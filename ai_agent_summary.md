# Ringkasan: VibeForge Vision & Skill AI Agent

## 1. Visi VibeForge
Berdasarkan dokumen `docs/overview/vision.md`, **VibeForge** adalah sebuah **AI Coding Workspace** terintegrasi yang bertujuan untuk mengurangi *context switching* (bolak-balik aplikasi) yang sering dilakukan developer.

Biasanya, developer harus berpindah-pindah antara:
- VS Code (Editor)
- Kanban Board/Linear (Task Management)
- AI Chat (ChatGPT/Claude)
- Google Docs/Notion (Dokumentasi)
- Terminal, GitHub, dll.

**VibeForge menggabungkan semua itu dalam satu tempat:**
`VS Code + Linear + GitHub + Notion + AI Agent`

Fitur utama yang diimpikan adalah alur kerja yang mulus: membuat proyek -> memecah tugas menggunakan AI -> menjadwalkannya -> membuat task Kanban -> coding dengan bantuan AI agent -> menjalankan terminal/testing -> dan mencatat log harian secara otomatis ke NocoDB.

---

## 2. Skill AI Agent (VibeForge AI Agent)
Sebagai asisten AI di proyek ini, saya memiliki akses ke sistem file dan terminal untuk membantu pengerjaan kode secara langsung. Skill/kemampuan saya meliputi:

1. **Eksplorasi & Navigasi Proyek**
   - Membaca struktur direktori untuk memahami tata letak kode.
   - Membaca isi file untuk memahami logika atau konfigurasi yang ada.

2. **Manipulasi Kode (Writing & Editing)**
   - Mengedit file secara presisi (search & replace).
   - Menulis kode baru, melakukan refactoring, dan memperbaiki bug.

3. **Eksekusi Perintah & Terminal**
   - Menjalankan command (seperti build, test, install dependencies) secara langsung dari workspace.

4. **Manajemen Memori Proyek**
   - Membaca dan menulis catatan di `.vibeforge/memory-bank/` agar konteks proyek dan progres pengerjaan terus terjaga.
