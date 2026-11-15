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

## Rilis dan pembaruan

Versi app ada di satu tempat: `version` di `Cargo.toml` (workspace). Alur rilis:

1. Ubah `version` di `Cargo.toml`, commit.
2. `git tag vX.Y.Z` lalu `git push --tags`.
3. Workflow `.github/workflows/release.yml` membangun MSI (berisi app dan `mcp-server.exe`),
   menandatangani pembaruan, dan mengunggahnya ke GitHub Release bersama `latest.json`.

App yang terpasang mengecek `latest.json` saat dibuka dan sekali sehari, lalu menampilkan
banner "Versi baru tersedia". Pembaruan baru dipasang setelah tombolnya ditekan.

GitHub Secrets yang dibutuhkan workflow:

| Secret                               | Isi                                                     |
| ------------------------------------ | ------------------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | Isi file private key updater (jangan pernah di-commit)  |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password key itu; kosong bila key dibuat tanpa password |
| `DATABOARD_GOOGLE_CLIENT_ID`         | Opsional, untuk unggah ke Google Drive                  |
| `DATABOARD_GOOGLE_CLIENT_SECRET`     | Opsional, untuk unggah ke Google Drive                  |

Public key pasangannya ada di `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). Kalau
key diganti (`npx tauri signer generate -w <file>`), app yang sudah terpasang dengan key lama
tidak bisa lagi menerima pembaruan, jadi ganti hanya sebelum rilis pertama.

Build installer di komputer sendiri: set `TAURI_SIGNING_PRIVATE_KEY` (dan password-nya), lalu
`npm run build:app`. MSI belum ditandatangani dengan sertifikat code signing, sehingga Windows
SmartScreen menampilkan "Unknown publisher"; lihat catatan di awal file workflow.

## Google Drive (unggah rekaman)

Unggah rekaman ke Google Drive hanya ada di app desktop dan butuh OAuth client milik
pembuat build (tipe **Desktop app**, scope `drive.file`). Kredensialnya dibaca dari
environment, saat build atau saat dijalankan:

```
DATABOARD_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
DATABOARD_GOOGLE_CLIENT_SECRET=...
```

Tanpa keduanya, app tetap jalan dan halaman Rekam layar menampilkan "Google Drive belum
diatur". Jangan commit nilainya; untuk rilis, simpan sebagai GitHub Secrets. Token login
pengguna disimpan di Windows Credential Manager, bukan di database.

## Lisensi

[MIT](LICENSE)
