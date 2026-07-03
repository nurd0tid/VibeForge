# Roadmap

This document defines the phased development plan for VibeForge, from initial branding to production deployment.

---

## Phase 0 — Rebrand and Cleanup

**Goal**: Establish the VibeForge identity and clean up all legacy artifacts.

- Remove all KarsaDesk branding (including code, comments, config, and metadata).
- Rename the project to VibeForge across all files (package.json, README, titles, favicons).
- Delete any invalid or non-functional old dashboard structure.
- Set up all AI rules and documentation files (AGENTS.md, CLAUDE.md, AI.md, .clinerules, MASTER_PROMPT.md, docs/).
- Prepare an open-source-friendly README.md with setup instructions, tech stack, and contribution guidelines.

---

## Phase 1 — Foundation

**Goal**: Establish the technical foundation and application shell.

- Initialize **Next.js 16** with App Router and `src/` directory structure.
- Install and configure **Tailwind CSS v4** via `@tailwindcss/postcss`.
- Install **shadcn/ui** with `@base-ui/react` primitives.
- Build the application shell: Sidebar (collapsible), StatusBar, Top bar.
- Implement global theming (light/dark mode with system preference detection).
- Implement navigation between all pages with active-state indicators.
- Build the Command Palette (`Cmd/Ctrl + K`) with search and keyboard navigation.
- Create reusable page state components: `<LoadingState />`, `<EmptyState />`, `<ErrorState />`.

---

## Phase 2 — NocoDB Integration

**Goal**: Connect all data persistence to NocoDB.

- Build the NocoDB client wrapper (`src/lib/nocodb.ts`) with authentication and error handling.
- Build the field helper utilities (`src/lib/nocodb-fields.ts`) for Title Case key access.
- Implement API routes for `projects` (CRUD + list).
- Implement API routes for `tasks` (CRUD + list + status update).
- Implement API routes for `task_plans`, `schedules`, `daily_logs`, `weekly_logs`.
- Implement API routes for `providers` (CRUD + test connection + model list).
- Validate all NocoDB responses use `getField()` / `getFieldBool()` helpers.
- Verify end-to-end data flow: UI form → API route → NocoDB → API response → UI update.

---

## Phase 3 — Kanban Board

**Goal**: Build a fully functional drag-and-drop Kanban board.

- Render columns for all 7 statuses (Backlog, Todo, In Progress, Review, Testing, Done, Blocked).
- Render task cards with priority, type, estimate, assigned agent, progress, branch, and blocker indicators.
- Implement drag-and-drop between columns with optimistic NocoDB status updates.
- Build the TaskDrawer: side drawer showing full task detail (description, criteria, checklist, docs, files, plan, schedule, logs, agent runs, blockers).
- Enforce the blocker rule: prevent tasks from being moved to Done if an active blocker exists.
- NocoDB sync: all drag-and-drop and drawer edits persist instantly.

---

## Phase 4 — Planner and Schedule

**Goal**: Enable AI-assisted planning and day-by-day scheduling.

- Build the Planner page with input form (objective, scope, complexity, days, task size, deadline, docs).
- Implement the AI planning endpoint that processes input and returns a structured plan.
- Render the plan output in a formatted preview panel (plan steps, risks, dependencies, tasks, day breakdown, criteria).
- Build the Schedule page with a vertical timeline of days, each containing scheduled tasks.
- Implement the "Convert to Tasks" action: create records in `task_plans`, `schedules`, and `tasks` tables in NocoDB.
- Redirect to the Kanban board on successful conversion.

---

## Phase 5 — Workspace (Web IDE)

**Goal**: Build the VS Code-like integrated development environment.

- Implement the 5-region resizable layout (Activity Bar, Explorer, Editor, AI Panel, Bottom Panel) using `react-resizable-panels` v4.
- Build the Activity Bar with icons for Explorer, Search, Git, Tasks, AI, Docs, Logs, Settings.
- Build the File Explorer with tree view, right-click context menu, and file/folder CRUD.
- Integrate Monaco Editor with tab management, multi-file support, syntax highlighting, and autosave.
- Build the AI Panel with current task context, criteria checklist, agent chat, input area, and run logs.
- Build the Bottom Panel with tabs: Terminal (xterm.js), Problems, Output, Git Diff, Logs, Testing.
- Build the Status Bar showing project, branch, provider/model, NocoDB sync, task status, agent status.

---

## Phase 6 — AI Providers

**Goal**: Enable multi-provider AI configuration.

- Build the Provider settings page with CRUD for providers.
- Implement the adapter layer for OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, 9Router, Ollama, vLLM, and Custom.
- Implement the "Test Connection" action with real API calls and display the exact provider display name on success.
- Build the fallback chain: configure fallback order, auto-switch on failure, log the switch.
- Implement local API key storage via `.vibeforge/providers.json` and `resolveApiKey()`.

---

## Phase 7 — Agent Workflow & Skills

**Goal**: Define and implement the core agent skills.

- **Planning Skill**: Given an objective, generate a structured plan and save to `task_plans`.
- **Task Creation Skill**: Convert plan items into Kanban tasks and save to `tasks`.
- **Daily Log Skill**: Summarize the day's work and save to `daily_logs`.
- **Weekly Log Skill**: Aggregate the week's daily logs and save to `weekly_logs`.
- **Context Update Skill**: Record architectural decisions and save to `project_context_updates`.
- **Review Skill**: Review a file or changeset and provide structured feedback.

---

## Phase 8 — Runtime Bridge

**Goal**: Enable real filesystem, git, and terminal access from the web workspace.

- Build the file system bridge API: read, write, create, delete, and rename files on the server's local filesystem.
- Build the git operations API: status, diff, stage, commit, branch, checkout, log.
- Build the terminal execution API: run arbitrary commands with streaming output via WebSocket or SSE.
- Build the diff viewer component (side-by-side and unified modes).
- Build the test runner integration: trigger test suites and stream results to the Testing tab.

---

## Phase 9 — Production Readiness

**Goal**: Prepare for deployment and operational use.

- Implement authentication (session-based or JWT).
- Implement role-based permissions (admin, developer, viewer).
- Create a production Dockerfile with multi-stage build.
- Configure Traefik reverse proxy with automatic HTTPS.
- Set up CI/CD pipeline (build, typecheck, lint, test on every push).
- Implement health check endpoints and basic monitoring.
- Write deployment documentation.
