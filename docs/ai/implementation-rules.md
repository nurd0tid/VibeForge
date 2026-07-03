# Implementation Rules

This document defines the mandatory implementation rules that every AI agent and human contributor must follow when working on VibeForge.

---

## 1. Full Rebuild Policy

If the current application state meets any of the following conditions, a full rebuild of the affected module is required:

- The app is broken and cannot start (`pnpm dev` fails).
- The UI still shows generic admin/dashboard patterns with no VibeForge identity.
- Any remnant of KarsaDesk branding, naming, or structure remains.
- Core pages are missing loading, empty, or error states.
- The NocoDB integration is non-functional or uses hardcoded data.

A rebuild must produce a working module that passes `pnpm build`, `pnpm run typecheck`, and `pnpm run lint` before it is considered complete.

---

## 2. README vs. AI Instructions — Strict Separation

`README.md` is exclusively for human readers and open-source contributors. It must contain project overview, setup instructions, tech stack, and contribution guidelines.

AI agent instructions must **never** live in `README.md`. They belong in the following files:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Primary agent constitution — read first |
| `CLAUDE.md` | Claude-specific entry point and overrides |
| `AI.md` | Universal AI behavior rules and operating loop |
| `.clinerules` | Workflow rules and done criteria for Cline-based agents |
| `MASTER_PROMPT.md` | Full development prompt for new agent sessions |
| `docs/ai/` | Detailed AI rules (this folder) |

---

## 3. Package Documentation — Always Use Context7

Before writing or modifying any code that interacts with a third-party library, the agent **must** consult Context7 for the latest documentation. This applies to all libraries in the stack, including but not limited to:

- **Framework**: Next.js, React
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (`@base-ui/react`), react-resizable-panels
- **State**: Zustand, TanStack Query
- **Forms**: React Hook Form, Zod v4
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Terminal**: xterm.js
- **Notifications**: Sonner, SweetAlert2
- **Database**: NocoDB REST API

**Rule**: If Context7 returns information that contradicts the agent's training data, Context7 wins. Library APIs change frequently — never rely on memorized syntax.

---

## 4. Complex Reasoning — Always Use Sequential Thinking

For any task that involves multi-step reasoning, architectural decisions, or non-trivial planning, the agent must use the Sequential Thinking MCP tool. This includes:

- Designing new features or modules
- Refactoring existing architecture
- Debugging complex, multi-file issues
- Planning database schema changes
- Evaluating tradeoffs between implementation approaches
- Resolving dependency conflicts
- Writing migration strategies

Sequential Thinking ensures the agent's reasoning is explicit, auditable, and less prone to hallucination.

---

## 5. Mandatory Implementation Elements — Never Skip

Every feature implementation must include the following. Omitting any of these is a blocking deficiency:

| Element | Requirement |
|---------|-------------|
| **Loading state** | Skeleton or spinner shown while data is being fetched |
| **Empty state** | Meaningful message and action when no data exists |
| **Error state** | Actionable error message with retry option |
| **Toast notifications** | Success, error, and warning feedback via Sonner |
| **Confirmation dialogs** | Required before any destructive action (delete, overwrite, reset) |
| **NocoDB persistence** | All data must be saved to NocoDB — never store state only in memory or local state |
| **Daily log entry** | Every completed work session must produce a daily log record in NocoDB |
| **Context update** | Any architectural decision or significant change must create a `project_context_updates` record |
| **Typed responses** | All API responses must be typed with TypeScript interfaces from `src/types/index.ts` |

---

## 6. No Hardcoded Secrets

All secrets, API keys, tokens, and credentials must be accessed through environment variables defined in `.env.local`. Specifically:

- **Never** hardcode NocoDB tokens, API keys, or base URLs in source code.
- **Never** prefix secrets with `NEXT_PUBLIC_` — they must remain server-side only.
- **Never** log, print, or expose secrets in console output, error messages, or API responses.
- **Never** commit `.env.local` or any file containing real credentials.
- Use `resolveApiKey()` from `src/lib/local-config.ts` for provider API key resolution.

---

## 7. Code Quality Standards

- All code must pass `pnpm build`, `pnpm run typecheck`, and `pnpm run lint` before being considered complete.
- Follow existing code conventions — inspect neighboring files before writing new code.
- Use existing utilities (`getField()`, `getFieldBool()`, `resolveApiKey()`) rather than reimplementing.
- Prefer composition over inheritance. Prefer small, focused functions over monolithic handlers.
- Every new component must follow the patterns established in `src/components/`.

---

## 8. File and Module Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Pages | `page.tsx` inside route folder | `src/app/(app)/tasks/page.tsx` |
| API routes | `route.ts` inside API folder | `src/app/api/tasks/route.ts` |
| Components | PascalCase `.tsx` | `TaskDrawer.tsx` |
| Hooks | camelCase with `use` prefix | `useProjects.ts` |
| Stores | camelCase with `.store.ts` suffix | `workspace.store.ts` |
| Utilities | camelCase `.ts` | `nocodb-fields.ts` |
| Types | `index.ts` in `src/types/` | `src/types/index.ts` |
