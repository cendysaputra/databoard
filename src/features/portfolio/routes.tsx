import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useSelection } from '@/shared/hooks/use-selection';
import { t } from '@/shared/i18n/id';
import type { Project } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FormError } from '@/shared/ui/FormError';
import { PortfolioIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { SelectionBar } from '@/shared/ui/SelectionBar';
import {
  useProject,
  useProjects,
  useRemoveProject,
  useRemoveProjects,
  useSaveProject,
} from './api';
import { ProjectForm } from './components/ProjectForm';

/** The project cards, with the controls to delete several projects at once. */
function ProjectGrid({ projects }: { projects: Project[] }) {
  const selection = useSelection(projects.map((project) => project.id));
  const remove = useRemoveProjects();

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SelectionBar
          selection={selection}
          deleting={remove.isPending}
          onDelete={(ids) => remove.mutate(ids)}
        />
      </div>
      <FormError error={remove.error} />
      <ol className="project-grid grid grid-cols-2 gap-5">
        {projects.map((project, index) => (
          <li
            key={project.id}
            className="project-card relative flex gap-5 rounded-md p-6 transition-colors hover:bg-surface-hover/50"
          >
            <span className="project-number flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-sm text-accent-text tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl leading-snug font-semibold">
                <Link
                  to="/portfolio/$projectId"
                  params={{ projectId: project.id }}
                  className="after:absolute after:inset-0"
                >
                  {project.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">
                {[project.client, project.role].filter(Boolean).join(' · ')}
              </p>
              <p className="label mt-4">
                {[project.year, t.portfolio.status[project.status], ...project.stack]
                  .filter(Boolean)
                  .join(' / ')}
              </p>
            </div>
            {selection.active && (
              <input
                type="checkbox"
                aria-label={t.common.selectItem(project.title)}
                checked={selection.isSelected(project.id)}
                onChange={() => selection.toggle(project.id)}
                // Above the card's full-size link, so a click ticks the box instead of opening it.
                className="relative z-10 size-4 shrink-0 cursor-pointer accent-(--accent)"
              />
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

/** Lists projects. Filters and cover images come later; adding and editing work now. */
export function PortfolioPage() {
  const projects = useProjects();

  return (
    <>
      <PageHeader
        title={t.portfolio.title}
        actions={
          <Link to="/portfolio/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {t.portfolio.new}
          </Link>
        }
      />
      <QueryBoundary query={projects}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon={PortfolioIcon}
              title={t.portfolio.emptyTitle}
              body={t.portfolio.emptyBody}
            />
          ) : (
            <ProjectGrid projects={items} />
          )
        }
      </QueryBoundary>
    </>
  );
}

function ProjectEditor({ project }: { project?: Project }) {
  const navigate = useNavigate();
  const projects = useProjects();
  const save = useSaveProject(project?.id);
  const remove = useRemoveProject();
  const back = () => void navigate({ to: '/portfolio' });

  return (
    <>
      <PageHeader title={project ? project.title : t.portfolio.new} />
      <QueryBoundary query={projects}>
        {(all) => (
          <ProjectForm
            project={project}
            nextSortOrder={Math.max(0, ...all.map((p) => p.sort_order)) + 1}
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
