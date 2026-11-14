import { t } from '@/shared/i18n/id';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PortfolioIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { useProjects } from './api';

/** Phase 1 placeholder: lists projects. Grid, filters and the form come in phase 4. */
export function PortfolioPage() {
  const projects = useProjects();

  return (
    <>
      <PageHeader title={t.portfolio.title} subtitle={t.portfolio.subtitle} />
      <QueryBoundary query={projects}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon={PortfolioIcon}
              title={t.portfolio.emptyTitle}
              body={t.portfolio.emptyBody}
            />
          ) : (
            <ol className="grid grid-cols-2 gap-x-12">
              {items.map((project, index) => (
                <li key={project.id} className="flex gap-5 border-b border-border py-6">
                  <span className="w-8 shrink-0 font-display text-xl leading-none text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl leading-none">{project.title}</h2>
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
