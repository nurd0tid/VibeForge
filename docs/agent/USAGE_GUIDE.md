# VibeForge Agent Usage Guide & Feature Summary

> Ditulis oleh: VibeForge AI Agent  
> Tanggal: 2 Juli 2026  
> Tujuan: Cara ngeprompt yang efektif, cara kerja tools, dan ringkasan pembaruan terbaru.

---

## Cara Ngeprompt yang Efektif

### 1. Gunakan @ untuk Skill
Ketik `@` di input chat untuk memanggil skill tertentu:
```
@planning    - Buat rencana task berstruktur
@create-task - Buat task baru di Kanban
@daily-log   - Tulis daily log progress
@review-code - Review perubahan kode
@update-context - Update project context/memory bank
```
Contoh:
```
@planning buat plan untuk implementasi auth dengan NextAuth
@create-task implementasi dark mode untuk semua halaman
```

### 2. Gunakan # untuk Attach File
Ketik `#` untuk mencari dan menyebut file tertentu:
```
#src/app/page.tsx - sertakan file ini sebagai konteks
```

### 3. Gunakan / untuk Command
```
/new      - Chat baru
/clear    - Hapus percakapan
/compact  - Kompres context untuk menghemat token
/sessions - Lihat semua sesi tersimpan
/init-memory  - Inisialisasi memory bank untuk project
/mcp-list - Lihat MCP server terhubung
```

### 4. Gunakan UMB untuk Update Memory
Ketik salah satu dari:
- `UMB`
- `update memory`
- `sync memory`
- `update memory bank`

AI akan memperbarui file memory bank: `activeContext.md`, `progress.md`, `decisionLog.md`, dll.

---

## Tools yang Tersedia untuk AI Agent

| Tool | Fungsi | Contoh |
|------|--------|--------|
| `list_directory` | Melihat isi folder | `{"path": "src/"}` |
| `read_file` | Membaca isi file | `{"path": "src/app/page.tsx"}` |
| `edit_file` | Mengedit file (search & replace) | `{"path": "file.ts", "old_string": "x", "new_string": "y"}` |
| `write_file` | **Membuat file baru** dari nol | `{"path": "notes.md", "content": "# Notes\n..."}` |
| `run_command` | Menjalankan perintah terminal | `{"command": "pnpm build"}` |
| `memory_list` | Daftar file memory bank | `{}` |
| `memory_read` | Baca file memory bank | `{"file": "activeContext.md"}` |
| `memory_write` | Tulis/update file memory bank | `{"file": "progress.md", "content": "..."}` |

---

## Fitur Terbaru yang Sudah Diimplementasikan

### Editor & Workspace
- **Auto-scroll editor ke lokasi perubahan** — Saat AI mengedit atau membuat file, Monaco Editor otomatis scroll ke baris yang berubah.
- **Gutter decorations (indikator hijau)** — Bar hijau di sisi kiri nomor baris menandai area yang diubah AI (seperti Git diff indicators di VS Code). Hilang otomatis setelah 6 detik.
- **File auto-terbuka** — Setiap kali AI berhasil membaca, mengedit, atau membuat file, file itu langsung terbuka di editor.
- **Git Diff Side-by-Side** — Panel Git Diff di bagian bawah workspace menggunakan Monaco DiffEditor sesungguhnya.
- **write_file tool** — AI sekarang bisa membuat file baru dari nol (sebelumnya hanya bisa edit file yang sudah ada).

### Chat AI Assistant
- **Setiap pesan AI menyimpan model & provider** — Badge di setiap bubble chat menampilkan model dan provider yang dipakai untuk menghasilkan respon tersebut (misalnya `9Router · claude-sonnet-4.5`). Tidak lagi "ngikut" model yang sedang aktif.
- **Context usage diperbarui saat ganti model** — Jika user berganti provider/model, bar context otomatis mengestimasi ulang token berdasarkan percakapan (estimasi = karakter / 4) dan memperbarui limit sesuai `context_window` provider baru.
- **Interrupted Task Resume Banner** — Jika agent berhenti di tengah jalan (misal user pindah tab), saat kembali ke workspace muncul banner merah "Task Interrupted" dengan tombol **Resume Task** yang langsung melanjutkan task dari awal tanpa harus menulis ulang prompt.
- **Global AbortController** — Stream SSE tidak terikat lifecycle komponen sehingga lebih stabil saat navigasi.
- **Delete Session** — Setiap session di popup Sessions bisa dihapus dengan tombol X yang muncul saat hover.
- **isAgentRunning tidak di-persist** — Tidak ada lagi UI stuck di state "sedang running" setelah refresh atau pindah tab.

### Provider & Settings
- **Max Output Tokens = -1** — Sama seperti Cline, jika diisi -1 atau dikosongkan, parameter `max_tokens` tidak dikirim ke API (artinya unlimited/default provider).
- **Settings Popover di Chat Header** — Toggle Auto Approve dan Auto Compact menggunakan Switch yang rapi di popover icon gear, bukan tombol teks mepet.
- **Context Usage Bar** — Progress bar di header chat menampilkan estimasi token berdasarkan provider aktif.

### Memory Bank
- **`/init-memory`** membuat 10 file di `.vibeforge/memory-bank/`:
  - `projectBrief.md`, `productContext.md`, `activeContext.md`
  - `systemPatterns.md`, `decisionLog.md`, `progress.md`
  - `knownIssues.md`, `fixedDoNotBreak.md`, `regressionGuard.md`, `updateLog.md`
- AI membaca memory bank sebelum mulai bekerja dan memperbarui setelah selesai.

### Tasks
- **Play Task** — Klik tombol Play (muncul saat hover card task) untuk mengirim task ke workspace dan memulai AI Todo Strip.
- **Multi-task batch play** — Pilih beberapa task sekaligus dan klik "Play X Tasks".
- **AI Task Creator** — Dilengkapi pilihan provider dan model. AI benar-benar memanggil API untuk generate task (tidak lagi mock).
- **Pending/Done filter tabs** — Tampilkan hanya task yang masih pending atau yang sudah done.

### Docs
- **16 kategori** di menu Docs, termasuk: Agent Guide, Skills, Setup, Deployment, Logging.
- **17 file** di `docs/agent/` untuk panduan agent, memory bank, MCP, structured editing, dan regression guard.
- **15 skill files** dengan anti-rationalization table, verification checklist, dan failure handling.

---

## Tips Penggunaan Terbaik

1. **Selalu `/init-memory` dulu** sebelum mulai project baru agar AI punya konteks yang lengkap.
2. **`UMB` setelah selesai task** agar memory bank diperbarui untuk sesi berikutnya.
3. **Pakai `/compact`** jika context bar sudah hampir penuh (≥70%) sebelum memulai task besar.
4. **Set context_window di provider settings** sesuai model yang dipakai agar context bar akurat.
5. **Pakai model = -1 untuk max output tokens** jika ingin output tidak dibatasi.
6. **Bisa pindah tab** — jika ada task yang interrupt, banner Resume Task akan muncul saat kembali ke workspace.
