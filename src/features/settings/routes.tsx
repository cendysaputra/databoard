import { useId, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Settings, Theme } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { sendTestNotification, useSettings, useUpdateSettings } from './api';

const themes: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: t.theme.system },
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
];

const MAX_REMINDER_MINUTES = 10_080;

function Field({ label, children }: { label: string; children(id: string): ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="w-64 shrink-0">{children(id)}</div>
    </div>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const save = (changes: Partial<Settings>) => update.mutate({ ...settings, ...changes });

  return (
    <div>
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

      <Field label={t.settings.accent}>
        {(id) => (
          <input
            id={id}
            type="color"
            value={settings.accent_color}
            onChange={(event) => save({ accent_color: event.target.value })}
            className="h-8 w-14 cursor-pointer rounded-sm border border-border bg-bg p-1"
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
      <QueryBoundary query={settings}>{(value) => <SettingsForm settings={value} />}</QueryBoundary>
    </>
  );
}
