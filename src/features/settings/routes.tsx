import { useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Settings, Theme } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Segmented } from '@/shared/ui/Segmented';
import { notifySaved, showToast } from '@/shared/ui/toast';
import { cn } from '@/shared/utils/cn';
import {
  isDesktop,
  sendTestNotification,
  useAutostart,
  useMcpServerPath,
  useSetAutostart,
  useSettings,
  useUpdateSettings,
} from './api';
import { ProfileForm } from './components/ProfileForm';
import { backup } from './api';
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
  const autostart = useAutostart();
  const setAutostart = useSetAutostart();

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

      <Field label={t.settings.autostart}>
        {(id) =>
          isDesktop ? (
            <label className="flex h-10 w-fit items-center gap-2 text-sm">
              <input
                id={id}
                type="checkbox"
                className="size-4 accent-(--accent)"
                checked={autostart.data ?? false}
                disabled={autostart.isPending || setAutostart.isPending}
                onChange={(event) => setAutostart.mutate(event.target.checked)}
              />
              {t.settings.autostartOn}
            </label>
          ) : (
            <p id={id} className="flex h-10 items-center text-sm text-muted">
              {t.common.desktopOnly}
            </p>
          )
        }
      </Field>
      {setAutostart.isError && <FormError error={setAutostart.error} />}

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

/** Backups of the database and exports of the app's content as files. */
function DataPanel({ settings, save }: PanelProps) {
  const client = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const text = t.settings.data;

  /** Runs one job at a time; a message it resolves to is shown as confirmation. */
  const start = (name: string, job: () => Promise<string | null>) => {
    setRunning(name);
    setError(null);
    job()
      .then((message) => message && showToast(message))
      .catch(setError)
      .finally(() => setRunning(null));
  };

  return (
    <>
      {isDesktop ? (
        <>
          <Field label={text.backupDir}>
            {(id) => (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm break-all text-muted">
                  {settings.backup_dir ?? text.backupDirDefault}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    id={id}
                    disabled={running !== null}
                    onClick={() =>
                      start('dir', async () => {
                        const backup_dir = await backup.pickDir();
                        if (backup_dir) save({ backup_dir });
                        return null;
                      })
                    }
                  >
                    {text.backupDirChoose}
                  </Button>
                  {settings.backup_dir && (
                    <Button variant="ghost" onClick={() => save({ backup_dir: null })}>
                      {text.backupDirReset}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted">{text.backupAuto}</p>
              </div>
            )}
          </Field>
          <Field label={text.backupNow}>
            {(id) => (
              <Button
                id={id}
                disabled={running !== null}
                onClick={() =>
                  start('backup', async () => {
                    const file = await backup.run();
                    showToast(text.backupDone, file);
                    return null;
                  })
                }
              >
                {text.backupRun}
              </Button>
            )}
          </Field>
          <Field label={text.restore}>
            {(id) => (
              <div className="flex flex-col items-start gap-2">
                <Button
                  id={id}
                  disabled={running !== null}
                  onClick={() =>
                    start('restore', async () => {
                      if (!(await backup.restore())) return null;
                      // Everything on screen came from the replaced data.
                      await client.invalidateQueries();
                      return text.restoreDone;
                    })
                  }
                >
                  {text.restoreRun}
                </Button>
                <p className="text-xs text-muted">{text.restoreHint}</p>
              </div>
            )}
          </Field>
        </>
      ) : (
        <Field label={text.backupNow}>
          {(id) => (
            <p id={id} className="flex h-10 items-center text-sm text-muted">
              {t.common.desktopOnly}
            </p>
          )}
        </Field>
      )}

      {exportsOffered.map(({ label, run }) => (
        <Field key={label} label={label}>
          {(id) => (
            <Button id={id} disabled={running !== null} onClick={() => start(label, run)}>
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

/** A block of text to paste somewhere else, with a button that copies it. */
function Snippet({ label, hint, code }: { label: string; hint: string; code: string }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="label">{label}</p>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
        <Button
          onClick={() =>
            void navigator.clipboard.writeText(code).then(() => showToast(t.settings.agent.copied))
          }
        >
          {t.settings.agent.copy}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-sm border border-border bg-surface-hover p-4 font-mono text-xs leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

type AgentClient = keyof typeof t.settings.agent.clients;
const agentClients = Object.keys(t.settings.agent.clients) as AgentClient[];

/** Name the app's server goes by in a client's configuration. */
const SERVER_NAME = 'databoard';

/** The configuration that registers the server at `command`, in the form each client reads. */
const agentConfig: Record<AgentClient, (command: string) => string> = {
  json: (command) => JSON.stringify({ mcpServers: { [SERVER_NAME]: { command } } }, null, 2),
  vscode: (command) =>
    JSON.stringify({ servers: { [SERVER_NAME]: { type: 'stdio', command } } }, null, 2),
  // A TOML literal string (single quotes) keeps the backslashes of a Windows path as they are.
  codex: (command) => `[mcp_servers.${SERVER_NAME}]\ncommand = '${command}'`,
  claudeCode: (command) => `claude mcp add ${SERVER_NAME} -- "${command}"`,
};

/** Ready-to-paste configuration that connects an AI agent to the app's data. */
function AgentPanel() {
  const path = useMcpServerPath();
  const [client, setClient] = useState<AgentClient>('json');
  const text = t.settings.agent;

  return (
    <QueryBoundary query={path}>
      {(serverPath) => {
        const command = serverPath ?? text.examplePath;
        return (
          <>
            <p className="mb-6 text-sm text-muted">
              {text.intro}
              {serverPath === null && ` ${text.browserNote}`}
            </p>
            <div className="mb-6">
              <Segmented<AgentClient>
                label={text.client}
                value={client}
                onChange={setClient}
                options={agentClients.map((name) => ({
                  value: name,
                  label: text.clients[name].label,
                }))}
              />
            </div>
            <Snippet
              label={text.clients[client].label}
              hint={text.clients[client].hint}
              code={agentConfig[client](command)}
            />
            <Snippet label={text.program} hint={text.programHint} code={command} />
          </>
        );
      }}
    </QueryBoundary>
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
          {tab === 'data' && <DataPanel settings={settings} save={save} />}
          {tab === 'agent' && <AgentPanel />}
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
