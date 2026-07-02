# VibeForge — Analisis Lengkap

> Dokumen ini dibuat berdasarkan pembacaan mendalam terhadap source code, dokumentasi, dan konfigurasi VibeForge.

---

## Apa itu VibeForge?

VibeForge adalah **AI-native coding workspace open-source** — sebuah platform yang menggabungkan tiga hal sekaligus dalam satu antarmuka:

1. **IDE berbasis browser** (seperti VS Code) — dengan file explorer, Monaco Editor (editor yang sama dengan VS Code), multi-tab, terminal, dan Git source control.
2. **AI Agent Chat** — asisten AI yang bisa secara otonom membaca, menulis, dan mengedit file di project user.
3. **Project Management** — Kanban board dengan task tracking, daily/weekly log, dan sinkronisasi ke database NocoDB.

**Target pengguna:** Developer individual atau tim kecil yang ingin menggunakan AI untuk membantu coding di project mereka sendiri — bukan di cloud seperti GitHub Copilot atau Cursor, tapi di komputer/server mereka sendiri dengan kontrol penuh.

**Cara kerjanya secara sederhana:** User membuka VibeForge di browser, memilih project (folder di komputer), lalu bicara dengan AI agent. Agent bisa langsung baca file, edit kode, jalankan terminal command, dan update memory bank — semuanya dilakukan secara otomatis sambil user melihat hasilnya secara real-time.

VibeForge berjalan di port **3456** (bukan 3000) supaya tidak bentrok dengan project user yang biasanya pakai port 3000.

---

## Komponen Utama

### 1. Workspace IDE (`src/app/(app)/workspace/page.tsx`)
Ini adalah halaman utama VibeForge — satu file besar (~2971 baris) yang mengandung hampir seluruh logika UI.

- **File Explorer** — Menampilkan struktur folder project yang dipilih user. User bisa klik file untuk membukanya di editor.
- **Monaco Editor** — Editor kode yang sama seperti di VS Code. Mendukung syntax highlighting, multi-tab, dan deteksi file yang sudah dimodifikasi (dirty flag).
- **Diff Viewer** — Ketika AI mengedit file, editor beralih ke mode split-view yang menampilkan versi lama (kiri) vs versi baru (kanan). User bisa Accept atau Reject perubahan.
- **Git Source Control** — Panel untuk melihat file yang berubah, stage changes, commit, pull, push, dan sync. Status git di-refresh otomatis setiap 10 detik.
- **Terminal** — Terminal built-in untuk menjalankan perintah shell langsung dari browser.
- **AI Chat Panel** — Panel chat di sisi kanan untuk berkomunikasi dengan AI agent. Menampilkan pesan, tool call cards, diff hasil edit, dan progress bar token.

### 2. AI Agent Chat (`src/app/api/ai/chat/route.ts`)
Backend yang menangani semua komunikasi dengan AI provider. Ini adalah inti dari VibeForge — dibahas lebih detail di bagian "AI Agent — Bagaimana Cara Kerjanya?".

### 3. Task Management (Kanban Board)
- Kanban board dengan kolom status (Todo, In Progress, Done, dll.)
- Tombol **Play Task** untuk mengeksekusi task menggunakan AI agent
- **Multi-select batch play** — pilih beberapa task sekaligus dan jalankan semua
- Filter tab Pending/Done
- **AI Task Creator** — buat task baru menggunakan AI, lengkap dengan pilihan provider/model

### 4. Memory Bank System
Sistem "ingatan" project yang disimpan di folder `.vibeforge/memory-bank/` di dalam project user. Dibahas lebih detail di bagian "Memory Bank System".

### 5. Provider Management (`/providers`)
Halaman untuk mengatur koneksi ke berbagai AI provider (OpenAI, Anthropic, Gemini, dll.). Konfigurasi disimpan lokal di `.vibeforge/providers.json`, bukan di database.

### 6. NocoDB Persistence
VibeForge menggunakan NocoDB sebagai database backend untuk menyimpan:
- `projects` — daftar project
- `tasks` — item Kanban
- `schedules` — jadwal kerja
- `daily_logs` — log harian
- `weekly_logs` — ringkasan mingguan
- `agent_runs` — riwayat eksekusi AI agent
- `providers` — konfigurasi AI provider
- `plans` — rencana task

### 7. Docs Browser
Semua dokumentasi (17 file agent docs + 15 skill docs) bisa dibrowse langsung di dalam app melalui halaman Docs.

