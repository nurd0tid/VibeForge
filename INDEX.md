# VibeForge — Documentation Index

A structured index of all documentation in this repository, organized by audience and purpose.

---

## For Human Developers

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview, feature list, setup guide, and quick reference |
| `CONTRIBUTING.md` | How to contribute, PR checklist, development principles |

---

## For AI Agents (Root Configuration)

These files must be read by any AI agent before making changes:

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | AI Agent Constitution — the primary rules document |
| `CLAUDE.md` | Agent-specific entry point (points to AGENTS.md) |
| `AI.md` | Universal operating loop and behavioral rules |
| `.clinerules` | Workflow rules and strict done criteria |
| `MASTER_PROMPT.md` | Full onboarding prompt for new development sessions |
| `SESSION.md` | Current session phase, recent changes, active blockers |
| `NEXT_ACTION.md` | The next concrete action to take |
| `RECOVERY.md` | Protocol for recovering from context/session loss |

---

## Architecture & Standards

| Document | Purpose |
|----------|---------|
| `docs/overview/product-requirements.md` | Full product requirements spec |
| `docs/architecture/system-architecture.md` | High-level system architecture |
| `docs/architecture/frontend-architecture.md` | Frontend structure and patterns |
| `docs/architecture/backend-architecture.md` | Backend/API structure |
| `docs/ui-ux/ui-ux-standard.md` | UI/UX rules and design philosophy |
| `docs/standards/definition-of-done.md` | Strict DoD for all tasks |
| `docs/standards/coding-standard.md` | Code style and conventions |
| `docs/standards/security-standard.md` | Security rules |

---

## Database

| Document | Purpose |
|----------|---------|
| `docs/database/nocodb-schema.md` | Full NocoDB table schema |
| `docs/database/nocodb-setup.md` | NocoDB setup and configuration guide |

---

## AI & MCP

| Document | Purpose |
|----------|---------|
| `docs/ai/mcp-rules.md` | MCP server configuration rules |
| `docs/ai/project-context.md` | Current project context for AI agents |
| `docs/ai/provider-rules.md` | AI provider integration rules |
| `docs/ai/implementation-rules.md` | Implementation-level coding rules |

---

## Agent Guide (`docs/agent/`)

| Document | Purpose |
|----------|---------|
| `VIBEFORGE_OVERVIEW.md` | General overview of the VibeForge system |
| `USAGE_GUIDE.md` | Guide on how to use the agent system |
| `HOW_VIBEFORGE_WORKS.md` | System architecture overview for agents |
| `DONE_CRITERIA.md` | Strict, agent-facing definition of done |
| `REGRESSION_GUARD.md` | Rules to prevent regressions |
| `AGENT_WORKFLOW.md` | Step-by-step agent workflow |
| `TASK_PLAY_WORKFLOW.md` | Details on the task play workflow execution |
| `MEMORY_BANK_GUIDE.md` | How to use and update the memory bank |
| `UPDATE_MEMORY_SKILL.md` | Specific skill for updating project memory |
| `PROVIDER_CONNECTIONS.md` | Provider connection setup rules |
| `STRUCTURED_EDITING.md` | How structured file diffs work |
| `DIFF_VIEWER_RULES.md` | Diff viewer behavior rules |
| `MCP_SETUP.md` | MCP server setup from within VibeForge |
| `TOOLING_AND_COMMANDS.md` | Reference for tooling and available commands |
| `UI_LAYOUT_RULES.md` | IDE layout composition rules |
| `BRAND_ASSETS.md` | Rules for utilizing brand assets |
| `NOCODB_PERSISTENCE.md` | Guidelines for NocoDB data persistence |
| `SKILLS_INDEX.md` | Index of all available agent skills |

---

## Workflow

| Document | Purpose |
|----------|---------|
| `docs/workflow/development-workflow.md` | The standard development workflow |
| `docs/workflow/agent-operating-loop.md` | Agent's operating loop documentation |
| `docs/workflow/blocker-policy.md` | How to handle and escalate blockers |

---

## Skills (`docs/skills/`)

Skills are structured workflows the AI agent follows for specific recurring tasks. See `docs/agent/SKILLS_INDEX.md` for the full list.
