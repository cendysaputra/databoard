import { Circle, Square } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import type { RecordingFile } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { RecordIcon } from '@/shared/ui/icons';
import { Input } from '@/shared/ui/Input';
import { LabelChip } from '@/shared/ui/LabelChip';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth, formatTime } from '@/shared/utils/date';
import { toDateTimeInput } from '@/shared/utils/datetime-input';
import {
  isDesktop,
  openInBrowser,
  useDriveStatus,
  useRecordings,
  useSaveRecording,
  useUploadToDrive,
} from './api';
import { DrivePanel } from './DrivePanel';
import { isRecordingSupported, useScreenRecorder, type Recording } from './use-screen-recorder';

const text = t.recorder;

const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

/** "01:05" or "1:02:03". */
function clock(totalSeconds: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [hours, minutes, seconds] = [
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ];
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** The outcome of an upload: progress, the link, or the error. */
function UploadState({ upload }: { upload: ReturnType<typeof useUploadToDrive> }) {
  if (upload.isPending) return <p className="text-sm text-muted">{text.result.uploading}</p>;
  if (upload.isError) return <FormError error={upload.error} />;
  if (!upload.data) return null;
  return (
    <p role="status" className="text-sm">
      {text.result.uploaded}{' '}
      <button
        type="button"
        className="underline"
        onClick={() => upload.data && void openInBrowser(upload.data)}
      >
        {text.result.openInDrive}
      </button>
    </p>
  );
}

function Result({ recording, onDiscard }: { recording: Recording; onDiscard(): void }) {
  const save = useSaveRecording();
  const upload = useUploadToDrive();
  const driveReady = useDriveStatus().data?.connected ?? false;
  const [name, setName] = useState(() =>
    text.result.defaultName(toDateTimeInput(new Date()).replace('T', ' ').replace(':', '.')),
  );
  const busy = save.isPending || upload.isPending;

  const saveLocal = () =>
    save.mutateAsync({ name, extension: recording.extension, blob: recording.blob });

  /** Drive takes a file from disk, so the recording is saved first if it was not yet. */
  const saveToDrive = async () => {
    try {
      const saved = save.data ?? (await saveLocal());
      upload.mutate(saved.fileName);
    } catch {
      // The save error is already shown below.
    }
  };

  return (
    <section className="editor-panel flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">{text.result.title}</h2>
        <p className="text-sm text-muted tabular-nums">
          {clock(recording.seconds)} · {text.result.size(megabytes(recording.blob.size))}
        </p>
      </div>

      <video
        controls
        src={recording.url}
        className="aspect-video w-full rounded-md border border-border bg-surface-hover"
      />

      <FormField label={text.result.name} required>
        {(id) => (
          <Input
            id={id}
            required
            // Once saved, the file keeps its name.
            disabled={Boolean(save.data)}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </FormField>

      <FormError error={save.error} />
      {save.data && (
        <p role="status" className="text-sm">
          {text.result.savedTo(save.data.location)}
        </p>
      )}
      <UploadState upload={upload} />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={busy || !name.trim() || Boolean(save.data)}
          onClick={() => void saveLocal().catch(() => {})}
        >
          {text.result.saveLocal}
        </Button>
        {isDesktop && (
          <Button
            disabled={busy || !name.trim() || !driveReady}
            title={driveReady ? undefined : text.drive.disconnected}
            onClick={() => void saveToDrive()}
          >
            {text.result.saveDrive}
          </Button>
        )}
        <Button disabled={busy} onClick={onDiscard}>
          {text.result.discard}
        </Button>
      </div>
    </section>
  );
}

/** One saved recording, with a button to send it to Drive. */
function SavedRow({ file, driveReady }: { file: RecordingFile; driveReady: boolean }) {
  const upload = useUploadToDrive();
  const modified = new Date(file.modified_at * 1000);

  return (
    <Row
      lead={`${formatDayMonth(modified)} ${formatTime(modified)}`}
      trail={
        <span className="flex items-center gap-3">
          {text.result.size(megabytes(file.size_bytes))}
          <Button
            disabled={!driveReady || upload.isPending}
            title={driveReady ? undefined : text.drive.disconnected}
            onClick={() => upload.mutate(file.file_name)}
          >
            {text.drive.upload}
          </Button>
        </span>
      }
    >
      <p className="truncate font-medium">{file.file_name}</p>
      <p className="truncate text-sm text-muted">{file.path}</p>
      <UploadState upload={upload} />
    </Row>
  );
}

function SavedRecordings() {
  const recordings = useRecordings();
  const driveReady = useDriveStatus().data?.connected ?? false;

  return (
    <section>
      <h2 className="mb-5 text-xl font-semibold">{text.saved.title}</h2>
      {isDesktop ? (
        <QueryBoundary query={recordings}>
          {(files) =>
            files.length === 0 ? (
              <p className="text-sm text-muted">{text.saved.empty}</p>
            ) : (
              <Rows>
                {files.map((file) => (
                  <SavedRow key={file.file_name} file={file} driveReady={driveReady} />
                ))}
              </Rows>
            )
          }
        </QueryBoundary>
      ) : (
        <p className="text-sm text-muted">{text.saved.browserNote}</p>
      )}
    </section>
  );
}

/** Records the screen (a monitor, a window or a tab) and saves the result to the computer. */
export function RecorderPage() {
  const recorder = useScreenRecorder();
  const [systemAudio, setSystemAudio] = useState(true);
  const [microphone, setMicrophone] = useState(false);

  return (
    <>
      <PageHeader title={text.title} />

      {!isRecordingSupported ? (
        <p className="text-muted">{text.unsupported}</p>
      ) : (
        <div className="flex flex-col gap-10">
          {/* The recorder takes the wide column; the Drive connection sits beside it. */}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {recorder.status === 'done' && recorder.recording ? (
              <Result recording={recorder.recording} onDiscard={recorder.discard} />
            ) : (
              <section
                aria-live="polite"
                className="editor-panel flex min-h-80 flex-col items-center justify-center gap-6 text-center"
              >
                {recorder.status === 'recording' ? (
                  <>
                    <p className="flex items-center gap-2.5 text-sm font-medium">
                      <span className="size-2.5 animate-pulse rounded-full bg-danger" />
                      {text.recording}
                    </p>
                    <p className="text-3xl leading-none font-semibold tabular-nums">
                      {clock(recorder.seconds)}
                    </p>
                    {recorder.systemAudioMissing && (
                      <p role="alert" className="max-w-sm text-sm text-danger">
                        {text.noSystemAudio}
                      </p>
                    )}
                    <Button onClick={recorder.stop}>
                      <Square aria-hidden className="size-4 fill-current" />
                      {text.stop}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex size-16 items-center justify-center rounded-full bg-surface-hover text-muted">
                      <RecordIcon className="size-7" />
                    </span>
                    <p className="max-w-sm text-sm text-muted">{text.pickHint}</p>
                    <div role="group" className="flex flex-wrap justify-center gap-1.5">
                      <LabelChip active={systemAudio} onClick={() => setSystemAudio(!systemAudio)}>
                        {text.options.systemAudio}
                      </LabelChip>
                      <LabelChip active={microphone} onClick={() => setMicrophone(!microphone)}>
                        {text.options.microphone}
                      </LabelChip>
                    </div>
                    {/* The microphone runs without echo removal, so speakers would be heard twice. */}
                    {systemAudio && microphone && (
                      <p className="max-w-sm text-xs text-muted">{text.headsetHint}</p>
                    )}
                    {recorder.error && (
                      <p role="alert" className="text-sm text-danger">
                        {text.denied}
                      </p>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => void recorder.start({ systemAudio, microphone })}
                    >
                      <Circle aria-hidden className="size-4 fill-current" />
                      {text.start}
                    </Button>
                  </>
                )}
              </section>
            )}

            <DrivePanel />
          </div>

          <SavedRecordings />
        </div>
      )}
    </>
  );
}