### 8. MCP Support
Model Context Protocol — sistem untuk menghubungkan AI agent dengan external tools/servers (misal: web search, database query, dll.). Konfigurasi disimpan di `.vibeforge/mcp.json`.

---

## AI Agent — Bagaimana Cara Kerjanya?

### Arsitektur Dasar

VibeForge menggunakan pendekatan **prompt-based tool calling** — bukan native function calling dari OpenAI API. Artinya: tool call dikirim sebagai teks XML di dalam pesan, bukan sebagai JSON structured function call. Ini memungkinkan VibeForge bekerja dengan **semua provider** yang kompatibel dengan OpenAI API format.

### System Prompt

Setiap kali user mengirim pesan, backend membangun system prompt yang berisi:
1. **PROJECT ROOT** — path absolut ke folder project user
2. **PROJECT MEMORY** — isi dari `.vibeforge/memory-bank.md` (hingga 2000 karakter pertama)
3. **CURRENT SKILL** — skill yang sedang aktif (jika ada)
4. **Daftar 8 tools** yang bisa digunakan agent (lihat di bawah)
5. **Aturan perilaku** — kapan harus baca memory, kapan harus update, dll.

### 8 Tools yang Tersedia untuk Agent

| Tool | Fungsi |
|------|--------|
| `list_directory` | Melihat isi folder (menampilkan [DIR] atau [FILE] untuk setiap item) |
| `read_file` | Membaca isi file (maksimal 6.000 karakter, sisanya dipotong) |
| `edit_file` | Mengedit file menggunakan search & replace (cari `old_string`, ganti dengan `new_string`) |
| `write_file` | Membuat file baru dari nol (langsung tulis konten penuh) |
| `run_command` | Menjalankan shell command (timeout 15 detik, output maks 4.000 karakter) |
| `memory_list` | Melihat daftar file di `.vibeforge/memory-bank/` |
| `memory_read` | Membaca file memory bank tertentu (maks 8.000 karakter) |
| `memory_write` | Menulis/update file memory bank |

### Format Tool Call (XML-based)

Agent mengirim tool call dalam format XML di dalam teks biasa:
```xml
<tool_use><name>read_file</name><args>{"path": "src/app/page.tsx"}</args></tool_use>
```

Backend mem-parse XML ini dengan regex, mengeksekusi tool yang sesuai, dan mengirimkan hasilnya kembali ke LLM dalam format:
```xml
<tool_result><name>read_file</name><result>...isi file...</result></tool_result>
```

### Loop Iterasi (Agentic Loop)

```
User kirim pesan
    ↓
Backend panggil LLM (streaming)
    ↓
LLM respond dengan teks + tool call XML
    ↓
Backend parse tool calls
    ↓
[Jika ada tool calls]
    → Eksekusi semua tools
    → Tambah hasil ke conversation history
    → Panggil LLM lagi (iterasi berikutnya)
    → (maksimal 8 iterasi)
    ↓
[Jika tidak ada tool calls]
    → Ini jawaban final
    → Kirim ke frontend
    → SELESAI
```

**Batas maksimal: 8 iterasi per prompt.** Jika dalam 8 putaran agent belum selesai, loop berhenti.

### SSE Streaming (Server-Sent Events)

Frontend menerima update real-time melalui SSE dengan beberapa jenis event:

| Event | Isi |
|-------|-----|
| `content_stream` | Potongan teks dari LLM (real-time, karakter per karakter) |
| `content` | Teks final yang sudah dibersihkan dari XML tool call |
| `thought` | Reasoning/pikiran agent sebelum menggunakan tool |
| `tool_call` | Notifikasi bahwa agent memanggil sebuah tool |
| `tool_result` | Hasil dari tool yang dipanggil |
| `usage` | Informasi penggunaan token |
| `done` | Sinyal bahwa agent sudah selesai |

### Bagaimana Agent Bisa Baca/Tulis File?

Agent **tidak bisa langsung** akses filesystem — semua akses file dieksekusi oleh **Next.js server** (bukan browser). Alurnya:

1. User membuka project dengan memilih path folder di komputer mereka
2. Path ini dikirim ke backend sebagai `projectPath`
3. Backend menggunakan Node.js `fs/promises` dan `child_process.exec` untuk akses filesystem
4. Semua path divalidasi terhadap `projectRoot` untuk mencegah path traversal

---

