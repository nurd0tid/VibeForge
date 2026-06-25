import type { SmartPromptResult } from "@vk/contracts";

function cleanLine(value: string) {
  return value.replace(/^[-*#\d.)\s]+/, "").trim();
}

function splitIdeas(prompt: string) {
  const lines = prompt
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map(cleanLine)
    .filter((line) => line.length > 4);
  return Array.from(new Set(lines)).slice(0, 8);
}

function titleFrom(value: string, fallback: string) {
  const text = cleanLine(value).replace(/\s+/g, " ");
  if (!text) return fallback;
  return text.length > 76 ? `${text.slice(0, 73)}...` : text;
}

export function fallbackSmartPrompt(
  roughPrompt: string,
  reason: string,
): SmartPromptResult {
  const ideas = splitIdeas(roughPrompt);
  const chunks = ideas.length ? ideas : [roughPrompt];
  const tasks = chunks.slice(0, 6).map((idea, index) => ({
    title:
      index === 0
        ? `Clarify scope: ${titleFrom(idea, "request")}`
        : titleFrom(idea, `Implement step ${index + 1}`),
    prompt: [
      "Work from this user request and preserve the intent:",
      idea,
      "",
      "Before changing anything, inspect the relevant project context and identify risks.",
      "Make a small, reviewable change or produce a concrete plan if implementation is not safe yet.",
    ].join("\n"),
    mode: "build" as const,
    priority: index === 0 ? ("high" as const) : ("medium" as const),
    acceptanceCriteria: [
      "The result directly addresses the user request.",
      "The work is small enough to review manually.",
      "Unclear assumptions are written down instead of silently guessed.",
    ],
    verification: [
      "Run the smallest relevant local verification.",
      "Review the resulting diff or plan before merging/applying.",
    ],
    dependsOn: index === 0 ? [] : [index - 1],
  }));
  return {
    summary: [
      "KarsaDesk generated a local fallback draft because the AI planning call failed or timed out.",
      `Reason: ${reason}`,
      "You can edit these tasks before publishing.",
    ].join("\n"),
    tasks,
  };
}

export function fallbackBrainstorm(message: string, reason: string) {
  const ideas = splitIdeas(message);
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
    "- Pilih satu poin paling penting.",
    "- Ubah jadi task kecil.",
    "- Jalankan Smart Prompt lagi setelah provider/model stabil.",
  ].join("\n");
}
