# Regression Guard

This document defines the mandatory safeguards the VibeForge AI Agent must follow to prevent system regressions, hallucinated fixes, and well-intentioned but destructive refactors.

---

## Core Principle: Chesterton's Fence

> *"Do not remove a fence until you understand why it was built."*

Before deleting, refactoring, or substantially rewriting any existing code, the agent **must** be able to answer:

1. **Why does this code exist?** Trace its origin — git history, comments, related tests, or documented decisions in the memory bank.
2. **What depends on it?** Identify all callers, consumers, and downstream effects.
3. **Is removal in scope?** Removal must be explicitly authorized by the task or be a direct, necessary consequence of the fix.

If any of these questions cannot be answered with certainty, **stop and ask**. Do not proceed under an assumption.

---

## 1. Pre-Task Guardrails

Before writing a single line of code, you MUST:

- [ ] Read all relevant documentation for the area being changed.
- [ ] Physically inspect the files you intend to modify using file-read tools.
- [ ] Verify all file paths exist — never assume a file is at a given location.
- [ ] Review the memory bank (`activeContext.md`, `fixedDoNotBreak.md`, `regressionGuard.md`) for prior decisions affecting this area.
- [ ] Identify which existing tests cover the area being changed.

---

## 2. During-Task Guardrails

- **Thin vertical slices only**: Implement and verify one piece at a time. Do not attempt "Big Bang" rewrites.
- **No speculative cleanup**: Do not refactor code adjacent to your target unless it is directly blocking your task.
- **No silent deletions**: Every line removed must be explicitly accounted for in the session summary.
- **Preserve intent**: If you must change the behavior of a function, document the old behavior and why the new behavior is correct.

---

## 3. Post-Task Mandatory Verification

"Seems right" is categorically insufficient. All of the following must be run and their output confirmed clean:

| Step | Command | Required Result |
|------|---------|-----------------|
| Typecheck | `pnpm run typecheck` | 0 errors |
| Lint | `pnpm run lint` | 0 errors / 0 warnings on changed files |
| Build | `pnpm build` | No fatal errors |
| Tests (if applicable) | `pnpm test` | All passing |

Do not declare a task done until all applicable checks have been executed and their clean output has been recorded.

---

## 4. Mandatory Testing Protocol

When a bug is fixed or a feature is added:

1. **Identify the regression vector**: What scenario would cause this bug to reappear?
2. **Verify the fix is targeted**: The fix addresses the root cause, not a symptom.
3. **Run the full verification suite**: All commands above, not just the ones you think are relevant.
4. **Check adjacent behavior**: Manually or programmatically verify that the code paths *surrounding* the change still behave correctly.
5. **Record in `fixedDoNotBreak.md`**: Any non-obvious fix must be documented in the memory bank so future agents do not accidentally reverse it.

---

## 5. Anti-Rationalization Table

Rationalization is the agent's most dangerous failure mode. The following excuses are categorically rejected:

| AI Excuse | Why It Fails | Required Action |
|-----------|--------------|-----------------|
| "This looks correct based on standard patterns." | Standard patterns don't account for this codebase's specific constraints. | Run the verification suite. Prove it. |
| "I assumed the file was at `src/utils`." | Wrong paths cause silent failures and phantom bugs. | Use glob/grep tools to confirm file existence before referencing. |
| "I'll just rewrite this function to fix the bug." | **Chesterton's Fence violation.** The function may encode hard-won edge-case handling. | Understand the function fully before touching it. Make the minimal change. |
| "The error is probably a glitch, I'll ignore it." | Ignored errors become production incidents. | Stop. Apply the Doubt-Driven Development protocol. Ask if unresolved. |
| "I'll update the memory bank later." | "Later" never comes. Future sessions start without critical context. | Update memory bank atomically with code changes. |
| "The test is flaky, it's fine." | Flaky tests mask real instability. | Investigate the root cause. Do not dismiss. |
| "Removing this won't affect anything." | This is a Chesterton's Fence assumption. | Trace all dependents. Verify. Then remove if safe. |

---

## 6. Incremental Implementation Rule

- Implement in **thin vertical slices**: one behavior, one component, one endpoint at a time.
- Verify each slice before moving to the next.
- Never let the codebase sit in a broken state between slices — each slice must leave the system in a valid, runnable condition.
- If a slice breaks the build, revert it before starting the next slice.