## Skills yang Tersedia

VibeForge memiliki **15 skill** yang tersimpan di `docs/skills/`. Setiap skill adalah panduan step-by-step untuk agent ketika mengerjakan tugas tertentu. Skill di-trigger dengan `@` di chat input.

| Skill | Fungsi |
|-------|--------|
| **bug-fix** | Diagnosa, isolasi, perbaiki, dan verifikasi bug secara sistematis. Wajib temukan root cause sebelum fix. |
| **code-review** | Review kode untuk style, security, performance, dan correctness. Output berupa laporan dengan Severity (Critical/Warning/Nitpick). |
| **create-task** | Ubah plan yang disetujui menjadi task atomik di Kanban board NocoDB. |
| **daily-log** | Dokumentasi progress harian, blockers, dan next steps. Disimpan ke NocoDB. |
| **deployment** | Eksekusi deployment yang aman dengan pre-flight checks (typecheck → lint → build → health check). |
| **documentation** | Update dan perbaiki dokumentasi project. |
| **memory-bank-update** | Sinkronisasi semua file memory bank setelah perubahan signifikan. Dipicu oleh keyword `UMB`. |
| **nocodb-sync** | Interaksi aman dengan NocoDB backend (CRUD operations). |
| **planning** | Buat rencana terstruktur dan bertahap sebelum implementasi. Output ditulis ke `NEXT_ACTION.md`. |
| **provider-setup** | Konfigurasi koneksi AI provider baru (URL, API key, test connection). |
| **schedule-breakdown** | Ubah plan menjadi jadwal dengan tanggal start/end dan simpan ke NocoDB. |
| **testing** | Tulis dan jalankan test untuk fitur baru atau bug fix. |
| **ui-ux-review** | Review antarmuka untuk layout, responsiveness, dan UX. |
| **update-project-context** | Update context project di memory bank setelah perubahan arsitektur. |
| **weekly-log** | Ringkasan mingguan yang disimpan ke NocoDB. |

Selain itu, ada **11 skill tambahan** yang tercatat di `SKILLS_INDEX.md` sebagai kategori konsep (context-engineering, frontend-ui-engineering, structured-file-editing, dll.) meskipun tidak semuanya memiliki file skill terpisah.

---

## Alur Kerja (Workflow)

Berikut adalah step-by-step dari user mengirim prompt hingga file diedit:

### Step 1: User Menulis Prompt
User mengetik pesan di chat input. Bisa menggunakan:
- `@` — memilih skill atau file sebagai konteks
- `#` — mencari file tertentu
- `/compact` — kompres konteks jika token mendekati batas

### Step 2: Frontend Mengirim Request
Frontend mengumpulkan:
- `messages` — seluruh riwayat percakapan (termasuk steps/tool calls sebelumnya)
- `providerId` — ID provider yang dipilih
- `model` — model yang dipakai
- `skill` — skill aktif (jika ada)
- `projectPath` — path folder project user

Request dikirim ke `POST /api/ai/chat` sebagai HTTP request.

### Step 3: Backend Membangun Context
Backend:
1. Ambil konfigurasi provider dari NocoDB + local config
2. Resolve API key (dari local storage atau env variable)
3. Baca `memory-bank.md` dari project (jika ada)
4. Bangun system prompt lengkap
5. Buat record baru di tabel `agent_runs` di NocoDB (status: "running")
6. Buka SSE stream ke frontend

### Step 4: Agentic Loop Dimulai
Backend memanggil LLM (streaming):
- Chunk teks dikirim ke frontend real-time via `content_stream` event
- Frontend menampilkan teks yang sedang "diketik" AI

### Step 5: LLM Menulis Tool Call
Misalnya agent ingin baca file:
```
Saya akan melihat struktur project dulu.
<tool_use><name>list_directory</name><args>{"path": "."}</args></tool_use>
```

Backend mendeteksi XML tool call, mengirim event `tool_call` ke frontend (frontend menampilkan "card" tool call), lalu **mengeksekusi** perintah tersebut di server.

### Step 6: Tool Dieksekusi
Backend menjalankan `list_directory`, mendapatkan hasil, dan:
- Mengirim event `tool_result` ke frontend (ditampilkan di bawah tool call card)
- Menambahkan hasil ke conversation history

### Step 7: LLM Melanjutkan
LLM menerima hasil tool, melanjutkan reasoning, mungkin memanggil tool lain (misal `read_file`, lalu `edit_file`).

