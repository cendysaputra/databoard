import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import type { Project } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PortfolioIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { useProject, useProjects, useRemoveProject, useSaveProject } from './api';
import { ProjectForm } from './components/ProjectForm';

/** Lists projects. Filters and cover images come later; adding and editing work now. */
export function PortfolioPage() {
  const projects = useProjects();

  return (
    <>
      <PageHeader
        title={t.portfolio.title}
        subtitle={t.portfolio.subtitle}
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
            <ol className="project-grid grid grid-cols-2 gap-5">
              {items.map((project, index) => (
                <li
                  key={project.id}
                  className="project-card relative flex gap-5 rounded-md border border-border p-6 transition-colors hover:bg-surface-hover/50"
                >
                  <span className="project-number flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-sm text-accent-text tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
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
                </li>
              ))}
            </ol>
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
