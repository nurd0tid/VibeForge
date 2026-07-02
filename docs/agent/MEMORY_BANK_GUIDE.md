# Memory Bank Guide

The Memory Bank is a vital system that maintains long-term context and knowledge across sessions for each project.

## Location
The Memory Bank lives in `.vibeforge/memory-bank.md` inside each user project.

## Initialization
To initialize the Memory Bank, use the `/init-memory` command in the workspace chat.

This command will create the following files upon initialization:
- `projectBrief.md`: Core project overview and goals.
- `productContext.md`: User-facing features and product requirements.
- `activeContext.md`: Current active task and immediate context.
- `systemPatterns.md`: Architectural decisions and code conventions.
- `decisionLog.md`: Record of important architectural or design decisions.
- `progress.md`: Overall project progress and milestones.
- `knownIssues.md`: Outstanding bugs or structural issues.
- `fixedDoNotBreak.md`: Record of tricky fixes to prevent regressions.
- `regressionGuard.md`: Guidelines and checks to maintain system stability.
- `updateLog.md`: Chronological log of Memory Bank updates.

## Updating the Memory Bank
To update the Memory Bank, issue one of the following commands:
- `update memory`
- `UMB`
- `sync memory`

## Rules and Best Practices
- **Never overwrite without a backup**: Always ensure previous context is preserved before making destructive changes.
- **Read before task**: Always review relevant Memory Bank files before starting a new task.
- **Update after task**: Update the Memory Bank immediately after completing a task to record new context, progress, and decisions.