### Step 8: Agent Mengedit File
Ketika `edit_file` dipanggil:
1. Backend mencari `old_string` di file
2. Mengganti dengan `new_string` menggunakan `String.replace()`
3. Frontend memicu **diff animation** — editor beralih ke split-view
4. Jika mode **Manual Approve**: user lihat diff dan klik Accept/Reject
5. Jika mode **Auto Approve**: perubahan langsung diterapkan

### Step 9: Agent Memberikan Jawaban Final
Ketika tidak ada lagi tool call, LLM menulis jawaban final. Backend mengirim event `content` (dengan `replace: true`) untuk mengganti raw streaming text dengan teks bersih final.

### Step 10: Cleanup
- Backend update record di `agent_runs` (status: "completed", token count, output summary)
- Frontend menyimpan session ke localStorage via Zustand persist
- Token usage diupdate di progress bar

---

## Memory Bank System

### Apa itu Memory Bank?

Memory Bank adalah sistem "ingatan jangka panjang" untuk agent. Karena LLM tidak punya memory permanen antar session, VibeForge menyimpan konteks project di file-file markdown di dalam folder `.vibeforge/memory-bank/` di project user.

### Cara Inisialisasi: `/init-memory`

User mengetik `/init-memory` di chat. Agent akan membuat 10 file standar:

| File | Isi |
|------|-----|
| `projectBrief.md` | Tujuan project, tech stack, target user |
| `activeContext.md` | Fokus saat ini, task yang sedang dikerjakan |
| `progress.md` | Daftar fitur yang sudah selesai dan yang belum |
| `decisionLog.md` | Keputusan arsitektur penting yang sudah dibuat |
| `updateLog.md` | Chronological log semua perubahan |
| `techContext.md` | Detail teknis: dependency, API, database schema |
| `systemPatterns.md` | Pola kode yang digunakan (naming, folder structure) |
| `productContext.md` | Konteks produk dari sudut pandang user/bisnis |
| `teamContext.md` | Informasi tim (jika relevan) |
| `sessionNotes.md` | Catatan session sementara |

### Bagaimana Agent Membaca Memory

Setiap kali agent dijalankan:
1. Backend otomatis membaca `memory-bank.md` (file ringkasan, bukan folder) dan memasukkannya ke system prompt (maks 2.000 karakter pertama)
2. Agent diperintahkan untuk **selalu** membaca memory bank sebelum mulai kerja via `memory_list` + `memory_read`
3. Setelah selesai, agent **wajib** update `activeContext.md`, `progress.md`, dan `updateLog.md`

### Mandatory Memory Workflow

Aturan yang tercantum di `HOW_VIBEFORGE_WORKS.md`:
- **Sebelum kerja apapun**: baca memory bank
- **Setelah kerja apapun**: tulis kembali ke memory bank
- Keyword `UMB` atau "update memory" memicu skill `memory-bank-update`

### Perbedaan `memory-bank.md` vs folder `memory-bank/`
- `.vibeforge/memory-bank.md` — satu file ringkasan yang otomatis dibaca backend dan dimasukkan ke system prompt
- `.vibeforge/memory-bank/` — folder berisi 10 file detail yang dibaca agent secara manual via tool

---

## Provider & Model

### Cara Setup Provider

1. User pergi ke halaman **Providers**
2. Klik **Add Provider**, pilih preset (OpenAI, Anthropic, Gemini, OpenRouter, 9Router, DeepSeek, Mistral, Groq, Ollama, LM Studio, atau Custom OpenAI-Compatible)
3. Isi: Base URL, API Key, Default Model
4. Set Context Window dan Max Output Tokens (`-1` = unlimited, pakai default provider)
5. Klik **Test Connection** untuk verifikasi

### Penyimpanan Konfigurasi

Konfigurasi provider **dibagi dua**:
- **NocoDB** — menyimpan: Base URL, Default Model, Context Window, Max Output Tokens, nama provider
- **Local** (`.vibeforge/providers.json`) — menyimpan: API Key (tidak pernah ke NocoDB atau git), mode penyimpanan key (direct-local, env variable, atau none)

Ini adalah desain keamanan yang baik — API key tidak pernah masuk database.

### Bagaimana Agent Tahu Pakai Model Apa

