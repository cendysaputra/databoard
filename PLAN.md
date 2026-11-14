# PLAN — Personal Dashboard (Windows, Tauri 2)

> Dokumen ini adalah instruksi kerja untuk AI agent. Ikuti fase secara berurutan.
> Setelah tiap fase selesai: jalankan semua cek di "Definition of Done" fase itu, lalu BERHENTI dan laporkan hasil sebelum lanjut ke fase berikutnya.
> Sebelum menulis konfigurasi Tauri, cek dokumentasi resmi Tauri 2 terbaru (v2.tauri.app). Jangan mengandalkan ingatan untuk nama field config atau nama plugin.

---

## 1. Tujuan

Aplikasi desktop Windows pribadi (single user, offline-first) berisi 4 modul:

1. **Kalender + Reminder**: event, pengingat, notifikasi native Windows.
2. **Notes Meeting**: catatan markdown, bisa ditautkan ke event kalender.
3. **Portfolio**: data karya/project (judul, klien, tahun, stack, link, cover, deskripsi).
4. **MCP Server**: AI (Claude Desktop / Claude Code) bisa membaca dan menulis data dashboard.

Di luar scope sekarang: mobile app, sync cloud, multi-user, login. Tapi schema harus siap untuk sync nanti (lihat bagian 6).

---

## 2. Prinsip Wajib

### 2.1 Ringan
- RAM idle saat diminimize ke tray harus sangat kecil: **window dan WebView dihancurkan saat ditutup ke tray**. Scheduler reminder tetap jalan di proses Rust.
- Lazy-load per route. Tiap modul jadi chunk terpisah.
- Dilarang memakai: UI kit besar (MUI, Ant, Chakra), moment.js, Monaco, lodash full, library animasi (framer-motion, GSAP).
- Data diquery dan difilter di Rust. Frontend menerima hasil jadi. List panjang dipaginasi.
- Profil release di `Cargo.toml`:
  ```toml
  [profile.release]
  opt-level = "s"
  lto = true
  codegen-units = 1
  strip = true
  panic = "abort"
  ```

### 2.2 Clean code
- Struktur **feature-based**. Fitur tidak saling import langsung. Yang dipakai bersama masuk `shared/`.
- `#[tauri::command]` harus tipis: validasi input → panggil fungsi di `domain/` → return. Logika bisnis HANYA di `domain/`, supaya bisa dipakai ulang oleh MCP server.
- Tipe Rust → TypeScript digenerate otomatis (`specta` + `tauri-specta`, atau `ts-rs`). Jangan menulis tipe dua kali.
- Schema hanya diubah lewat file migration SQL bernomor. Tidak boleh ada ALTER manual.
- Tooling: ESLint + Prettier (TS), `cargo fmt` + `cargo clippy -- -D warnings` (Rust). Semua harus lolos di tiap fase.
- TypeScript `strict: true`. Tanpa `any`.

### 2.3 Tampilan
- **Clean dan minimal.** Banyak ruang kosong, tipografi jelas, dan satu warna aksen.
- **Animasi minimal:** hanya CSS transition 150–200ms untuk hover, focus, buka/tutup panel, dan pergantian route (fade). Wajib menghormati `prefers-reduced-motion` (animasi mati).
- Dark mode dan light mode, mengikuti sistem secara default, plus toggle manual.
- Semua design token (warna, radius, spacing, font) ada di **satu file** `src/shared/styles/tokens.css` sebagai CSS variables, lalu dipetakan ke Tailwind. Mengganti tampilan cukup dengan mengedit file ini.
- Layout: sidebar kiri (ikon + label, bisa collapse), area konten kanan, dan command palette `Ctrl+K`.
- Ikon: `lucide-react`, import per ikon (tree-shake).

### 2.4 Mudah update konten
- Semua konten (event, notes, project) dikelola **lewat UI** (CRUD lengkap). Tidak ada konten yang di-hardcode.
- Teks UI statis (label, judul menu, pesan kosong) dikumpulkan di `src/shared/i18n/id.ts`, tidak tersebar di komponen.
- Pengaturan app (nama, aksen warna, jam default reminder, folder backup) diubah lewat halaman **Settings** dan disimpan di tabel `settings`.

---

## 3. Stack

