---
name: create-task
description: Convert structured plans into actionable, atomic Kanban tasks suitable for tracking progress and execution.
---

# Overview
Parses an approved plan and creates atomic, well-defined tasks in NocoDB with correct field mappings, clear acceptance criteria, and immediate reflection in the ActiveTodoStrip.

# When to Use
- After a plan is approved
- When breaking down a large epic into manageable tickets
- User requests to create tasks from a list

# Process
1. Parse the plan from `NEXT_ACTION.md`
2. Break down broad phases into specific, atomic tasks (max 4 hours each)
3. For each task, define: Title, Description, Type (Feature/Bug/Chore), Priority, Status (Todo)
4. Use `src/lib/nocodb-fields.ts` helpers to ensure correct NocoDB field mapping
5. Save tasks to NocoDB via the API
6. Verify each saved task with a follow-up read
7. Update `ActiveTodoStrip` with the immediate next tasks
8. Update memory bank with task creation event

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "One big task is fine" | Tasks must be small and atomic. Max 4 hours effort. |
| "I'll just remember the details" | Write the context into the task description. |
| "NocoDB is down, I'll just write markdown" | Troubleshoot the connection first. NocoDB is the source of truth. |
| "The field names are obvious" | Always use column Title as the JSON key, not column_name. |

# Red Flags
- Tasks saved with `column_name` keys instead of column Title keys
- Tasks with no acceptance criteria
- Tasks larger than a single logical unit of work
- NocoDB save not verified with a follow-up read

# Verification
- [ ] Tasks are saved successfully to NocoDB
- [ ] Titles map correctly to NocoDB column Titles (not column_names)
- [ ] Every task has clear acceptance criteria
- [ ] `ActiveTodoStrip` reflects the next immediate tasks
- [ ] Memory bank updated with task creation event
