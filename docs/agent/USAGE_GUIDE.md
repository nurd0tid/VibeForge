# VibeForge Agent Usage Guide & Feature Summary

> Written by: VibeForge AI Agent
> Date: 2 July 2026
> Purpose: Effective prompting strategies, tool reference, and a summary of recent feature updates.

---

## Effective Prompting Strategies

### 1. Use @ to Invoke Skills
Type `@` in the chat input to invoke a specific skill:
```
@planning       - Generate a structured task plan
@create-task    - Create a new task on the Kanban board
@daily-log      - Write a daily progress log
@review-code    - Review recent code changes
@update-context - Update the project context / memory bank
```
Examples:
```
@planning create a plan for implementing auth with NextAuth
@create-task implement dark mode across all pages
```

### 2. Use # to Attach Files
Type `#` to search for and reference a specific file:
```
#src/app/page.tsx - include this file as context
```

### 3. Use / for Commands
```
/new          - Start a new chat
/clear        - Clear the current conversation
/compact      - Compress context to save tokens
/sessions     - View all saved sessions
/init-memory  - Initialize the memory bank for the project
/mcp-list     - View connected MCP servers
```

### 4. Use UMB to Update Memory
Type any of the following to trigger a memory bank update:
- `UMB`
- `update memory`
- `sync memory`
- `update memory bank`

The AI will update the memory bank files: `activeContext.md`, `progress.md`, `decisionLog.md`, etc.

---

## Available Agent Tools

The VibeForge agent loop executes the following tools. All tool calls are streamed as SSE events and rendered as inline diffs in the Chat Workspace.

| Tool | Function | Example |
|------|----------|---------|
| `list_directory` | List files and folders in a directory | `{"path": "src/"}` |
| `read_file` | Read the contents of a file | `{"path": "src/app/page.tsx"}` |
| `edit_file` | Write or overwrite a file (search & replace) | `{"path": "file.ts", "old_string": "x", "new_string": "y"}` |
| `run_command` | Execute a shell command and capture output | `{"command": "pnpm build"}` |

> **Note:** `write_file`, `memory_list`, `memory_read`, and `memory_write` are documented in some memory bank files but are not part of the core agent loop. The agent uses `edit_file` to both edit and create files, and uses `run_command` to interact with the file system and shell. Memory bank files are read and written via `read_file` and `edit_file`.

---

## Recently Implemented Features

### Editor & Workspace
- **Auto-scroll to change location** — When the AI edits or creates a file, Monaco Editor automatically scrolls to the changed line.
- **Gutter decorations (green indicators)** — A green bar on the left side of the line numbers marks the area modified by the AI (similar to Git diff indicators in VS Code). Decorations are automatically removed after 6 seconds.
- **File auto-open** — Whenever the AI successfully reads, edits, or creates a file, that file is immediately opened in the editor.
- **Git Diff Side-by-Side** — The Git Diff panel at the bottom of the workspace uses a true Monaco DiffEditor.
- **File creation via `edit_file`** — The agent can create new files from scratch using the `edit_file` tool (previously only existing files could be edited).

### AI Chat Assistant
- **Per-message model & provider badge** — Each chat bubble displays the model and provider used to generate that specific response (e.g., `9Router · claude-sonnet-4.5`). The badge reflects the model at the time of generation, not the currently active model.
- **Context usage recalculated on model switch** — When the user switches provider or model, the context bar automatically re-estimates token usage based on the current conversation (estimation = characters / 4) and updates the limit according to the new provider's `context_window`.
- **Interrupted Task Resume Banner** — If the agent stops mid-task (e.g., the user switches tabs), a red "Task Interrupted" banner appears upon returning to the workspace, with a **Resume Task** button that restarts the task from the beginning without requiring the prompt to be re-entered.
- **Global AbortController** — The SSE stream is not bound to the component lifecycle, making it more stable during navigation.
- **Delete Session** — Any session in the Sessions popup can be deleted via an X button that appears on hover.
- **`isAgentRunning` is not persisted** — The UI will no longer be stuck in a "running" state after a page refresh or tab switch.

### Provider & Settings
- **Max Output Tokens = -1** — Consistent with Cline behavior: if set to -1 or left empty, the `max_tokens` parameter is not sent to the API, resulting in the provider's default (effectively unlimited).
- **Settings Popover in Chat Header** — Auto Approve and Auto Compact toggles use a clean Switch component inside a gear icon popover, replacing the previous cramped text buttons.
- **Context Usage Bar** — A progress bar in the chat header displays the estimated token usage based on the active provider.

### Memory Bank
- **`/init-memory`** creates 10 files under `.vibeforge/memory-bank/`:
  - `projectBrief.md`, `productContext.md`, `activeContext.md`
  - `systemPatterns.md`, `decisionLog.md`, `progress.md`
  - `knownIssues.md`, `fixedDoNotBreak.md`, `regressionGuard.md`, `updateLog.md`
- The AI reads the memory bank before beginning work and updates it upon completion.

### Tasks
- **Play Task** — Click the Play button (visible on task card hover) to send a task to the workspace and start the AI Todo Strip.
- **Multi-task batch play** — Select multiple tasks and click "Play X Tasks" to run them as a batch.
- **AI Task Creator** — Includes provider and model selection. The AI makes a real API call to generate tasks (no longer mocked).
- **Pending/Done filter tabs** — Filter the task list to show only pending or completed tasks.

### Docs
- **16 categories** in the Docs menu, including: Agent Guide, Skills, Setup, Deployment, and Logging.
- **17 files** under `docs/agent/` covering agent guidance, memory bank, MCP, structured editing, and regression guard.
- **15 skill files** each including an anti-rationalization table, a verification checklist, and failure handling instructions.

---

## Best Practice Tips

1. **Always run `/init-memory` first** before starting a new project so the AI has complete context.
2. **Run `UMB` after completing a task** so the memory bank is up to date for the next session.
3. **Use `/compact`** when the context bar is nearly full (≥70%) before starting a large task.
4. **Set `context_window` in provider settings** to match the model in use so the context bar is accurate.
5. **Set max output tokens to -1** if you want unlimited output from the provider.
6. **You can switch tabs freely** — if a task is interrupted, the Resume Task banner will appear when you return to the workspace.
