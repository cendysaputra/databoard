# DataBoard

Aplikasi desktop Windows pribadi (Tauri 2, offline-first): kalender + reminder, catatan meeting,
portfolio, dan MCP server. Rencana kerja lengkap ada di [PLAN.md](PLAN.md).

## Perintah

| Perintah                                                                            | Fungsi                                                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                                                                       | Preview UI di browser (`http://localhost:5173`), data contoh di IndexedDB |
| `npm run dev:app`                                                                   | Jalan sebagai app desktop dengan SQLite                                   |
| `npm run build` / `npm run build:app`                                               | Build frontend / build installer MSI                                      |
| `npm run lint` · `npm run typecheck`                                                | ESLint + Prettier · TypeScript                                            |
| `cargo fmt --all --check` · `cargo clippy --workspace --all-targets -- -D warnings` | Cek Rust                                                                  |
| `cargo test --workspace`                                                            | Tes Rust                                                                  |
| `npm run gen:types`                                                                 | Generate tipe TypeScript dari Rust ke `src/shared/types/`                 |

## Struktur

- `src/` — frontend React. `features/` per modul, `shared/` untuk yang dipakai bersama,
  `data/` adalah satu-satunya pintu ke backend (`tauri-source` atau `browser-source`).
- `crates/core/` — SQLite, migration, dan semua logika bisnis (`domain/`).
- `src-tauri/` — shell Tauri; command tipis yang memanggil `crates/core`.
- `mcp-server/` — binary MCP (stdio) yang memakai `crates/core` yang sama.

## Mengubah sesuatu

- Tampilan: edit `src/shared/styles/tokens.css`.
- Teks UI: edit `src/shared/i18n/id.ts`.
- Schema: tambah file baru di `crates/core/migrations/` dan daftarkan di
  `crates/core/src/db/migrations.rs`. Migration yang sudah rilis tidak boleh diedit.
- Tipe data: ubah struct Rust di `crates/core/src/domain/`, lalu `npm run gen:types`.
