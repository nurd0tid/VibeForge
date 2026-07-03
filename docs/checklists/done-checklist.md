# Done Checklist

This checklist defines the strict definition of done for any task, feature, or bug fix implemented in VibeForge. No task may be marked as complete in the UI, NocoDB, or to the user until every checkbox in this document is verified.

---

## 1. Acceptance Criteria Verification

- [ ] **Functional Match**: The implemented solution exactly matches the description and criteria defined in the task record.
- [ ] **No Remaining Blockers**: Every blocker listed in the `blockers` table for this task has its status set to `resolved` and the `resolved_at` timestamp set.
- [ ] **Done Condition**: The task's specific checklist is 100% checked.
- [ ] **No regressions**: Verify that existing features are not broken by the change (`REGRESSION_GUARD.md` passed).

---

## 2. Technical Validation

- [ ] **Build Check**: Run `pnpm build` successfully without errors or warnings. Output must be provided as evidence.
- [ ] **Typecheck**: Run `pnpm run typecheck` successfully. No TypeScript compilation errors (`tsc` must exit with `0`). Output must be provided as evidence.
- [ ] **Lint**: Run `pnpm run lint` successfully. No ESLint errors or warnings on modified files. Output must be provided as evidence.
- [ ] **No Console Logs**: Remove all `console.log()` calls used during development (unless explicitly required for production logging).
- [ ] **Error Handling**: Every API route, database call, and async operation is wrapped in a try/catch block or error boundary with graceful error recovery. No silent failures.
- [ ] **Path Validation**: Verify all file paths exist—no assumptions about file locations.

---

## 3. UI/UX and State Integrity

- [ ] **UI States**: Loading, error, empty, and success states are properly handled and visually distinct.
- [ ] **No Undefined in UI/Toasts**: All user-facing notifications and UI elements display valid, human-readable strings. No `undefined`, `null`, or `[object Object]` values.
- [ ] **Layout Intact**: No overlapping panels, incorrect z-index stacking, or broken flexbox/grid structures.
- [ ] **Responsiveness**: Elements scale, collapse, or reflow correctly across viewport sizes.

---

## 4. Persistent Records and Data

- [ ] **NocoDB Persistence**: Verify all data created or modified is saved in the NocoDB instance.
- [ ] **NocoDB Key Validation**: NocoDB fields are accessed using the correct column **Title** keys (e.g., `record['Field Name']`), and helpers like `getField()`/`getFieldBool()` are used appropriately.
- [ ] **No Secrets Leak**: Verify no API keys, credentials, or secrets are logged to the console, exposed in the client-side UI, or committed to the repository.
- [ ] **Context Update**: Update `.vibeforge/memory-bank.md` (and sub-files like `activeContext.md`, `progress.md`) to reflect the changes, architectural decisions, and remaining risks.
- [ ] **Summary of Changes**: Prepare a clear list of files modified during the session for the final update.
