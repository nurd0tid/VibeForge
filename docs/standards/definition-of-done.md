# Definition of Done (DoD)

A task in VibeForge is considered **Done** only when it passes the strict criteria outlined below. No exceptions are allowed.

## Core Rules

1. **Acceptance Criteria Verification**
   - Every bullet point in the task's acceptance criteria must be completely implemented, verified, and functioning.
   - Any deviation must be explicitly approved by the user and documented.

2. **No Unresolved Blockers**
   - The task must not have any associated active blocker records in NocoDB.
   - All blocker issues (build failures, type errors, environment issues) must be resolved.

3. **Build & Quality Pipeline**
   - The production build must succeed (`pnpm build`).
   - TypeScript checking must pass without errors (`pnpm run typecheck`).
   - ESLint checking must pass without warnings or errors (`pnpm run lint`).
   - Standard code formatting must be enforced.

4. **UI State & Resilience**
   - Components must handle all states:
     - **Loading State:** Skeletons or spinners show while fetching.
     - **Empty State:** Clean, user-friendly UI for zero records.
     - **Error State:** Clear, non-technical error alerts or banners.
     - **Success/Feedback State:** Toast notifications (`sonner`) for non-destructive actions.
     - **Confirmation Dialogs:** Destructive actions (delete, reset) require a confirmation modal (`sweetalert2` or shadcn dialog).

5. **Data Layer Integration**
   - NocoDB records are modified or created using the proper column Title keys (`getField()` and `getFieldBool()`).
   - Optimistic UI updates or cache invalidations via TanStack Query are implemented to prevent lag.

6. **Agent Artifacts & Logging**
   - A detailed NocoDB `daily_logs` entry is created.
   - The NocoDB `project_context_updates` table is populated if any schemas, APIs, or settings changed.
   - The workspace memory bank (`.vibeforge/memory-bank.md`) is updated if necessary.

7. **Security & Branding Integrity**
   - No sensitive information (API keys, passwords, database tokens) is leaked or hardcoded.
   - No console logs or trace logs exist in production paths.
   - No outdated branding or placeholder copy remains in the codebase.
   - Path validation checks are applied to all file system endpoints.

## Quick DoD Checklist

- [ ] All acceptance criteria met
- [ ] No blockers open
- [ ] `pnpm build` passes
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] Loading/Empty/Error/Success UI states handled
- [ ] Confirmation for destructive actions
- [ ] NocoDB queries use Title case fields
- [ ] Daily log and context updates completed
- [ ] Secrets and console logs removed
- [ ] Correct branding verified
