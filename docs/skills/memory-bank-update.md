---
name: memory-bank-update
description: Systematically update the project's memory bank files after task completion to ensure absolute alignment, track decisions, and keep context fresh.
---

# Overview
Updates active context, progress tracking, decision logs, and project context files in the memory bank, ensuring they align with the latest codebase status.

# When to Use
- Triggered by `UMB` keyword or task completion
- Significant architectural decisions are made
- Active context, progress, or decisions change

# Process
1. Read `activeContext.md`, `progress.md`, and `decisionLog.md` to see the baseline
2. Identify completed tasks, new technical decisions, and current focus areas
3. Update `activeContext.md` with current focus and active task status
4. Update `progress.md` with completed features and new tasks
5. Document any architectural or critical code design decisions in `decisionLog.md`
6. Write a detailed entry to `updateLog.md` summarizing what changed
7. Sync changes with local context files `SESSION.md` and `NEXT_ACTION.md`

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "Memory is already up to date" | Check the files first, don't assume. Read to verify. |
| "The changes are too minor to document" | Small updates prevent the memory bank from decaying. |
| "I'll just summarize in chat" | Chat is volatile. The memory bank is the persistent source of truth. |
| "I'll update memory bank at the very end" | Update incrementally so progress is not lost if a crash occurs. |

# Red Flags
- Inconsistent information between `activeContext.md` and `progress.md`
- Architectural decisions made without entry in `decisionLog.md`
- No summary entry written to `updateLog.md`
- Context files out of sync with actual codebase state

# Verification
- [ ] Memory bank files accurately reflect project state
- [ ] No inconsistent info between `activeContext.md` and `progress.md`
- [ ] Entry added to `updateLog.md`
- [ ] Build passes
- [ ] No undefined/null errors in context mapping
- [ ] Memory bank successfully synchronized with local files
