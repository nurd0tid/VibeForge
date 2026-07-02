# Skill: Update Project Context

## Purpose
Maintain the accuracy of project context files, capturing changes to scope, constraints, decisions, and system configuration.

## When to Use
- Starting a new work session
- Ending a work session
- Significant changes to system architecture, dependencies, or project rules

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`CLAUDE.md`, `.clinerules`)
- [ ] Review recent commits, NocoDB status, and file changes
- [ ] Verify you have the correct file paths for context files

## Steps
1. Read the current memory bank files: `activeContext.md`, `progress.md`, `decisionLog.md`, `productContext.md`
2. Identify changes: features completed, architectural decisions, new blockers, next actions
3. Update memory bank files to reflect the exact current state
4. Write log entry in `updateLog.md` or equivalent
5. Document any new constraints or environment setup details
6. Sync the updates with `SESSION.md` and `NEXT_ACTION.md`

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "I remember the changes, no need to write them down" | Other agents and the user need this context. Write it down. |
| "The context hasn't changed much" | Even minor changes to progress need to be updated. |
| "I'll just do a quick commit" | Context updates must be structured and thorough. |

## Verification (Definition of Done)
- [ ] Memory bank files match the actual state of the project
- [ ] All changes are documented
- [ ] Build passes
- [ ] No undefined/null errors in context links
- [ ] Memory bank updated

## Output Format
Summary of context files updated, highlighting key changes, printed to chat.

## Files Affected
- `.vibeforge/memory-bank/activeContext.md`
- `.vibeforge/memory-bank/progress.md`
- `.vibeforge/memory-bank/decisionLog.md`
- `.vibeforge/memory-bank/productContext.md`
- `SESSION.md`, `NEXT_ACTION.md`

## Failure Handling
If context files are out of sync or conflict, trace the git history to reconstruct the correct state. Ask the user for clarification if necessary.
