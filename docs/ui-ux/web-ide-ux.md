# Web IDE UX

The Workspace page (`/workspace`) is the core of VibeForge. It must deliver a VS Code-quality experience inside the browser, combining file management, Monaco editing, an integrated terminal, and an embedded AI agent in a single, seamless interface.

---

## 1. Philosophy

Every design decision for the Workspace must answer yes to all three questions:

1. Does it help the user stay focused on code without switching to another tool?
2. Does it feel like VS Code, Linear, and an AI agent — not a generic web dashboard?
3. Does it scale to a 1920×1080 desktop resolution with dense, useful information?

---

## 2. Required Layout

The Workspace is divided into five distinct regions. All regions are managed by `react-resizable-panels` v4:

```
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: Project name | Branch | Provider | Command actions   │
├────┬───────────────┬──────────────────────┬──────────────────┤
│    │               │ [File.tsx ×] [API.ts] │                  │
│    │  Explorer     │ ─────────────────────│   AI Panel       │
│Act │  Files        │                      │   ─────────────  │
│Bar │  Search       │   Monaco Editor      │   Current Task   │
│    │  Git          │                      │   Acceptance     │
│    │  Tasks        │                      │   Criteria       │
│    │  Docs         │                      │   Chat Input     │
│    │  Settings     │                      │   Agent Stream   │
├────┴───────────────┴──────────────────────┴──────────────────┤
│ Terminal | Problems | Output | Git Diff | Logs | Testing      │
├──────────────────────────────────────────────────────────────┤
│ Status Bar: project | branch | model | sync | task | tokens   │
└──────────────────────────────────────────────────────────────┘
```

### Panel Definitions

| Panel | Description | Min Size | Default Size |
|-------|-------------|----------|-------------|
| **Activity Bar** | Fixed-width vertical icon bar, not resizable | 48px fixed | 48px |
| **Explorer Panel** | File tree, Search, Git, Tasks, Docs, Logs | 15% | 20% |
| **Editor Area** | Monaco editor with tab bar at the top | 30% | 50% |
| **AI Panel** | Current task, criteria, agent chat | 20% | 30% |
| **Bottom Panel** | Terminal, Problems, Output, Git Diff, Logs, Testing | 15% | 25% |

---

## 3. Activity Bar

The Activity Bar is a fixed 48px-wide vertical bar on the far left. Each icon toggles its corresponding Explorer Panel section.

| Icon | Section | Description |
|------|---------|-------------|
| Files icon | **Explorer** | Project file tree, directory navigation |
| Search icon | **Search** | Full-text search across the project |
| Git icon | **Git** | Branch, staged changes, diff summary |
| Task icon | **Tasks** | Quick-access task list filtered to the active project |
| AI icon | **AI** | Agent chat and history |
| Docs icon | **Docs** | Project context documents and architecture notes |
| Log icon | **Logs** | Daily and weekly log access |
| Settings icon | **Settings** | Jump to the settings page |

- Clicking the currently active icon collapses the Explorer Panel.
- The active icon has a visible accent indicator (left border or background highlight).
- Icon tooltips appear on hover.

---

## 4. Explorer Panel

The Explorer Panel displays different content depending on which Activity Bar section is active.

### File Explorer

- Tree view with expand/collapse for directories
- Right-click context menu with: Open, Rename, Delete, Copy Path, New File, New Folder
- Tracked files (changed since last commit) highlighted in amber/green
- Clicking a file opens it in a new editor tab
- Keyboard navigation: arrow keys, Enter to open, Space to expand

### Search

- Full-text search input at the top
- Results grouped by file, showing matching lines with context
- Click a result to open the file and jump to the matching line

### Git

- Current branch name at the top with checkout action
- Changed files list: staged (green), unstaged (amber), untracked (gray)
- Stage/unstage individual files or all at once
- Commit message input and commit button
- Recent commits list with abbreviated SHA

---

## 5. Editor Area

### Tab Bar

- Each open file has a tab showing filename and language icon
- Unsaved files show a dot indicator
- Tabs can be closed via the `×` button or `Cmd/Ctrl + W`
- Right-click a tab for: Close, Close Others, Close All, Reveal in Explorer

### Monaco Editor

- Language detection based on file extension
- Syntax highlighting, autocomplete, error underlining (if language server available)
- Theme matches the global VibeForge dark theme
- `Cmd/Ctrl + S` saves and triggers autosave to the file bridge
- Line numbers visible
- Minimap visible on the right (can be toggled off)
- Word wrap configurable

---

## 6. AI Panel

The AI Panel is the embedded agent interface. It must always be contextually aware of the active task.

### Panel Sections

| Section | Description |
|---------|-------------|
| **Current Task** | Title, status badge, and priority of the currently selected task |
| **Acceptance Criteria** | Full checklist of criteria — each item is checkable inline |
| **Related Files** | Quick-open links to files related to the task |
| **Related Docs** | Links to relevant architecture or documentation entries |
| **Agent Chat** | The conversation thread: user messages, AI thoughts, tool calls, tool results |
| **Input Area** | Multiline text input with `@skill`, `#file` prefix support and a Send button |
| **Run Logs** | Collapsible view of the raw agent iteration log (tool calls, iterations, latency) |
| **Suggested Commands** | Inline quick-action chips generated by the agent (e.g., "Run Tests", "Stage Changes") |

### Agent Stream Rendering

- `thought` events: rendered in a collapsible gray block with italic styling
- `tool_call` events: rendered as a dark code block showing the tool name and parameters
- `tool_result` events: rendered below the tool_call block with output formatting
- `content` events: rendered as the final assistant message in the chat bubble
- `done` events: show a completion indicator and unlock the input

---

## 7. Bottom Panel

The Bottom Panel is toggled with `Cmd/Ctrl + J` and defaults to visible. It contains tabbed sub-panels:

| Tab | Description |
|-----|-------------|
| **Terminal** | xterm.js terminal, supports multiple terminal instances |
| **Problems** | TypeScript/ESLint errors and warnings from the current project |
| **Output** | Server logs, build output, agent run output |
| **Git Diff** | Side-by-side or unified diff viewer for staged changes |
| **Logs** | Real-time stream of today's daily log entries |
| **Testing** | Test runner output from the most recent test execution |

- The active tab is highlighted with an accent underline.
- Terminal instances are pinned (they do not restart when switching tabs).

---

## 8. Status Bar

The Status Bar is a fixed, single-line bar at the very bottom of the screen. It must always be visible.

| Segment | Description |
|---------|-------------|
| **Active Project** | Project name — clickable to switch projects |
| **Active Branch** | Current git branch — clickable to open Git panel |
| **Active Provider/Model** | Provider name + model name — clickable to open provider settings |
| **NocoDB Sync** | Green dot (synced), amber dot (pending), red dot (error) |
| **Current Task Status** | Status badge of the currently focused task |
| **Agent Status** | "Agent running..." with spinner when the agent loop is active |
| **Terminal Status** | Indicator if a terminal command is running |
| **Token Counter** | Estimated prompt tokens for the current session |

---

## 9. Interaction Guidelines

- **Panel resizing**: Must be smooth with no performance jitter. Use CSS transitions sparingly — functionality over animation.
- **Tab switching**: Instant — no loading spinners when switching between already-loaded editor tabs.
- **Context awareness**: When a task is selected from the Tasks panel, the AI Panel must automatically update to show that task's context.
- **Autofocus**: When the user opens the AI Panel chat, the input must receive focus immediately.
- **Keyboard trap prevention**: `Tab` key inside Monaco Editor must insert a tab character, not change focus. Users exit via `Escape` followed by `Tab`.
