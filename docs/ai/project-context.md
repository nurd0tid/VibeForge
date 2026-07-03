# AI Project Context

This document is the canonical reference for the VibeForge project's technical architecture, structure, and current status. AI agents must read this before writing any code.

---

## 1. Application Identity

| Property | Value |
|----------|-------|
| **Name** | VibeForge |
| **Type** | AI Coding Workspace (open-source) |
| **Purpose** | Unify Kanban, Planner, Schedule, Web IDE, AI Agent, Logs, and Project Context into a single zero-context-switching workspace |
| **Branding** | VibeForge exclusively — KarsaDesk is fully removed and must never appear |

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router with `src/` directory) |
| **Styling** | Tailwind CSS v4 via `@tailwindcss/postcss` |
| **Components** | shadcn/ui built on `@base-ui/react` — **NOT** legacy Radix UI |
| **State (Client)** | Zustand |
| **State (Server)** | TanStack Query v5 |
| **Forms** | React Hook Form + Zod v4 |
| **Editor** | `@monaco-editor/react` (loaded via `dynamic` import) |
| **Database** | NocoDB REST API v1 (server-side only) |
| **Terminal UI** | xterm.js |
| **Notifications** | Sonner (toasts), SweetAlert2 (confirm dialogs) |

---

## 3. Critical Architecture Notes

These notes describe breaking changes and non-obvious behaviors. Violating them causes build failures or runtime errors.

### 3.1 shadcn/ui — @base-ui/react

The installed version of shadcn/ui uses `@base-ui/react` as its underlying primitive library, **not** the older Radix UI.

- `DialogTrigger` from `@base-ui/react` uses a **`render={}`** prop, **not** the `asChild` prop pattern.
- Do not import from `@radix-ui/*` unless a specific legacy component requires it and has been verified.
- Always consult Context7 for `@base-ui/react` API before using any Dialog, Popover, or Select components.

### 3.2 react-resizable-panels v4

The installed version (`react-resizable-panels` v4) exports different component names than the commonly documented v0/v1:

| v4 Export (Correct) | Legacy Export (Wrong) |
|---------------------|----------------------|
| `Group` | `PanelGroup` |
| `Panel` | `Panel` (same) |
| `Separator` | `PanelResizeHandle` |

Always use the v4 export names. Import directly from `react-resizable-panels`.

### 3.3 NocoDB — Server-Side Only

All NocoDB access must go through Next.js API routes (`src/app/api/`). The NocoDB API token must **never** appear in client-side bundles. This means:

- No NocoDB calls in Client Components (`'use client'`)
- No `NEXT_PUBLIC_` prefix for NocoDB credentials
- All credentials must be loaded from `process.env` inside API route handlers

### 3.4 NocoDB — Title Case JSON Keys

NocoDB returns API responses with the **column Title** as the JSON key, not the `column_name` (snake_case). This is the single most common source of bugs when reading NocoDB data.

**Canonical access pattern:**
```typescript
record['Field Name']      // Title Case — canonical, always works
record.field_name         // snake_case — unreliable, do NOT rely on this
```

Use the helper functions from `src/lib/nocodb-fields.ts`:

```typescript
import { getField, getFieldBool } from '@/lib/nocodb-fields'

const title = getField(record, 'title', 'Title')
const isActive = getFieldBool(record, 'is_active', 'Is Active')
```

These helpers check both formats and return the correct value. Always use them when reading NocoDB records.

### 3.5 Zod v4 + @hookform/resolvers

Zod v4 introduced a breaking change in the resolver integration. When using `zodResolver` from `@hookform/resolvers`, you may need to apply an `as any` cast:

```typescript
resolver: zodResolver(schema) as any
```

This is a known compatibility issue. Always check Context7 for the latest resolution.

### 3.6 Monaco Editor

Monaco Editor is loaded with `dynamic` import to prevent SSR issues:

```typescript
import dynamic from 'next/dynamic'
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })
```

Do not attempt to import or use `@monaco-editor/react` in a synchronous module context.

---

## 4. Provider Local Configuration

AI provider configuration follows a hybrid model:

| What | Where Stored |
|------|-------------|
| Provider name, type, base URL, default model | NocoDB (`providers` table) |
| API keys and sensitive secrets | `.vibeforge/providers.json` (local, gitignored) |

**API Key Resolution** — always use the `resolveApiKey()` function from `src/lib/local-config.ts`:

```typescript
resolveApiKey(providerId, mode, envName, directKey)
```

| Mode | Behavior |
|------|---------|
| `env` | Reads from `process.env[envName]` |
| `direct` | Reads from `.vibeforge/providers.json` |
| `none` | No key needed (e.g., self-hosted Ollama) |

---

