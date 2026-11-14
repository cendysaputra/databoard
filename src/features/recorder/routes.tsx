import { Circle, Square } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth, formatTime } from '@/shared/utils/date';
import { toDateTimeInput } from '@/shared/utils/datetime-input';
import { canListRecordings, useRecordings, useSaveRecording } from './api';
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

function Result({ recording, onDiscard }: { recording: Recording; onDiscard(): void }) {
  const save = useSaveRecording();
  const [name, setName] = useState(() =>
    text.result.defaultName(toDateTimeInput(new Date()).replace('T', ' ').replace(':', '.')),
  );

  return (
    <section className="flex flex-col gap-5">
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
          <Input id={id} required value={name} onChange={(event) => setName(event.target.value)} />
        )}
      </FormField>

      <FormError error={save.error} />
      {save.data && (
        <p role="status" className="text-sm">
          {text.result.savedTo(save.data)}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={save.isPending || !name.trim()}
          onClick={() =>
            save.mutate({ name, extension: recording.extension, blob: recording.blob })
          }
        >
          {text.result.saveLocal}
        </Button>
        <Button disabled={save.isPending} onClick={onDiscard}>
          {text.result.discard}
        </Button>
      </div>
    </section>
  );
}

function SavedRecordings() {
  const recordings = useRecordings();

  return (
    <section>
      <h2 className="mb-5 text-xl font-semibold">{text.saved.title}</h2>
      {canListRecordings ? (
        <QueryBoundary query={recordings}>
          {(files) =>
            files.length === 0 ? (
              <p className="text-sm text-muted">{text.saved.empty}</p>
            ) : (
              <Rows>
                {files.map((file) => {
                  const modified = new Date(file.modified_at * 1000);
                  return (
                    <Row
                      key={file.file_name}
                      lead={`${formatDayMonth(modified)} ${formatTime(modified)}`}
                      trail={text.result.size(megabytes(file.size_bytes))}
                    >
                      <p className="truncate font-medium">{file.file_name}</p>
                      <p className="truncate text-sm text-muted">{file.path}</p>
                    </Row>
                  );
                })}
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
      <PageHeader title={text.title} subtitle={text.subtitle} />

      {!isRecordingSupported ? (
        <p className="text-muted">{text.unsupported}</p>
      ) : (
        <div className="flex flex-col gap-12">
          {recorder.status === 'idle' && (
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                {(
                  [
                    [text.options.systemAudio, systemAudio, setSystemAudio],
                    [text.options.microphone, microphone, setMicrophone],
                  ] as const
                ).map(([label, checked, set]) => (
                  <label key={label} className="flex w-fit items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-(--accent)"
                      checked={checked}
                      onChange={(event) => set(event.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-sm text-muted">{text.pickHint}</p>
              {recorder.error && (
                <p role="alert" className="text-sm text-danger">
                  {text.denied}
                </p>
              )}
              <Button
                variant="primary"
                className="w-fit"
                onClick={() => void recorder.start({ systemAudio, microphone })}
              >
                <Circle aria-hidden className="size-4 fill-current" />
                {text.start}
              </Button>
            </section>
          )}

          {recorder.status === 'recording' && (
            <section className="flex items-center gap-5" aria-live="polite">
              <span className="size-3 animate-pulse rounded-full bg-danger" />
              <p className="font-medium">{text.recording}</p>
              <p className="text-2xl font-semibold tabular-nums">{clock(recorder.seconds)}</p>
              <Button onClick={recorder.stop}>
                <Square aria-hidden className="size-4 fill-current" />
                {text.stop}
              </Button>
            </section>
          )}

          {recorder.status === 'done' && recorder.recording && (
            <Result recording={recorder.recording} onDiscard={recorder.discard} />
          )}

          <SavedRecordings />
        </div>
      )}
    </>
  );
}
