import { addDays, addHours, startOfDay } from 'date-fns';
import type {
  CalendarEvent,
  Collection,
  Entry,
  Note,
  Project,
  Reminder,
  Settings,
  Tag,
} from '@/shared/types';

export const defaultSettings: Settings = {
  app_name: 'DataBoard',
  accent_color: '#111111',
  accent_color_secondary: '#8c8c8c',
  theme: 'system',
  default_reminder_minutes: 10,
  backup_dir: null,
  profile_name: '',
  profile_nickname: '',
  profile_role: '',
};

export interface SeedData {
  events: CalendarEvent[];
  reminders: Reminder[];
  notes: Note[];
  projects: Project[];
  tags: Tag[];
  collections: Collection[];
  entries: Entry[];
}

/** [title, days from today, start hour, duration in hours (0 = all day), location] */
const eventRows: Array<[string, number, number, number, string | null]> = [
  ['Standup mingguan', 0, 9, 0.5, 'Google Meet'],
  ['Kickoff project website', 1, 10, 1, 'Google Meet'],
  ['Makan siang dengan klien', 1, 12, 1.5, 'Kopi Senja'],
  ['Review desain', 3, 14, 1, null],
  ['Sesi foto produk', 4, 9, 3, 'Studio'],
  ['Deadline proposal', 5, 0, 0, null],
  ['Presentasi progres', 7, 13, 1, 'Zoom'],
  ['Standup mingguan', 7, 9, 0.5, 'Google Meet'],
  ['Workshop konten', 8, 10, 2, null],
  ['Demo ke klien', 10, 15, 1, 'Zoom'],
  ['Retrospektif', 12, 16, 1, null],
];

export const seedTags: Tag[] = [
  { id: 'seed-tag-meeting', name: 'Meeting', color: null },
  { id: 'seed-tag-ide', name: 'Ide', color: null },
  { id: 'seed-tag-klien', name: 'Klien', color: null },
];

/** [title, body, created days ago, pinned, label id] */
const noteRows: Array<[string, string, number, boolean, string | null]> = [
  [
    'Meeting kickoff',
    '## Agenda\n\n- Scope\n- Timeline\n\n## Action Items\n\n- [ ] Kirim proposal',
    1,
    true,
    'seed-tag-meeting',
  ],
  [
    'Ide konten portfolio',
    'Tulis studi kasus untuk dua project terakhir.',
    3,
    false,
    'seed-tag-ide',
  ],
  ['Catatan review desain', 'Perbaiki hierarki tipografi.', 9, false, 'seed-tag-meeting'],
  ['Rencana kuartal', 'Tiga prioritas: portfolio, klien baru, belajar Rust.', 12, false, null],
  ['Notulen workshop', 'Peserta sepakat rilis bertahap.', 17, false, 'seed-tag-meeting'],
  ['Daftar bacaan', 'Buku tipografi dan desain editorial.', 30, false, 'seed-tag-ide'],
  ['Evaluasi bulan lalu', 'Dua project selesai tepat waktu.', 38, false, null],
  ['Brief klien baru', 'Butuh landing page dalam tiga minggu.', 45, false, 'seed-tag-klien'],
];

/** [title, client, years ago, role, stack, status] */
const projectRows: Array<[string, string | null, number, string, string[], Project['status']]> = [
  [
    'Website Kedai Kopi',
    'Kopi Senja',
    0,
    'Fullstack Developer',
    ['React', 'Tailwind CSS'],
    'published',
  ],
  ['Aplikasi Kasir', null, 1, 'Frontend Developer', ['Rust', 'Tauri'], 'draft'],
  ['Company Profile Arsitek', 'Studio Ruang', 0, 'Web Designer', ['Astro'], 'published'],
  ['Dashboard Penjualan', 'Toko Maju', 1, 'Fullstack Developer', ['React', 'SQLite'], 'published'],
  ['Katalog Batik', 'Batik Lestari', 2, 'Frontend Developer', ['Vue'], 'archived'],
  ['Landing Page Kursus', null, 0, 'Web Designer', ['Astro', 'Tailwind CSS'], 'draft'],
];