## 5. MCP Server Configuration

- MCP server configurations are stored in `.vibeforge/mcp.json` (local, gitignored).
- API routes `GET/POST/DELETE /api/mcp` handle CRUD operations for MCP servers.
- The Settings page (`/settings`) provides a UI to add, remove, enable, and disable MCP servers.
- The agent loop (`/api/ai/chat/route.ts`) reads all enabled MCP servers and includes them in the system prompt sent to the AI model.

---

## 6. Agent Loop Architecture

The agentic execution loop is implemented in `/api/ai/chat/route.ts`:

- Runs as a **Server-Sent Events (SSE)** stream.
- Executes up to **10 agentic iterations** per request.
- SSE event types: `thought`, `tool_call`, `tool_result`, `content`, `done`.

Available agent tools:

| Tool | Description |
|------|-------------|
| `list_directory` | List files and folders in a directory |
| `read_file` | Read the contents of a file |
| `edit_file` | Write or overwrite a file |
| `run_command` | Execute a shell command and capture output |

Agent state (`isAgentRunning`, `agentStatusText`) is stored in Zustand so it persists across page/tab switches without re-mounting.

---

## 7. Chat Session Management

- Sessions auto-save on the first user message in a new conversation.
- `saveChatSession()` in `workspace.store.ts` creates or updates the persisted session in NocoDB.
- Slash commands available in the AI input: `/new`, `/sessions`, `/clear`.
- `@skill` prefix triggers skill-specific system prompts.
- `#file` prefix triggers the file search flow.

---

## 8. Full Project Folder Structure

```
src/
├── app/
│   ├── layout.tsx                  ← root layout (ThemeProvider, QueryProvider, Toaster)
│   ├── (app)/
│   │   ├── layout.tsx              ← app shell (Sidebar, main, StatusBar, CommandPalette)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/page.tsx       ← CRUD projects, SweetAlert2 delete
│   │   ├── tasks/page.tsx          ← Kanban board with TaskDrawer sheet
│   │   ├── planner/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── workspace/page.tsx      ← VS Code-like IDE with Monaco + resizable panels + AI Agent
│   │   ├── agents/page.tsx
│   │   ├── providers/page.tsx      ← CRUD AI providers
│   │   ├── logs/page.tsx           ← daily + weekly logs tabs
│   │   ├── docs/page.tsx
│   │   └── settings/page.tsx       ← General, NocoDB, Workspace, MCP config
│   └── api/
│       ├── projects/route.ts + [id]/route.ts
│       ├── tasks/route.ts + [id]/route.ts
│       ├── providers/route.ts + [id]/route.ts + models/route.ts
│       ├── logs/daily/route.ts + weekly/route.ts
│       ├── ai/chat/route.ts        ← Agent loop with SSE streaming
│       ├── mcp/route.ts            ← MCP server CRUD
│       └── workspace/              ← tree, file, git, terminal APIs
├── components/
│   ├── ui/                         ← shadcn components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── StatusBar.tsx
│   │   └── CommandPalette.tsx
│   ├── common/
│   │   ├── LoadingState.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorState.tsx
│   └── providers/
│       └── QueryProvider.tsx
├── features/
│   ├── projects/hooks.ts
│   └── tasks/
│       ├── hooks.ts
│       └── components/TaskDrawer.tsx
├── lib/
│   ├── nocodb.ts                   ← NocoDB REST client (server-side)
│   ├── nocodb-fields.ts            ← getField / getFieldBool helpers
│   ├── local-config.ts             ← Provider local config + API key resolution
│   ├── query-client.ts
│   └── utils.ts
├── stores/
│   ├── ui.store.ts                 ← Zustand: activeProjectId, taskDrawer state
│   └── workspace.store.ts          ← Zustand: files, AI messages, sessions, agent state
└── types/
    └── index.ts                    ← TypeScript types matching NocoDB schema
```

---

## 9. Current Build Status

| Check | Status |
|-------|--------|
| `pnpm dev` | Passing |
| `pnpm build` | Passing |
| `pnpm run typecheck` | Passing |
| `pnpm run lint` | Passing |

**Phase**: MVP Phase 2 — IN PROGRESS

Completed:
- All pages implemented with loading, empty, and error states
- AI Agent loop with tool execution operational
- MCP server configuration supported
- Chat session auto-save on first message
- Agent status persists across tab switches

---

## 10. Core Rules

1. All work must be persisted to NocoDB — not only reported in chat. NocoDB credentials must be configured in `.env.local` before any agent work begins.
2. Do not mark a task as done if any blocker remains unresolved.
3. Do not expose secrets in any form — not in logs, not in error messages, not in API responses.
4. Every session must end with an updated daily log and context record in NocoDB.
