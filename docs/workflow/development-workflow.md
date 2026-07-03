# Development Workflow

## Main Flow

```txt
Project Context Ready
  │
  ├─► Context Review & Setup
  │
  ├─► AI Plan Generation (task_plans)
  │
  ├─► Schedule Breakdown (schedules)
  │
  ├─► Ticket Creation (tasks)
  │
  ├─► Workspace Check & Path Validation
  │
  ├─► Agent Execution Loop (AI Operating Loop)
  │
  ├─► Code Review & Quality Checks
  │
  ├─► Automated Testing & Verification
  │
  ├─► Agent Logging (daily_logs)
  │
  ├─► Context Synchronization (project_context_updates)
  │
  └─► Task Marked Done
```

## 1. Project Context & Setup
Before writing code, agents must consume the project context, checking the `README.md`, `CLAUDE.md`, and any `AI.md` file. Understanding the base Next.js 16 (App Router), Tailwind v4, and NocoDB stack is mandatory.

## 2. Planning (task_plans)
Agents must outline an execution strategy detailing components, data flow, API endpoints, and potential edge cases. This is stored in NocoDB under the `task_plans` table using the **Title** column keys. 

## 3. Schedule (schedules)
Large or multi-day tasks must be mapped to specific days in the NocoDB `schedules` table, providing a timeline for review and testing.

## 4. Task Structure (tasks)
No work occurs without a formal ticket. Every task in NocoDB must define:
- **title** (clear, actionable)
- **description** (context and "why")
- **priority** (Low, Medium, High, Critical)
- **estimate** (in points or hours)
- **acceptance_criteria** (bullet points strictly defining Done)
- **related_docs** (file paths)
- **dependencies** (other blocked/blocking tasks)
- **status** (todo, in-progress, blocked, in-review, done)

## 5. Agent Logging
After substantial work, the agent must record progress.
- **Daily Logs:** Stored in NocoDB `daily_logs`. Covers what was done, what blockers were hit, and what comes next.
- **Weekly Summaries:** Aggregated logs stored in `weekly_logs` to maintain macro context.

## 6. Context Synchronization
Any architectural decision, DB schema change, new UI pattern, or security update must trigger a contextual update. Store these in NocoDB `project_context_updates` to prevent future agent hallucinations.
