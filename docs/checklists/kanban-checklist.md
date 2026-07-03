# Kanban Checklist

This checklist ensures the Kanban board feature is functional, synced, and robust in managing tasks and workflow states.

- [ ] **Kanban Columns**: Columns correctly map to task statuses (e.g., Backlog, Todo, In Progress, In Review, Done) and render their respective task counts accurately.
- [ ] **Task Drawer Sheet**: Clicking a Kanban card opens the task drawer sheet component smoothly, displaying all relevant task details without layout breakage.
- [ ] **Drag-and-Drop Constraints**: Cards can be dragged between columns. State constraints are enforced (e.g., cannot move to 'Done' if criteria aren't met; UI reverts if the drop is invalid).
- [ ] **NocoDB Sync**: Drag-and-drop actions, status changes, and card edits are immediately and optimistically updated in the UI, while successfully syncing to the NocoDB backend.
- [ ] **Priority Indicator**: Task cards clearly display their priority level (e.g., Low, Medium, High, Urgent) via distinct visual indicators or badges.
- [ ] **Blocked Status**: Tasks with unresolved blockers visually indicate their "Blocked" status on the board and restrict invalid state transitions until unblocked.
- [ ] **Acceptance Criteria**: The task drawer properly displays acceptance criteria, allowing them to be toggled, and updates their completion state in the database.
