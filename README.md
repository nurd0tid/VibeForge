# VibeForge

Open-source AI Coding Workspace — VS Code + Linear + AI Agent in one.

## Features

- **Workspace IDE** — File explorer, Monaco Editor, multi-tab editing, built-in terminal, Git source control.
- **AI Agent Chat** — Streaming AI assistant with autonomous tool execution, structured diff viewer (inline + side-by-side), Accept/Reject controls, and context usage tracking.
- **Agent Activity** — Transparent tool-call cards showing file reads, edits, folder browsing, terminal commands, and memory bank operations — all with collapsible accordions.
- **Task Management** — Kanban board with Play Task button, multi-select batch play, Pending/Done filter tabs, and AI Task Creator with provider/model selection.
- **Memory Bank** — `/init-memory` creates 10 context files (projectBrief, activeContext, decisionLog, progress, etc.) in `.vibeforge/memory-bank/`. Agent reads before work, writes after.
- **Provider Agnostic** — OpenAI, Anthropic, Gemini, OpenRouter, 9Router, DeepSeek, Mistral, Groq, Ollama, LM Studio, and any OpenAI-compatible endpoint. Context window and max output tokens configurable (-1 = unlimited).
- **NocoDB Persistence** — Projects, Tasks, Daily Logs, Weekly Logs, Schedules, and Agent Runs synced to NocoDB.
- **Daily & Weekly Logs** — Real NocoDB mutations for creating daily and weekly progress summaries.
- **Auto/Manual Approve** — Toggle in Settings popover. Manual mode shows Accept/Reject buttons on diffs. Auto mode applies immediately.
- **Context Management** — Token usage progress bar, `/compact` command, and auto-compact at 90% threshold.
- **MCP Support** — Configure external MCP servers in Settings to extend agent capabilities.
- **15 Agent Skills** — Structured skill docs with anti-rationalization tables, verification checklists, and failure handling.
- **17 Agent Docs** — Comprehensive documentation in `docs/agent/` covering workflow, memory bank, MCP, structured editing, and regression guards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (@base-ui/react) |
| State | Zustand (persisted) |
| Data | TanStack React Query |
| Editor | Monaco Editor (@monaco-editor/react) |
| Database | NocoDB REST API v1 |
| Icons | Lucide React |

## Prerequisites

### NocoDB Setup (Required)

VibeForge uses NocoDB as the database backend. You have **two options** to set it up:

---

#### Option A: NocoDB Cloud (Easiest)

Use NocoDB's free hosted cloud — no Docker or server needed.

1. Go to **https://app.nocodb.com/** and **Sign Up** or **Log In**
2. Create a new **Base** (database)
3. Create the required tables (see below)
4. Get your API token from: **Team & Settings → Tokens → Add Token**
5. Your Base URL is `https://app.nocodb.com`
6. Get your `Workspace ID` and `Base ID` from the URL:
   ```
   https://app.nocodb.com/#/nc/{WORKSPACE_ID}/{BASE_ID}
   ```
7. Fill your `.env.local`:
   ```env
   NOCODB_BASE_URL=https://app.nocodb.com
   NOCODB_WORKSPACE_ID=your_workspace_id
   NOCODB_BASE_ID=your_base_id
   NOCODB_API_TOKEN=your_api_token
   ```

---

#### Option B: Self-Hosted via Docker

Run NocoDB locally on your machine.

1. **Run NocoDB** via Docker:
   ```bash
   docker run -d --name nocodb -p 8080:8080 nocodb/nocodb:latest
   ```
   Or see the full guide: **https://docs.nocodb.com/getting-started/self-hosted/installation/**

2. **Open NocoDB UI** at [http://localhost:8080](http://localhost:8080), create an account
3. Create a new **Workspace** and a new **Base** (database)
4. Get your API token from: **Team & Settings → Tokens → Add Token**
5. Get your IDs from the URL:
   ```
   http://localhost:8080/#/nc/{WORKSPACE_ID}/{BASE_ID}
   ```
6. Fill your `.env.local`:
   ```env
   NOCODB_BASE_URL=http://localhost:8080
   NOCODB_WORKSPACE_ID=your_workspace_id
   NOCODB_BASE_ID=your_base_id
   NOCODB_API_TOKEN=your_api_token
   ```

---

#### Required Tables

After setting up NocoDB (cloud or Docker), create these tables with **exact names**:

| Table Name | Purpose |
|-----------|---------|
| `projects` | Project records |
| `tasks` | Task/Kanban items |
| `schedules` | Scheduled work items |
| `daily_logs` | Daily progress logs |
| `weekly_logs` | Weekly summaries |
| `agent_runs` | AI agent execution history |
| `providers` | AI provider configurations |
| `task_plans` | Task plans |

> **Note:** VibeForge runs on port **3456** by default to avoid conflicting with your user projects which typically run on port 3000.

---

## Setup

```bash
# 1. Install
pnpm install

# 2. Configure environment (see NocoDB Setup above first)
cp .env.example .env.local
# Fill in NOCODB_BASE_URL, NOCODB_WORKSPACE_ID, NOCODB_BASE_ID, NOCODB_API_TOKEN

# 3. Initialize NocoDB tables automatically (Requires Node.js)
node scripts/setup-nocodb.js

# 4. Run
pnpm dev
```

Open [http://localhost:3456](http://localhost:3456).

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm run typecheck` | TypeScript check |
| `pnpm run lint` | ESLint check |

## Workspace Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save active file |
| `Enter` | Send message |
| `Shift+Enter` | New line in chat |
| `@` | Trigger skill/file menu |
| `#` | Trigger file search |
| `/` | Trigger command menu |

## Chat Commands

| Command | Action |
|---------|--------|
| `/new` | New chat session |
| `/clear` | Clear conversation |
| `/sessions` | Show saved sessions |
| `/compact` | Compress context |
| `/mcp-list` | List MCP servers |
| `/init-memory` | Initialize memory bank for current project |

## AI Provider Setup

1. Go to **Providers** page.
2. Click **Add Provider** and select a preset (OpenAI, Anthropic, etc.) or use Custom OpenAI-Compatible.
3. Enter Base URL, API Key, and Default Model.
4. Set Context Window and Max Output Tokens (-1 = unlimited / provider default).
5. Click **Test Connection** to verify.

## Performance Optimization

For the fastest and most lightweight workspace experience (especially when switching pages or streaming large outputs), run the production build instead of the development server:

```bash
pnpm build
pnpm start
```

Using the production build drastically reduces memory usage, eliminates hot-reloads, and provides a near-instant IDE response.

## Documentation

All documentation is browsable in the **Docs** page inside the app. Categories include: Agent Guide, Architecture, Skills, AI & MCP, Workflow, Standards, Database, UI/UX, Checklists, Templates, ADR, Prompts, Setup, Deployment, and Logging.

## Contributing

Contributions welcome. Follow the guidelines in `AGENTS.md` and `docs/agent/DONE_CRITERIA.md` before submitting PRs.
