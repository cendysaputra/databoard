import { Link } from '@tanstack/react-router';
import { addDays, endOfMonth, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Overview } from '@/shared/types';
import { NotesIcon } from '@/shared/ui/icons';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { formatDayMonth, formatLongDate } from '@/shared/utils/date';
import {
  overviewBuckets,
  useCollections,
  useEventsBetween,
  useOverview,
  useRecentNotes,
} from './api';
import { CategoryCard } from './components/CategoryCard';
import { MiniCalendar } from './components/MiniCalendar';
import { NotesChart } from './components/NotesChart';
import { ScheduleChart } from './components/ScheduleChart';
import { StatusBars } from './components/StatusBars';
import { Timeline } from './components/Timeline';

const text = t.home;

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 11) return text.greeting.morning;
  if (hour < 15) return text.greeting.midday;
  if (hour < 19) return text.greeting.afternoon;
  return text.greeting.night;
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Round "+" button that opens a small menu of things to create. */
function AddMenu() {
  const links = [
    { to: '/calendar/new', label: t.calendar.new },
    { to: '/notes/new', label: t.notes.new },
    { to: '/portfolio/new', label: t.portfolio.new },
    { to: '/collections/new', label: t.collections.new },
  ] as const;

  return (
    <details className="group relative">
      <summary
        aria-label={text.add}
        title={text.add}
        className="flex size-12 cursor-pointer list-none items-center justify-center rounded-full bg-accent text-accent-contrast transition-[rotate] group-open:rotate-45 [&::-webkit-details-marker]:hidden"
      >
        <Plus aria-hidden className="size-5" />
      </summary>
      <div className="absolute top-14 right-0 z-10 w-44 rounded-md border border-border bg-surface p-1.5 shadow-xl">
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
  const collections = useCollections().data ?? [];
  const eventsAhead = overview.events_per_day.reduce((sum, n) => sum + n, 0);

  return (
    <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pt-2 pb-6">
      <CategoryCard
        art={0}
        name={t.nav.calendar}
        detail={text.counts.events(eventsAhead)}
        link={{ to: '/calendar' }}
      />
      <CategoryCard
        art={1}
        name={t.nav.notes}
        detail={text.counts.notes(overview.notes_total)}
        link={{ to: '/notes' }}
      />
      <CategoryCard
        art={2}
        name={t.nav.portfolio}
        detail={text.counts.projects(overview.projects_total)}
        link={{ to: '/portfolio' }}
      />
      {collections.map((collection, index) => (
        <CategoryCard
          key={collection.id}
          art={index + 3}
          name={collection.name}
          detail={t.collections.entryCount(collection.entry_count)}
          link={{ to: '/collections/$collectionId', params: { collectionId: collection.id } }}
        />
      ))}
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
          <ul className="grid grid-cols-2 gap-x-8 gap-y-5">
            {items.map((note) => (
              <li key={note.id} className="relative flex items-center gap-4">
                <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-sm rounded-tr-[1.1rem] bg-surface-hover text-muted">
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

function CalendarColumn({ overview, today }: { overview: Overview; today: Date }) {
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState<Date | null>(null);

  // The grid starts on the Monday on or before the 1st and covers whole weeks.
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const lastDay = endOfMonth(month);
  const weeks = Math.ceil((Math.round((+lastDay - +gridStart) / 86_400_000) + 1) / 7);
  const monthEvents = useEventsBetween(gridStart, addDays(gridStart, weeks * 7)).data ?? [];

  const onDay = (day: Date) => monthEvents.filter((e) => isSameDay(new Date(e.start_at), day));
  const dayEvents = selected ? onDay(selected) : [];

  return (
    <aside className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">{text.calendar.title}</h2>
      <MiniCalendar
        month={month}
        gridStart={gridStart}
        weeks={weeks}
        today={today}
        selected={selected}
        hasEvents={(day) => onDay(day).length > 0}
        onMonthChange={setMonth}
        onSelect={(day) => setSelected(selected && isSameDay(day, selected) ? null : day)}
      />
      <div>
        <p className="mb-4 text-sm font-medium text-muted">
          {selected ? formatLongDate(selected) : text.calendar.upcoming}
        </p>
        {selected ? (
          <Timeline events={dayEvents} showDate={false} empty={text.calendar.emptyDay} />
        ) : (
          <Timeline events={overview.next_events} showDate empty={text.calendar.emptyUpcoming} />
        )}
      </div>
    </aside>
  );
}

function HomeView({ overview, now }: { overview: Overview; now: Date }) {
  const { days, weeks } = overviewBuckets(now);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_19rem] gap-14">
      <div className="flex min-w-0 flex-col gap-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl leading-tight font-semibold">{greeting(now)} 👋</h1>
            <p className="mt-2 text-muted">{formatLongDate(now)}</p>
          </div>
          <AddMenu />
        </div>

        <Section title={text.browse}>
          <Categories overview={overview} />
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
          title={text.schedule.title}
          aside={<p className="text-xs text-muted">{text.schedule.caption}</p>}
        >
          <ScheduleChart days={days} counts={overview.events_per_day} />
        </Section>

        <div className="grid grid-cols-2 gap-10">
          <Section title={text.notes.title}>
            <NotesChart weeks={weeks.slice(0, -1)} counts={overview.notes_per_week} />
          </Section>
          <Section title={text.projects.title}>
            <StatusBars
              rows={[
                { label: t.portfolio.status.published, count: overview.projects_published },
                { label: t.portfolio.status.draft, count: overview.projects_draft },
                { label: t.portfolio.status.archived, count: overview.projects_archived },
              ]}
            />
          </Section>
        </div>
      </div>

      <CalendarColumn overview={overview} today={now} />
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
