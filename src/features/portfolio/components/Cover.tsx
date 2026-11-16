import { cn } from '@/shared/utils/cn';
import { useCoverUrl } from '../api';

interface CoverProps {
  /** The stored cover of a project; nothing is drawn without one. */
  path: string | null;
  alt: string;
  className?: string;
}

/** A project's cover image in a 16:9 frame. The frame keeps its place while the image loads. */
export function Cover({ path, alt, className }: CoverProps) {
  const url = useCoverUrl(path).data;
  if (!path) return null;

  return (
    <div className={cn('aspect-video overflow-hidden rounded-sm bg-surface-hover', className)}>
      {url && <img src={url} alt={alt} className="size-full object-cover" />}
    </div>
  );
}
