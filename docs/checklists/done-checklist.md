# Done Checklist

This checklist defines the strict definition of done for any task, feature, or bug fix implemented in VibeForge. No task may be marked as complete in the UI, NocoDB, or to the user until every checkbox in this document is verified.

---

## 1. Acceptance Criteria Verification

- [ ] **Functional Match**: The implemented solution exactly matches the description and criteria defined in the task record.
- [ ] **No Remaining Blockers**: Every blocker listed in the `blockers` table for this task has its status set to `resolved` and the `resolved_at` timestamp set.
- [ ] **Done Condition**: The task's checklist is 100% checked.
- [ ] **No regressions**: Verify that existing features are not broken by the change.

---

## 2. Technical Validation

- [ ] **Build Check**: Run `pnpm build` successfully without errors or warnings.
- [ ] **Typecheck**: Run `pnpm run typecheck` successfully. No TypeScript compilation errors (`tsc` must exit with `0`).
- [ ] **Lint**: Run `pnpm run lint` successfully. No ESLint errors.
- [ ] **No Console Logs**: Remove all `console.log()` calls used during development (unless explicitly required for production logging).
- [ ] **Error Handling**: Every API route and database call is wrapped in a try/catch block with graceful error recovery.

---

## 3. Persistent Records

- [ ] **NocoDB Persistence**: Verify all data created or modified is saved in the NocoDB instance, not just in local/client state.
- [ ] **Daily Log Entry**: Create or update the `daily_logs` record in NocoDB summarizing the work completed on the task.
- [ ] **Context Update**: If the change involves architectural decisions, schema changes, or API updates, create a record in `project_context_updates` to update the project context.
- [ ] **Summary of changes**: Prepare a clear list of files modified during the session for the final update.
