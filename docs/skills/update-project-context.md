---
name: update-project-context
description: Maintain the accuracy of project context files, capturing changes to scope, constraints, decisions, and system configuration.
---

# Overview
Reads all project context files, identifies what has changed since the last update, writes accurate updates to memory bank and session files, and logs every change.

# When to Use
- Starting a new work session
- Ending a work session
- Significant changes to system architecture, dependencies, or project rules

# Process
1. Read the current memory bank files: `activeContext.md`, `progress.md`, `decisionLog.md`, `productContext.md`
2. Identify changes: features completed, architectural decisions, new blockers, next actions
3. Update memory bank files to reflect the exact current state
4. Write log entry in `updateLog.md`
5. Document any new constraints or environment setup details
6. Sync the updates with `SESSION.md` and `NEXT_ACTION.md`

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "I remember the changes, no need to write them down" | Other agents and the user need this context. Write it down. |
| "The context hasn't changed much" | Even minor changes to progress need to be updated. |
| "I'll just do a quick commit" | Context updates must be structured and thorough. |
| "I'll update at the very end" | Incremental updates prevent data loss on interruption. |

# Red Flags
- Context files contradict current codebase state
- Session started without reading context files first
- `updateLog.md` not updated after significant changes
- `SESSION.md` and `NEXT_ACTION.md` out of sync with memory bank

# Verification
- [ ] Memory bank files match the actual state of the project
- [ ] All changes are documented in `updateLog.md`
- [ ] Build passes
- [ ] No undefined/null errors in context links
- [ ] `SESSION.md` and `NEXT_ACTION.md` synced with memory bank
