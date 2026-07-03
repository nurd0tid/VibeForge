---
name: schedule-breakdown
description: Convert a high-level plan into a structured schedule by assigning dates, estimating durations, and creating schedule records in NocoDB.
---

# Overview
Takes approved plans and tasks, estimates durations based on task sizing, assigns start/end dates, resolves dependency ordering, creates schedule records in NocoDB, and documents the timeline.

# When to Use
- After a plan is approved and tasks are created
- Before starting a new sprint or development cycle
- User requests to schedule tasks on a timeline

# Process
1. Parse the plan and tasks to estimate durations and dependencies
2. Assign start and end dates based on velocity and capacity
3. Map dates and durations to NocoDB columns (using column Title as key)
4. Check for scheduling conflicts or resource bottlenecks
5. Create schedule records in NocoDB
6. Update `ActiveTodoStrip` with dates
7. Document the schedule in `SESSION.md`
8. Update memory bank with schedule overview

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "Dates don't matter, we just go task by task" | Schedules build accountability and help manage expectations. |
| "I'll just guess the dates" | Use actual task size (S/M/L) and developer velocity. |
| "Conflicts aren't my problem" | Resolving dependency order is a core step in scheduling. |
| "I'll skip NocoDB and just write a table in chat" | Schedule records must be in NocoDB so other views can consume them. |

# Red Flags
- Schedule records saved with `column_name` keys instead of column Title keys
- Dependency conflicts left unresolved in the schedule
- Dates assigned without considering task size or velocity
- Schedule not committed to NocoDB

# Verification
- [ ] Start/end dates assigned to all tasks
- [ ] Schedule records successfully saved in NocoDB
- [ ] No dependency conflicts in the schedule
- [ ] Build passes
- [ ] No undefined/null errors in data mapping
- [ ] Memory bank updated with schedule overview
