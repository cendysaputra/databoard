import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CalendarView = 'list' | 'month';
export type EventGrouping = 'day' | 'week' | 'month';

interface CalendarViewState {
  view: CalendarView;
  grouping: EventGrouping;
  setView(view: CalendarView): void;
  setGrouping(grouping: EventGrouping): void;
}

/** How the calendar page is shown; remembered so it survives opening an event and coming back. */
export const useCalendarView = create<CalendarViewState>()(
  persist(
    (set) => ({
      view: 'list',
      grouping: 'day',
      setView: (view) => set({ view }),
      setGrouping: (grouping) => set({ grouping }),
    }),
    { name: 'databoard.calendar.v1' },
  ),
);
