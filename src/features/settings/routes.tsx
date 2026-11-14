import { useId, useState, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Settings, Theme } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { notifySaved } from '@/shared/ui/toast';
import { cn } from '@/shared/utils/cn';
import { sendTestNotification, useSettings, useUpdateSettings } from './api';
import { ProfileForm } from './components/ProfileForm';

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
    <div className="settings-field flex items-center justify-between gap-6 border-b border-border py-5">
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

function SettingsTabs({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const save = (changes: Partial<Settings>) => update.mutate({ ...settings, ...changes });
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div>
      <div role="tablist" className="mb-8 flex gap-1 border-b border-border">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === name
                ? 'border-accent text-text'
                : 'border-transparent text-muted hover:text-text',
            )}
          >
            {t.settings.tabs[name]}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="settings-panel">
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
      </div>

      {update.isError && (
        <p role="alert" className="mt-4 text-danger">
          {t.common.error}: {(update.error as { message?: string }).message}
        </p>
      )}
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettings();

  return (
    <>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <QueryBoundary query={settings}>{(value) => <SettingsTabs settings={value} />}</QueryBoundary>
    </>
  );
}
