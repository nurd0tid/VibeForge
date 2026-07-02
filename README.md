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

## Setup

```bash
# 1. Install
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in NOCODB_BASE_URL, NOCODB_WORKSPACE_ID, NOCODB_BASE_ID, NOCODB_API_TOKEN

# 3. Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

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

## Documentation

All documentation is browsable in the **Docs** page inside the app. Categories include: Agent Guide, Architecture, Skills, AI & MCP, Workflow, Standards, Database, UI/UX, Checklists, Templates, ADR, Prompts, Setup, Deployment, and Logging.

## Contributing

Contributions welcome. Follow the guidelines in `AGENTS.md` and `docs/agent/DONE_CRITERIA.md` before submitting PRs.
