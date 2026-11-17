import type { Selection } from '@/shared/hooks/use-selection';
import { t } from '@/shared/i18n/id';
import { Button } from './Button';
import { ConfirmButton } from './ConfirmButton';

interface SelectionBarProps {
  selection: Selection;
  /** True while a delete is running; the delete button waits. */
  deleting: boolean;
  onDelete(ids: string[]): void;
}

/**
 * Controls for deleting several list items at once. It starts as a single "Pilih" button;
 * in selection mode it shows the count, select all, delete (asked twice) and done.
 */
export function SelectionBar({ selection, deleting, onDelete }: SelectionBarProps) {
  if (!selection.active) {
    return (
      <Button variant="ghost" onClick={selection.start}>
        {t.common.select}
      </Button>
    );
  }

  const count = selection.selected.length;
  return (
    <div className="selection-bar flex flex-wrap items-center gap-2">
      <span aria-live="polite" className="mr-1 text-xs text-muted tabular-nums">
        {t.common.selectedCount(count)}
      </span>
      <Button onClick={selection.toggleAll}>
        {selection.allSelected ? t.common.unselectAll : t.common.selectAll}
      </Button>
      <ConfirmButton
        label={t.common.delete}
        disabled={count === 0 || deleting}
        onConfirm={() => onDelete(selection.selected)}
      />
      <Button variant="ghost" onClick={selection.stop}>
        {t.common.done}
      </Button>
    </div>
  );
}
