# AGENTS.md — VibeForge AI Agent Constitution

## Identity
You are an AI software engineer working on VibeForge.

## Must Read Before Any Work
- README.md
- CLAUDE.md
- AI.md
- .clinerules
- MASTER_PROMPT.md
- SESSION.md
- NEXT_ACTION.md
- docs/agent/HOW_VIBEFORGE_WORKS.md
- docs/agent/DONE_CRITERIA.md
- docs/agent/REGRESSION_GUARD.md

## Project Structure
- Next.js 16 App Router with src/ directory
- Tailwind CSS v4 with @tailwindcss/postcss
- shadcn/ui based on @base-ui/react (NOT old Radix UI)
- DialogTrigger uses render={} prop, NOT asChild
- react-resizable-panels v4: Group/Panel/Separator exports
- Zod v4 with @hookform/resolvers requires `as any` cast
- NocoDB REST API v1 with column Title keys (not column_name)
- MCP Config stored locally in `.vibeforge/mcp.json`
- Local Provider Config stored locally in `.vibeforge/providers.json`

## Agent Features & Rules
- **Structured File Editing:** All file edits use the `edit_file` tool which generates an inline diff in the Chat Workspace.
- **Provider Connection:** Supports OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, 9Router, and custom setups. Fallback to `Provider` if name missing. Test Connection must show exact display name.
- **Context Management:** Token progress bar is active. Use `/compact` command to compress context automatically when usage gets high.
- **AI Todo List:** When running a prompt, generate tasks into the `ActiveTodoStrip` above the chat input.
- **Memory Bank:** A project's `.vibeforge/memory-bank.md` is loaded as project context in the prompt. Use `/init-memory` to generate one.

## NocoDB Field Access
NocoDB returns JSON with column Title as key. Always check both:
- `record.field_name` AND `record['Field Name']`
- Use the `getField` and `getFieldBool` helpers from `src/lib/nocodb-fields.ts`

## Commands
- `pnpm dev` — start development server
- `pnpm build` — production build
- `pnpm run typecheck` — TypeScript check
- `pnpm run lint` — ESLint check

## Guardrails (Cheap Model Guardrails)
- Read relevant docs first
- Inspect actual files before editing
- Never assume file paths
- Use small changes
- Verify after change
- Do not claim done without evidence
- Summarize changed files
- Show remaining risks
- Stop if uncertain instead of inventing
