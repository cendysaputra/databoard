import { FolderKanban } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
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
              icon={FolderKanban}
              title={t.portfolio.emptyTitle}
              body={t.portfolio.emptyBody}
            />
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
              {items.map((project) => (
                <li key={project.id}>
                  <Card className="flex h-full flex-col gap-1">
                    <span className="font-medium">{project.title}</span>
                    <span className="text-sm text-muted">
                      {[project.client, project.year].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-2 text-xs text-muted">
                      {t.portfolio.status[project.status]}
                      {project.stack.length > 0 && ` · ${project.stack.join(', ')}`}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </>
  );
}
