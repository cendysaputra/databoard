# DataBoard Privacy Policy

Effective date: 17 November 2026

DataBoard is a desktop application for Windows. It runs on your computer and does not require
an account. This policy explains what data it handles and where that data goes.

## Data stored on your computer

Your calendar events, reminders, notes, labels, portfolio projects, profile (name, nickname
and role) and settings are stored in a local database on your computer. Screen recordings you
save are stored in your `Videos\DataBoard` folder.

The developer does not run a server for DataBoard and does not collect, receive, sell or share
this data. DataBoard contains no analytics, advertising or tracking.

## Google Drive (optional)

You can connect your Google account to upload screen recordings to Google Drive. If you do:

- DataBoard asks only for the `drive.file` permission. It can access only the files it creates
  itself and cannot see or change any other file in your Drive.
- It uses this permission for one purpose: uploading the recordings you choose to a
  `DataBoard` folder in your own Google Drive.
- It reads your Google account's email address only to show which account is connected. The
  address is not stored or sent anywhere else.
- The sign-in token is stored in your operating system's credential store (Windows Credential
  Manager). It is never sent to the developer.

You can disconnect at any time with the **Putuskan** (Disconnect) button on the screen
recording page, or by removing DataBoard's access at <https://myaccount.google.com/permissions>.
Files already uploaded stay in your Drive until you delete them.

DataBoard's use and transfer of information received from Google APIs adheres to the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the Limited Use requirements.

## Update checks

To tell you about new versions, DataBoard downloads a small file (`latest.json`) from this
project's GitHub Releases when it starts and about once a day. This request contains no
personal data, but like any web request it is received by GitHub, which sees your IP address.

## AI assistants (optional)

DataBoard includes an MCP server that lets an AI assistant you set up yourself, such as Claude
Desktop, read and change your DataBoard data. Nothing is shared unless you configure this.
Once you do, how the assistant handles that data is governed by the assistant provider's own
privacy policy.

## Changes and contact

Changes to this policy are published in this file. Questions can be asked by opening an issue
at <https://github.com/cendysaputra/databoard/issues>.

---

## Ringkasan dalam Bahasa Indonesia

- Semua datamu (event, pengingat, catatan, label, project, profil, pengaturan) disimpan di
  database lokal di komputermu. Rekaman layar disimpan di folder `Videos\DataBoard`.
- Pengembang tidak punya server untuk DataBoard dan tidak mengumpulkan, menerima, menjual, atau
  membagikan datamu. Tidak ada analitik, iklan, atau pelacakan.
- Google Drive bersifat opsional. Kalau disambungkan, DataBoard hanya bisa mengakses file yang
  dibuatnya sendiri, untuk mengunggah rekaman yang kamu pilih ke folder `DataBoard` di Drive-mu.
  Token login disimpan di Windows Credential Manager. Putuskan kapan saja lewat tombol
  **Putuskan** atau di <https://myaccount.google.com/permissions>.
- Untuk mengecek versi baru, DataBoard mengunduh file kecil dari GitHub saat dibuka dan sekitar
  sekali sehari. Permintaan itu tidak berisi data pribadi, tetapi GitHub melihat alamat IP-mu.
- Asisten AI (lewat MCP server) hanya bisa membaca atau mengubah datamu kalau kamu sendiri yang
  mengaturnya.
