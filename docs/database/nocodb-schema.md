# NocoDB Schema

NocoDB is the **single source of truth** for all persistent data in VibeForge. Every project, task, plan, schedule, log, provider, agent run, and architectural decision is stored as a NocoDB record.

---

## Critical: Title Case JSON Keys

NocoDB REST API v1 returns JSON objects keyed by the **column Title** (display name), not the internal `column_name`.

```typescript
// What you might expect:
record.field_name          // ❌ Unreliable — may not work

// What NocoDB actually returns:
record['Field Name']       // ✅ Canonical — always works
```

**Always use the helper functions** from `src/lib/nocodb-fields.ts`:

```typescript
import { getField, getFieldBool } from '@/lib/nocodb-fields'

const title = getField(record, 'title', 'Title')
const isActive = getFieldBool(record, 'is_active', 'Is Active')
```

These helpers check both snake_case and Title Case formats, ensuring compatibility regardless of NocoDB's response format. Failing to use them is the #1 source of data access bugs in VibeForge.

---

## Tables

### projects

The root entity. Each project represents a codebase or product.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Name | SingleLineText | Display name of the project |
| Slug | SingleLineText | URL-safe identifier |
| Description | LongText | Project overview |
| Status | SingleSelect | `active`, `archived`, `paused` |
| Repository Url | URL | Git repository URL |
| Local Path | SingleLineText | Absolute path to the local checkout |
| Default Branch | SingleLineText | Default git branch (e.g., `main`) |
| Tech Stack | LongText | Comma-separated or JSON list of technologies |
| Ai Context Path | SingleLineText | Path to the project's AI context file |
| Created At | DateTime | Record creation timestamp |
| Updated At | DateTime | Last update timestamp |

---

### tasks

The work unit. Each task is a discrete piece of work assigned to a project.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Title | SingleLineText | Task name |
| Description | LongText | Detailed task description (markdown) |
| Status | SingleSelect | See status values below |
| Priority | SingleSelect | `low`, `medium`, `high`, `critical` |
| Type | SingleSelect | `feature`, `bug`, `refactor`, `docs`, `devops`, `test` |
| Estimate Days | Number | Estimated effort in days |
| Estimate Hours | Number | Estimated effort in hours |
| Assigned Agent | SingleLineText | Name or ID of the assigned AI agent |
| Provider Id | Number | FK → `providers.Id` |
| Acceptance Criteria | LongText | JSON array or markdown checklist |
| Related Files | LongText | JSON array of file paths |
| Related Docs | LongText | JSON array of document references |
| Branch Name | SingleLineText | Git branch for this task |
| Progress | Number | Completion percentage (0–100) |
| Ai Confidence | Number | Agent's self-assessed confidence (0–100) |
| Dependencies | LongText | JSON array of dependent task IDs |
| Blocked Reason | LongText | Description of the blocking issue |
| Created At | DateTime | Record creation timestamp |
| Updated At | DateTime | Last update timestamp |

**Task Statuses:**

| Status | Description |
|--------|-------------|
| `backlog` | Created but not prioritized |
| `todo` | Prioritized and ready to start |
| `in_progress` | Actively being worked on |
| `review` | Awaiting human or agent review |
| `testing` | Undergoing automated or manual tests |
| `done` | All acceptance criteria met, no blockers |
| `blocked` | Cannot proceed due to a blocker |

---

### task_plans

AI-generated development plans linked to tasks.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Task Id | Number | FK → `tasks.Id` (nullable if plan covers multiple tasks) |
| Title | SingleLineText | Plan title |
| Objective | LongText | What the plan aims to achieve |
| Scope | LongText | What's included in the plan |
| Out Of Scope | LongText | What's explicitly excluded |
| Plan Steps | LongText | JSON array of ordered steps |
| Risks | LongText | JSON array of identified risks |
| Dependencies | LongText | JSON array of external dependencies |
| Assumptions | LongText | JSON array of stated assumptions |
| Estimated Effort | SingleLineText | Total estimated effort (e.g., "3 days") |
| Created By Agent | SingleLineText | Agent name that generated the plan |
| Created At | DateTime | Record creation timestamp |

---

### schedules

Day-by-day breakdown of a plan.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Task Id | Number | FK → `tasks.Id` |
| Plan Id | Number | FK → `task_plans.Id` |
| Day Index | Number | Relative day number (1, 2, 3...) |
| Scheduled Date | Date | Actual calendar date (nullable) |
| Title | SingleLineText | Day milestone title |
| Description | LongText | What should be accomplished |
| Expected Output | LongText | Deliverables for the day |
| Status | SingleSelect | `pending`, `in_progress`, `done`, `skipped` |
| Created At | DateTime | Record creation timestamp |
| Updated At | DateTime | Last update timestamp |

---

### daily_logs

