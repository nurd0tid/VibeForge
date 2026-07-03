# Product Requirements Document

## Product Name

**VibeForge** — AI Coding Workspace

---

## 1. Problem Statement

Developers working with AI coding agents face a fundamental workflow fragmentation problem. Work and context are scattered across incompatible tools with no shared state:

| Problem | Impact |
|---------|--------|
| Tasks live in Kanban tools, code in the IDE, docs in Notion, and AI in a browser tab | Constant, expensive context switching |
| AI agents forget what was previously done | Repeated work and inconsistent quality |
| AI generates reports in chat but never persists them | Zero institutional memory between sessions |
| Large objectives are never broken into daily executable tasks | Vague plans, missed deadlines |
| AI provider configurations differ per tool and have no unified interface | Fragile workflows dependent on specific models |
| Project context is never updated as the codebase evolves | AI operates on stale assumptions |

---

## 2. Solution

VibeForge provides a single, unified, desktop-first web workspace for the complete software development lifecycle — from ideation to deployment.

```
VS Code  +  Linear  +  GitHub  +  Notion  +  AI Agent
```

The workspace combines:

- **Project Management**: Create and manage projects with full repository awareness.
- **AI Planning**: Input a large objective; the AI agent generates a structured development plan.
- **Schedule Breakdown**: Maps plans to a day-by-day schedule (relative or calendar-based).
- **Kanban Tasks**: Converts schedule items into concrete, trackable tasks in NocoDB.
- **Web IDE**: Monaco-based editor with file tree, integrated terminal, git operations, and diffs.
- **AI Agent Execution**: An agentic loop with tool calling (read, write, run) that operates on real project files.
- **Persistent Logs**: Daily and weekly logs are auto-generated and saved to NocoDB.
- **Project Context**: A living document of architectural decisions, updated by the agent after every significant change.
- **Provider Management**: Unified configuration for any OpenAI-compatible, Anthropic, Gemini, Groq, or custom AI provider.

---

## 3. Target Users

| User Type | Description |
|-----------|-------------|
| **Solo Developer** | A developer using AI to accelerate personal or freelance projects. |
| **AI-Assisted Developer** | A developer who regularly works alongside AI agents and needs structured context. |
| **Team Lead** | Responsible for planning, delegation, and reporting across a small dev team. |
| **Product Builder** | Building a product rapidly and needing to track both product and technical work in one place. |
| **Internal Dev Team** | A small engineering team (3–10 people) that wants to standardize AI-assisted development. |
| **Open-Source Maintainer** | Maintains multiple projects and needs to track contributions, issues, and architectural decisions. |

---

## 4. Core Modules

### Dashboard

An at-a-glance overview of the active workspace state:

- Active projects list with status indicators.
- Today's scheduled tasks with completion status.
- Active blockers that need attention.
- Recent daily log entry.
- Active AI provider/model status.

### Projects

Full project management:

- Create, read, update, and delete projects.
- Link a project to a git repository URL and local filesystem path.
- Define the default git branch, tech stack, and AI context file path.
- View all tasks, plans, schedules, logs, and context updates associated with a project.

### Planner

AI-powered planning:

- Input form: objective, scope, complexity, available days, task size preference, deadline, related docs.
- AI agent processes the input and returns a structured development plan.
- Plan includes: strategy, risks, dependencies, suggested tasks, day breakdown, acceptance criteria.

### Schedule

Day-based task scheduling:

- Map plan items to a relative timeline (Day 1, Day 2...) or calendar dates.
- Visualize daily workload capacity.
- Drag and drop to reschedule tasks between days.

### Kanban

Task lifecycle management:

- 7-column board: Backlog, Todo, In Progress, Review, Testing, Done, Blocked.
- Drag-and-drop status updates with NocoDB persistence.
- Task detail drawer with full context: description, criteria, checklist, docs, files, plan, schedule, logs, agent runs, blockers.
- Blocker enforcement: tasks cannot move to Done while active blockers exist.

### Workspace (Web IDE)

The core development environment:

- VS Code-like layout with Activity Bar, File Explorer, Monaco Editor, AI Panel, Bottom Panel, Status Bar.
- Resizable panels managed by `react-resizable-panels` v4.
- File tree with right-click context menus.
- Monaco Editor with multi-tab support, syntax highlighting, and autosave.
- Integrated terminal (xterm.js) with streaming command execution.
- AI Panel showing current task context, acceptance criteria, agent chat, and tool execution stream.
- Git diff viewer (side-by-side and unified modes).

### AI Agents

Predefined agent skills:

- **Planner**: Breaks objectives into plans.
- **Coder**: Implements tasks by reading, writing, and running code.
- **Reviewer**: Reviews code and diffs for quality, security, and correctness.
- **Tester**: Writes and runs tests, reports results.
- **DevOps**: Configures infrastructure, Dockerfiles, and deployment scripts.
- **Documentation**: Writes or updates project documentation and context.

### AI Providers

Multi-provider configuration:

- CRUD interface for provider records.
- Support for: OpenAI, Anthropic, Google Gemini, OpenRouter, DeepSeek, Groq, Ollama, vLLM, 9Router, Custom.
- Test Connection action that verifies the API key and returns the exact provider display name.
- Fallback order configuration.
- Local API key storage via `.vibeforge/providers.json`.

### Logs

Persistent work history:

- Daily Logs: One record per task per day. Summarizes completed items, blockers, next steps, and changed files.
- Weekly Logs: Aggregates daily logs into a weekly summary.
- Agent Runs: Log of every agent execution (provider, model, status, duration, input/output summaries).
- Decision Logs: Architectural and product decisions with reasoning and alternatives.

### Docs

In-app documentation viewer:

- Reads and renders markdown documents from the `docs/` directory.
- Links to relevant architecture, frontend, backend, database, UI/UX, API, and deployment docs.
- Memory Bank: A per-project `.vibeforge/memory-bank.md` file that the agent uses as live project context.

---

## 5. MVP Scope

The MVP includes:

- VibeForge branding (no KarsaDesk remnants).
- App shell (Sidebar, StatusBar, CommandPalette, ThemeProvider).
- Projects CRUD with NocoDB persistence.
- Tasks Kanban with NocoDB persistence and drag-and-drop.
- Planner UI (form input and plan display).
- Schedule UI (day timeline).
- Workspace IDE shell (layout + Monaco + AI Panel + Terminal tab).
- Provider settings UI with test connection.
- Daily and Weekly Logs UI.
- NocoDB client wrapper with `getField()` helpers.
- Agent loop with SSE streaming and tool execution.
- MCP server configuration via Settings page.
- All pages have loading, empty, and error states.

---

## 6. Out of Scope for First MVP

The following features are planned for future phases and are explicitly excluded from MVP:

- Full remote code execution environment (sandboxed or container-based).
- Full local file bridge with real-time directory watching.
- Multi-user authentication and role-based access control.
- Billing or subscription management.
- Skills marketplace.
- Advanced permission system with team-based ACLs.
- Mobile or tablet optimization.

These will be designed and planned after the MVP is validated in production.
