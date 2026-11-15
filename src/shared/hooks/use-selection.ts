import { useState } from 'react';

/** Which items of a list are picked, for actions on several items at once. */
export interface Selection {
  /** Whether the list is in selection mode, with a checkbox on every item. */
  active: boolean;
  /** Picked ids that still exist, in list order. */
  selected: string[];
  allSelected: boolean;
  isSelected(id: string): boolean;
  toggle(id: string): void;
  /** Picks every item, or clears the picks when all are picked already. */
  toggleAll(): void;
  start(): void;
  /** Leaves selection mode and forgets the picks. */
  stop(): void;
}

/** Selection state for the list whose current item ids are `ids`. */
export function useSelection(ids: string[]): Selection {
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  // Ids of items that were removed since they were picked drop out here.
  const selected = ids.filter((id) => picked.has(id));
  const allSelected = ids.length > 0 && selected.length === ids.length;

  return {
    active,
    selected,
    allSelected,
    isSelected: (id) => picked.has(id),
    toggle: (id) =>
      setPicked((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    toggleAll: () => setPicked(allSelected ? new Set() : new Set(ids)),
    start: () => setActive(true),
    stop: () => {
      setActive(false);
      setPicked(new Set());
    },
  };
}
