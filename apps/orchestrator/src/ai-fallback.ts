import type { SmartPromptResult } from "@vk/contracts";

function cleanLine(value: string) {
  return value.replace(/^[-*#\d.)\s]+/, "").trim();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleFrom(value: string, fallback: string) {
  const text = normalizeText(cleanLine(value));
  if (!text) return fallback;
  return text.length > 84 ? `${text.slice(0, 81)}...` : text;
}

function explicitItems(prompt: string) {
  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const marked = lines
    .filter((line) => /^(\d+[.)]|[-*])\s+/.test(line))
    .map(cleanLine)
    .filter((line) => line.length > 8);
  if (marked.length >= 2) return Array.from(new Set(marked)).slice(0, 6);

  const sections = prompt
    .split(/\n\s*\n+/)
    .map(cleanLine)
    .filter((section) => section.length > 24);
  if (sections.length >= 2 && sections.length <= 6) return sections;

  return [];
}

function needsFrontendDemo(value: string) {
  return /ui|ux|frontend|front-end|page|dashboard|sidebar|modal|dialog|responsive|mobile|desktop|component|design|layout|shadcn|tailwind/i.test(
    value,
  );
}

function looksLikeAudit(value: string) {
  return /cek|audit|review|periksa|inspect|map|inventaris|tmp kanban|tmp-kanban|task lanjutan|lanjut/i.test(
    value,
  );
}

function inferScope(prompt: string) {
  if (/tmp[- ]kanban|task lanjutan|sudah task berapa/i.test(prompt))
    return {
      title: "Audit tmp-kanban prompts dan susun task lanjutan",
      objective:
        "Memahami isi tmp-kanban yang sudah ada, menghitung/memetakan task berjalan, lalu menyusun task lanjutan yang tidak duplikatif dan mengikuti aturan project.",
      work: [
        "Baca `AGENTS.md`, `docs/ai/README.md`, dan file context lain yang diwajibkan project.",
        "Inspect folder `docs/ai/tmp-kanban-prompts/` atau folder tmp-kanban yang relevan di project.",
        "Buat daftar task yang sudah ada: nomor, judul, tujuan, dependency, dan status asumsi jika bisa disimpulkan dari daily log.",
        "Identifikasi gap/inkonsistensi yang belum tertutup oleh prompt yang sudah ada.",
        "Jika perlu task lanjutan, susun prompt lanjutan dengan urutan aman dan tidak overlap dengan task lama.",
        "Jangan langsung implement semua temuan besar; prioritaskan rencana/task yang reviewable.",
      ],
    };
  if (looksLikeAudit(prompt))
    return {
      title: titleFrom(prompt, "Audit project context dan susun rencana kerja"),
      objective:
        "Menginspeksi kondisi project terlebih dahulu, memetakan masalah/ruang lingkup, lalu menghasilkan langkah kerja yang aman dan bisa direview.",
      work: [
        "Baca `AGENTS.md`, `docs/ai/README.md`, dan context project yang relevan.",
        "Inspect file/folder yang disebut user sebelum membuat perubahan.",
        "Catat temuan utama, risiko, dan area yang belum jelas.",
        "Jika scope terlalu besar, pecah menjadi task lanjutan yang berurutan.",
        "Implementasikan hanya bagian yang aman dan kecil, atau hasilkan plan konkret jika implementasi belum aman.",
      ],
    };
  return {
    title: titleFrom(prompt, "Implement requested change"),
    objective:
      "Mengubah request kasar user menjadi pekerjaan kecil yang jelas, aman, dan bisa direview di kanban.",
    work: [
      "Baca `AGENTS.md`, `docs/ai/README.md`, dan context project yang relevan.",
      "Pahami request user dan tulis asumsi penting sebelum membuat perubahan.",
      "Inspect file/folder terkait; jangan menebak struktur project.",
      "Implementasikan perubahan secara kecil dan reviewable.",
      "Pastikan hasilnya selaras dengan aturan project, daily log, dan design/system yang ada.",
    ],
  };
}

function buildPrompt({
  title,
  userRequest,
  objective,
  work,
  frontend,
}: {
  title: string;
  userRequest: string;
  objective: string;
  work: string[];
  frontend: boolean;
}) {
  return [
    `# Prompt - ${title}`,
    "",
    "Ikuti `AGENTS.md`, `docs/ai/README.md`, dan seluruh aturan project yang relevan sebelum mengubah apa pun.",
    "",
    "Jika project memakai Next.js versi baru, baca dokumentasi lokal di `node_modules/next/dist/docs/` sebelum menyentuh routing, metadata, proxy, loading, atau Server/Client Component.",
    "",
    "## Request user",
    "",
    userRequest.trim(),
    "",
    "## Tujuan",
    "",
    objective,
    "",
    "## Kerjakan",
    "",
    ...work.map((item) => `- ${item}`),
    "",
    "## Acceptance criteria",
    "",
    "- Hasil kerja langsung menjawab request user dan tidak melebar ke scope yang tidak diminta.",
    "- Semua perubahan mengikuti aturan `AGENTS.md`, AI memory, dan pola existing project.",
    "- Task tetap kecil/reviewable; jika scope besar, tulis task lanjutan yang jelas daripada memaksakan semuanya.",
    "- Tidak ada overwrite daily log atau file user yang tidak terkait.",
    "- Jika ada asumsi atau blocker, catat eksplisit di hasil kerja dan daily log.",
    "",
    ...(frontend
      ? [
          "## Frontend demo wajib",
          "",
          "- Verifikasi desktop.",
          "- Verifikasi mobile/responsive.",
          "- Cek loading, empty, error, dan offline/conflict state jika relevan.",
          "",
        ]
      : []),
    "## Verifikasi",
    "",
    "- Jalankan verifikasi paling relevan dan proporsional untuk project ini.",
    "- Minimal cek lint/typecheck/test/build jika tersedia dan sesuai dengan perubahan.",
    "- Jika command gagal karena issue lama, catat detailnya; jangan sembunyikan error.",
    "",
    "## Daily log",
    "",
    "- Append ke `docs/ai/daily-logs/YYYY-MM-DD.md`; jangan overwrite section lama.",
    "- Catat prompt, plan, changed files, verification, result, status, blockers, dan next steps.",
  ].join("\n");
}

function makeTask(userRequest: string, index: number, total: number) {
  const scope = inferScope(userRequest);
  const frontend = needsFrontendDemo(userRequest);
  const title =
    total === 1
      ? scope.title
      : `${String(index + 1).padStart(2, "0")} - ${titleFrom(userRequest, scope.title)}`;
  return {
    title,
    prompt: buildPrompt({
      title,
      userRequest,
      objective: scope.objective,
      work: scope.work,
      frontend,
    }),
    mode: looksLikeAudit(userRequest) ? ("plan" as const) : ("build" as const),
    priority: index === 0 ? ("high" as const) : ("medium" as const),
    acceptanceCriteria: [
      "Prompt task mengikuti pola tmp-kanban: context first, tujuan, kerjakan, acceptance criteria, verifikasi, dan daily log.",
      "Task tidak duplikatif dan tidak memecah pekerjaan tanpa alasan.",
      "Hasil dapat langsung dijalankan oleh agent coding tanpa perlu menebak aturan main project.",
    ],
    verification: [
      "Review prompt sebelum publish ke Backlog.",
      "Pastikan task count sesuai scope: satu task untuk scope tunggal, beberapa task hanya untuk scope yang memang terpisah.",
    ],
    dependsOn: index === 0 ? [] : [index - 1],
  };
}

export function fallbackSmartPrompt(
  roughPrompt: string,
  reason: string,
): SmartPromptResult {
  const items = explicitItems(roughPrompt);
  const chunks = items.length ? items : [roughPrompt];
  const tasks = chunks.map((item, index) =>
    makeTask(item, index, chunks.length),
  );
  return {
    summary: [
      "KarsaDesk membuat draft lokal dengan format tmp-kanban karena AI planning call gagal atau timeout.",
      `Reason: ${reason}`,
      `Draft ini menghasilkan ${tasks.length} task sesuai scope request. Edit/reorder sebelum publish jika perlu.`,
    ].join("\n"),
    tasks,
  };
}

export function fallbackBrainstorm(message: string, reason: string) {
  const ideas = explicitItems(message);
  const bullets = (ideas.length ? ideas : [message]).slice(0, 5);
  const providerIssue =
    /balance|billing|quota|invalid api key|unauthorized|payment/i.test(reason);
  return [
    "AI provider belum berhasil merespons, jadi KarsaDesk membuat brainstorm lokal dulu.",
    `Alasan: ${reason}`,
    "",
    "Arah yang bisa kamu pakai:",
    ...bullets.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Saran next step:",
    providerIssue
      ? "- Cek billing/credit/API key provider di OpenCode, lalu pilih provider/model yang aktif."
      : "- Pastikan provider/model OpenCode masih aktif kalau ingin pakai AI remote.",
    "- Kalau mau dijadikan task, pakai Smart Prompt agar formatnya mengikuti AGENTS.md, AI memory, verification, dan daily log.",
    "- Publish hanya setelah preview task sudah sesuai scope.",
  ].join("\n");
}
