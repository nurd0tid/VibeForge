---
name: planning
description: Generate structured, phased task plans before any implementation begins. Ensures work is scoped correctly and broken into executable chunks.
---

# Overview
Reads context and source files, defines in-scope and out-of-scope boundaries, breaks work into phased atomic tasks, estimates efforts, and updates context files.

# When to Use
- User asks to plan a feature, epic, or sprint
- Starting a new module or significant refactor
- Before writing any code for a non-trivial change

# Process
1. Read AGENTS.md, memory bank files, `docs/agent/HOW_VIBEFORGE_WORKS.md`, `SESSION.md`, and `NEXT_ACTION.md`
2. Clarify scope: what is in and what is out
3. Identify affected modules and files by searching the codebase
4. Break work into phases (e.g., Phase 1: Data layer, Phase 2: UI, Phase 3: Tests)
5. Break each phase into atomic tasks (max 2-4 hours each)
6. Estimate effort per task (S/M/L)
7. Identify dependencies and blockers
8. Write plan to `NEXT_ACTION.md` and surface in chat
9. Update memory bank with new plan context

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "I can estimate without reading the code" | Always inspect actual files before estimating. |
| "The scope is obvious" | Confirm it in writing anyway. Unwritten scope drifts. |
| "I'll break it down as I go" | Plan first, then act. Surprises mid-task cause regressions. |
| "This is too small to plan" | If it touches more than one file, it needs a plan. |

# Red Flags
- Code changes started before plan is written and approved
- Tasks are larger than 4 hours or contain multiple logical units of work
- Estimations done without examining the destination files first
- Dependencies or potential blockers ignored in plan

# Verification
- [ ] Plan is written and visible in chat
- [ ] Every task is ≤ one logical unit of work
- [ ] Dependencies and blockers are explicitly listed
- [ ] `NEXT_ACTION.md` is updated with phases and tasks
- [ ] Memory bank updated with new scope context
