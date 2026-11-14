import { useState, type FormEvent, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Project, ProjectInput, ProjectStatus } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';

const text = t.portfolio.form;
const statuses = Object.keys(t.portfolio.status) as ProjectStatus[];

interface ProjectFormProps {
  /** The project being edited; leave out to create a new one. */
  project?: Project;
  /** Position given to a new project, normally after the last one. */
  nextSortOrder: number;
  saving: boolean;
  error: unknown;
  onSubmit(input: ProjectInput): void;
  onCancel(): void;
  extra?: ReactNode;
}

export function ProjectForm({
  project,
  nextSortOrder,
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
    stack: project?.stack.join(', ') ?? '',
    url: project?.url ?? '',
    repo_url: project?.repo_url ?? '',
    status: project?.status ?? ('draft' as ProjectStatus),
    sort_order: String(project?.sort_order ?? nextSortOrder),
    description_md: project?.description_md ?? '',
  });
  const set = (changes: Partial<typeof form>) => setForm((current) => ({ ...current, ...changes }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      title: form.title,
      client: form.client,
      year: form.year === '' ? null : Number(form.year),
      role: form.role,
      stack: form.stack
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
      url: form.url,
      repo_url: form.repo_url,
      description_md: form.description_md,
      // The cover image is desktop-only and comes with the upload feature.
      cover_path: project?.cover_path ?? null,
      status: form.status,
      sort_order: Number(form.sort_order) || 0,
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
              className="w-full"
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
        <FormField label={text.stack}>
          {(id) => (
            <Input id={id} value={form.stack} onChange={(e) => set({ stack: e.target.value })} />
          )}
        </FormField>
        <FormField label={text.sortOrder}>
          {(id) => (
            <Input
              id={id}
              type="number"
              value={form.sort_order}
              onChange={(e) => set({ sort_order: e.target.value })}
            />
          )}
        </FormField>
      </div>

      <FormField label={text.description}>
        {(id) => (
          <Textarea
            id={id}
            rows={8}
            className="font-mono"
            value={form.description_md}
            onChange={(e) => set({ description_md: e.target.value })}
          />
        )}
      </FormField>

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
