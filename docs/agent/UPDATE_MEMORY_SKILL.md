# Update Memory Skill

The Update Memory Skill is a core workflow that synchronizes the workspace's state with the Memory Bank.

## Triggers
This skill is triggered when the agent detects or the user enters the following commands:
- `update memory`
- `UMB`
- `sync memory`

## Process
When triggered, the agent performs the following actions:
1. **Reads context**: Collects information about completed tasks, changed files, and new design/architectural decisions.
2. **Updates files**: Re-writes or edits the relevant Memory Bank files to keep them accurate:
   - `activeContext.md`: Updates the current focus.
   - `progress.md`: Updates status of milestones and tasks.
   - `decisionLog.md`: Logs any new architectural decisions.
   - `knownIssues.md`: Updates active or fixed issues.
   - `fixedDoNotBreak.md`: Records regression prevention items.
   - `updateLog.md`: Appends a chronological entry of the sync.

Always verify that updates to the Memory Bank do not destroy prior history or context.