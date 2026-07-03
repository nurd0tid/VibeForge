# Skills Index

Skills in VibeForge are **Process over Prose** — they are strict, step-by-step workflows with explicit entry conditions, checkpoints, and exit criteria. They ensure the agent acts systematically and repeatably.

---

## 1. context-engineering
- **Purpose**: Manage token usage and optimize context loading.
- **When to Use**: Approaching token limits, starting a new complex feature, or when the agent experiences slow response times.
- **Steps**:
  1. Inspect current context size and token gauge.
  2. If token usage exceeds 80%, execute the `/compact` command.
  3. Load only the files required for the immediate next step (Progressive Disclosure).
- **Verification**: Token gauge is in a healthy range (below 60% after compaction).
- **Failure Condition**: Context window remains saturated — prompt the user to segment the task.

---

## 2. frontend-ui-engineering
- **Purpose**: Build layout, components, and interactive interfaces.
- **When to Use**: Any task modifying user interface files.
- **Steps**:
  1. Review `UI_LAYOUT_RULES.md` and tailwind conventions.
  2. Inspect neighboring components to mimic code conventions (imports, components, typing).
  3. Implement UI incrementally in thin vertical slices.
  4. Manually or programmatically verify responsiveness, z-index, and scroll containment.
- **Verification**: Build passes, no console errors, layout constraints satisfied.
- **Files Affected**: `src/components/*`, `src/app/*`.

---

## 3. structured-file-editing
- **Purpose**: Safely and precisely modify source files without destructive overwrites.
- **When to Use**: Every task requiring file modification.
- **Steps**:
  1. Inspect the target file using read tools.
  2. Identify the exact block of code to modify.
  3. Execute changes via the `edit_file` tool to generate an inline diff.
  4. Ensure Chesterton's Fence rule is respected (no code removed without tracing its purpose).
- **Verification**: Inline diff matches desired changes exactly. Typecheck, lint, and build pass.

---

## 4. diff-viewer
- **Purpose**: Verify correctness of code changes before final application.
- **When to Use**: Immediately after proposing an edit via structured-file-editing.
- **Steps**:
  1. Verify the absolute or relative file path in the diff header.
  2. Inspect removed (red) and added (green) lines.
  3. Toggle side-by-side view if complex changes require spatial verification.
  4. Pause for user approval if "Manual Approve" mode is active.
- **Verification**: Diff shows only the intended modifications.

---

## 5. task-play-workflow
- **Purpose**: Execute standard tasks from start to finish.
- **When to Use**: Default workflow for any incoming user request.
- **Steps**: Define → Plan → Build → Verify → Review → Ship.
- **Verification**: Done criteria met, evidence provided.

---

## 6. nocodb-persistence
- **Purpose**: Interact with the NocoDB backend safely and consistently.
- **When to Use**: Modifying data structures, fetching, or writing data to database tables.
- **Steps**:
  1. Verify the NocoDB schema and column Titles.
  2. Access fields strictly using the Column Title key format (e.g., `record['Field Name']`).
  3. Use `getField` and `getFieldBool` helper functions from `src/lib/nocodb-fields.ts`.
- **Verification**: Write operations persist; read operations retrieve expected values.

---

## 7. memory-bank-update
- **Purpose**: Maintain the project's long-term context and knowledge base.
- **When to Use**: Atomic with completion of any task, or at session start/end.
- **Steps**:
  1. Scan modified files and decisions made in the current session.
  2. Update relevant Memory Bank sub-files (e.g., `activeContext.md`, `progress.md`, `fixedDoNotBreak.md`).
  3. Log modifications in `updateLog.md`.
- **Verification**: Updates are successfully committed to `.vibeforge/memory-bank.md` and related files.

---

## 8. mcp-tooling
- **Purpose**: Leverage Model Context Protocol servers for external capability.
- **When to Use**: Executing tasks that require third-party tools, APIs, or database connections.
- **Steps**:
  1. Verify MCP settings in `.vibeforge/mcp.json`.
  2. Query MCP tools based on task descriptions.
  3. Maintain credentials securely (never write API keys to disk).

---

## 9. debugging-and-error-recovery
- **Purpose**: Systematically isolate and resolve codebase bugs.
- **When to Use**: When tests fail, build errors occur, or unexpected behavior is reported.
- **Steps**: Follow the Doubt-Driven Development protocol: CLAIM → EXTRACT → DOUBT → RECONCILE → STOP.
- **Verification**: The bug is isolated, a targeted fix is applied, and regression checks pass.

---

## 10. regression-guard
- **Purpose**: Protect existing functionality from unintended side effects.
- **When to Use**: Prior to committing any code modifications.
- **Steps**:
  1. Run the full verification suite (lint, typecheck, build).
  2. Compare new state against the instructions in `fixedDoNotBreak.md`.
  3. Verify adjacent code paths behavior manually or via tests.
- **Verification**: Zero warnings, 0 typecheck errors, successful build.

---

## 11. documentation-update
- **Purpose**: Keep project documentation accurate and synchronized with the codebase.
- **When to Use**: When editing or introducing features that change user interfaces, setup workflows, or architecture.
- **Steps**: Update markdown files under `docs/` using the structured-file-editing skill.

---

## 12. definition-of-done
- **Purpose**: Standardize the final checkpoint before task completion.
- **When to Use**: Declaring a task complete. See `DONE_CRITERIA.md`.
