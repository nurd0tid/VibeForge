# UI/UX Standard

This document defines the visual and interaction design standards for VibeForge. Every page, component, and layout decision must conform to these rules.

---

## 1. Design Identity

VibeForge must feel like:

```
VS Code  +  Linear  +  GitHub  +  Notion  +  AI Agent
```

| Inspiration | What VibeForge Takes From It |
|-------------|----------------------------|
| **VS Code** | Resizable panels, activity bar, command palette, file explorer, integrated terminal, status bar, editor tabs |
| **Linear** | Clean task management, fast keyboard-driven UI, minimal chrome, dense information display |
| **GitHub** | Code review, diff viewer, branch awareness, commit history |
| **Notion** | Structured documentation, flexible content blocks, in-app context |
| **AI Agent** | Inline chat, task-aware suggestions, tool execution, agentic loop visibility |

If a design decision does not clearly contribute to this combined identity, it is wrong.

---

## 2. Desktop-First Principles

VibeForge is a **desktop-first** application. Mobile and tablet layouts are secondary and should never compromise the desktop experience.

### Mandatory Desktop Features

| Feature | Description |
|---------|-------------|
| **Resizable panels** | All major layout regions (sidebar, editor, AI panel, bottom panel) must use `react-resizable-panels` v4 with `Group`, `Panel`, and `Separator` exports |
| **Collapsible sidebar** | The left sidebar must collapse to icon-only mode, preserving screen space |
| **Docked panels** | Panels must dock to their designated positions (left, center, right, bottom) and remember their sizes |
| **Split editor** | Users must be able to open multiple files side-by-side in the editor area |
| **Context menus** | Right-click menus on files, tasks, and other entities with relevant actions |
| **Command palette** | `Cmd/Ctrl + K` opens a searchable command palette (like VS Code or Linear) |
| **Keyboard shortcuts** | All primary actions must be accessible via keyboard |
| **Status bar** | A persistent bottom bar showing project, branch, provider, sync, and task status |
| **Bottom panel** | A collapsible bottom region for terminal, problems, output, diff, logs, and test results |

---

## 3. Resizable Panel Rules

All resizable panel layouts must follow these strict rules:

```typescript
import { Group, Panel, Separator } from 'react-resizable-panels'
```

| Rule | Detail |
|------|--------|
| **Import names** | Always use `Group`, `Panel`, `Separator` — never `PanelGroup` or `PanelResizeHandle` |
| **Min/max sizes** | Every `Panel` must define `minSize` and `maxSize` percentages to prevent collapsed or overflowed panels |
| **Default sizes** | Every `Panel` must define a `defaultSize` that produces a usable layout on 1920×1080 screens |
| **Persistence** | Panel sizes must be saved to `localStorage` using the `autoSaveId` prop on `Group` |
| **Direction** | Horizontal layouts use `direction="horizontal"`, vertical use `direction="vertical"` |
| **Nesting** | Groups can be nested (e.g., a horizontal Group containing a vertical Group for editor + bottom panel) |
| **Collapse** | Collapsible panels must use the `collapsible` and `collapsedSize` props, not conditional rendering |
| **Separator styling** | `Separator` must have a visible hover indicator (e.g., a subtle blue bar on hover) |

---

## 4. VS Code-like Workspace Layout

The Workspace page (`/workspace`) is the heart of VibeForge. It must replicate the VS Code experience as closely as possible:

```
┌──────────────────────────────────────────────────────────────┐
│ Command Bar / Top Bar                                        │
├────┬───────────────┬─────────────────────────┬───────────────┤
│Act │ Explorer      │ Editor Tabs             │ AI Panel      │
│Bar │ Files         │ Monaco Editor           │ Current Task  │
│    │ Search        │                         │ Criteria      │
│    │ Git           │                         │ Chat          │
│    │ Docs          │                         │ Related Docs  │
├────┴───────────────┴─────────────────────────┴───────────────┤
│ Terminal | Problems | Output | Git Diff | Logs | Testing      │
├──────────────────────────────────────────────────────────────┤
│ Status Bar                                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Information Density

VibeForge is a productivity tool. Every pixel must earn its place.

### Do

- Use compact spacing (`gap-1`, `gap-2`, `p-2`, `p-3`) — not `p-8` or `gap-6`
- Show data inline where possible (e.g., priority badges, status dots, progress bars on task cards)
- Use tables for structured data, not cards with excessive whitespace
- Truncate long text with ellipsis and show full text on hover or in a drawer
- Use icon-only buttons with tooltips in toolbars

### Do Not

- Never use large, empty hero sections
- Never use decorative gradients or abstract illustrations
- Never show stats with no real data behind them
- Never use card layouts with more padding than content

---

## 6. Zero Context Switching

The user must be able to complete the following workflow **without leaving the Workspace page**:

1. Pick a task from the task list
2. Read its acceptance criteria and checklist
3. Open the relevant file(s) in the editor
4. Edit code in Monaco Editor
5. Run terminal commands
6. Ask the AI agent for help
7. Review diffs
8. Update the daily log

If the user must navigate to another page to complete any of these steps, the design has failed.

---

## 7. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Command palette |
| `Cmd/Ctrl + P` | Quick file open |
| `Cmd/Ctrl + Shift + T` | Open task panel |
| `Cmd/Ctrl + Shift + A` | Open AI agent |
| `Cmd/Ctrl + Shift + L` | Open daily log |
| `Cmd/Ctrl + Shift + S` | Open schedule |
| `Cmd/Ctrl + Shift + K` | Open planner |
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + J` | Toggle bottom panel |
| `Cmd/Ctrl + \` | Split editor |
| `Cmd/Ctrl + W` | Close active tab |

---

## 8. Required Page States

Every page and data-driven component must implement the following states. Missing any one of these is a blocking deficiency:

| State | Implementation |
|-------|---------------|
| **Loading** | Skeleton placeholder matching the layout shape — not a generic spinner |
| **Empty** | Meaningful message explaining what's missing + a primary action button (e.g., "Create your first project") |
| **Error** | Specific error message + a "Retry" button — not a blank screen |
| **Retry** | On error, the user must be able to retry without refreshing the page |
| **Toast** | Success, error, and warning toasts via Sonner for all mutations |
| **Confirmation** | SweetAlert2 confirmation dialog before any destructive action (delete, overwrite, reset) |

Use the shared components: `<LoadingState />`, `<EmptyState />`, `<ErrorState />` from `src/components/common/`.

---

## 9. Forbidden Patterns

The following patterns are strictly prohibited in VibeForge:

| Forbidden | Why |
|-----------|-----|
| Generic admin dashboard layouts | VibeForge is a workspace, not a CMS |
| CRUD-only pages with no workflow | Every page must serve a purpose in the development lifecycle |
| Fake statistics with placeholder data | Only show real data from NocoDB |
| Excessive whitespace | Wastes screen real estate on a desktop-first tool |
| Random decorative gradients | Conflicts with the professional VS Code aesthetic |
| Inconsistent button styles | All buttons must use shadcn/ui button variants |
| Missing user feedback | Every action must produce visible feedback (toast, state change, animation) |
| Modal overuse | Prefer drawers and inline editing over modals — reserve modals for confirmations only |
