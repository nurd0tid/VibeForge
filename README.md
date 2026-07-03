# VibeForge

![VibeForge Banner](./public/banner.png)

**VibeForge** is an open-source AI Coding Workspace that combines the power of an IDE (like VS Code), a task manager (like Linear), and an autonomous AI Agent in a single, seamless environment.

It is designed to give you complete control and visibility over what your AI agent is doing, bridging the gap between local development and AI-assisted coding.

---

## 🌟 Key Features

- **Workspace IDE**: A fully featured environment with a file explorer, Monaco Editor, multi-tab editing, built-in terminal, and Git source control.
- **AI Agent Chat**: A streaming AI assistant with autonomous tool execution. Features a structured diff viewer (inline + side-by-side) with Accept/Reject controls and active context tracking.
- **Transparent Agent Activity**: Actionable tool-call cards showing file reads, edits, folder browsing, terminal commands, and memory bank operations—all organized in collapsible accordions.
- **Integrated Task Management**: A Kanban board with "Play Task" functionality, multi-select batch play, Pending/Done filter tabs, and an AI Task Creator.
- **Memory Bank**: Command `/init-memory` scaffolds 10 context files (projectBrief, activeContext, decisionLog, etc.) in `.vibeforge/memory-bank/`. The agent reads these before work and updates them after.
- **Provider Agnostic**: Use any provider! OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Mistral, Groq, Ollama, LM Studio, or any OpenAI-compatible endpoint.
- **NocoDB Persistence**: All your Projects, Tasks, Daily Logs, Weekly Logs, Schedules, and Agent Runs are securely synced to NocoDB (Cloud or Self-Hosted).
- **Auto/Manual Diff Approval**: Toggle in Settings. Manual mode requires your explicit approval for code changes, while Auto mode applies them instantly.
- **Context Management**: Visual token usage progress bar, automatic context compaction at 90% threshold, and manual `/compact` command.
- **MCP Support**: Configure external Model Context Protocol (MCP) servers in Settings to extend the agent's capabilities (e.g., direct docs fetching via Context7).
- **15 Built-in Agent Skills**: Structured workflows with anti-rationalization tables, verification checklists, and robust failure handling.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS v4, shadcn/ui (via `@base-ui/react`) |
| **State** | Zustand (Persisted) |
| **Data Fetching**| TanStack React Query |
| **Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Database** | NocoDB REST API v1 |
| **Icons** | Lucide React |

---

## 🚀 Getting Started

### Prerequisites: NocoDB Setup (Required)

VibeForge uses **NocoDB** as the database backend. You must set this up before running the app.

#### Option A: NocoDB Cloud (Easiest & Free)
1. Go to [app.nocodb.com](https://app.nocodb.com/) and Sign Up/Log In.
2. Create a new **Base** (database).
3. Get your API token from: **Team & Settings → Tokens → Add Token**.
4. Your Base URL is `https://app.nocodb.com`.
5. Get your `Workspace ID` and `Base ID` from the URL: `https://app.nocodb.com/#/nc/{WORKSPACE_ID}/{BASE_ID}`.

#### Option B: Self-Hosted (Docker)
1. Run NocoDB locally:
   ```bash
   docker run -d --name nocodb -p 8080:8080 nocodb/nocodb:latest
   ```
2. Open [http://localhost:8080](http://localhost:8080) and create an account, workspace, and base.
3. Get your API token from **Team & Settings → Tokens → Add Token**.
4. Extract IDs from the URL as above. Your Base URL is `http://localhost:8080`.

### Setup Instructions

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your NocoDB credentials in `.env.local`:
   ```env
   NOCODB_BASE_URL=
   NOCODB_WORKSPACE_ID=
   NOCODB_BASE_ID=
   NOCODB_API_TOKEN=
   ```

3. **Initialize Database Tables**
   ```bash
   node scripts/setup-nocodb.js
   ```

4. **Run the App**
   ```bash
   pnpm dev
   ```
   > **Note:** VibeForge runs on port **3456** by default to avoid conflicting with your user projects which typically run on port 3000. Open [http://localhost:3456](http://localhost:3456).

---

## ⚡ Performance Optimization

For the fastest, most lightweight workspace experience (especially when streaming large outputs), we highly recommend running the production build:

```bash
pnpm build
pnpm start
```

*This drastically reduces memory usage, eliminates hot-reloads, and provides a near-instant IDE response.*

---

## ⌨️ Shortcuts & Commands

### Workspace Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save active file |
| `Enter` | Send chat message |
| `Shift+Enter` | New line in chat |
| `@` | Trigger skill/file context menu |
| `#` | Trigger file search |
| `/` | Trigger command menu |

### Chat Commands
| Command | Action |
|---------|--------|
| `/new` | Start a new chat session |
| `/clear` | Clear conversation history |
| `/sessions` | View saved sessions |
| `/compact` | Compress LLM context |
| `/mcp-list` | View connected MCP servers |
| `/init-memory` | Initialize memory bank for current project |

---

## 🤖 AI Provider Setup

1. Navigate to the **Providers** page in VibeForge.
2. Click **Add Provider**. Select a preset (OpenAI, Anthropic, Gemini, etc.) or use Custom.
3. Enter your Base URL, API Key, and Default Model.
4. Set Context Window and Max Output Tokens (use `-1` for provider defaults).
5. Click **Test Connection** to verify it works, then save.

---

## 📖 Documentation

All documentation is browsable directly inside the **Docs** page within the app. Categories include:
- Architecture & Tech Stack
- AI & MCP Integration
- AI Agent Workflows & Skills
- UI/UX Standards
- Database Schemas
- Prompt Templates & Checklists

## 🤝 Contributing

Contributions are heavily encouraged! Before submitting a Pull Request, please read our [CONTRIBUTING.md](./CONTRIBUTING.md) and ensure you align with the rules set in `AGENTS.md`.

---

*Built for developers who want the power of autonomous AI with the safety of a structured, observable environment.*
