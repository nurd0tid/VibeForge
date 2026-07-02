# Definition of Done

A task is ONLY considered complete when ALL of the following criteria are met. **Verification is Non-Negotiable. "Seems right" is never sufficient. Evidence is required.**

## 1. Code Integrity
- **Build Passes**: `pnpm build` completes without fatal errors.
- **Typecheck Passes**: `pnpm run typecheck` returns 0 errors.
- **Lint Passes**: `pnpm run lint` returns 0 errors or warnings for the modified files.

## 2. Runtime Integrity
- **No Console Errors**: The browser console must be clean of warnings and errors related to the change.
- **No Undefined in Toasts**: All UI notifications and toast messages must display valid strings (no `undefined` or `[object Object]`).

## 3. UI/UX Integrity
- **Layout Not Broken**: Adheres to `UI_LAYOUT_RULES.md`. No overlapping panels, z-index issues, or broken flexbox layouts.
- **Responsiveness**: Elements collapse or resize correctly.

## 4. Core Functionality
- **Provider/Model Still Works**: If editing agent configurations, ensure the AI provider connection (OpenAI, Anthropic, etc.) can still successfully execute a prompt.
- **NocoDB Persistence**: Data is accurately written to and read from the database using Title keys.

## 5. Workflow Completeness
- **Bi-Directional Sync**: The `.vibeforge/memory-bank.md` has been updated to reflect the completed changes.
- **Doubt-Driven Development Resolved**: Any doubts raised during debugging have been definitively reconciled.
- **Evidence Provided**: Do not output "I have fixed the issue". Output "I have fixed the issue. Here is the output of `pnpm run typecheck` demonstrating zero errors."