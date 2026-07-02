# Skill: Create Task

## Purpose
Convert structured plans into actionable, atomic Kanban tasks suitable for tracking progress and execution.

## When to Use
- After a plan is approved
- When breaking down a large epic into manageable tickets
- User requests to create tasks from a list

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`docs/agent/HOW_VIBEFORGE_WORKS.md`)
- [ ] Read the current plan output from `NEXT_ACTION.md`
- [ ] Verify NocoDB schema and connection

## Steps
1. Parse the plan from `NEXT_ACTION.md`
2. Break down broad phases into specific, atomic tasks
3. For each task, define: Title, Description, Type (Feature/Bug/Chore), Priority, Status (Todo)
4. Use `src/lib/nocodb-fields.ts` helpers to ensure correct NocoDB field mapping
5. Save tasks to NocoDB via the API
6. Update `ActiveTodoStrip` with the immediate next tasks

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "One big task is fine" | No, tasks must be small and atomic. Max 4 hours effort. |
| "I'll just remember the details" | Write the context into the task description. |
| "NocoDB is down, I'll just write markdown" | Troubleshoot connection first. NocoDB is the source of truth. |

## Verification (Definition of Done)
- [ ] Tasks are saved successfully to NocoDB
- [ ] Titles map correctly to NocoDB column Titles (not column_names)
- [ ] Every task has clear acceptance criteria
- [ ] Memory bank updated with task creation event

## Output Format
List of created tasks with their IDs, visible in the chat. `ActiveTodoStrip` updated.

## Files Affected
- NocoDB remote records
- `SESSION.md`

## Failure Handling
If NocoDB save fails, check field names (must be Titles). If connection fails, log error and save tasks locally to a `.todo.md` fallback file.
