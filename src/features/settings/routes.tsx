import { useId, useState, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Settings, Theme } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { notifySaved, showToast } from '@/shared/ui/toast';
import { cn } from '@/shared/utils/cn';
import { sendTestNotification, useSettings, useUpdateSettings } from './api';
import { ProfileForm } from './components/ProfileForm';
import { exportJson, exportNotesMarkdown, exportProjectsCsv } from './export';

const themes: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: t.theme.system },
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
];

type Tab = keyof typeof t.settings.tabs;
const tabs = Object.keys(t.settings.tabs) as Tab[];

const MAX_REMINDER_MINUTES = 10_080;

/** Must match the accent defaults in the Rust settings and tokens.css. */
const DEFAULT_ACCENTS = { accent_color: '#111111', accent_color_secondary: '#8c8c8c' };

function Field({ label, children }: { label: string; children(id: string): ReactNode }) {
  const id = useId();
  return (
    <div className="settings-field flex items-center justify-between gap-6 border-b border-border py-5 first:pt-0 last:border-b-0 last:pb-0">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="w-64 shrink-0">{children(id)}</div>
    </div>
  );
}

interface PanelProps {
  settings: Settings;
  save(changes: Partial<Settings>): void;
}

/** App name, reminders and notifications. */
function AppPanel({ settings, save }: PanelProps) {
  return (
    <>
      <Field label={t.settings.appName}>
        {(id) => (
          <Input
            id={id}
            key={settings.app_name}
            defaultValue={settings.app_name}
            maxLength={60}
            onBlur={(event) => {
              const app_name = event.target.value.trim();
              if (app_name && app_name !== settings.app_name) save({ app_name });
              else event.target.value = settings.app_name;
            }}
          />
        )}
      </Field>

      <Field label={t.settings.defaultReminder}>
        {(id) => (
          <Input
            id={id}
            type="number"
            min={0}
            max={MAX_REMINDER_MINUTES}
            key={settings.default_reminder_minutes}
            defaultValue={settings.default_reminder_minutes}
            onBlur={(event) => {
              const minutes = Math.round(event.target.valueAsNumber);
              if (minutes >= 0 && minutes <= MAX_REMINDER_MINUTES) {
                if (minutes !== settings.default_reminder_minutes) {
                  save({ default_reminder_minutes: minutes });
                }
              } else {
                event.target.value = String(settings.default_reminder_minutes);
              }
            }}
          />
        )}
      </Field>

      <Field label={t.settings.notification}>
        {(id) => (
          <Button
            id={id}
            onClick={() =>
              void sendTestNotification(settings.app_name, t.settings.testNotificationBody)
            }
          >
            {t.settings.testNotification}
          </Button>
        )}
      </Field>
    </>
  );
}

/** Theme and accent colors. */
function AppearancePanel({ settings, save }: PanelProps) {
  return (
    <>
      <Field label={t.theme.label}>
        {(id) => (
          <div id={id} role="radiogroup" className="flex gap-1">
            {themes.map(({ value, label }) => (
              <Button
                key={value}
                role="radio"
                aria-checked={settings.theme === value}
                variant={settings.theme === value ? 'primary' : 'secondary'}
                className="flex-1 px-0"
                onClick={() => save({ theme: value })}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </Field>

      {(
        [
          ['accent_color', t.settings.accent],
          ['accent_color_secondary', t.settings.accentSecondary],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label}>
          {(id) => (
            <div className="flex items-center gap-3">
              <input
                id={id}
                type="color"
                value={settings[key]}
                onChange={(event) => save({ [key]: event.target.value })}
                className="h-9 w-14 cursor-pointer rounded-sm border border-border bg-transparent p-1"
              />
              <span className="font-mono text-sm text-muted">{settings[key]}</span>
            </div>
          )}
        </Field>
      ))}

      <Field label={t.settings.accentReset}>
        {(id) => (
          <Button
            id={id}
            disabled={
              settings.accent_color === DEFAULT_ACCENTS.accent_color &&
              settings.accent_color_secondary === DEFAULT_ACCENTS.accent_color_secondary
            }
            onClick={() => save(DEFAULT_ACCENTS)}
          >
            {t.settings.accentReset}
          </Button>
        )}
      </Field>
    </>
  );
}

/** One export: its label and the job, which resolves to the message to confirm with. */
const exportsOffered: Array<{ label: string; run(): Promise<string | null> }> = [
  { label: t.settings.data.exportJson, run: () => exportJson().then(() => t.settings.data.done) },
  {
    label: t.settings.data.exportCsv,
    run: () => exportProjectsCsv().then(() => t.settings.data.done),
  },
  {
    label: t.settings.data.exportNotes,
    // Nothing is confirmed when the folder dialog was cancelled.
    run: () =>
      exportNotesMarkdown().then((count) =>
        count === null ? null : t.settings.data.notesDone(count),
      ),
  },
];

/** Exports of the app's content as files. */
function DataPanel() {
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  return (
    <>
      {exportsOffered.map(({ label, run }) => (
        <Field key={label} label={label}>
          {(id) => (
            <Button
              id={id}
              disabled={running !== null}
              onClick={() => {
                setRunning(label);
                setError(null);
                run()
                  .then((message) => message && showToast(message))
                  .catch(setError)
                  .finally(() => setRunning(null));
              }}
            >
              {t.settings.data.export}
            </Button>
          )}
        </Field>
      ))}
      {error !== null && (
        <div className="mt-5">
          <FormError error={error} />
        </div>
      )}
    </>
  );
}

function SettingsTabs({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const save = (changes: Partial<Settings>) => update.mutate({ ...settings, ...changes });
  const [tab, setTab] = useState<Tab>('profile');

  return (
    // Sections are listed at the left on wide screens and in a row above on narrow ones.
    <div className="grid items-start gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-orientation="vertical"
        className="flex gap-1 overflow-x-auto lg:sticky lg:top-8 lg:flex-col"
      >
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              'h-10 shrink-0 rounded-sm px-3.5 text-left text-sm font-medium transition-colors',
              tab === name ? 'bg-surface text-text' : 'text-muted hover:text-text',
            )}
          >
            {t.settings.tabs[name]}
          </button>
        ))}
      </div>

      <div>
        <div role="tabpanel" className="settings-panel max-w-3xl">
          <h2 className="mb-6 text-lg font-semibold">{t.settings.tabs[tab]}</h2>
          {tab === 'profile' && (
            <div className="max-w-md">
              <ProfileForm
                // Remount when the saved profile changes, so the fields show what is stored.
                key={`${settings.profile_name}|${settings.profile_nickname}|${settings.profile_role}`}
                settings={settings}
                submitLabel={t.common.save}
                onSaved={notifySaved}
              />
            </div>
          )}
          {tab === 'appearance' && <AppearancePanel settings={settings} save={save} />}
          {tab === 'app' && <AppPanel settings={settings} save={save} />}
          {tab === 'data' && <DataPanel />}
        </div>

        {update.isError && (
          <p role="alert" className="mt-4 text-danger">
            {t.common.error}: {(update.error as { message?: string }).message}
          </p>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettings();

  return (
    <>
      <PageHeader title={t.settings.title} />
      <QueryBoundary query={settings}>{(value) => <SettingsTabs settings={value} />}</QueryBoundary>
    </>
  );
}
