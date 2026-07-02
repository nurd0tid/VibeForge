# Diff Viewer Rules

The Diff Viewer provides clear, actionable feedback on code modifications proposed by the agent.

## Display Rules
- **Inline Diff format**:
  - Removed lines are highlighted in **red**.
  - Added lines are highlighted in **green**.
- **Tool Call Accordion**:
  - When a tool call completes, its UI accordion is collapsed by default to save space.
- **File Path**:
  - The absolute or relative file path being edited must always be shown clearly in the header of the diff block.
- **Side-by-side View**:
  - A side-by-side diff option is available (the underlying data structure supports this) and can be toggled if preferred over inline diffs.