# How VibeForge Works

## Overview

VibeForge is an AI-native IDE workspace and project management system. It tightly integrates an AI assistant with structured file editing, persistent task tracking, database-backed state (NocoDB), and a memory bank that serves as the project's long-term brain. Every system component is governed by strict guardrails that mandate verification and prohibit rationalization.

---

## System Architecture

### Agent Gateway

The gateway orchestrates the agent's full task lifecycle. Every non-trivial task passes through these phases in order:

| Phase | Description |
|-------|-------------|
| **Define** | Establish concrete, unambiguous requirements. Do not begin coding. |
| **Plan** | Draft the approach. Write the plan to the memory bank before any code changes. |
| **Build** | Execute incremental changes in thin vertical slices. |
| **Verify** | Run typecheck, lint, and build. All must be clean. |
| **Review** | Evaluate the output against `DONE_CRITERIA.md`. |
| **Ship** | Finalize, sync the memory bank, and surface remaining risks. |

---

### Chat Assistant & Agent Modes

The agent operates in one of four distinct modes depending on the nature of the task. Mode selection is explicit — the agent must declare which mode it is operating in.

| Mode | Purpose | Key Constraint |
|------|---------|----------------|
| **Architect** | High-level system design and dependency mapping. | No code generation. Output is plans and decisions only. |
| **Code** | Incremental feature implementation and file modification. | Obeys Chesterton's Fence — no code removed without understanding why it exists. |
| **Ask** | Answering questions from documented evidence or codebase inspection. | No file modification. |
| **Debug** | Root cause analysis via the Doubt-Driven Development protocol. | CLAIM → EXTRACT → DOUBT → RECONCILE → STOP. |

---

### Memory Bank — The Project's Brain

The memory bank lives at `.vibeforge/memory-bank.md` and its sub-files within each user project. It is the **single source of truth** for project context, decisions, and progress across sessions.

Because the agent has no persistent memory between sessions, the memory bank **is** the agent's continuity. Every session begins by reading it. Every session ends by writing to it.

**Sub-files initialized by `/init-memory`:**

| File | Purpose |
|------|---------|
| `projectBrief.md` | Core goals and project scope |
| `productContext.md` | User-facing features and product requirements |
| `activeContext.md` | Current task, focus area, and immediate context |
| `systemPatterns.md` | Architectural decisions and code conventions |
| `decisionLog.md` | Record of important architectural or design choices |
| `progress.md` | Milestones, overall project progress |
| `knownIssues.md` | Outstanding bugs or structural deficiencies |
| `fixedDoNotBreak.md` | Non-obvious fixes — must not be reversed |
| `regressionGuard.md` | Project-specific regression rules |
| `updateLog.md` | Chronological log of all memory bank updates |

---

### Workspace & File Explorer

- **Progressive Disclosure**: Load only the files and context needed for the current task. Do not dump entire directories into context.
- **Bi-Directional Sync**: When modifying the project, update the memory bank simultaneously — not after, not later.

---

### Agent Activity & Task Play

- **Agent Activity Log**: Records every tool invocation and step-by-step action taken during a session. Provides a complete audit trail.
- **Task Play**: Agents follow predefined Skills — structured workflows with explicit entry conditions, checkpoints, and exit criteria — to execute tasks reliably and repeatably.
- **ActiveTodoStrip**: A live task list generated above the chat input when a prompt is running. Tracks in-progress and completed steps.

---

### Structured Editing & Diff Viewer

- **Structured File Editing**: All file changes are made via the `edit_file` tool, which generates precise inline diffs. Full-file rewrites are used only when no alternative exists.
- **Diff Viewer**: Displays changes with removed lines in red and added lines in green. Supports both inline and side-by-side views.
- **Manual Approve Mode**: When enabled, the agent pauses on each diff and waits for explicit user approval before applying the change.

---

### NocoDB Persistence

VibeForge uses NocoDB as its persistent storage layer via the REST API v1.

- **Column access uses the Title key**: `record['Field Name']` — not the snake_case column name.
- Always use the `getField()` and `getFieldBool()` helper functions from `src/lib/nocodb-fields.ts`.
- Never assume a field's key format without checking the NocoDB table schema.

---

### Provider Connections

The agent supports multiple LLM providers configured via `.vibeforge/providers.json`:

- OpenAI, Anthropic, Google Gemini, OpenRouter, 9Router, DeepSeek, Groq, Mistral, Ollama, LM Studio.
- Custom OpenAI-compatible providers via Base URL + API Key + Model ID.
- Test Connection must display the correct provider display name. Toast messages must never show `undefined`.

---

### MCP Tools

- MCP servers are configured in `.vibeforge/mcp.json`.
- Once connected, the agent automatically discovers and routes relevant queries through the MCP server's tools.
- API keys and credentials associated with MCP servers must never be logged or exposed.

---

### Skills

Skills encode **Process over Prose** — they are step-by-step workflows, not descriptions. See `SKILLS_INDEX.md` for the full catalog.

---

### Approval, Error Handling & Verification

- **Manual Approve**: Critical or destructive changes require explicit user approval before execution.
- **Error Handling**: Stop and ask the user if encountering an unexplained error. Do not rationalize or skip errors.
- **Verification is Non-Negotiable**: `pnpm run typecheck`, `pnpm run lint`, and `pnpm build` must all pass before any task is declared done.

---

### Context Management

- **Token Progress Bar**: Monitors context window usage in real time.
- **Auto Compact**: When usage becomes high, trigger `/compact` to compress context. Load only the files required for the immediate next step.
