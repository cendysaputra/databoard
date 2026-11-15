import { Link } from '@tanstack/react-router';
import { addDays, endOfMonth, isSameDay, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Overview } from '@/shared/types';
import { NotesIcon } from '@/shared/ui/icons';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { cn } from '@/shared/utils/cn';
import {
  formatDayMonth,
  formatDayMonthYear,
  formatLongDate,
  formatWeekdayLong,
} from '@/shared/utils/date';
import { overviewBuckets, useEventsBetween, useOverview, useRecentNotes, useSettings } from './api';
import { CategoryCard } from './components/CategoryCard';
import { DayTimeline } from './components/DayTimeline';
import { MiniCalendar } from './components/MiniCalendar';
import { NextEventCard } from './components/NextEventCard';
import { ScheduleChart } from './components/ScheduleChart';
import { Timeline } from './components/Timeline';

const text = t.home;

/** A greeting picked at random; it does not follow the time of day. */
function randomGreeting(): string {
  const options = text.greetings;
  return options[Math.floor(Math.random() * options.length)] ?? '';
}

/** What to call the user: the nickname, else the first word of the name. */
function useGreetingName(): string {
  const settings = useSettings().data;
  return settings?.profile_nickname || settings?.profile_name.split(' ')[0] || '';
}

function Section({
  title,
  aside,
  framed = false,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  /** Draws the section as a bordered panel, heading included. */
  framed?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn('dashboard-section', framed && 'dashboard-panel')}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Square "+" button beside the greeting; opens a small menu of things to create. */
function AddMenu() {
  const links = [
    { to: '/calendar/new', label: t.calendar.new },
    { to: '/notes/new', label: t.notes.new },
    { to: '/portfolio/new', label: t.portfolio.new },
  ] as const;

  return (
    <details className="group relative shrink-0">
      <summary
        aria-label={text.add}
        title={text.add}
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-sm bg-accent text-accent-contrast transition-[rotate] group-open:rotate-45 [&::-webkit-details-marker]:hidden"
      >
        <Plus aria-hidden className="size-5" />
      </summary>
      <div className="absolute top-14 right-0 z-20 w-44 rounded-md border border-border bg-surface p-1.5 shadow-xl">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="block rounded-sm px-3 py-2 text-sm transition-colors hover:bg-surface-hover"
          >
            {label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function Categories({ overview }: { overview: Overview }) {
  const eventsAhead = overview.events_per_day.reduce((sum, n) => sum + n, 0);

  return (
    <div className="category-grid">
      <CategoryCard
        art={0}
        name={t.nav.calendar}
        stat={eventsAhead}
        caption={text.counts.events}
        link={{ to: '/calendar' }}
      />
      <CategoryCard
        art={1}
        name={t.nav.notes}
        stat={overview.notes_total}
        caption={text.counts.notes}
        link={{ to: '/notes' }}
      />
      <CategoryCard
        art={2}
        name={t.nav.portfolio}
        stat={overview.projects_total}
        caption={text.counts.projects}
        link={{ to: '/portfolio' }}
      />
    </div>
  );
}

function RecentNotes() {
  const notes = useRecentNotes();

  return (
    <QueryBoundary query={notes}>
      {(items) =>
        items.length === 0 ? (
          <p className="text-sm text-muted">{text.recent.empty}</p>
        ) : (
          <ul className="recent-notes grid grid-cols-2 gap-x-8 gap-y-5">
            {items.map((note) => (
              <li key={note.id} className="recent-note relative flex items-center gap-4">
                <span className="note-glyph flex h-14 w-11 shrink-0 items-center justify-center rounded-sm rounded-tr-[1.1rem] bg-surface-hover text-muted">
                  <NotesIcon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">
                    {formatDayMonth(note.updated_at)}
                  </span>
                  <Link
                    to="/notes/$noteId"
                    params={{ noteId: note.id }}
                    className="line-clamp-2 font-semibold after:absolute after:inset-0"
                  >
                    {note.title}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )
      }
    </QueryBoundary>
  );
}

interface CalendarColumnProps {
  overview: Overview;
  now: Date;
  selected: Date;
  onSelect(day: Date): void;
}

function CalendarColumn({ overview, now, selected, onSelect }: CalendarColumnProps) {
  const [month, setMonth] = useState(now);

  // The grid starts on the Monday on or before the 1st and covers whole weeks.
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const lastDay = endOfMonth(month);
  const weeks = Math.ceil((Math.round((+lastDay - +gridStart) / 86_400_000) + 1) / 7);
  const monthEvents = useEventsBetween(gridStart, addDays(gridStart, weeks * 7)).data ?? [];

  return (
    <aside className="calendar-column" aria-label={text.calendar.title}>
      <div className="calendar-widget">
        <h2 className="mb-5 text-base font-semibold">{text.calendar.title}</h2>
        <MiniCalendar
          month={month}
          gridStart={gridStart}
          weeks={weeks}
          today={now}
          selected={selected}
          hasEvents={(day) => monthEvents.some((e) => isSameDay(new Date(e.start_at), day))}
          onMonthChange={setMonth}
          onSelect={onSelect}
        />
      </div>
      <div className="calendar-events">
        <NextEventCard event={overview.next_events[0]} now={now} />
        <div className="calendar-agenda">
          <p className="mb-1 text-xs font-medium text-muted">{text.calendar.upcoming}</p>
          <Timeline
            events={overview.next_events.slice(1)}
            showDate
            empty={text.calendar.emptyUpcoming}
          />
        </div>
      </div>
    </aside>
  );
}

function HomeView({ overview, now }: { overview: Overview; now: Date }) {
  const name = useGreetingName();
  const { days } = overviewBuckets(now);
  const [greeting] = useState(randomGreeting);
  // The day shown on the timeline; picked in the calendar, today by default.
  const [selected, setSelected] = useState(now);
  const dayStart = startOfDay(selected);
  const dayEvents = (useEventsBetween(dayStart, addDays(dayStart, 1)).data ?? []).filter((e) =>
    isSameDay(new Date(e.start_at), selected),
  );
  const isToday = isSameDay(selected, now);

  return (
    <div className="dashboard-grid">
      <div className="dashboard-primary flex min-w-0 flex-col gap-9">
        <div className="dashboard-greeting flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl leading-tight font-semibold">
              {greeting}
              {name && `, ${name}`}
            </h1>
            <p className="mt-2 text-muted">{formatLongDate(now)}</p>
          </div>
          <AddMenu />
        </div>

        <Section title={text.browse}>
          <Categories overview={overview} />
        </Section>

        <Section
          title={
            <>
              <span className="font-normal text-muted">
                {isToday ? text.today : formatWeekdayLong(selected)},
              </span>{' '}
              {formatDayMonthYear(selected)}
            </>
          }
        >
          <DayTimeline day={selected} events={dayEvents} now={now} />
        </Section>

        <Section
          title={text.recent.title}
          aside={
            <Link to="/notes" className="text-sm text-muted transition-colors hover:text-text">
              {text.recent.all}
            </Link>
          }
        >
          <RecentNotes />
        </Section>

        <Section
          framed
          title={text.schedule.title}
          aside={<p className="text-xs text-muted">{text.schedule.caption}</p>}
        >
          <ScheduleChart days={days} counts={overview.events_per_day} />
        </Section>
      </div>

      <CalendarColumn
        overview={overview}
        now={now}
        selected={selected}
        // Picking the selected day again goes back to today.
        onSelect={(day) => setSelected(isSameDay(day, selected) ? now : day)}
      />
    </div>
  );
}

export function HomePage() {
  const [now] = useState(() => new Date());
  const overview = useOverview(now);

  return (
    <QueryBoundary query={overview}>
      {(value) => <HomeView overview={value} now={now} />}
    </QueryBoundary>
  );
}
