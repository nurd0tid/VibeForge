# Skills Index

Skills in VibeForge emphasize **Process over Prose**. They are strict step-by-step workflows with explicit entry conditions, checkpoints, and exit criteria. 

## context-engineering
- **Purpose**: Manage token usage and ensure relevant context is loaded.
- **When to Use**: Approaching token limits or starting a new, complex feature.
- **Steps**: 1) Identify current context size, 2) Run `/compact` if needed, 3) Selectively load only necessary files (Progressive Disclosure).
- **Verification**: Check token gauge.
- **Failure**: Context too large -> prompt user to restructure task.

## frontend-ui-engineering
- **Purpose**: Build layout and components.
- **When to Use**: UI tasks.
- **Steps**: 1) Review `UI_LAYOUT_RULES.md`, 2) Build incrementally, 3) Test responsive behavior.
- **Verification**: UI is not broken, no overlaps, correct z-indices.
- **Files Affected**: `src/components/*`, `src/app/*`.

## structured-file-editing
- **Purpose**: Modify files safely.
- **Steps**: 1) Inspect file, 2) Use `edit_file` tool for inline diff, 3) Do not remove code without understanding (Chesterton's Fence).
- **Verification**: Changes pass linting and typing.

## diff-viewer
- **Purpose**: Review changes before applying.
- **Steps**: Ensure diff is rendering correctly in the workspace.

## task-play-workflow
- **Purpose**: Execute predefined action sequences.
- **Steps**: Define -> Plan -> Build -> Verify -> Review -> Ship.

## nocodb-persistence
- **Purpose**: Interact with NocoDB backend safely.
- **Steps**: Use Title keys. Check `getField` helpers.

## memory-bank-update
- **Purpose**: Keep `.vibeforge/memory-bank.md` accurate.
- **When to Use**: Mandatory Bi-Directional Sync after any project change.

## mcp-tooling
- **Purpose**: Leverage MCP servers for external context.

## debugging-and-error-recovery
- **Purpose**: Fix bugs safely.
- **Workflow**: Doubt-Driven Development. CLAIM -> EXTRACT -> DOUBT -> RECONCILE -> STOP.
- **Failure**: If stuck, stop and ask the user. Do not rationalize.

## regression-guard
- **Purpose**: Prevent breaking existing features.
- **Steps**: Run full verification flow. "Seems right" is unacceptable.

## documentation-update
- **Purpose**: Keep docs fresh.

## definition-of-done
- **Purpose**: Final verification checkpoint. See `DONE_CRITERIA.md`.