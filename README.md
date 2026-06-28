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
- Google Workspace adalah halaman kerja penuh: refresh/pilih file Drive, gunakan API text preview yang stabil atau Google visual preview, lalu chat dengan AI tanpa membuat task otomatis.
- Figma Workspace adalah halaman kerja penuh: connect OAuth/PAT, buka canvas embed, pilih provider/model, lalu diskusikan screen/flow baru sebelum membuat task secara eksplisit.

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
NOCODB_API_TOKEN=<new_server_side_pat>
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

## Google Workspace dan Figma setup

KarsaDesk memakai file asli user, bukan clone editor palsu. Google Docs/Sheets/Slides tetap dibuka di Google Workspace, dan Figma tetap dibuka di Figma. KarsaDesk bertugas menjadi agent layer: login/connect, attach file ke task, baca metadata/context, membuat prompt/action preview, menyimpan history, dan mengaitkan hasilnya ke kanban.

Secret provider hanya dipakai server-side oleh orchestrator lokal. Jangan pakai prefix `NEXT_PUBLIC_*` untuk token/client secret.

Isi `.env.local`:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:4317/api/connect/google/callback
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
FIGMA_OAUTH_REDIRECT_URI=http://127.0.0.1:4317/api/connect/figma/callback
FIGMA_PERSONAL_ACCESS_TOKEN=
```

Setelah mengubah env, restart dev server:

```bash
npm run dev
```

### Google Cloud OAuth setup

Gunakan langkah ini supaya tombol **Google Docs** dan **Connected Files → Google** bisa login ke Drive user.

Di Google Cloud Console:

1. Buka Google Cloud Console.
2. Buat atau pilih project.
3. Aktifkan API berikut:
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Google Slides API
     Pastikan API diaktifkan pada project yang sama dengan OAuth Client ID. Jika
     error menyebut project number tertentu, buka API Library menggunakan project
     number tersebut. Propagasi biasanya membutuhkan 2–10 menit; setelah itu
     reconnect Google dan tekan Retry.
4. Buka **APIs & Services → OAuth consent screen**.
5. Pilih mode sesuai kebutuhan:
   - **Testing** untuk lokal/private.
   - Tambahkan akun Google kamu sebagai test user jika masih testing.
6. Buka **Credentials → Create Credentials → OAuth client ID**.
7. Pilih **Web application**.
8. Tambahkan Authorized JavaScript origins:
   - `http://127.0.0.1:3456`
   - `http://localhost:3456`
9. Tambahkan Authorized redirect URI:
   `http://127.0.0.1:4317/api/connect/google/callback`
10. Copy client ID dan client secret ke `.env.local`:

```env
GOOGLE_CLIENT_ID=<google_client_id>
GOOGLE_CLIENT_SECRET=<google_client_secret>
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:4317/api/connect/google/callback
```

Scope yang diminta KarsaDesk:

- `drive.file`
- `documents`
- `spreadsheets`
- `presentations`

Token disimpan lokal di SQLite runtime (`VK_DATA_DIR`) dan tidak masuk browser bundle/NocoDB.

### Cara login dan memakai Google Workspace

Ada dua pintu Google:

1. Header **Google Docs** untuk document workflow utama.
2. Task inspector **Connected Files** untuk attach file Google ke task tertentu.

Workflow header **Google Docs**:

1. Klik **Google Docs** di header.
2. Klik login/connect Google jika status belum connected.
3. Setelah OAuth selesai, kembali ke KarsaDesk.
4. Search Google Docs/Sheets/Slides dari Drive.
5. Pilih file untuk dibuka di editor Google asli.
6. Buat file baru dari prompt jika ingin mulai dari nol.
7. Import `.docx/.xlsx/.pptx` lokal ke Google Drive agar menjadi Google Docs/Sheets/Slides asli.

Workflow per task:

1. Buat atau pilih task di kanban.
2. Buka task inspector.
3. Di **Connected Files**, klik **Connect Google**.
4. Search file Drive atau paste URL Google Docs/Sheets/Slides.
5. Klik attach.
6. Klik **Open** untuk edit di Google asli.
7. Pakai **AI Assistant** di connected file untuk membuat preview/action history.

### Figma setup — live

Figma sudah live di KarsaDesk untuk connect, attach file, baca metadata/tree context, membuka file asli, dan mengaitkan AI action ke task. Untuk keamanan, secret tetap server-side dan perubahan destruktif tetap harus lewat review/confirmation.

Ada dua cara connect Figma.

#### Opsi A — Personal Access Token, paling cepat untuk lokal

1. Buka Figma.
2. Masuk ke **Settings → Security**.
3. Buat **Personal access token**.
4. Pilih scope/read permission yang cukup untuk file metadata/content.
5. Gunakan salah satu cara:
   - isi env:

     ```env
     FIGMA_PERSONAL_ACCESS_TOKEN=<figma_personal_access_token>
     ```

   - atau paste PAT langsung di modal **Figma** / task inspector **Connected Files**.

6. Restart `npm run dev` jika token dimasukkan lewat `.env.local`.
7. Klik **Figma** di header, lalu **Connect PAT**.

#### Opsi B — Figma OAuth

