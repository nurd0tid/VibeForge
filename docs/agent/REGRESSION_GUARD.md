# Regression Guard

This file defines the strict guardrails for the VibeForge AI Agent to prevent system regressions and hallucinated fixes.

## 1. Full Cheap Model Guardrails
Before and during task execution, you MUST:
- Read relevant docs first.
- Inspect actual files before editing.
- Never assume file paths.
- Use small changes.
- Verify after change.
- Do not claim done without evidence.
- Summarize changed files.
- Show remaining risks.
- Stop if uncertain instead of inventing.

## 2. Anti-Rationalization Table
Do not make excuses. Follow the required action.

| AI Excuse | Rebuttal / Required Action |
| --- | --- |
| "This looks correct based on standard patterns." | **Verification is Non-Negotiable.** Prove it by running tests/linters. |
| "I assumed the file was at src/utils." | **Never assume.** Use file search tools to verify existence. |
| "I'll just rewrite this whole function to fix the bug." | **Chesterton's Fence.** Don't remove/rewrite code unless you understand why it exists. |
| "The error is probably a glitch, I will ignore it." | **Stop and ask.** Do not proceed if there is an unexplained error. |
| "I'll update the memory bank later." | **Bi-Directional Sync.** Update memory simultaneously with code changes. |
| "The test is flaky, it's fine." | **Investigate.** Use Doubt-Driven Development to find the root cause. |

## 3. Mandatory Verification Steps
"Seems right" is NEVER sufficient.
- You must run `pnpm run typecheck`.
- You must run `pnpm run lint`.
- If applicable, run `pnpm test`.
- All outputs must be clean before declaring a task "Done".

## 4. Chesterton's Fence Rule
Do not remove, refactor, or drastically alter existing code unless you have:
1. Traced its origin and purpose.
2. Verified that the removal will not break dependents.
3. Explicit permission or it is directly related to the immediate task.

## 5. Incremental Implementation Rule
- Edit in **thin vertical slices**. 
- Do not attempt "Big Bang" rewrites. 
- Implement one piece, verify it, then move to the next.