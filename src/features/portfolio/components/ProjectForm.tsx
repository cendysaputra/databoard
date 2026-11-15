import { lazy, Suspense, useState, type FormEvent, type ReactNode } from 'react';
import { LabelChip } from '@/features/notes/components/LabelChip';
import { t } from '@/shared/i18n/id';
import type { Project, ProjectInput, ProjectStatus } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';

// The rich text engine is heavy, so it loads with the form instead of with the project list.
const RichEditor = lazy(() =>
  import('@/features/notes/components/RichEditor').then((module) => ({
    default: module.RichEditor,
  })),
);

const text = t.portfolio.form;
const statuses = Object.keys(t.portfolio.status) as ProjectStatus[];
const noop = () => {};

interface ProjectFormProps {
  /** The project being edited; leave out to create a new one. */
  project?: Project;
  /** Position given to a new project, normally after the last one. */
  nextSortOrder: number;
  /** The kinds and tools on offer, from the settings. */
  kinds: string[];
  tools: string[];
  saving: boolean;
  error: unknown;
  onSubmit(input: ProjectInput): void;
  onCancel(): void;
  extra?: ReactNode;
}

/** `names` plus the values a project already has, so a value taken off the list stays visible. */
const withCurrent = (names: string[], current: string[]) => [
  ...names,
  ...current.filter((name) => !names.includes(name)),
];

export function ProjectForm({
  project,
  nextSortOrder,
  kinds,
  tools,
  saving,
  error,
  onSubmit,
  onCancel,
  extra,
}: ProjectFormProps) {
  const [form, setForm] = useState({
    title: project?.title ?? '',
    client: project?.client ?? '',
    year: project?.year?.toString() ?? '',
    role: project?.role ?? '',
    kind: project?.kind ?? '',
    stack: project?.stack ?? [],
    url: project?.url ?? '',
    repo_url: project?.repo_url ?? '',
    status: project?.status ?? ('draft' as ProjectStatus),
    description_md: project?.description_md ?? '',
  });
  const set = (changes: Partial<typeof form>) => setForm((current) => ({ ...current, ...changes }));

  const kindOptions = withCurrent(kinds, form.kind ? [form.kind] : []);
  const toolOptions = withCurrent(tools, form.stack);
  const toggleTool = (tool: string) =>
    set({
      stack: form.stack.includes(tool)
        ? form.stack.filter((name) => name !== tool)
        : [...form.stack, tool],
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      title: form.title,
      client: form.client,
      year: form.year === '' ? null : Number(form.year),
      role: form.role,
      kind: form.kind || null,
      stack: form.stack,
      url: form.url,
      repo_url: form.repo_url,
      description_md: form.description_md,
      // The cover image is desktop-only and comes with the upload feature.
      cover_path: project?.cover_path ?? null,
      status: form.status,
      // The order is not edited here: a project keeps its place, a new one goes last.
      sort_order: project?.sort_order ?? nextSortOrder,
    });
  };

  return (
    <form onSubmit={submit} className="editor-panel flex flex-col gap-7">
      <FormField label={text.title} required>
        {(id) => (
          <Input
            id={id}
            required
            autoFocus={!project}
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        )}
      </FormField>

      <div className="form-grid grid grid-cols-2 gap-6">
        <FormField label={text.client}>
          {(id) => (
            <Input id={id} value={form.client} onChange={(e) => set({ client: e.target.value })} />
          )}
        </FormField>
        <FormField label={text.role}>
          {(id) => (
            <Input id={id} value={form.role} onChange={(e) => set({ role: e.target.value })} />
          )}
        </FormField>
        <FormField label={text.kind}>
          {(id) => (
            <Select id={id} value={form.kind} onChange={(e) => set({ kind: e.target.value })}>
              <option value="">{text.kindNone}</option>
              {kindOptions.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={text.year}>
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1900}
              max={2200}
              value={form.year}
              onChange={(e) => set({ year: e.target.value })}
            />
          )}
        </FormField>
        <FormField label={text.status}>
          {(id) => (
            <Select
              id={id}
              value={form.status}
              onChange={(e) => set({ status: e.target.value as ProjectStatus })}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {t.portfolio.status[status]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={text.url}>
          {(id) => (
            <Input
              id={id}
              type="url"
              placeholder="https://"
              value={form.url}
              onChange={(e) => set({ url: e.target.value })}
            />
          )}
        </FormField>
        <FormField label={text.repoUrl}>
          {(id) => (
            <Input
              id={id}
              type="url"
              placeholder="https://"
              value={form.repo_url}
              onChange={(e) => set({ repo_url: e.target.value })}
            />
          )}
        </FormField>
      </div>

      <div>
        <p className="label mb-2">{text.tools}</p>
        {toolOptions.length === 0 ? (
          <p className="text-sm text-muted">{text.toolsNone}</p>
        ) : (
          <div role="group" aria-label={text.tools} className="flex flex-wrap gap-1.5">
            {toolOptions.map((tool) => (
              <LabelChip
                key={tool}
                active={form.stack.includes(tool)}
                onClick={() => toggleTool(tool)}
              >
                {tool}
              </LabelChip>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="label mb-2">{text.description}</p>
        <div className="min-h-56 rounded-sm border border-border bg-surface p-4">
          <Suspense fallback={<p className="text-sm text-muted">{t.common.loading}</p>}>
            <RichEditor
              initialMarkdown={project?.description_md ?? ''}
              onChange={(description_md) => set({ description_md })}
              onReady={noop}
            />
          </Suspense>
        </div>
      </div>

      <FormError error={error} />

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {t.common.save}
        </Button>
        <Button onClick={onCancel}>{t.common.cancel}</Button>
        <div className="flex-1" />
        {extra}
      </div>
    </form>
  );
}
