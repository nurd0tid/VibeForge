# NEXT_ACTION.md — Upcoming Work

This file is the single source of truth for what to work on next. Update it after completing each task.

---

## Current Status

| Check | Status |
|-------|--------|
| Workspace Visual Overhaul | ✅ Complete |
| Build | ✅ Passing |
| TypeScript | ✅ Passing |
| Lint | ✅ 0 errors |

---

## Next Tasks (Priority Order)

1. **Connect real AI completions in Workspace AI Panel** — Use the active provider/model selected in the Workspace to power the AI chat, replacing any mocked responses.

2. **Connect real xterm.js terminal to server-side bridge** — Implement a WebSocket or server-sent event bridge so the in-app terminal communicates with a real shell process.

3. **Connect real Git diff in Workspace bottom panel** — Show live git diff output for the current file or project in the `Git` bottom panel tab.

4. **Add drag-and-drop to Kanban Board** — Implement card dragging between status columns using `@dnd-kit/core` or a similar library already in the project.

5. **Weekly logs auto-generation** — Implement the `/weekly-log` skill or a scheduled API route that aggregates daily logs into a weekly summary and saves it to NocoDB.
