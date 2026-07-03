# System Architecture

## Overview

VibeForge is an open-source, local-first AI Coding Workspace. It is not a SaaS platform — it runs entirely on the user's machine. The system is designed to bridge AI code generation with a structured, context-aware project management engine backed by NocoDB.

The stack centers on **Next.js 16 (App Router)** as both the frontend runtime and the local backend API server. There is no separate remote API server.

## Core Stack

| Layer | Technology |
|-------|-----------|
| **Application Framework** | Next.js 16 (App Router, React 19) |
| **Styling Engine** | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| **Component Primitives** | shadcn/ui powered by `@base-ui/react` |
| **State — Server** | TanStack React Query v5 |
| **State — UI/Workspace** | Zustand |
| **Schema Validation** | Zod v4 |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Panel Layouts** | `react-resizable-panels` v4 |
| **Icons** | Lucide React |
| **Notifications** | Sonner (`sonner`) |
| **Alerts/Confirmations** | SweetAlert2 |
| **Database Backend** | NocoDB (local or user-hosted, REST API v1) |

## Local-First Design Philosophy

| Concern | Approach |
|---------|---------|
| **User Data** | Stored in NocoDB, which the user controls. Nothing leaves the user's machine by default. |
| **File System** | Directly reads and writes the user's local git repositories via Node.js `fs/promises`. |
| **AI API Keys** | Stored in `.env.local` or `.vibeforge/providers.json`. Keys are sent directly to AI provider endpoints (never proxied). |
| **Configuration** | MCP configuration in `.vibeforge/mcp.json`, provider config in `.vibeforge/providers.json`. |

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│   Browser (React 19, Tailwind v4, shadcn/ui Base UI)    │
│   - App Router Pages & Layouts                          │
│   - Zustand Stores (UI, Workspace)                      │
│   - TanStack Query (server state)                       │
├─────────────────────────────────────────────────────────┤
│   Next.js 16 API Routes (src/app/api/)                  │
│   - File system access (Node fs/promises)               │
│   - Git operations (child_process)                      │
│   - NocoDB REST API proxy                               │
│   - AI provider API calls                               │
├─────────────────────────────────────────────────────────┤
│   Local Resources                                       │
│   - User's file system (workspace projects)             │
│   - NocoDB instance (local or LAN)                      │
│   - AI Provider APIs (OpenAI, Anthropic, Gemini, etc.)  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **UI → Next.js API Route:** React components use TanStack Query hooks to call Next.js route handlers via `fetch()`.
2. **Next.js API → File System:** Route handlers use `fs/promises` to read directories, parse file contents, and handle write operations.
3. **Next.js API → NocoDB:** Route handlers proxy structured requests to the NocoDB REST API (`/api/v1/db/data/...`), returning structured `{ ok, data }` or `{ ok: false, error }` responses.
4. **Next.js API → AI Provider:** The AI agent route handler sends prompt context, tool definitions, and conversation history to the selected AI provider.

## Feature Module Structure

```
src/features/<domain>/
  ├── components/       # Domain-specific React components
  ├── hooks/            # TanStack Query and Zustand hooks
  ├── types.ts          # Domain types and Zod schemas
  └── utils.ts          # Domain utilities
```

## NocoDB as the Knowledge Engine

NocoDB functions as the project's structured memory. Key tables:

| Table | Purpose |
|-------|---------|
| `projects` | Project registry and workspace paths |
| `tasks` | All work tickets |
| `task_plans` | Agent-generated execution strategies |
| `schedules` | Day-by-day timeline planning |
| `daily_logs` | Session-level agent logs |
| `weekly_logs` | Aggregated weekly summaries |
| `blockers` | Formal blocker records |
| `agent_runs` | Individual agent execution instances |
| `agent_logs` | Granular step-by-step agent activity |
| `project_context_updates` | Architectural and schema change log |
| `providers` | AI provider configuration registry |
