# Memory Bank Guide

The Memory Bank is the single source of truth for the project's long-term context, architectural decisions, and current state across agent sessions. Because the agent starts each session with no prior knowledge, the Memory Bank acts as its persistent brain.

**Mandatory Rule:** The Memory Bank must be read at the start of every session and updated at the end of every session or task completion. An unsynchronized Memory Bank means the task is **not done**.

---

## Structure and Location

The Memory Bank resides in `.vibeforge/memory-bank.md` and its associated sub-files within the project repository. It is generated and maintained via specific commands.

### Core Files

| File | Purpose | When to Update |
|------|---------|----------------|
| `projectBrief.md` | High-level project definition and core goals | Only when project scope fundamentally changes |
| `productContext.md` | User-facing features, requirements, and use cases | When adding or modifying core user flows |
| `activeContext.md` | **Highest touch frequency.** Current focus area, recent changes, immediate next steps | At the start and end of every task/session |
| `systemPatterns.md` | Architectural decisions, code conventions, stack choices | When introducing a new pattern, library, or structural change |
| `decisionLog.md` | Chronological record of major architectural or design decisions with rationale | When making significant tradeoffs or technology choices |
| `progress.md` | Milestones, completed features, overall progress tracking | When completing a major feature or sprint milestone |
| `knownIssues.md` | Outstanding bugs, technical debt, or structural deficiencies | When discovering a bug or deferring a non-critical issue |
| `fixedDoNotBreak.md` | Tricky, non-obvious fixes that must not be reversed | When fixing a complex edge case or applying a fragile workaround |
| `regressionGuard.md` | Project-specific checks and guardrails | When identifying a pattern of recurring errors |
| `updateLog.md` | Chronological log of Memory Bank modifications | Atomic with any other Memory Bank update |

---

## Initialization

To generate a new Memory Bank or reset an existing one, use the `/init-memory` command in the workspace chat.

This command will:
1. Scan the project for existing context.
2. Generate all required sub-files.
3. Populate initial data based on project state and configuration.

---

## Update Workflow (Bi-Directional Sync)

To trigger a manual update cycle, issue one of these commands:
- `update memory`
- `UMB`
- `sync memory`

However, the agent is expected to update the memory implicitly as part of its task completion workflow.

### The Update Process:

1. **Review**: Identify what changed in the current session (code, decisions, issues).
2. **Target**: Determine which Memory Bank files require updates based on the changes.
3. **Execute**: Modify the target files, ensuring previous context is not inadvertently overwritten.
4. **Log**: Add an entry to `updateLog.md` detailing what was changed and when.

---

## Rules and Best Practices

- **Never Overwrite Blindly**: Always read the existing content before making destructive changes. The Memory Bank contains hard-won context from prior sessions. Do not erase it casually.
- **Atomic Updates**: Memory Bank updates must happen concurrently with code changes. Do not wait until "later."
- **Focus on the `Why`**: The codebase already documents *what* the system does and *how* it does it. The Memory Bank's primary value is documenting *why* decisions were made, *why* certain patterns are used, and *why* specific fixes were applied.
- **Chesterton's Fence for Context**: If you don't understand why a particular piece of context is in the Memory Bank, do not delete it. Ask the user or leave it alone.
- **Keep it Actionable**: Avoid rambling narratives. Use clear headers, bullet points, and checklists to make the context easily digestible for future agents.
- **Zero Hallucination**: Do not write planned future work as if it is already completed. Clearly distinguish between "done," "in progress," and "planned."
