# Skill: Memory Bank Update

## Purpose
Systematically update the project's memory bank files after task completion to ensure absolute alignment, track decisions, and keep context fresh.

## When to Use
- Triggered by `UMB` keyword or task completion
- Significant architectural decisions are made
- Active context, progress, or decisions change

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`, `decisionLog.md`, `productContext.md`)
- [ ] Check relevant docs
- [ ] Review current files in `.vibeforge/memory-bank/`
- [ ] Review recent code changes, tests, and NocoDB updates

## Steps
1. Read `activeContext.md`, `progress.md`, and `decisionLog.md` to see the baseline
2. Identify completed tasks, new technical decisions, and current focus areas
3. Update `activeContext.md` with current focus and active task status
4. Update `progress.md` with completed features and new tasks
5. Document any architectural or critical code design decisions in `decisionLog.md`
6. Write a detailed entry to `updateLog.md` summarizing what changed
7. Sync changes with local context files `SESSION.md` and `NEXT_ACTION.md`

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "Memory is already up to date" | Check the files first, don't assume. Read the content to verify. |
| "The changes are too minor to document" | Small updates prevent the memory bank from decaying. |
| "I'll just summarize in chat" | Chat is volatile. The memory bank is the persistent source of truth. |

## Verification (Definition of Done)
- [ ] Memory bank files accurately reflect project state
- [ ] No inconsistent info between `activeContext.md` and `progress.md`
- [ ] Entry added to `updateLog.md`
- [ ] Build passes
- [ ] No undefined/null errors in context mapping
- [ ] Memory bank successfully synchronized

## Output Format
List of memory bank files updated and a summary of the sync, printed to chat.

## Files Affected
- `.vibeforge/memory-bank/activeContext.md`
- `.vibeforge/memory-bank/progress.md`
- `.vibeforge/memory-bank/decisionLog.md`
- `.vibeforge/memory-bank/updateLog.md`
- `SESSION.md`, `NEXT_ACTION.md`

## Failure Handling
If memory bank files are corrupted or missing, use `/init-memory` to re-initialize the memory bank, then manually reconstruct the state from git history.
