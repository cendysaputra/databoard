import { t } from '@/shared/i18n/id';

/** Shows why saving failed, using the message from the data source. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = (error as { message?: string }).message;
  return (
    <p role="alert" className="text-danger">
      {t.common.error}
      {message && `: ${message}`}
    </p>
  );
}
