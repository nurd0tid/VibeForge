# Skill: Bug Fix

## Purpose
Systematically diagnose, isolate, fix, and verify bugs to prevent recurrence and regressions.

## When to Use
- User reports a bug, error, or unexpected behavior
- Tests fail
- Resolving an issue assigned in NocoDB

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`docs/agent/REGRESSION_GUARD.md`)
- [ ] Gather error logs or specific steps to reproduce
- [ ] Search codebase for related files and past fixes

## Steps
1. Reproduce the bug (mentally trace or run dev server if instructed)
2. Isolate the root cause by reading relevant files
3. Formulate a hypothesis and verify against the code
4. Implement the fix using the `edit_file` tool (minimal necessary changes)
5. Add or update tests if applicable to prevent regression
6. Verify the fix (run lint, typecheck, or tests)
7. Perform a regression check on adjacent features

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "I think this is the cause" | No. Prove it with evidence from logs or code tracing. |
| "This quick hack will do" | No. Find the root cause, fix it properly. |
| "I don't need to check related files" | Yes you do. Check for side effects of your change. |

## Verification (Definition of Done)
- [ ] Root cause identified and documented in chat
- [ ] Fix applied via `edit_file`
- [ ] Build passes (`pnpm build` or `pnpm run typecheck`)
- [ ] No undefined/null errors introduced
- [ ] Lint passes (`pnpm run lint`)
- [ ] Memory bank updated with bug resolution details

## Output Format
Explanation of root cause, inline diff of fix, and confirmation of verification steps passed.

## Files Affected
- Source files containing the bug
- Test files (if applicable)
- `.vibeforge/memory-bank/progress.md`

## Failure Handling
If the fix breaks the build or fails tests, revert the change immediately. Re-evaluate the root cause. Do not blindly attempt multiple guesses. Ask user for clarification if stuck.
