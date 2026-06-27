import { describe, expect, it } from "vitest";
import { fallbackSmartPrompt } from "./ai-fallback.js";

describe("Smart Prompt local fallback", () => {
  it("keeps a coherent rough request as one tmp-kanban style task", () => {
    const result = fallbackSmartPrompt(
      "Tolong cek tmp kanban saya sudah task berapa, sebenarnya saya mau buat task lanjutan",
      "test",
    );
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toMatch(/tmp-kanban|task lanjutan/i);
    expect(result.tasks[0].prompt).toContain("Ikuti `AGENTS.md`");
    expect(result.tasks[0].prompt).toContain("Daily log:");
  });

  it("splits explicit lists into dependency-aware cards", () => {
    const result = fallbackSmartPrompt(
      ["1. Audit demo data source of truth", "2. Fix RBAC sidebar demo"].join(
        "\n",
      ),
      "test",
    );
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[1].dependsOn).toEqual([0]);
    expect(result.tasks[0].prompt).toContain("Acceptance criteria:");
  });
});
