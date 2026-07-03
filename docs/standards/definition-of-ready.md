# Definition of Ready (DoR)

Before an agent begins work on a task, it must verify the task meets the Definition of Ready. If a task is not ready, the agent must ask for clarification or mark the task as `blocked`.

## Core Requirements

1. **Clear Objective**
   - The primary goal of the task is explicitly stated.
   - The "why" is understood (business value or technical necessity).

2. **Acceptance Criteria**
   - The task contains a bulleted list of verifiable acceptance criteria.
   - Criteria define exactly what "Done" looks like for UI, API, and state.

3. **Context and Documentation**
   - Relevant project documentation or related feature files are linked or referenced in the description.
   - UI mockups, NocoDB schema references, or third-party API docs are available if necessary.

4. **Dependencies Known**
   - If this task depends on another task being completed first, the dependency is documented and the blocking task is in `done` state.
   - Required NocoDB tables exist.

5. **Estimation and Priority**
   - The task has an assigned priority level (Low, Medium, High, Critical).
   - An estimate exists (to help guide timeboxing and scheduling).

6. **Blocker Check**
   - No known blockers exist that would prevent immediate progress.
   - All required API keys, provider access, or environment variables (`.env.local`) are available.

## Agent Pre-Flight Check

Before starting execution, the agent must perform these steps:
- Run `pnpm run typecheck` and `pnpm run lint` on the baseline codebase to ensure the starting point is healthy.
- Ensure the project context (`README.md`, `CLAUDE.md`, `.clinerules`) has been read.
- Read the `.vibeforge/memory-bank.md`.

If the starting point fails checks or the task is incomplete, stop. Do not guess. Request clarification.
