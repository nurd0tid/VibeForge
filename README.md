# KarsaDesk

KarsaDesk adalah local-first AI command center untuk kanban coding, OpenCode sessions, dan file kerja asli user seperti Google Docs, Google Sheets, Google Slides, dan Figma.

UI berjalan di `http://127.0.0.1:3456`. Orchestrator lokal berjalan di `http://127.0.0.1:4317` dan mengurus filesystem, Git, OpenCode, terminal, SQLite, dan sync NocoDB. Source code, path lokal, terminal log, raw agent event, dan diff tetap lokal.

## Fitur utama

- Browse project lokal lewat folder tree lokal; system folder dialog tersedia sebagai opsi sekunder.
- Kelola banyak repository Git dan banyak session paralel.
- Deteksi OpenCode dari awal, lalu load provider/model setelah project dipilih.
- Jalankan task Next, Selected, atau All dengan review gate.
- Review diff dan explicit merge; tidak auto-stash, tidak auto-merge.
- Connected Files per task:
  - connect Google Workspace OAuth atau Figma OAuth/PAT lokal;
  - cari/attach Google Docs/Sheets/Slides dari Drive;
  - attach Figma URL/file key dan sync metadata REST API;
  - tombol Open ke editor asli Google/Figma;
  - AI Assistant per connected file dengan preview/action history;
  - action history per task.
- Google Workspace modal adalah login-first: lihat file Drive, buat Docs/Sheets/Slides dari prompt, atau import file lokal ke Google Drive.

## Prasyarat

- Node.js 20.9+; Node 22 LTS direkomendasikan.
- Git tersedia di `PATH`.
- OpenCode direkomendasikan sebagai executor AI.
- NocoDB base + PAT server-side bila ingin sync cloud.

## Setup OpenCode

KarsaDesk tidak menginstall CLI dan tidak membaca credential provider. Install dan login dilakukan manual di terminal kamu sendiri.

```bash
opencode --version
opencode auth login
opencode auth list
opencode models
```

Jika binary tidak ada di `PATH`, isi `OPENCODE_BIN` di `.env.local`.

## Install dan jalan lokal

```bash
npm install
copy .env.example .env.local
npm run dev
```

macOS/Linux:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://127.0.0.1:3456`.

## NocoDB

Isi `.env.local`:

```env
NOCODB_BASE_URL=https://app.nocodb.com
NOCODB_WORKSPACE_ID=wfost257
NOCODB_BASE_ID=pfzvil4cr8t2529
NOCODB_API_TOKEN=your-new-server-side-pat
```

Jalankan:

```bash
npm run nocodb:setup
```

Migration idempotent dan hanya membuat tabel berprefix `vk_`.

## Coding project workflow

1. Klik **Add project**.
2. Klik **Browse folders** untuk folder tree lokal.
3. Pilih folder, klik **Use this folder**, lalu **Add repository**.
4. Buat task manual atau Smart Prompt.
5. Pindahkan task ke Ready.
6. Buat OpenCode session dengan provider/model.
7. Jalankan Next, Selected, atau All.
8. Review diff, request changes, atau explicit merge.

## Google/Figma Connected Files workflow

KarsaDesk bukan editor Word/Spreadsheet/Figma buatan sendiri. File asli tetap dibuka di `docs.google.com`, `sheets.google.com`, `slides.google.com`, atau `figma.com`.

1. Siapkan env Google/Figma di `.env.local`, restart `npm run dev`.
2. Buat/pilih task.
3. Buka task inspector.
4. Di **Connected Files**, klik **Connect** Google/Figma.
5. Untuk Google, search Drive lalu attach Docs/Sheets/Slides.
6. Untuk Figma, connect OAuth atau masukkan PAT lokal, lalu paste URL Figma dan klik **Attach original file**.
7. Klik **Open** untuk mengedit di aplikasi asli.
8. Tulis instruksi di **AI Assistant**, lalu klik **Ask AI / prepare preview**.
9. Riwayat action tersimpan di task.

MVP saat ini sudah memiliki account status, OAuth/PAT endpoint, token lokal terenkripsi, Google Drive listing, Google export context, Figma metadata/tree read, metadata sync, tombol Open, dan action history. Perubahan langsung ke file asli masih dibuat sebagai preview `needs_confirmation`; apply adapters per Docs/Sheets/Slides dan Figma Plugin bridge adalah tahap berikutnya supaya tidak merusak file user tanpa konfirmasi.

Env yang nanti dipakai:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:4317/api/connect/google/callback
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
FIGMA_OAUTH_REDIRECT_URI=http://127.0.0.1:4317/api/connect/figma/callback
FIGMA_PERSONAL_ACCESS_TOKEN=
```

### Google OAuth setup

Di Google Cloud Console:

1. Buat OAuth Client untuk aplikasi desktop/web lokal.
2. Tambahkan authorized redirect URI:
   `http://127.0.0.1:4317/api/connect/google/callback`
3. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`.
4. Pastikan API yang dibutuhkan aktif: Google Drive API, Google Docs API, Google Sheets API, Google Slides API.

Scope yang diminta KarsaDesk:

- `drive.file`
- `documents`
- `spreadsheets`
- `presentations`

Token disimpan terenkripsi di SQLite lokal (`VK_DATA_DIR`) dan tidak masuk browser bundle/NocoDB.

### Figma setup

Pilihan development paling cepat:

1. Buat Personal Access Token dari akun Figma.
2. Isi `FIGMA_PERSONAL_ACCESS_TOKEN` atau paste token di panel Connected Files.
3. Attach URL Figma di task, lalu klik **Sync** untuk metadata.

OAuth Figma juga disiapkan dengan redirect:
`http://127.0.0.1:4317/api/connect/figma/callback`

## Google Workspace modal

Klik **Google Docs** di header untuk workflow dokumen utama. KarsaDesk tidak lagi menjadikan local upload sebagai mode utama:

1. Login Google.
2. Lihat/search Google Docs, Sheets, dan Slides asli dari Drive.
3. Buat file baru dari prompt langsung di Google Docs/Sheets/Slides.
4. Jika punya file lokal `.docx/.xlsx/.pptx`, gunakan **Import file to Google** supaya file dikirim ke Google Drive dan dikonversi menjadi file Google asli.
5. Buka file di editor Google asli, lalu hubungkan ke task jika ingin AI action history/review.

## Data lokal

Default runtime data:

- `~/.karsadesk/karsadesk.sqlite`
- `~/.karsadesk/worktrees/`
- `~/.karsadesk/logs/`

Override:

```env
VK_DATA_DIR=
VK_WORKTREE_DIR=
```

Prefix env `VK_` tetap dipertahankan untuk kompatibilitas v1.

## Command

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm test
npm run test:e2e
npm run nocodb:setup
```

## Troubleshooting

- **Web masih ke port 3000:** stop proses Next lama dan jalankan dari folder ini; app memakai port 3456.
- **Browse folder tidak muncul:** klik **Browse...** untuk native OS picker atau **Folder tree** untuk fallback lokal.
- **OpenCode unavailable:** cek `opencode --version`, atau set `OPENCODE_BIN`.
- **No providers/models:** login provider di OpenCode lalu refresh project.
- **Cannot create session:** source worktree harus clean dan target branch harus sedang checked out.
- **Google/Figma belum bisa connect:** cek env OAuth/PAT, restart dev server, lalu cek status di Connected Files.
- **AI file action butuh confirmation:** ini normal; MVP membaca konteks dan menyiapkan preview, tidak menulis ke file asli tanpa apply adapter/konfirmasi.