Di setiap prompt dari frontend, user menentukan `providerId` dan `model`. Backend:
1. Ambil record provider dari NocoDB berdasarkan `providerId`
2. Ambil API key dari local config
3. Gunakan `model` dari request, atau fallback ke `default_model` dari NocoDB
4. Panggil endpoint `${baseUrl}/chat/completions` (standar OpenAI format)

Artinya: VibeForge bekerja dengan **semua provider yang kompatibel dengan OpenAI chat completions API** — tidak hanya OpenAI.

### Retry Logic

Backend memiliki retry otomatis untuk network error:
- Maksimal 2 kali retry
- Hanya untuk error: `fetch failed`, `ECONNREFUSED`, `ETIMEDOUT`
- Delay 2 detik antar retry

---

## Kekurangan & Limitasi yang Ditemukan

Berdasarkan analisis source code, berikut adalah masalah teknis yang nyata:

### 1. Tool Parsing Rentan Error (KRITIS)
**File:** `src/app/api/ai/chat/route.ts` baris 136-158

Tool calling menggunakan **regex parsing pada teks bebas** — bukan native function calling. Ini berarti:
- Jika LLM tidak mengikuti format XML persis, tool tidak akan terdeteksi
- Tidak ada validasi argumen (args) sebelum eksekusi
- `args` hanya di-cast sebagai `Record<string, string>` — jika value berisi bukan string (misal number atau object), bisa error saat runtime
- Komentar di kode menyebut ada dua format (XML dan JSON block), tapi implementasinya tidak sempurna untuk semua kasus edge

### 2. `edit_file` Hanya Ganti Kemunculan Pertama (KRITIS)
**File:** `route.ts` baris 35

```typescript
content.replace(args.old_string, args.new_string)
```

`String.replace()` tanpa flag `/g` hanya mengganti **kemunculan pertama** dari `old_string`. Jika ada duplikat kode (misalnya dua fungsi dengan body yang sama), agent akan mengedit yang salah tanpa tahu kesalahannya.

### 3. Batas 8 Iterasi Terlalu Ketat untuk Task Kompleks
**File:** `route.ts` baris 301

`MAX_ITERATIONS = 8` — untuk task yang membutuhkan banyak file read + edit (misal: refactor besar), 8 iterasi sering tidak cukup. Agent akan berhenti di tengah jalan tanpa menyelesaikan task, tanpa memberi tahu user bahwa task belum selesai.

### 4. Context Trimming yang Kasar
**File:** `route.ts` baris 367-374

Ketika LLM mengembalikan response kosong (context terlalu panjang), backend melakukan:
```typescript
const trimmed = [...chatMessages.slice(0, 4), ...chatMessages.slice(-3)];
```

Ini **memotong conversation history secara acak** — bisa menyebabkan agent kehilangan konteks penting dari tengah percakapan, seperti hasil tool call sebelumnya yang masih relevan.

### 5. `read_file` Dipotong di 6.000 Karakter
**File:** `route.ts` baris 27

File besar (>6.000 karakter) dipotong. Untuk file TypeScript yang panjang (>300 baris), agent hanya melihat sebagian file — bisa menyebabkan edit yang salah karena agent tidak melihat bagian bawah file.

### 6. Workspace Page Terlalu Besar (Code Smell)
**File:** `src/app/(app)/workspace/page.tsx`

Satu file dengan 2.971 baris — ini adalah anti-pattern yang dikenal sebagai "God Component". Sulit di-maintain, sulit di-test, dan menyebabkan performa buruk karena React harus re-render komponen besar untuk perubahan kecil.

### 7. Auto-Compact Tidak Aktif by Default
**File:** `workspace.store.ts` baris 116

```typescript
isAutoCompactEnabled: false,
```

Auto-compact (kompres context otomatis di 90% token usage) dimatikan by default. Banyak user mungkin tidak tahu fitur ini ada, sehingga sesi mereka crash karena context terlalu panjang.

### 8. Memory Bank Dibaca Hanya 2.000 Karakter Pertama
**File:** `route.ts` baris 207

```typescript
memoryBank.slice(0, 2000)
```

Jika `memory-bank.md` berisi banyak informasi (wajar untuk project kompleks), hanya 2.000 karakter pertama yang masuk ke system prompt. Informasi penting bisa terpotong.

### 9. Tidak Ada Test Suite
Tidak ditemukan file `*.test.ts`, `*.spec.ts`, atau konfigurasi `vitest`/`jest` di project ini. Padahal VibeForge sendiri memiliki skill "testing" untuk project user — ironisnya VibeForge sendiri tidak punya test.

