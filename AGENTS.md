# AGENTS.md — VibeForge AI Agent Constitution

This is the primary configuration document for all AI agents working on VibeForge. Every agent must read this file before performing any work.

## Identity

You are an AI software engineer working on **VibeForge**, an open-source AI Coding Workspace.

## Required Reading (Before Any Work)

Read these documents in order before making any code changes:

| Priority | Document | Purpose |
|----------|----------|---------|
| 1 | `README.md` | Project overview, setup, and tech stack |
| 2 | `CLAUDE.md` | Agent-specific entry point |
| 3 | `AI.md` | Universal AI behavior rules and operating loop |
| 4 | `.clinerules` | Workflow rules and done criteria |
| 5 | `MASTER_PROMPT.md` | Full development prompt for new sessions |
| 6 | `SESSION.md` | Current phase, recent changes, and blockers |
| 7 | `NEXT_ACTION.md` | Next concrete action to take |
| 8 | `docs/agent/HOW_VIBEFORGE_WORKS.md` | System architecture overview |
| 9 | `docs/agent/DONE_CRITERIA.md` | Strict definition of done |
| 10 | `docs/agent/REGRESSION_GUARD.md` | Rules to prevent regressions |

## Project Structure & Key Tech Details

| Area | Detail |
|------|--------|
| Framework | Next.js 16 App Router with `src/` directory |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` |
| Components | shadcn/ui based on `@base-ui/react` (**NOT** old Radix UI) |
| Dialogs | `DialogTrigger` uses `render={}` prop, **NOT** `asChild` |
| Panels | `react-resizable-panels` v4: uses `Group`, `Panel`, `Separator` exports |
| Validation | Zod v4 with `@hookform/resolvers` requires `as any` cast |
| Database | NocoDB REST API v1 — uses column **Title** as JSON keys (not `column_name`) |
| MCP Config | Stored locally in `.vibeforge/mcp.json` |
| Provider Config | Stored locally in `.vibeforge/providers.json` |

## Agent Features & Rules

| Feature | Rule |
|---------|------|
| **Structured File Editing** | All file edits use the `edit_file` tool, generating inline diffs in the Chat Workspace. |
| **Provider Connection** | Supports OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, 9Router, and custom setups. Fallback to `Provider` if name is missing. Test Connection must show exact display name. |
| **Context Management** | Token progress bar is active. Use `/compact` command to compress context when usage is high. |
| **AI Todo List** | When running a prompt, generate tasks into the `ActiveTodoStrip` above the chat input. |
| **Memory Bank** | A project's `.vibeforge/memory-bank.md` is loaded as project context. Use `/init-memory` to generate one. |

## NocoDB Field Access

NocoDB returns JSON with **column Title** as the key. Always check both formats:

```typescript
record.field_name           // snake_case (sometimes works)
record['Field Name']        // Title Case (canonical)
```

Use the `getField()` and `getFieldBool()` helpers from `src/lib/nocodb-fields.ts`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server |
| `pnpm build` | Run a production build |
| `pnpm run typecheck` | Run TypeScript type checking |
| `pnpm run lint` | Run ESLint |

## Guardrails

These guardrails prevent low-quality or harmful output:

1. **Read first.** Always read relevant docs and inspect existing files before editing.
2. **Never assume file paths.** Verify that files exist before referencing them.
3. **Make small, focused changes.** Avoid sweeping refactors unless explicitly instructed.
4. **Verify after every change.** Run build/typecheck/lint after editing.
5. **Never claim "done" without evidence.** Passing checks and working UI are the bar.
6. **Summarize changed files.** List all files modified in your session update.
7. **Surface remaining risks.** If anything is incomplete or risky, state it clearly.
8. **Stop if uncertain.** Ask for clarification instead of inventing assumptions.
