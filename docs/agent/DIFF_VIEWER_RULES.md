# Diff Viewer Rules

The Diff Viewer is the primary interface for inspecting and verifying proposed code changes. It ensures code reviews are visual, accurate, and easy to parse.

---

## 1. Presentation Rules

- **Inline Diff View**:
  - Removed lines are highlighted in **red** with a leading `-` symbol.
  - Added lines are highlighted in **green** with a leading `+` symbol.
- **Header Metadata**:
  - The header of the diff block must clearly display the absolute or relative file path being edited.
- **Tool Call Accordion**:
  - Once a tool call executes successfully, its UI accordion collapses by default to save vertical workspace space and keep the focus on active tasks.
- **Side-by-side View Option**:
  - For complex or structural edits, a side-by-side toggle option must be available to allow spatial comparison of before and after states.

---

## 2. Agent Constraints

When generating edits that feed the Diff Viewer, the agent must adhere to these rules:

- **Exact Match**: The `oldString` provided to the `edit_file` tool must match the target code exactly, including leading spaces, tabs, and line endings.
- **Unique Context**: Provide enough surrounding lines of context to ensure the match is unique within the file.
- **Single Change per Block**: Group related edits together, but separate unrelated edits into separate tool calls or separate blocks to keep diffs readable.
- **No Invisible Edits**: All changes must be visible in the diff. Never propose an edit that makes no functional change to the file.
