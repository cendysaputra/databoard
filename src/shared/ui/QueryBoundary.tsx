import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import { Button } from './Button';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  children(data: T): ReactNode;
}

/** Shows the loading and error states of a query; renders children once data is there. */
export function QueryBoundary<T>({ query, children }: QueryBoundaryProps<T>) {
  if (query.isPending) return <p className="text-muted">{t.common.loading}</p>;
  if (query.isError) {
    const message = (query.error as { message?: string }).message ?? '';
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-danger">
          {t.common.error}
          {message && `: ${message}`}
        </p>
        <Button onClick={() => query.refetch()}>{t.common.retry}</Button>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}
