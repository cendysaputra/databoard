import { useCallback, useEffect, useRef, useState } from 'react';

interface RecorderOptions {
  systemAudio: boolean;
  microphone: boolean;
}

export interface Recording {
  blob: Blob;
  extension: 'webm' | 'mp4';
  /** Temporary address of the blob, for the preview player. */
  url: string;
  seconds: number;
}

type Status = 'idle' | 'starting' | 'recording' | 'done';

/** Formats tried in order; the first one this engine can record wins. */
const FORMATS: Array<{ mimeType: string; extension: 'webm' | 'mp4' }> = [
  { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
  { mimeType: 'video/mp4', extension: 'mp4' },
];

export const isRecordingSupported =
  typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
  typeof MediaRecorder !== 'undefined';

/**
 * One stream to record: the screen's video plus its sounds. Screen audio and the microphone
 * are mixed into a single track, because a recorder keeps only one audio track.
 */
async function captureStream(options: RecorderOptions) {
  // Without these two hints the picker offers the computer's sound for a whole screen only,
  // and a shared window comes back silent. They are newer than the TypeScript definitions.
  const request: DisplayMediaStreamOptions & {
    systemAudio?: 'include' | 'exclude';
    windowAudio?: 'exclude' | 'window' | 'system';
  } = {
    video: true,
    // Sound is recorded as it is played: no echo removal, no levelling.
    audio: options.systemAudio && {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  };
  if (options.systemAudio) {
    request.systemAudio = 'include';
    request.windowAudio = 'system';
  }
  const screen = await navigator.mediaDevices.getDisplayMedia(request);
  try {
    return await mixStream(screen, options);
  } catch (err) {
    // Mixing failed: end the share.
    for (const track of screen.getTracks()) track.stop();
    throw err;
  }
}

async function mixStream(screen: MediaStream, options: RecorderOptions) {
  // The picker can still hand back a share without sound, e.g. when its audio switch is off.
  const systemAudioMissing = options.systemAudio && screen.getAudioTracks().length === 0;
  const sources = [screen];
  if (options.microphone) {
    try {
      sources.push(
        await navigator.mediaDevices.getUserMedia({
          // Echo removal puts Windows into "call" mode, which turns every other sound down,
          // so the computer's sound reached the recording almost silent.
          audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false },
        }),
      );
    } catch {
      // No microphone or permission denied: record without it.
    }
  }

  const audioSources = sources.filter((source) => source.getAudioTracks().length > 0);
  let mixer: AudioContext | undefined;
  let mixerInputs: MediaStreamAudioSourceNode[] = [];
  let released = false;
  const release = () => {
    // Frees everything, once.
    if (released) return;
    released = true;
    for (const source of sources) for (const track of source.getTracks()) track.stop();
    for (const node of mixerInputs) node.disconnect();
    void mixer?.close().catch(() => {});
  };
  const tracks = [...screen.getVideoTracks()];
  try {
    await mixAudio();
  } catch (err) {
    // Mixing failed: mic and mixer too.
    release();
    throw err;
  }

  async function mixAudio() {
    if (audioSources.length === 1 && audioSources[0]) {
      tracks.push(...audioSources[0].getAudioTracks());
    } else if (audioSources.length > 1) {
      const context = new AudioContext();
      mixer = context;
      const output = context.createMediaStreamDestination();
      // Each input gets a stream of its own audio track only, and the nodes are kept for the
      // whole recording: an input the engine tidies away goes silent mid-recording.
      mixerInputs = audioSources.map((source) => {
        const node = context.createMediaStreamSource(new MediaStream(source.getAudioTracks()));
        node.connect(output);
        return node;
      });
      // The mixer is made after the pickers, outside the click, so it can start paused. An engine
      // that will not start it must not leave Start hanging with the share already live.
      if (context.state === 'suspended') {
        await Promise.race([
          context.resume().catch(() => {}),
          new Promise((resolve) => window.setTimeout(resolve, 1000)),
        ]);
      }
      tracks.push(...output.stream.getAudioTracks());
    }
  }

  return {
    stream: new MediaStream(tracks),
    screenTrack: screen.getVideoTracks()[0],
    systemAudioMissing,
    release,
  };
}

/** Records the screen with the browser engine's own recorder. */
export function useScreenRecorder() {
  const [status, setStatus] = useState<Status>('idle');
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  /** Why the last start or recording failed. */
  const [error, setError] = useState<false | 'denied' | 'failed'>(false);
  /** True when the computer's sound was asked for but the share came without it. */
  const [systemAudioMissing, setSystemAudioMissing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const releaseRef = useRef<() => void>(() => {});
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  // The clock that runs while recording.
  useEffect(() => {
    if (status !== 'recording') return;
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      500,
    );
    return () => window.clearInterval(timer);
  }, [status]);

  // Leaving the page stops the capture and frees the preview. A recording still running is
  // dropped without building a file nobody can reach any more.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      releaseRef.current();
      setRecording((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return null;
      });
    };
  }, []);

  const start = useCallback(async (options: RecorderOptions) => {
    // One start at a time.
    if (busyRef.current) return;
    busyRef.current = true;
    setError(false);
    setStatus('starting');
    const fail = () => {
      busyRef.current = false;
      setError('denied');
      setStatus('idle');
    };
    const format = FORMATS.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType));
    let capture: Awaited<ReturnType<typeof captureStream>>;
    try {
      capture = await captureStream(options);
    } catch {
      // Picker cancelled or permission denied.
      fail();
      return;
    }
    // Page left while picking.
    if (!mountedRef.current) {
      capture.release();
      return;
    }

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    let failed = false;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(capture.stream, format && { mimeType: format.mimeType });
    } catch {
      // Stream or format refused.
      capture.release();
      fail();
      return;
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      failed = true;
    };
    recorder.onstop = () => {
      capture.release();
      busyRef.current = false;
      // A broken recording is not offered as finished.
      if (failed) {
        setError('failed');
        setStatus('idle');
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType });
      setRecording({
        blob,
        extension: format?.extension ?? 'webm',
        url: URL.createObjectURL(blob),
        seconds: Math.round((Date.now() - startedAt) / 1000),
      });
      setStatus('done');
    };
    // Stopping the share from the system's own "stop sharing" button ends the recording too.
    capture.screenTrack?.addEventListener('ended', () => {
      if (recorder.state !== 'inactive') recorder.stop();
    });

    recorderRef.current = recorder;
    releaseRef.current = capture.release;
    try {
      recorder.start(1000);
    } catch {
      recorder.onstop = null;
      capture.release();
      fail();
      return;
    }
    setSystemAudioMissing(capture.systemAudioMissing);
    setSeconds(0);
    setStatus('recording');
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
  }, []);

  /** Throws the finished recording away and returns to the start. */
  const discard = useCallback(() => {
    setRecording((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setStatus('idle');
  }, []);

  return { status, seconds, recording, error, systemAudioMissing, start, stop, discard };
}