### 10. NocoDB Sebagai Hard Dependency
Setup NocoDB (baik cloud maupun Docker) adalah **wajib** sebelum VibeForge bisa dijalankan sama sekali. Ini adalah barrier masuk yang cukup tinggi untuk developer yang hanya ingin mencoba VibeForge dengan cepat.

### 11. Tidak Ada File Locking pada Edit Bersamaan
Jika user mengedit file secara manual di editor Monaco **sementara** agent sedang mengedit file yang sama, bisa terjadi konflik tanpa ada mekanisme lock atau merge. Salah satu perubahan bisa hilang.

### 12. `run_command` Tanpa Sandboxing
**File:** `route.ts` baris 48-52

Agent bisa menjalankan **perintah shell apapun** di project root dengan timeout 15 detik. Tidak ada whitelist command, tidak ada sandboxing. Jika prompt injection terjadi (konten berbahaya di file yang dibaca agent), bisa berpotensi berbahaya.

---

## Rekomendasi Perbaikan

Berdasarkan analisis di atas, berikut prioritas perbaikan dari yang paling mendesak:

### Prioritas 1 — Keamanan & Keandalan Dasar

**A. Perbaiki `edit_file` — ganti hanya kemunculan pertama**
Gunakan split/join atau regex dengan flag untuk memastikan penggantian yang tepat. Atau tambahkan validasi: jika `old_string` muncul lebih dari sekali, return error dan minta agent lebih spesifik.

**B. Tambahkan sandboxing untuk `run_command`**
Setidaknya tambahkan whitelist command yang diizinkan, atau munculkan konfirmasi ke user sebelum menjalankan perintah yang tidak umum. Ini penting untuk keamanan.

**C. Validasi argumen tool sebelum eksekusi**
Parsing XML + JSON bisa gagal diam-diam. Tambahkan validasi schema untuk setiap tool args sebelum `executeTool()` dipanggil.

### Prioritas 2 — User Experience

**D. Naikkan atau buat `MAX_ITERATIONS` bisa dikonfigurasi**
Defaultkan ke 12-15 iterasi, atau biarkan user set di Settings. Jika limit tercapai, beri notifikasi jelas bahwa agent berhenti dan tunjukkan di mana agent berhenti.

**E. Aktifkan Auto-Compact by default**
Set `isAutoCompactEnabled: true` sebagai default. Jika konteks mendekati 90%, otomatis compact — ini mencegah frustrasi user yang session-nya tiba-tiba berhenti.

**F. Perbesar limit `read_file` dan `memory-bank.md`**
Naikkan dari 6.000 ke setidaknya 12.000 karakter untuk `read_file`, dan dari 2.000 ke 4.000 untuk memory bank di system prompt.

### Prioritas 3 — Arsitektur & Maintainability

**G. Pecah `workspace/page.tsx` menjadi komponen terpisah**
File 2.971 baris harus dipecah setidaknya menjadi: `FileExplorer.tsx`, `EditorArea.tsx`, `ChatPanel.tsx`, `GitPanel.tsx`, `TerminalPanel.tsx`. Ini akan memudahkan maintenance dan mengurangi re-render yang tidak perlu.

**H. Tulis test untuk komponen dan API routes kritis**
Minimal: unit test untuk `parseToolCalls()`, `executeTool()`, dan integration test untuk `/api/ai/chat` route. VibeForge punya skill testing untuk user — seharusnya dipakai untuk dirinya sendiri.

**I. Buat NocoDB opsional (SQLite fallback)**
Tambahkan SQLite sebagai opsi penyimpanan lokal agar developer bisa mencoba VibeForge tanpa harus setup NocoDB terlebih dahulu.

### Prioritas 4 — Fitur Lanjutan

**J. Switch ke native function calling**
Jika hanya support provider dengan native function calling (OpenAI, Anthropic, Gemini), ganti prompt-based XML parsing dengan structured function calling. Ini akan membuat tool call jauh lebih andal dan tidak bergantung pada kemampuan LLM untuk mengikuti format XML.

**K. Tambahkan file locking**
Ketika agent sedang mengedit sebuah file, tampilkan indikator "locked" di tab editor dan nonaktifkan editing manual sementara agent bekerja.

---

*Dokumen ini dihasilkan dari analisis mendalam terhadap source code VibeForge pada Juli 2026.*
