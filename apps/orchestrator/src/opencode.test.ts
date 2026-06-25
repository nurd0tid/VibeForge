import { describe, expect, it } from "vitest";
import { parseSmartPrompt, providerDiagnostic } from "./opencode.js";

describe("smart prompt parser", () => {
  it("parses fenced JSON and applies defaults", () => {
    const result = parseSmartPrompt(
      '```json\n{"summary":"A","tasks":[{"title":"Inspect","prompt":"Read the repo"}]}\n```',
    );
    expect(result.tasks[0].priority).toBe("medium");
  });

  it("rejects prose without structured data", () => {
    expect(() => parseSmartPrompt("No structured response")).toThrow();
  });
});

describe("OpenCode provider diagnostics", () => {
  it("extracts insufficient balance from provider event payloads", () => {
    expect(
      providerDiagnostic({
        type: "error",
        properties: {
          error:
            "Insufficient balance. Manage your billing here: https://opencode.ai/workspace/demo/billing",
        },
      }),
    ).toContain("Insufficient balance");
  });

  it("redacts obvious API-key shaped secrets", () => {
    const fakeKey = `sk-${"thisShouldNotLeak123456"}`;
    expect(
      providerDiagnostic({
        error: `Unauthorized: invalid api key ${fakeKey}`,
      }),
    ).not.toContain("thisShouldNotLeak");
  });
});
