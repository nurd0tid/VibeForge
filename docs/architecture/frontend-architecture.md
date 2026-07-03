# Frontend Architecture

## Framework Core
VibeForge's frontend is powered by Next.js 16 (App Router) utilizing React 19. The entire architecture embraces Server Components by default, pushing interactivity to Client Components (`'use client'`) only at the leaf nodes or feature boundaries.

## Styling & Theming

- **Tailwind CSS v4:** Uses the new v4 engine with `@tailwindcss/postcss`. There is no traditional `tailwind.config.ts`. Configuration is managed directly in CSS variables within the main stylesheet.
- **Color System:** Dark mode is enforced as the primary experience using `next-themes`. The palette aligns with standard IDE dark themes (slate/zinc).
- **Typography:**
  - **Interface:** Geist Sans / Inter.
  - **Code/Editor:** JetBrains Mono (primary), Geist Mono.

## Component Architecture

- **Base UI Integration:** `shadcn/ui` components are built on `@base-ui/react` (not Radix UI). This modern foundation provides unstyled, accessible primitives.
- **Render Props:** Components like `DialogTrigger` utilize the `render={}` render prop pattern instead of the legacy `asChild` pattern.
  - *Correct:* `<DialogTrigger render={<Button>Click me</Button>} />`
  - *Incorrect:* `<DialogTrigger asChild><Button>Click me</Button></DialogTrigger>`
- **Forms & Validation:** `react-hook-form` is coupled with `zodResolver`. Due to typing constraints, the resolver must be cast: `zodResolver(schema) as any`.

## State Management

State is divided by domain responsibility to avoid prop drilling and monolithic stores:

| Store Type | Technology | Purpose |
|------------|------------|---------|
| **Server State** | TanStack Query v5 | Handles all asynchronous data (NocoDB tables, git status, file system fetches). Features caching, optimistic updates, and background refetching. |
| **Workspace State** | Zustand | `useWorkspaceStore` manages the Monaco Editor IDE experience (open tabs, active file, dirtiness, terminal logs, AI chat history). |
| **UI State** | Zustand | `useUiStore` manages global layout states (sidebar collapse, active project context, global modals). |

## Layouts & Sub-Systems

### 1. Workspace IDE (`src/app/(app)/workspace/`)
The core interface where code generation happens.
- **Panels:** Powered by `react-resizable-panels` v4. Uses `<PanelGroup>`, `<Panel>`, and `<PanelResizeHandle>` directly (deprecated v3 syntax is strictly forbidden).
- **Editor:** `@monaco-editor/react` provides VS Code-like syntax highlighting and interaction.
- **Components:** File explorer tree, terminal output log, and the AI agent chat pane interface.

### 2. Schedule Board (`src/app/(app)/schedule/`)
A calendar-based planning view.
- Maps NocoDB `schedules` records to a Monday-Sunday grid.
- Allows dragging or assigning NocoDB tasks to specific dates.

### 3. Projects Dashboard (`src/app/(app)/projects/`)
The entry point.
- Lists available local workspaces.
- Checks `git` status to ensure working directories are clean.
- Validates local file paths via `/api/workspace/validate-path`.

### 4. Docs Reader (`src/app/(app)/docs/`)
A dedicated Markdown rendering engine for project documentation.
- Renders `.md` files in a high-contrast prose style.
- Syntax highlighting for code blocks within documentation.
