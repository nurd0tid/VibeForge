# Planner and Schedule UX

The Planner and Schedule modules convert high-level user objectives into structured, day-by-day development plans and executable Kanban tasks. They are designed to prevent the common AI agent issue of working without a clear roadmap.

---

## 1. Planner Purpose & UX

The Planner page (`/planner`) is where the project lifecycle begins. It takes a large, ambiguous objective and structures it into a clear plan.

### Planner Inputs

The user provides the following inputs in a clean form:

- **Objective**: Detailed description of what needs to be built.
- **Scope**: Boundaries of the feature/project.
- **Complexity**: Dropdown (Low, Medium, High).
- **Available Days**: Number of days allocated for development.
- **Preferred Task Size**: Time estimates per task (e.g., 2h, 4h, 8h).
- **Deadline**: Optional date picker.
- **Related Docs**: Select from existing project documentation to serve as context.

### Planner Outputs

The AI agent processes the input and renders the output in a structured markdown preview panel:

| Output Element | Description |
|----------------|-------------|
| **Development Plan** | High-level strategy and architectural approach. |
| **Risks & Mitigations** | Identified technical risks and how to address them. |
| **Dependencies** | External APIs, libraries, or tasks that must be resolved first. |
| **Suggested Tasks** | A flat list of tasks with descriptions and estimates. |
| **Day Breakdown** | High-level milestones for each day of the plan. |
| **Acceptance Criteria** | Proposed criteria for the overall objective. |

---

## 2. Schedule Purpose & UX

The Schedule page (`/schedule`) maps the planner's output onto a timeline.

### Formatting the Timeline

The Schedule does not always require calendar dates. It supports relative days to allow flexible execution.

- **Relative Days**: Day 1, Day 2, Day 3, etc. (Default)
- **Calendar Dates**: If the user provides a start date or deadline, the UI displays actual calendar days alongside the relative days.

### Schedule Layout

- A vertical timeline showing each Day as a block.
- Each Day block contains the tasks scheduled for that day.
- Drag and drop tasks between days to reschedule.
- Visual display of daily workload capacity (e.g., a progress bar showing total estimated hours for the day vs. available working hours).

---

## 3. Convert to Tasks Workflow

The core action on both the Planner and Schedule pages is the conversion of planned items into executable Kanban tasks.

### Conversion Rules

1. **Task Selection**: The user can review the list of suggested tasks, select/deselect specific items, and edit their titles, descriptions, and estimates.
2. **NocoDB Persistence**: Clicking "Convert and Save" triggers an API request to:
   - Create a record in the `task_plans` table.
   - Create a record in the `schedules` table for each scheduled item.
   - Create a record in the `tasks` table for each task, setting its status to `todo` or `backlog`, and linking it to the plan.
3. **Redirection**: On success, show a success toast and redirect the user to the Kanban board (`/tasks`) with the newly created tasks highlighted.
