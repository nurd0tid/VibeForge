# Kanban UX

The Kanban board (`/tasks`) manages all work items in a project. It serves as the bridge between planning and execution. The board must be dense, fast, and visually indicate blockers and priorities.

---

## 1. Board Columns

The board is divided into the following columns. These statuses represent the complete lifecycle of a task and map directly to the NocoDB `tasks.status` field.

| Column | Description |
|--------|-------------|
| **Backlog** | Tasks created during planning but not yet prioritized or scheduled. |
| **Todo** | Tasks prioritized for the current sprint or schedule. |
| **In Progress** | Tasks actively being worked on by a human or agent. |
| **Review** | Tasks that require human review or agent validation. |
| **Testing** | Tasks undergoing automated or manual testing. |
| **Done** | Completed tasks that meet all acceptance criteria. |
| **Blocked** | Tasks blocked by dependencies, bugs, or missing information. |

---

## 2. Card Content

Task cards must be compact but information-dense. Every card must display the following elements inline, using icons, badges, or small text.

| Element | Format |
|---------|--------|
| **Title** | Truncated to 2 lines maximum. |
| **Priority** | Visual indicator (e.g., Red 🛑 = High, Yellow ⚠️ = Medium, Gray ⚪ = Low). |
| **Type** | Small badge (e.g., Feature, Bug, Refactor, Docs). |
| **Estimate** | Time or points badge (e.g., "2h", "1d", "3pts"). |
| **Assigned Agent** | Avatar or name badge of the assigned AI agent (if any). |
| **Provider/Model** | Small badge showing the model handling the task (e.g., "GPT-4o"). |
| **Progress** | A thin progress bar at the bottom of the card showing completion percentage based on checklist items. |
| **Dependencies** | Link icon with count if the task depends on others. |
| **Related Files** | File icon with count of associated files. |
| **Branch** | Git branch icon with branch name. |
| **Blocker Indicator** | Prominent red outline or warning badge if blocked. |

---

## 3. Task Detail Drawer

Clicking a task card opens a side drawer (not a modal) on the right side of the screen. This allows the user to view task details while keeping the board visible.

The drawer must include the following sections, styled clearly as distinct blocks:

| Section | Description |
|---------|-------------|
| **Header** | Task Title, Status dropdown, Priority selector, Edit/Delete actions. |
| **Description** | Full markdown support for the task description. |
| **Acceptance Criteria** | A checklist of criteria. Checkboxes update task progress instantly. |
| **Checklist** | Secondary technical or process checklist (e.g., "Update docs", "Add tests"). |
| **Related Docs** | Links to project context documents relevant to the task. |
| **Related Files** | Links to files associated with the task. Clicking opens the file in the Workspace if applicable. |
| **Plan** | Link to the original plan (from the `task_plans` table) this task was generated from. |
| **Schedule** | The assigned schedule day/date (from the `schedules` table). |
| **Logs** | A feed of log entries associated with the task (from `daily_logs` and `agent_logs`). |
| **Agent Runs** | Summary of recent agent executions for this task. |
| **Blockers** | If blocked, details of the blocker (from the `blockers` table) and resolution status. |

---

## 4. Interaction Rules

1. **Drag and Drop**: Tasks must be draggable between columns to update status.
2. **Instant Update**: Moving a task must update its status in NocoDB immediately, using optimistic UI updates for responsiveness.
3. **The Blocker Rule**: **A task cannot be moved to the Done column if an active blocker exists in the Blockers section.** The UI must visually prevent the drag action or show an immediate error toast if attempted.
4. **Context Switching**: The drawer must include an "Open in Workspace" button that navigates to the `/workspace` page, setting the selected task as the active context in the AI Panel.
