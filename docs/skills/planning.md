# Skill: Planning

## Purpose
Generate structured, phased task plans before any implementation begins. Ensures work is scoped correctly and broken into executable chunks.

## When to Use
- User asks to plan a feature, epic, or sprint
- Starting a new module or significant refactor
- Before writing any code for a non-trivial change

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read `docs/agent/HOW_VIBEFORGE_WORKS.md`
- [ ] Read `SESSION.md` and `NEXT_ACTION.md`
- [ ] Read memory bank: `activeContext.md`, `progress.md`
- [ ] Inspect relevant source files before estimating effort

## Steps
1. Read all pre-condition files listed above
2. Clarify scope: what is in, what is out
3. Identify affected modules and files by searching the codebase
4. Break work into phases (e.g., Phase 1: Data layer, Phase 2: UI, Phase 3: Tests)
5. Break each phase into atomic tasks (max 2-4 hours each)
6. Estimate effort per task (S/M/L)
7. Identify dependencies and blockers
8. Write plan to `NEXT_ACTION.md` and surface in chat

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I can estimate without reading the code" | No. Always inspect actual files before estimating. |
| "The scope is obvious" | Confirm it in writing anyway. Unwritten scope drifts. |
| "I'll break it down as I go" | No. Plan first, then act. Surprises mid-task cause regressions. |
| "This is too small to plan" | If it touches more than one file, it needs a plan. |

## Verification (Definition of Done)
- [ ] Plan is written and visible in chat
- [ ] Every task is ≤ one logical unit of work
- [ ] Dependencies are listed
- [ ] `NEXT_ACTION.md` is updated
- [ ] Memory bank updated with new scope context

## Output Format
Markdown plan with phases, tasks, effort estimates, and dependency notes saved to `NEXT_ACTION.md`.

## Files Affected
- `NEXT_ACTION.md`
- `SESSION.md`
- `.vibeforge/memory-bank/activeContext.md`

## Failure Handling
If scope cannot be determined from existing files, ask the user one clarifying question before proceeding. Do not guess scope.
