# Structured Editing

VibeForge uses structured editing to make precise, auditable changes to codebases. Full file rewrites are avoided unless no alternative exists.

---

## Editing Protocol

1. **Read First**: Always inspect the target file using read tools before proposing changes. Blind edits are prohibited.
2. **Use `edit_file`**: All file modifications are executed via the `edit_file` tool, which applies a strict search-and-replace mechanism to locate existing code and substitute it with new code.
3. **Minimal Surface Area**: Each edit targets the smallest block of code necessary to accomplish the task. Do not refactor or reformat adjacent lines.
4. **Chesterton's Fence**: Do not remove or rewrite code unless its purpose has been traced and understood.

---

## Inline Diff in Chat

- When an edit is proposed, an inline diff is rendered directly in the chat interface.
- Removed lines are highlighted in **red**; added lines are highlighted in **green**.
- The absolute or relative file path is always displayed in the diff header for traceability.

---

## Approval Modes

| Mode | Behavior |
|------|----------|
| **Auto Approve** | Edits are applied immediately upon generation. |
| **Manual Approve** | The agent pauses execution. The user sees **Apply** and **Reject** buttons on each diff. The agent does not proceed until the user acts. |

Manual Approve mode should be used for destructive or high-risk changes (e.g., schema modifications, provider configuration changes, mass refactors).

---

## Audit Trail

- Every file modification is logged in the agent's activity log.
- This log provides a complete record of which files were touched, what was changed, and during which task or session the change occurred.
- Modified files must also be summarized in the session's Done Declaration (see `DONE_CRITERIA.md`).