One record per task per day, summarizing the day's work.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Task Id | Number | FK → `tasks.Id` |
| Date | Date | Log date |
| Summary | LongText | What was accomplished |
| Completed Items | LongText | JSON array of completed checklist items |
| Blockers | LongText | JSON array of encountered blockers |
| Next Steps | LongText | JSON array of planned next actions |
| Changed Files | LongText | JSON array of files modified |
| Notes | LongText | Free-form notes |
| Agent Id | SingleLineText | Agent that authored the log |
| Provider Id | Number | FK → `providers.Id` |
| Created At | DateTime | Record creation timestamp |

---

### weekly_logs

Aggregated summary of an entire week's work.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Week Start | Date | Start date of the week |
| Week End | Date | End date of the week |
| Summary | LongText | High-level week summary |
| Completed Tasks | LongText | JSON array of completed task IDs/titles |
| Pending Tasks | LongText | JSON array of still-pending task IDs/titles |
| Blockers | LongText | JSON array of unresolved blockers |
| Decisions | LongText | JSON array of decisions made during the week |
| Next Week Plan | LongText | Planned focus for the following week |
| Created At | DateTime | Record creation timestamp |

---

### project_context_updates

Immutable log of architectural and contextual changes.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Task Id | Number | FK → `tasks.Id` |
| Update Type | SingleSelect | `architecture`, `dependency`, `schema`, `config`, `documentation` |
| Title | SingleLineText | Short description of the change |
| Description | LongText | Full details of the change |
| Affected Docs | LongText | JSON array of affected documentation files |
| Affected Files | LongText | JSON array of affected source files |
| Decision | LongText | The decision made |
| Reason | LongText | Why the decision was made |
| Created By Agent | SingleLineText | Agent that created the update |
| Created At | DateTime | Record creation timestamp |

---

### agent_runs

Each record represents a single agent execution against a task.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Task Id | Number | FK → `tasks.Id` |
| Agent Name | SingleLineText | Name of the agent profile |
| Provider Id | Number | FK → `providers.Id` |
| Model | SingleLineText | Exact model identifier used |
| Skill | SingleLineText | Skill that was invoked (if any) |
| Status | SingleSelect | `running`, `completed`, `failed`, `cancelled` |
| Input Summary | LongText | Summarized input (user prompt) |
| Output Summary | LongText | Summarized output (agent response) |
| Started At | DateTime | Execution start time |
| Finished At | DateTime | Execution end time |
| Error Message | LongText | Error details (if failed) |

---

### agent_logs

Granular log entries within an agent run.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Run Id | Number | FK → `agent_runs.Id` |
| Project Id | Number | FK → `projects.Id` |
| Task Id | Number | FK → `tasks.Id` |
| Level | SingleSelect | `info`, `warn`, `error`, `debug` |
| Message | LongText | Log message content |
| Metadata | LongText | JSON object with additional context |
| Created At | DateTime | Record creation timestamp |

---

### providers

AI provider configuration records.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Name | SingleLineText | Display name (e.g., "OpenAI Production") |
| Type | SingleSelect | `openai`, `anthropic`, `gemini`, `openrouter`, `deepseek`, `groq`, `ollama`, `vllm`, `9router`, `custom` |
| Base Url | URL | Provider API endpoint |
| Default Model | SingleLineText | Default model identifier |
| Fallback Order | Number | Priority in the fallback chain (lower = higher priority) |
| Is Active | Checkbox | Whether the provider is enabled |
| Supports Reasoning | Checkbox | Whether the model supports reasoning/thinking |
| Supports Tools | Checkbox | Whether the model supports tool calling |
| Created At | DateTime | Record creation timestamp |
| Updated At | DateTime | Last update timestamp |

---

### skills

Agent skills define reusable prompt/action templates.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Name | SingleLineText | Skill name (e.g., "plan", "review", "test") |
| Command | SingleLineText | Slash command trigger (e.g., "/plan") |
| Description | LongText | What the skill does |
| Required Inputs | LongText | JSON schema of required inputs |
| Output Target | SingleLineText | Where the output goes (e.g., "task_plans", "daily_logs") |
| Is Active | Checkbox | Whether the skill is enabled |
| Created At | DateTime | Record creation timestamp |

---

### decisions

Architectural and product decisions for audit trail.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Title | SingleLineText | Decision summary |
| Decision | LongText | Full decision text |
| Reason | LongText | Rationale for the decision |
| Alternatives | LongText | JSON array of alternatives considered |
| Impact | LongText | Expected impact of the decision |
| Created At | DateTime | Record creation timestamp |

---

### blockers

Active and resolved blockers for tracking impediments.

| Column Title | Type | Description |
|-------------|------|-------------|
| Id | AutoNumber | Primary key |
| Project Id | Number | FK → `projects.Id` |
| Task Id | Number | FK → `tasks.Id` |
| Title | SingleLineText | Short blocker description |
| Description | LongText | Full details of the blocker |
| Severity | SingleSelect | `low`, `medium`, `high`, `critical` |
| Status | SingleSelect | `active`, `resolved`, `wontfix` |
| Resolution | LongText | How the blocker was resolved |
| Created At | DateTime | Record creation timestamp |
| Resolved At | DateTime | When the blocker was resolved |
