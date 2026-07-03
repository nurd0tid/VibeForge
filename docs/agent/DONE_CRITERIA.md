# Definition of Done

A task is **ONLY** considered complete when ALL criteria below are met with verifiable evidence. Claims without proof are rejected. "Seems right," "should work," and "I believe it's fixed" are non-answers.

---

## Non-Negotiable Principle: Evidence Over Claims

Do not output: *"I have fixed the issue."*

Output: *"I have fixed the issue. Here is the output of `pnpm run typecheck` showing zero errors: `[paste output]`"*

Every completion statement must be accompanied by command output, tool results, or an observable artifact proving the criterion is satisfied.

---

## 1. Code Integrity

| Check | Command | Required Result |
|-------|---------|-----------------|
| Build | `pnpm build` | Completes with no fatal errors |
| Typecheck | `pnpm run typecheck` | Returns **0 errors** |
| Lint | `pnpm run lint` | Returns **0 errors or warnings** on modified files |

All three must be run and their output pasted as evidence. Skipping any one of these fails the Done criteria.

---

## 2. Runtime Integrity

- **Console Clean**: The browser console must contain zero errors or warnings attributable to the change.
- **No Undefined in Toasts**: All user-facing notifications display valid, human-readable strings. No `undefined`, `null`, or `[object Object]` values.
- **No Silent Failures**: Async operations must have error boundaries or catch blocks that surface failures visibly.

---

## 3. UI/UX Integrity

- **Layout Not Broken**: The change adheres strictly to `UI_LAYOUT_RULES.md`. No overlapping panels, incorrect z-index stacking, or broken flexbox/grid structures.
- **Responsiveness Verified**: Elements scale, collapse, or reflow correctly across viewport sizes.
- **No Visual Regressions**: Existing UI elements unrelated to the change are visually unaffected.

---

## 4. Core Functionality

- **Provider/Model Connectivity**: If agent configurations were modified, at least one successful prompt execution through the AI provider (OpenAI, Anthropic, etc.) must be confirmed.
- **NocoDB Persistence**: Data is accurately written to and read from the database. Fields are accessed using the correct column **Title** keys. `getField()` and `getFieldBool()` helpers are used where appropriate.
- **No Broken Flows**: All user flows connected to the changed surface area (auth, project creation, task execution, etc.) remain fully operational.

---

## 5. Memory Bank Sync (Mandatory)

- The `.vibeforge/memory-bank.md` (and its sub-files) **must** be updated to reflect:
  - What was changed and why.
  - Any new architectural decisions made.
  - Any known issues or follow-up items discovered.
- Memory sync is not optional. An unsynchronized memory bank means the task is **not done**.

---

## 6. Workflow Completeness

- **Doubt-Driven Development Resolved**: Any open doubts raised during the debug cycle have been definitively reconciled — not rationalized away.
- **Regression Guard Passed**: No previously working feature has been broken. See `REGRESSION_GUARD.md`.
- **Files Summarized**: A list of all modified files has been provided in the session update.
- **Remaining Risks Surfaced**: Any incomplete work, known edge cases, or potential follow-up issues are explicitly stated. Do not leave hidden risks.

---

## Done Checklist Template

Use this verbatim when declaring a task complete:

```
## Done Declaration

**Task**: [Task name/description]

**Evidence**:
- `pnpm build`: [PASS / output snippet]
- `pnpm run typecheck`: [PASS / 0 errors]
- `pnpm run lint`: [PASS / 0 warnings]
- Console clean: [Yes / No issues observed]
- Memory bank updated: [Yes — updated activeContext.md, progress.md]

**Files Modified**:
- src/components/Foo.tsx
- src/lib/bar.ts

**Remaining Risks**:
- [None | Or explicit statement of risk]
```