1. Buka Figma Developer / OAuth app settings.
2. Buat OAuth app.
3. Tambahkan redirect URI:
   `http://127.0.0.1:4317/api/connect/figma/callback`
4. Copy client ID dan client secret ke `.env.local`:

```env
FIGMA_CLIENT_ID=<figma_client_id>
FIGMA_CLIENT_SECRET=<figma_client_secret>
FIGMA_OAUTH_REDIRECT_URI=http://127.0.0.1:4317/api/connect/figma/callback
```

5. Restart `npm run dev`.
6. Klik **Figma** di header.
7. Klik **Connect OAuth**.
8. Selesaikan login Figma di browser.

Scope Figma yang dipakai:

- `file_metadata:read`
- `file_content:read`

### Cara memakai Figma di KarsaDesk

Workflow header **Figma**:

1. Klik **Figma** di header.
2. Connect OAuth atau PAT.
3. Paste URL Figma:
   - `https://www.figma.com/design/<fileKey>/...`
   - `https://www.figma.com/file/<fileKey>/...`
   - `https://www.figma.com/proto/<fileKey>/...`
4. KarsaDesk membaca file key dari URL.
5. Canvas langsung tampil di halaman KarsaDesk.
6. Pilih provider/model OpenCode di header.
7. Pilih preset **Register**, **OTP verification**, **Forgot password**, atau **Complete auth flow**, atau tulis prompt sendiri.
8. Klik **Ask AI** untuk membaca tree Figma dan mendiskusikan frame, component, state, responsive behavior, dan prototype connection. Ini belum membuat task.
9. Setelah jawaban sesuai, klik **Create task from this answer** jika memang ingin memasukkannya ke kanban.

Workflow per task:

1. Buat atau pilih task desain.
2. Buka task inspector.
3. Di **Connected Files**, connect Figma OAuth/PAT jika belum connected.
4. Paste URL Figma dan klik **Attach original file**.
5. Klik **Sync** untuk metadata.
6. Klik **Open** untuk edit file asli di Figma.
7. Pakai **AI Assistant** untuk instruksi desain, review context, dan action history.

Yang sudah live:

- Account status untuk Figma.
- Figma OAuth endpoint.
- Figma PAT connect lokal.
- Attach Figma URL/file key ke task.
- Sync metadata via Figma REST API.
- Read Figma file summary/tree context.
- Tombol open ke Figma asli.
- AI action history per task/connected file.

Yang tetap dijaga:

- KarsaDesk tidak menaruh Figma token di browser bundle.
- KarsaDesk tidak auto-publish perubahan desain destruktif tanpa review.
- Jika nanti ada Figma plugin bridge/apply adapter, apply tetap harus lewat permission/confirmation.

## Google Workspace page

Klik **Google Docs** di header untuk workflow dokumen utama. KarsaDesk tidak lagi menjadikan local upload sebagai mode utama:

1. Login Google.
2. Gunakan **Refresh files** untuk mengambil ulang daftar Drive.
3. Klik kartu file; API text preview langsung tampil dan tidak bergantung pada login iframe. Gunakan **Google visual** bila ingin bentuk halaman asli.
4. Pilih provider/model OpenCode di header.
5. Tulis pertanyaan di panel kanan dan klik **Ask AI**. Percakapan tidak membuat task dan tidak mengubah file.
6. Klik **Create task from this answer** hanya bila percakapan sudah layak dijadikan pekerjaan kanban.
7. Untuk benar-benar menulis ke Google, buka **Prepare an actual Google change**, lalu review proposal dan klik explicit apply.
8. Apply aman bersifat non-destruktif: Docs append content, Sheets append rows, dan Slides menambah slide.
9. Jika punya file lokal `.docx/.xlsx/.pptx`, gunakan **Import file to Google** supaya file dikirim dan dikonversi menjadi file Google asli.

## Connected Files action behavior

Connected file AI action saat ini bersifat supervised:

- membaca metadata/context file;
- membuat preview/action history;
- mengaitkan hasil ke task;
- Google hanya ditulis setelah explicit confirmation; apply tidak menghapus konten lama.
- Figma REST hanya membaca metadata/tree. Pembuatan node canvas otomatis memerlukan Figma Plugin bridge.

Ini sengaja dibuat begitu supaya file kuliah, Google Workspace, dan Figma user tidak rusak oleh auto-apply.

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
- **Google OAuth redirect mismatch:** pastikan redirect URI persis `http://127.0.0.1:4317/api/connect/google/callback`.
- **Figma OAuth redirect mismatch:** pastikan redirect URI persis `http://127.0.0.1:4317/api/connect/figma/callback`.
- **Figma PAT gagal:** cek token masih aktif dan punya akses ke file yang ditempel.
- **Figma file tidak terbaca:** pastikan URL mengandung `/design/<fileKey>/`, `/file/<fileKey>/`, `/proto/<fileKey>/`, atau `/board/<fileKey>/`, dan akun/token punya permission ke file.
- **AI chat `insufficient balance` / `invalid api key`:** itu error provider OpenCode. Cek billing/credit/API key provider di OpenCode, lalu refresh provider/model.
- **AI file action butuh confirmation:** ini normal. Google revision dapat diterapkan setelah explicit confirmation; Figma canvas mutation masih memerlukan Plugin bridge.
