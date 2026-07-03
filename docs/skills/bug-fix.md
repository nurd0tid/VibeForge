---
name: bug-fix
description: Systematically diagnose, isolate, fix, and verify bugs to prevent recurrence and regressions.
---

# Overview
Identifies the root cause of a reported bug, applies a minimal focused fix, and verifies the resolution without introducing regressions.

# When to Use
- User reports a bug, error, or unexpected behavior
- Tests fail
- Resolving an issue assigned in NocoDB

# Process
1. Reproduce the bug (mentally trace or run dev server if instructed)
2. Isolate the root cause by reading relevant files
3. Formulate a hypothesis and verify against the code
4. Implement the fix using the `edit_file` tool (minimal necessary changes)
5. Add or update tests if applicable to prevent regression
6. Verify the fix (run `pnpm run lint`, `pnpm run typecheck`)
7. Perform a regression check on adjacent features
8. Update memory bank with bug resolution details

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "I'll fix the other issues later" | No. Do it now or log it as a blocker. |
| "I think this is the cause" | Prove it with evidence from logs or code tracing. |
| "This quick hack will do" | Find the root cause and fix it properly. |
| "I don't need to check related files" | Check for side effects. Adjacent code may break. |

# Red Flags
- Fix applied without reproducing the bug first
- Multiple guesses attempted without identifying root cause
- Build or lint fails after the fix is applied
- Adjacent features untested after the change

# Verification
- [ ] Root cause identified and documented in chat
- [ ] Fix applied via `edit_file` with minimal scope
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] No undefined/null errors introduced
- [ ] Memory bank updated with bug resolution details