| Bagian | Pilihan |
|---|---|
| Shell | Tauri 2 |
| Backend | Rust (stable) |
| Database | SQLite via `rusqlite` (feature `bundled`), migration via `rusqlite_migration` atau `refinery` |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS (v4) + CSS variables |
| Routing | TanStack Router (code-split per route) |
| State | Zustand (UI state) + TanStack Query (data dari backend) |
| Tanggal | date-fns |
| Editor notes | CodeMirror 6 (mode markdown), preview pakai `markdown-it` |
| Pencarian | SQLite FTS5 |
| Plugin Tauri | notification, autostart, updater, process, dialog, single-instance |
| Tray | Tray API bawaan Tauri 2 |
| MCP | crate `rmcp` (SDK MCP resmi Rust), transport stdio |

---

## 4. Struktur Folder

```
dashboard/
├─ src/                          # Frontend React
│  ├─ app/
│  │  ├─ router.tsx
│  │  ├─ layout/                 # Sidebar, Topbar, CommandPalette
│  │  └─ providers.tsx
│  ├─ features/
│  │  ├─ calendar/               # components/, hooks/, api.ts, routes.tsx
│  │  ├─ notes/
│  │  ├─ portfolio/
│  │  └─ settings/
│  ├─ shared/
│  │  ├─ ui/                     # Button, Input, Modal, Card, EmptyState (buatan sendiri)
│  │  ├─ styles/tokens.css
│  │  ├─ i18n/id.ts
│  │  ├─ utils/
│  │  └─ types/                  # hasil generate dari Rust
│  └─ data/
│     ├─ source.ts               # interface DataSource
│     ├─ tauri-source.ts         # implementasi via invoke()
│     ├─ browser-source.ts       # implementasi untuk preview web (lihat bagian 5)
│     └─ index.ts                # memilih source otomatis
├─ src-tauri/
│  ├─ src/
│  │  ├─ main.rs
│  │  ├─ lib.rs
│  │  ├─ db/                     # pool, migrations runner, backup
│  │  ├─ domain/                 # events.rs, reminders.rs, notes.rs, projects.rs, settings.rs
│  │  ├─ commands/               # wrapper tipis per domain
│  │  ├─ scheduler.rs            # loop reminder
│  │  ├─ tray.rs
│  │  └─ error.rs                # satu tipe AppError (thiserror) → serialize ke frontend
│  ├─ migrations/                # 001_init.sql, 002_..., dst
│  ├─ icons/
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ crates/
│  └─ core/                      # (opsional tapi disarankan) domain + db sebagai library
│                                #  dipakai bersama oleh src-tauri dan mcp-server
├─ mcp-server/                   # binary Rust terpisah
└─ package.json
```

> Disarankan: pindahkan `db/` + `domain/` ke crate `crates/core` (Cargo workspace), supaya `src-tauri` dan `mcp-server` memakai kode yang sama persis.

---

## 5. Preview di Browser Selama Development

Selama development, UI harus bisa dibuka di **browser biasa** (`npm run dev` → `http://localhost:5173`) tanpa build Windows.

Caranya, lewat **data layer dengan dua implementasi**:

```ts
// src/data/source.ts
export interface DataSource {
  events: { list(range): Promise<Event[]>; create(input): Promise<Event>; update(...); remove(id) };
  notes: { ... };
  projects: { ... };
  reminders: { ... };
  settings: { get(): Promise<Settings>; update(...) };
  notify(title: string, body: string): Promise<void>;
}
```

- `tauri-source.ts`: memanggil `invoke()` ke Rust.
- `browser-source.ts`: menyimpan data di **IndexedDB** (pakai `idb-keyval` atau `idb`), dengan seed data contoh. `notify()` memakai Web Notification API, atau toast in-app sebagai fallback.
- `index.ts`: deteksi otomatis dengan `isTauri()` dari `@tauri-apps/api/core`. Komponen hanya import dari `src/data`, tidak pernah langsung `invoke()`.

Script di `package.json`:

```json
{
  "scripts": {
    "dev": "vite",                 // preview di browser (data dummy IndexedDB)
    "dev:app": "tauri dev",        // jalan sebagai app Windows asli
    "build": "tsc && vite build",
    "build:app": "tauri build",
    "lint": "eslint . && prettier --check .",
    "typecheck": "tsc --noEmit"
  }
}
```

Fitur yang memang hanya ada di desktop (tray, autostart, notifikasi native, backup file) cukup ditampilkan sebagai no-op atau badge "desktop only" di mode browser. Mode browser tidak boleh crash.

---

## 6. Database

