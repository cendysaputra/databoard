import { useState, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent, Overview } from '@/shared/types';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth, formatTime, formatWeekday } from '@/shared/utils/date';
import { overviewBuckets, useOverview } from './api';
import { NotesChart } from './components/NotesChart';
import { ScheduleChart } from './components/ScheduleChart';
import { StatusBars } from './components/StatusBars';

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 11) return t.home.greeting.morning;
  if (hour < 15) return t.home.greeting.midday;
  if (hour < 19) return t.home.greeting.afternoon;
  return t.home.greeting.night;
}

function Section({
  title,
  caption,
  className,
  children,
}: {
  title: string;
  caption?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-xl leading-none font-semibold">{title}</h2>
        {caption && <p className="label">{caption}</p>}
      </div>
      {children}
    </section>
  );
}

function EventWhen({ event }: { event: CalendarEvent }) {
  return (
    <>
      {formatWeekday(event.start_at)} {formatDayMonth(event.start_at)}
    </>
  );
}

function OverviewView({ overview, now }: { overview: Overview; now: Date }) {
  const { days, weeks } = overviewBuckets(now);
  const eventsAhead = overview.events_per_day.reduce((sum, n) => sum + n, 0);
  const stats = [
    { label: t.home.stats.events, value: eventsAhead },
    { label: t.home.stats.reminders, value: overview.active_reminders },
    { label: t.home.stats.notes, value: overview.notes_total },
    { label: t.home.stats.projects, value: overview.projects_total },
  ];

  return (
    <div className="flex flex-col gap-12">
      <dl className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-md border border-border p-5">
            <dd className="text-3xl leading-none font-semibold tabular-nums">{value}</dd>
            <dt className="label mt-3">{label}</dt>
          </div>
        ))}
      </dl>

      <Section title={t.home.schedule.title} caption={t.home.schedule.caption}>
        <ScheduleChart days={days} counts={overview.events_per_day} />
      </Section>

      <div className="grid grid-cols-2 gap-12">
        <Section title={t.home.notes.title} caption={t.home.notes.caption}>
          <NotesChart weeks={weeks.slice(0, -1)} counts={overview.notes_per_week} />
        </Section>

        <Section title={t.home.projects.title}>
          <StatusBars
            rows={[
              { label: t.portfolio.status.published, count: overview.projects_published },
              { label: t.portfolio.status.draft, count: overview.projects_draft },
              { label: t.portfolio.status.archived, count: overview.projects_archived },
            ]}
          />
        </Section>
      </div>

      <Section title={t.home.next.title}>
        {overview.next_events.length === 0 ? (
          <p className="text-muted">{t.home.next.empty}</p>
        ) : (
          <Rows>
            {overview.next_events.map((event) => (
              <Row
                key={event.id}
                lead={<EventWhen event={event} />}
                trail={event.all_day ? t.calendar.allDay : formatTime(event.start_at)}
              >
                <span className="font-medium">{event.title}</span>
                {event.location && <span className="text-muted"> · {event.location}</span>}
              </Row>
            ))}
          </Rows>
        )}
      </Section>
    </div>
  );
}

export function HomePage() {
  const [now] = useState(() => new Date());
  const overview = useOverview(now);

  return (
    <>
      <h1 className="mb-8 text-2xl leading-none font-semibold">{greeting(now)}</h1>
      <QueryBoundary query={overview}>
        {(value) => <OverviewView overview={value} now={now} />}
      </QueryBoundary>
    </>
  );
}
