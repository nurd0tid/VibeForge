# Skill: Schedule Breakdown

## Purpose
Convert a high-level plan into a structured schedule by assigning dates, estimating durations, and creating schedule records in NocoDB.

## When to Use
- After a plan is approved and tasks are created
- Before starting a new sprint or development cycle
- User requests to schedule tasks on a timeline

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs
- [ ] Read the plan from `NEXT_ACTION.md`
- [ ] Retrieve list of tasks created in NocoDB

## Steps
1. Parse the plan and tasks to estimate durations and dependencies
2. Assign start and end dates based on velocity and capacity
3. Map dates and durations to NocoDB columns (using column Title as key)
4. Check for scheduling conflicts or resource bottlenecks
5. Create schedule records in NocoDB
6. Update `ActiveTodoStrip` with dates
7. Document the schedule in `SESSION.md`

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "Dates don't matter, we just go task by task" | Schedules build accountability and help manage client expectations. |
| "I'll just guess the dates" | Use actual task size (S/M/L) and developer velocity. |
| "Conflicts aren't my problem" | Resolving dependency order is a core step in scheduling. |

## Verification (Definition of Done)
- [ ] Start/end dates assigned to all tasks
- [ ] Schedule records successfully saved in NocoDB
- [ ] Build passes
- [ ] No undefined/null errors in data mapping
- [ ] Memory bank updated with schedule overview

## Output Format
Scedule table with Task Title, Start Date, End Date, and Dependencies shown in chat.

## Files Affected
- NocoDB remote records
- `SESSION.md`
- `.vibeforge/memory-bank/progress.md`

## Failure Handling
If dates conflict with dependencies, alert the user and suggest an adjusted timeline. Do not save invalid schedules.
