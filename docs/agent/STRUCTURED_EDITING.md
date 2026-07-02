# Structured Editing

VibeForge relies on structured editing to make precise, safe changes to codebases without requiring full file rewrites.

## Process
- All file changes are executed via the `edit_file` tool.
- This tool uses a strict search and replace mechanism to locate existing code and substitute it with new code.

## User Interface
- When an edit is proposed, an inline diff is shown directly in the chat interface.
- Removed lines are indicated clearly, alongside the new added lines.

## Manual Approve Mode
- If "Manual Approve" mode is enabled, the user will see **Apply** and **Reject** buttons on the diff.
- The agent pauses execution until the user approves or rejects the change.

## Tracking
- All changed files are tracked in the agent's activity log.
- This provides a clear audit trail of what files were touched during a specific task or session.