import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecorderOptions {
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

type Status = 'idle' | 'recording' | 'done';

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
  const screen = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: options.systemAudio,
  });
  const sources = [screen];
  if (options.microphone) {
    try {
      sources.push(await navigator.mediaDevices.getUserMedia({ audio: true }));
    } catch {
      // No microphone or permission denied: record without it.
    }
  }

  const audioSources = sources.filter((source) => source.getAudioTracks().length > 0);
  let mixer: AudioContext | undefined;
  const tracks = [...screen.getVideoTracks()];
  if (audioSources.length === 1 && audioSources[0]) {
    tracks.push(...audioSources[0].getAudioTracks());
  } else if (audioSources.length > 1) {
    mixer = new AudioContext();
    const output = mixer.createMediaStreamDestination();
    for (const source of audioSources) mixer.createMediaStreamSource(source).connect(output);
    tracks.push(...output.stream.getAudioTracks());
  }

  const release = () => {
    for (const source of sources) for (const track of source.getTracks()) track.stop();
    void mixer?.close();
  };
  return { stream: new MediaStream(tracks), screenTrack: screen.getVideoTracks()[0], release };
}

/** Records the screen with the browser engine's own recorder. */
export function useScreenRecorder() {
  const [status, setStatus] = useState<Status>('idle');
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const releaseRef = useRef<() => void>(() => {});

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

  // Leaving the page stops the capture and frees the preview.
  useEffect(
    () => () => {
      releaseRef.current();
      setRecording((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return null;
      });
    },
    [],
  );

  const start = useCallback(async (options: RecorderOptions) => {
    setError(false);
    const format = FORMATS.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType));
    let capture: Awaited<ReturnType<typeof captureStream>>;
    try {
      capture = await captureStream(options);
    } catch {
      // The picker was cancelled or the permission was denied.
      setError(true);
      return;
    }

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    const recorder = new MediaRecorder(capture.stream, format && { mimeType: format.mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      capture.release();
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
    recorder.start(1000);
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

  return { status, seconds, recording, error, start, stop, discard };
}
