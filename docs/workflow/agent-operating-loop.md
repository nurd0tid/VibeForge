# Agent Operating Loop

Agents operating within VibeForge must strictly adhere to the following execution loop to prevent incomplete implementations, hallucinated code, or untracked changes.

## The 14-Step Loop

1. **Context Initialization & Verification:** 
   Locate and ingest the core documents (`README.md`, `CLAUDE.md`, `AI.md`, `.clinerules`, `NEXT_ACTION.md`, and `.vibeforge/memory-bank.md`). Validate that the current platform, dependencies, and environment are fully loaded.
2. **Task Identification:** 
   Query the NocoDB `tasks` table to pull the current active ticket (`in-progress`). Identify its scope and constraints.
3. **Acceptance Criteria Verification:** 
   Extract the strict acceptance criteria of the task. Check for edge cases, performance considerations, and responsive/styling rules (Tailwind CSS v4).
4. **Documentation Lookup (Context7):** 
   For any library, framework, or API integration (even standard ones like Next.js 16, `@base-ui/react`, or Tailwind v4), invoke the `Context7` tool to fetch correct version-specific syntax. Never write code based on stale training data.
5. **Sequential Thinking Execution:** 
   Run detailed analysis (using the sequential thinking tool) to map code changes, potential regressions, schema alterations, and layout implications before editing.
6. **Task Plan Creation:** 
   Draft a clear implementation step list and store it in NocoDB `task_plans`.
7. **Implementation:** 
   Make surgical, high-quality, comment-free code changes. Follow the Next.js 16 App Router folder structure and hook-form resolver typings.
8. **Automated Linting & Type-Checking:** 
   Execute local commands (`pnpm run typecheck`, `pnpm run lint`) to catch syntax, import, and type issues immediately.
9. **UI & State Validation:** 
   Confirm state flow (Zustand/TanStack Query) handles loading, empty, and error scenarios. Check accessibility constraints.
10. **Regression Guard Review:** 
    Confirm no existing behavior was broken and that no branding or security rules were violated.
11. **Session Logging:** 
    Write a structured entry into NocoDB `daily_logs` detailing files touched and current status.
12. **Context Synchronization:** 
    If architecture, DB tables, schemas, or env variables were modified, document them in NocoDB `project_context_updates` and update the local memory bank.
13. **Task Status Mutation:** 
    Update the task status in NocoDB. If successfully verified, set to `in-review`. If blocked, transition to `blocked` (see blocker policy).
14. **Next Loop Transition:** 
    Clean up workspace workspace states, reset query caches, and proceed to the next ready task.