- Lokasi file: `app_data_dir()/dashboard.db` → `%APPDATA%\<identifier>\`. **Jangan** simpan di folder instalasi, supaya data aman saat update atau uninstall-reinstall.
- PRAGMA saat koneksi: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000` (penting karena MCP server mengakses file yang sama).
- Migration berjalan otomatis saat app start. **Sebelum menjalankan migration baru, salin dulu `dashboard.db` ke `backups/dashboard-<versi>-<tanggal>.db`.**
- Semua tabel memakai: `id TEXT PRIMARY KEY` (UUID v7), `created_at`, `updated_at`, `deleted_at` (soft delete).

### 001_init.sql (tabel)

- `projects`: id, title, client, year, role, stack (JSON array), url, repo_url, description_md, cover_path, status (`draft|published|archived`), sort_order, timestamps
- `events`: id, title, description, location, start_at, end_at, all_day, color, timestamps
- `reminders`: id, event_id (nullable FK), note_id (nullable FK), remind_at, message, done_at (nullable), timestamps
- `notes`: id, title, body_md, event_id (nullable FK), project_id (nullable FK), pinned, timestamps
- `tags`: id, name (unique), color
- `taggables`: tag_id, entity_type (`note|project`), entity_id
- `settings`: key (PK), value (JSON)
- `notes_fts`: virtual table FTS5 (title, body_md) beserta trigger sync

Gambar cover disimpan sebagai file di `app_data_dir()/media/`, sedangkan DB hanya menyimpan path relatifnya.

---

## 7. Installer Windows

### Format
- **MSI** (format installer bawaan Windows, via WiX yang dibundel Tauri).
- `tauri.conf.json` → `bundle.targets: ["msi"]`.
- WebView2: pakai mode default `downloadBootstrapper` supaya installer tetap kecil (Windows 10/11 umumnya sudah punya WebView2).
- Set `identifier` yang tetap dan unik sejak awal, misalnya `com.cendi.dashboard`. **Jangan pernah diubah** setelah rilis pertama, karena updater dan lokasi data bergantung padanya.
- Set `version` di satu tempat (`tauri.conf.json` atau `Cargo.toml`) dan ikuti semver.

### Keamanan
- Aktifkan **Content Security Policy** ketat di `tauri.conf.json` (tanpa `unsafe-eval`, tanpa remote script).
- **Capabilities/permissions Tauri 2:** izinkan hanya API yang dipakai. Jangan pakai wildcard.
- Tidak ada akses network dari frontend kecuali endpoint updater.
- Validasi semua input command di Rust. Query SQL wajib memakai parameter binding, tanpa string concat.
- **Code signing:** siapkan pipeline agar MSI bisa ditandatangani (Azure Trusted Signing atau sertifikat code signing). Tanpa signing, Windows SmartScreen akan menampilkan peringatan "Unknown publisher" saat install. Untuk pemakaian pribadi ini masih bisa diterima (klik "More info → Run anyway"), tapi buat konfigurasinya siap pakai supaya signing tinggal diaktifkan.

### Auto-update (supaya update ke depan nggak repot)
- Pakai `tauri-plugin-updater`.
- Generate keypair updater (`tauri signer generate`). **Private key jangan di-commit**, simpan di GitHub Secrets. Public key masuk ke `tauri.conf.json`.
- `bundle.createUpdaterArtifacts: true`.
- Endpoint updater: `latest.json` di **GitHub Releases** (repo privat atau publik).
- Alur di app: cek update saat start dan tiap 24 jam → tampilkan banner "Versi baru tersedia" → user klik → download → install → restart. Jangan pernah update diam-diam.
- **GitHub Actions** (`.github/workflows/release.yml`) memakai `tauri-apps/tauri-action`: push tag `v*` → build MSI → sign update → upload ke Release beserta `latest.json`.
- Alur rilis yang diharapkan: ubah versi → commit → `git tag vX.Y.Z` → push. Selesai.

---

## 8. MCP Server

- Binary terpisah `mcp-server`, transport **stdio**, memakai crate `core` yang sama.
- Path DB dibaca dari env `DASHBOARD_DB` atau argumen `--db`, dengan default lokasi `%APPDATA%` yang sama dengan app.
- Tools:
  - Kalender: `list_events(from, to)`, `create_event`, `update_event`, `delete_event`
  - Reminder: `list_reminders(upcoming)`, `create_reminder`, `complete_reminder`
  - Notes: `search_notes(query)`, `get_note(id)`, `create_note`, `update_note`
  - Portfolio: `list_projects(filter)`, `get_project(id)`, `create_project`, `update_project`
- Semua tool mengembalikan JSON ringkas. Delete hanya soft delete.
- MSI ikut menyertakan binary `mcp-server.exe` (lewat `bundle.externalBin` atau `resources`).
- Halaman Settings menampilkan snippet konfigurasi untuk Claude Desktop (`claude_desktop_config.json`) dan Claude Code, lengkap dengan path yang benar, plus tombol "Copy".

