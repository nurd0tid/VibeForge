# Blocker Policy

## Core Principle

No task, feature, or subtask may be marked as **Done** while any unresolved blocker exists. This is a non-negotiable rule enforced across all agents, all sessions, and all project phases.

## What Constitutes a Blocker

A blocker is any condition that prevents the task from meeting its acceptance criteria or shipping safely. Examples include but are not limited to:

| Category | Examples |
|----------|----------|
| **Build & Toolchain** | Broken `pnpm build`, missing dependency, incompatible package version, PostCSS/Tailwind v4 config error |
| **Type Safety** | TypeScript errors, unresolved `any` types in critical paths, Zod v4 schema mismatches |
| **Data Layer** | Unknown or changed NocoDB schema, missing table, incorrect column Title keys, failed API token |
| **Environment** | Missing `.env.local` variable, expired API key, unreachable NocoDB instance |
| **Provider** | AI provider connection failure, invalid model ID, exhausted rate limit |
| **UI/UX** | Component does not match acceptance criteria, missing loading/empty/error states, broken responsive layout |
| **Security** | Secret exposed in client bundle, missing path traversal guard, `NEXT_PUBLIC_` prefix on sensitive value |
| **Branding & Identity** | Old product name, placeholder logos, or legacy copy remaining in UI or docs |
| **Requirements** | Ambiguous or contradictory acceptance criteria that cannot be resolved without user input |

## Required Actions When a Blocker Is Identified

1. **Immediately** set the task status to `blocked` in NocoDB.
2. Create a structured blocker record in the NocoDB `blockers` table with:
   - `task_id` (linked to the blocked task)
   - `blocker_type` (build, type, data, env, provider, ui, security, branding, requirements)
   - `description` (precise technical detail)
   - `severity` (critical, high, medium)
   - `suggested_resolution` (actionable next step)
3. Document the blocker in the current session's `daily_logs` entry.
4. Suggest the next safe, unblocked action the agent can take.
5. If another task is unblocked, transition to it immediately; do not idle.

## Strict Prohibitions

- **Never** suppress, hide, or minimize a blocker.
- **Never** mark a task as Done, in-review, or shipped while a blocker is open.
- **Never** claim implementation is complete when acceptance criteria are partially met.
- **Never** skip logging a blocker to "save time" or "clean up later."
- **Never** attempt to work around a security blocker without explicit user approval.

## Blocker Resolution

A blocker is resolved only when:
1. The root cause is fixed and verified (build passes, type checks pass, UI renders correctly).
2. The blocker record in NocoDB is updated with `resolved: true` and a resolution summary.
3. The task status is transitioned back to `in-progress` or `in-review`.

## Escalation

If a blocker cannot be resolved by the agent (e.g., requires user credentials, external service access, or architectural decision), the agent must:
1. Clearly state the blocker in the chat output.
2. Provide all relevant context so the user can act.
3. Halt work on the blocked task until the user responds.
