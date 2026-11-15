import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useSelection } from '@/shared/hooks/use-selection';
import { useSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import type { Project, Settings } from '@/shared/types';
import { Button, buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FormError } from '@/shared/ui/FormError';
import { PortfolioIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Select } from '@/shared/ui/Select';
import { SelectionBar } from '@/shared/ui/SelectionBar';
import {
  useProject,
  useProjects,
  useRemoveProject,
  useRemoveProjects,
  useSaveProject,
} from './api';
import { Cover } from './components/Cover';
import { OptionManager } from './components/OptionManager';
import { ProjectForm } from './components/ProjectForm';

const text = t.portfolio;

/** `names` plus the values projects already use, so nothing in the data is unreachable. */
const withUsed = (names: string[], used: Array<string | null | undefined>) => {
  const all = [...names];
  for (const name of used) if (name && !all.includes(name)) all.push(name);
  return all;
};

interface FilterProps {
  label: string;
  /** Text of the choice that filters nothing. */
  all: string;
  value: string;
  options: string[];
  onChange(value: string): void;
}

/** One dropdown of the filter row; its empty value means "no filter". */
function Filter({ label, all, value, options, onChange }: FilterProps) {
  return (
    // The select fills its box, so the box sets the width.
    <div className="w-44">
      <Select
        aria-label={label}
        className="h-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** What a card needs to draw its checkbox while projects are being selected. */
interface CardSelect {
  checked: boolean;
  onChange(): void;
}

function ProjectCard({ project, select }: { project: Project; select?: CardSelect }) {
  return (
    <li className="project-card relative flex flex-col gap-4 rounded-card p-6">
      <Cover path={project.cover_path} alt={text.form.coverAlt(project.title)} />
      <div className="flex items-center gap-2 text-xs">
        {project.kind && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium">
            {project.kind}
          </span>
        )}
        <span className="text-muted">{text.status[project.status]}</span>
        <span className="ml-auto text-muted tabular-nums">{project.year}</span>
        {select && (
          <input
            type="checkbox"
            aria-label={t.common.selectItem(project.title)}
            checked={select.checked}
            onChange={select.onChange}
            // Above the card's full-size link, so a click ticks the box instead of opening it.
            className="relative z-10 size-4 shrink-0 cursor-pointer accent-(--accent)"
          />
        )}
      </div>

      <div>
        <h2 className="text-lg leading-snug font-semibold">
          <Link
            to="/portfolio/$projectId"
            params={{ projectId: project.id }}
            className="after:absolute after:inset-0"
          >
            {project.title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted">
          {[project.client, project.role].filter(Boolean).join(' · ')}
        </p>
      </div>

      {project.stack.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-1.5">
          {project.stack.map((tool) => (
            <li key={tool} className="rounded-sm bg-surface-hover px-2 py-0.5 text-xs text-muted">
              {tool}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** The filter row and the project cards, with the controls to delete several projects. */
function ProjectGrid({ projects, settings }: { projects: Project[]; settings: Settings }) {
  const [kind, setKind] = useState('');
  const [year, setYear] = useState('');
  const [tool, setTool] = useState('');
  const [managing, setManaging] = useState(false);
  const remove = useRemoveProjects();

  const kinds = withUsed(
    settings.project_kinds,
    projects.map((project) => project.kind),
  );
  const tools = withUsed(
    settings.project_tools,
    projects.flatMap((project) => project.stack),
  );
  // Years are not managed by hand: the list is whatever the projects have, newest first.
  const years = [...new Set(projects.flatMap((project) => (project.year ? [project.year] : [])))]
    .sort((a, b) => b - a)
    .map(String);

  const shown = projects.filter(
    (project) =>
      (!kind || project.kind === kind) &&
      (!year || String(project.year) === year) &&
      (!tool || project.stack.includes(tool)),
  );
  // Picks follow the cards on screen, so narrowing the filter narrows them too.
  const selection = useSelection(shown.map((project) => project.id));
  const filtered = Boolean(kind || year || tool);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter
          label={text.filter.kind}
          all={text.filter.allKinds}
          value={kind}
          options={kinds}
          onChange={setKind}
        />
        <Filter
          label={text.filter.year}
          all={text.filter.allYears}
          value={year}
          options={years}
          onChange={setYear}
        />
        <Filter
          label={text.filter.tool}
          all={text.filter.allTools}
          value={tool}
          options={tools}
          onChange={setTool}
        />
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setKind('');
              setYear('');
              setTool('');
            }}
          >
            {text.filter.reset}
          </Button>
        )}
        <div className="flex-1" />
        {shown.length > 0 && (
          <SelectionBar
            selection={selection}
            deleting={remove.isPending}
            onDelete={(ids) => remove.mutate(ids)}
          />
        )}
        <Button variant="ghost" onClick={() => setManaging(true)}>
          {text.options.manage}
        </Button>
      </div>
      <FormError error={remove.error} />

      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">{text.filter.empty}</p>
      ) : (
        <ol className="project-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              select={
                selection.active
                  ? {
                      checked: selection.isSelected(project.id),
                      onChange: () => selection.toggle(project.id),
                    }
                  : undefined
              }
            />
          ))}
        </ol>
      )}

      <OptionManager open={managing} onClose={() => setManaging(false)} settings={settings} />
    </>
  );
}

/** Projects as cards, filtered by kind, year and tool. */
export function PortfolioPage() {
  const projects = useProjects();
  const settings = useSettings();

  return (
    <>
      <PageHeader
        title={text.title}
        actions={
          <Link to="/portfolio/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {text.new}
          </Link>
        }
      />
      <QueryBoundary query={projects}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={PortfolioIcon} title={text.emptyTitle} body={text.emptyBody} />
          ) : (
            <QueryBoundary query={settings}>
              {(value) => <ProjectGrid projects={items} settings={value} />}
            </QueryBoundary>
          )
        }
      </QueryBoundary>
    </>
  );
}

function ProjectEditor({ project }: { project?: Project }) {
  const navigate = useNavigate();
  const projects = useProjects();
  const settings = useSettings().data;
  const save = useSaveProject(project?.id);
  const remove = useRemoveProject();
  const back = () => void navigate({ to: '/portfolio' });

  return (
    <>
      <PageHeader title={project ? project.title : text.new} />
      <QueryBoundary query={projects}>
        {(all) => (
          <ProjectForm
            project={project}
            nextSortOrder={Math.max(0, ...all.map((p) => p.sort_order)) + 1}
            kinds={settings?.project_kinds ?? []}
            tools={settings?.project_tools ?? []}
            saving={save.isPending}
            error={save.error ?? remove.error}
            onCancel={back}
            onSubmit={(input) => save.mutate(input, { onSuccess: back })}
            extra={
              project && (
                <ConfirmButton
                  label={t.common.delete}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(project.id, { onSuccess: back })}
                />
              )
            }
          />
        )}
      </QueryBoundary>
    </>
  );
}

export function ProjectNewPage() {
  return <ProjectEditor />;
}

export function ProjectEditPage() {
  const { projectId = '' } = useParams({ strict: false });
  const project = useProject(projectId);

  return (
    <QueryBoundary query={project}>
      {(value) => <ProjectEditor key={value.id} project={value} />}
    </QueryBoundary>
  );
}
