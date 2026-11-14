import { addDays, addHours, startOfDay } from 'date-fns';
import type { CalendarEvent, Note, Project, Reminder, Settings } from '@/shared/types';

export const defaultSettings: Settings = {
  app_name: 'Dashboard',
  accent_color: '#4f46e5',
  theme: 'system',
  default_reminder_minutes: 10,
  backup_dir: null,
};

export interface SeedData {
  events: CalendarEvent[];
  reminders: Reminder[];
  notes: Note[];
  projects: Project[];
}

/** Example content for the browser preview, dated around today so it is always visible. */
export function createSeed(now = new Date()): SeedData {
  const stamp = now.toISOString();
  const meta = { created_at: stamp, updated_at: stamp };
  const at = (days: number, hour: number) =>
    addHours(addDays(startOfDay(now), days), hour).toISOString();

  const events: CalendarEvent[] = [
    {
      id: 'seed-event-1',
      title: 'Kickoff project website',
      description: 'Bahas scope dan timeline.',
      location: 'Google Meet',
      start_at: at(1, 10),
      end_at: at(1, 11),
      all_day: false,
      color: null,
      ...meta,
    },
    {
      id: 'seed-event-2',
      title: 'Review desain',
      description: null,
      location: null,
      start_at: at(3, 14),
      end_at: at(3, 15),
      all_day: false,
      color: null,
      ...meta,
    },
    {
      id: 'seed-event-3',
      title: 'Deadline proposal',
      description: null,
      location: null,
      start_at: at(5, 0),
      end_at: at(6, 0),
      all_day: true,
      color: null,
      ...meta,
    },
  ];

  const notes: Note[] = [
    {
      id: 'seed-note-1',
      title: 'Meeting kickoff',
      body_md: '## Agenda\n- Scope\n- Timeline\n\n## Action Items\n- [ ] Kirim proposal',
      event_id: 'seed-event-1',
      project_id: null,
      pinned: true,
      ...meta,
    },
    {
      id: 'seed-note-2',
      title: 'Ide konten portfolio',
      body_md: 'Tulis studi kasus untuk dua project terakhir.',
      event_id: null,
      project_id: null,
      pinned: false,
      ...meta,
    },
  ];

  const projects: Project[] = [
    {
      id: 'seed-project-1',
      title: 'Website Kedai Kopi',
      client: 'Kopi Senja',
      year: now.getFullYear(),
      role: 'Fullstack Developer',
      stack: ['React', 'Tailwind CSS'],
      url: null,
      repo_url: null,
      description_md: 'Landing page dan menu online.',
      cover_path: null,
      status: 'published',
      sort_order: 1,
      ...meta,
    },
    {
      id: 'seed-project-2',
      title: 'Aplikasi Kasir',
      client: null,
      year: now.getFullYear() - 1,
      role: 'Frontend Developer',
      stack: ['Rust', 'Tauri'],
      url: null,
      repo_url: null,
      description_md: '',
      cover_path: null,
      status: 'draft',
      sort_order: 2,
      ...meta,
    },
  ];

  const reminders: Reminder[] = [
    {
      id: 'seed-reminder-1',
      event_id: 'seed-event-1',
      note_id: null,
      remind_at: at(1, 9.75),
      message: 'Kickoff project website 15 menit lagi',
      done_at: null,
      ...meta,
    },
  ];

  return { events, reminders, notes, projects };
}