---

## 9. Fase Pengerjaan

### Fase 1 — Fondasi
- Init Tauri 2 + React + TS + Vite + Tailwind. Setup Cargo workspace (`src-tauri`, `crates/core`, `mcp-server`).
- ESLint, Prettier, clippy, rustfmt, TS strict.
- `tokens.css`, tema dark/light, layout sidebar + topbar, halaman kosong per modul, command palette kosong.
- Data layer (`DataSource`) dengan `browser-source` (IndexedDB + seed) dan `tauri-source`.
- SQLite + migration runner + backup sebelum migration + `001_init.sql`.

**DoD:** `npm run dev` jalan di browser dengan data dummy, `npm run dev:app` jalan sebagai app Windows dengan SQLite, lint, typecheck, dan clippy bersih.

### Fase 2 — Kalender + Reminder
- Tampilan bulan, minggu, dan agenda (dibuat sendiri dengan CSS grid, tanpa library kalender berat).
- CRUD event lewat modal/panel. Reminder per event (misalnya 10 menit sebelumnya, 1 jam, 1 hari, atau custom).
- `scheduler.rs`: loop tokio, cek reminder yang jatuh tempo, kirim notifikasi native, tandai sudah terkirim. Reminder yang terlewat saat app mati ditampilkan saat app dibuka.
- Tray: Open, Quick add event, Quit. Close window = sembunyikan ke tray dan hancurkan WebView. Autostart opsional di Settings. Single-instance.

**DoD:** reminder muncul sebagai notifikasi Windows walaupun window tertutup. Catat RAM idle (tray) dan RAM saat window terbuka di laporan.

### Fase 3 — Notes Meeting
- List + editor CodeMirror (markdown) + toggle preview. Autosave dengan debounce.
- Template "Meeting" (Agenda, Peserta, Catatan, Keputusan, Action Items).
- Tautkan note ke event. Baris action item `- [ ] ... @2026-11-20 09:00` bisa diubah jadi reminder.
- Pencarian full-text (FTS5), pin note, dan tag.

**DoD:** buat note dari event, cari note lewat kata kunci, action item jadi reminder.

### Fase 4 — Portfolio
- Grid dan list project, filter berdasarkan tag/stack/tahun/status, urutkan dengan drag atau sort_order.
- Form CRUD lengkap, upload cover (dikompres dan di-resize di Rust, disimpan di `media/`).
- Halaman detail project.

**DoD:** semua field bisa diedit lewat UI, gambar tampil, dan filter berjalan.

### Fase 5 — MCP Server
- Implementasi semua tools di bagian 8 memakai crate `core`.
- Halaman Settings: snippet konfigurasi + tombol copy.

**DoD:** dari Claude Desktop/Claude Code bisa membuat event dan mencari notes, dan perubahannya langsung terlihat di app (refresh data saat window fokus).

### Fase 6 — Export & Backup
- Export notes ke folder `.md`, export semua data ke JSON, export projects ke CSV.
- Backup manual (copy `.db`), backup otomatis mingguan ke folder yang dipilih, dan restore dari file backup.

**DoD:** export menghasilkan file yang bisa dibuka, dan restore dari backup berhasil.

### Fase 7 — Installer, Update, Polish
- Konfigurasi MSI, CSP, capabilities minimal, ikon app.
- Updater + GitHub Actions release workflow.
- Shortcut keyboard (`Ctrl+K`, `Ctrl+N`, `Ctrl+1..4` untuk pindah modul), empty state, error state.
- Audit ukuran: bundle JS per chunk, ukuran MSI, RAM.

**DoD:** install MSI di Windows bersih berhasil. Rilis `v0.1.1` lewat tag terdeteksi oleh app `v0.1.0` dan update berjalan tanpa data hilang. Laporkan ukuran MSI dan RAM.

---

## 10. Aturan untuk Agent

- Selalu tulis **file lengkap**, bukan potongan.
- Satu fase = satu PR atau satu kumpulan commit yang rapi. Pesan commit mengikuti format Conventional Commits.
- Jangan menambah dependency baru tanpa alasan tertulis di laporan fase (sebutkan ukuran dan alternatifnya).
- Kalau ada keputusan yang ambigu, pilih opsi yang paling ringan dan paling sederhana, lalu catat di laporan.
- Jangan mengubah `identifier` app, struktur folder data, atau migration yang sudah ada. Perubahan schema selalu lewat migration baru.
