# VibeForge Vision

VibeForge is a desktop-first, AI-agentic coding workspace. It is designed to act as a unified command center for software development, removing the constant context switching that developers experience between various tools.

---

## The Vision: Zero Context Switching

Today, developers are forced to context-switch constantly:

- Writing code in **VS Code** or another IDE.
- Tracking progress in **Linear** or a Kanban board.
- Generating ideas, scripts, or explanations in a separate **ChatGPT/Claude** browser tab.
- Documenting decisions or architecture in **Notion** or Google Docs.
- Running builds, tests, and version control in the **Terminal**.
- Reviewing PRs and commits on **GitHub**.
- Updating manual spreadsheet logs or status updates for reporting.

**VibeForge consolidates this entire loop into a single, cohesive web interface.**

```
VS Code  +  Linear  +  GitHub  +  Notion  +  AI Agent
```

---

## Core Value Proposition

VibeForge enables a seamless developer-agent workflow:

1. **Create Project**: Initialize a project and link it to a local checkout and git repository.
2. **AI Planner**: Describe a major milestone. The AI agent analyzes the objective and breaks it into an architectural plan.
3. **Schedule**: The planner's output is mapped to a relative schedule (Day 1, Day 2, Day 3...).
4. **Kanban Tasks**: With a single click, convert schedule items into concrete Kanban tasks in NocoDB.
5. **IDE Workspace**: Open the Workspace page. The selected task's description, acceptance criteria, and checklist load directly into the AI Panel.
6. **Code & Edit**: Browse files in the tree view and edit them in Monaco Editor.
7. **Agent Execution**: Run the AI agent to implement the task. The agent reads the files, plans the changes, edits the code, and runs tests in the integrated terminal.
8. **Verify Diff**: Review the generated git diff side-by-side.
9. **Daily Logs**: On completion, the agent automatically compiles and writes the daily log and updates the project context.
10. **Done**: The task is updated in NocoDB as `done` and the Kanban board reflects the change immediately.

---

## Design Philosophy

- **Desktop First**: The workspace is a tool for professional developers. It is optimized for 1920×1080 screens with high information density, resizable layouts, keyboard shortcuts, and minimal decorative elements.
- **Agentic Source of Truth**: All data (tasks, logs, plans, schedules) resides in NocoDB. The AI agent reads and writes directly to NocoDB, ensuring that the team (humans and other agents) is always aligned.
- **Model Agnostic**: VibeForge uses an adapter layer to support multiple AI providers. Workflows are designed to degrade gracefully if a simpler model is used, ensuring independence from any single provider.
- **Extensible Skills**: AI behaviors are defined as "skills" (defined in NocoDB and `AGENTS.md`). Users can register new skills with custom prompts and outputs.
