# RECOVERY.md — Recovering From Context Loss

Use this document whenever the AI session resets or context has been lost. Follow these steps in order to restore full situational awareness before continuing work.

## Step-by-Step Recovery Protocol

1. Read `README.md` — Get a high-level understanding of the project.
2. Read `AGENTS.md` — Reload all project rules, structure, and constraints.
3. Read `CLAUDE.md` — Load agent-specific configuration.
4. Read `.clinerules` — Load workflow rules and done criteria.
5. Read `SESSION.md` — Understand the current phase, key changes, and active blockers.
6. Read `NEXT_ACTION.md` — Identify the next concrete task to continue.
7. Check latest **Daily Logs** in NocoDB — Understand what was accomplished most recently.
8. Check latest **Task Status** in NocoDB — Identify pending/in-progress tasks.
9. Read `docs/ai/project-context.md` — Understand the current architectural state.
10. Continue from the newest unfinished task found in step 8.

## Verifying State Before Continuing

If the state of the project is unclear, always verify the following before claiming any task is complete:

| Check | How to Verify |
|-------|--------------|
| Build | `pnpm build` |
| TypeScript | `pnpm run typecheck` |
| Lint | `pnpm run lint` |
| NocoDB Logs | Review the `daily_logs` and `agent_runs` tables |
| Acceptance Criteria | Check the task description in `tasks` table |
| UI State | Verify loading, error, and empty states exist |
| Blockers | Check `SESSION.md` current blockers section |

## After Recovery

Once context is restored, update `SESSION.md` with:
- Current phase
- Current active task
- Any blockers discovered
- Next planned action
