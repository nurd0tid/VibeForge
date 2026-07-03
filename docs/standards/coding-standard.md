# Coding Standard

## Guiding Principles

| Principle | Description |
|-----------|-------------|
| **Simplicity First** | Choose the simplest correct implementation. Avoid premature abstraction or over-engineering. |
| **Test-Driven Thinking** | Consider how code will be verified before writing it. Every function, hook, and API route should be structured for testability. |
| **Security By Default** | Never trust user input. Validate at boundaries (Zod schemas, path checks). Never expose secrets on the client. |
| **Read Before Write** | Always read relevant files and understand existing patterns before modifying code. |

## TypeScript

- **Strict Mode:** `strict: true` in `tsconfig.json` is required.
- **No Untyped Code:** Avoid `any` unless absolutely necessary (e.g., Zod v4 `as any` cast for `@hookform/resolvers`). Document the reason when used.
- **Zod v4 Validation:** All runtime data (API payloads, form inputs, NocoDB responses) must be validated through Zod schemas.
- **Type Co-location:** Keep types within their feature module (`src/features/<domain>/types.ts`) unless shared across multiple features.
- **Discriminated Unions:** Prefer discriminated unions over optional properties for state modeling (e.g., `{ status: 'loading' } | { status: 'error'; error: Error }`).

## Components (React / Next.js 16)

- **Small, Focused Components:** Each component should have a single responsibility. Extract sub-components when a file exceeds ~150 lines.
- **shadcn/ui + Base UI:** All interactive primitives use `@base-ui/react`. Dialog triggers use `render={}` prop, never `asChild`.
- **Server vs. Client Components:** Default to Server Components. Only add `'use client'` when hooks, event handlers, or browser APIs are required.
- **Co-located Feature Structure:**
  ```
  src/features/<domain>/
    ├── components/
    ├── hooks/
    ├── types.ts
    └── utils.ts
  ```
- **No Inline Styles:** Use Tailwind CSS v4 utility classes exclusively. Theme tokens are defined as CSS variables.

## State Management

| Layer | Tool | Usage |
|-------|------|-------|
| Server State | TanStack React Query v5 | All NocoDB and API data fetching. Custom hooks in `src/features/` encapsulate queries and mutations. |
| UI State | Zustand | Global UI flags (sidebar collapse, active project, modal visibility). |
| Workspace State | Zustand (`useWorkspaceStore`) | Monaco editor tabs, file tree, terminal output, AI chat history. |
| Form State | react-hook-form + Zod | All user input forms. Resolver cast: `zodResolver(schema) as any`. |

## Data Access & NocoDB

- Always access NocoDB fields using the **Title** column key.
- Use the `getField()` and `getFieldBool()` helpers from `src/lib/nocodb-fields.ts`.
- Check both `record.field_name` and `record['Field Name']` when consuming NocoDB JSON.
- Handle NocoDB connection failures gracefully (show user-friendly error, never crash).

## Error Handling

- **API Routes:** Catch all errors. Return structured `{ ok: false, error: { code, message } }` responses.
- **UI Components:** Use error boundaries or conditional rendering. Display user-friendly messages, never raw stack traces.
- **Agent Logging:** Record unexpected errors in NocoDB `agent_logs` for post-mortem analysis.

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| React Components | PascalCase | `TaskCard`, `ProviderSheet` |
| Variables & Functions | camelCase | `fetchTasks`, `isLoading` |
| Route Segments & Files | kebab-case | `api/daily-logs/route.ts` |
| CSS Variables | kebab-case with `--` prefix | `--color-primary` |
| NocoDB Table Names | snake_case | `daily_logs`, `task_plans` |
| Zod Schemas | camelCase with `Schema` suffix | `createTaskSchema` |
| Zustand Stores | camelCase with `use` prefix and `Store` suffix | `useUiStore` |

## Panels & Layout

- Use `react-resizable-panels` v4 with its `Group`, `Panel`, and `Separator` exports.
- Never use deprecated v3 APIs (`PanelGroup`, `PanelResizeHandle`).

## Icons

- Use `lucide-react` exclusively. Do not introduce alternative icon libraries without explicit approval.