/** Example content for the browser preview, dated around today so it is always visible. */
export function createSeed(now = new Date()): SeedData {
  const stamp = now.toISOString();
  const meta = { created_at: stamp, updated_at: stamp };
  const at = (days: number, hour: number) =>
    addHours(addDays(startOfDay(now), days), hour).toISOString();

  const events: CalendarEvent[] = eventRows.map(([title, days, hour, hours, location], i) => ({
    id: `seed-event-${i + 1}`,
    title,
    description: null,
    location,
    start_at: at(days, hour),
    end_at: hours === 0 ? at(days + 1, 0) : at(days, hour + hours),
    all_day: hours === 0,
    color: null,
    ...meta,
  }));

  const notes: Note[] = noteRows.map(([title, body_md, daysAgo, pinned, label], i) => {
    const created = addDays(now, -daysAgo).toISOString();
    return {
      id: `seed-note-${i + 1}`,
      title,
      body_md,
      event_id: i === 0 ? 'seed-event-2' : null,
      project_id: null,
      pinned,
      note_date: created.slice(0, 10),
      status: i < 3 ? 'published' : 'draft',
      label_ids: label ? [label] : [],
      created_at: created,
      updated_at: created,
    };
  });

  const projects: Project[] = projectRows.map(
    ([title, client, yearsAgo, role, stack, status], i) => ({
      id: `seed-project-${i + 1}`,
      title,
      client,
      year: now.getFullYear() - yearsAgo,
      role,
      stack,
      url: null,
      repo_url: null,
      description_md: '',
      cover_path: null,
      status,
      sort_order: i + 1,
      ...meta,
    }),
  );

  const reminders: Reminder[] = [
    ['seed-event-2', at(1, 9.75), 'Kickoff project website 15 menit lagi'],
    ['seed-event-6', at(4, 9), 'Deadline proposal besok'],
    ['seed-event-10', at(10, 14), 'Demo ke klien 1 jam lagi'],
  ].map(([event_id, remind_at, message], i) => ({
    id: `seed-reminder-${i + 1}`,
    event_id: event_id ?? null,
    note_id: null,
    remind_at: remind_at ?? stamp,
    message: message ?? '',
    done_at: null,
    ...meta,
  }));

  const collections: Collection[] = [
    {
      id: 'seed-collection-1',
      name: 'Posts',
      slug: 'posts',
      description: 'Artikel blog.',
      fields: [
        {
          key: 'excerpt',
          label: 'Ringkasan',
          field_type: 'textarea',
          required: false,
          options: [],
        },
        { key: 'body', label: 'Isi', field_type: 'markdown', required: true, options: [] },
        {
          key: 'category',
          label: 'Kategori',
          field_type: 'select',
          required: false,
          options: ['Catatan', 'Tutorial', 'Kabar'],
        },
        {
          key: 'publish_date',
          label: 'Tanggal terbit',
          field_type: 'date',
          required: false,
          options: [],
        },
        { key: 'featured', label: 'Unggulan', field_type: 'toggle', required: false, options: [] },
      ],
      entry_count: 0,
      ...meta,
    },
  ];

  const entries: Entry[] = [
    {
      id: 'seed-entry-1',
      collection_id: 'seed-collection-1',
      title: 'Halo, DataBoard',
      status: 'published',
      data: {
        excerpt: 'Tulisan pertama di koleksi Posts.',
        body: '# Halo\n\nIni contoh entri. Ubah atau hapus sesukamu.',
        category: 'Kabar',
        publish_date: now.toISOString().slice(0, 10),
        featured: true,
      },
      ...meta,
    },
    {
      id: 'seed-entry-2',
      collection_id: 'seed-collection-1',
      title: 'Cara menyusun blueprint',
      status: 'draft',
      data: {
        body: 'Tambah field lewat tombol Edit blueprint.',
        category: 'Tutorial',
        featured: false,
      },
      ...meta,
    },
  ];

  return { events, reminders, notes, projects, tags: seedTags, collections, entries };
}
