# Prompt: Review Before Done

Review the task thoroughly before marking it as completed.

Check and verify all of the following:

- **Acceptance Criteria**: Ensure all criteria specified in the task description are met.
- **Blockers**: Confirm that all blocking issues have been resolved.
- **Build**: Run the build command and verify that it passes.
- **Typecheck**: Verify that TypeScript compiles without any errors.
- **Lint**: Run the linting checks and resolve any warnings or errors.
- **UI States**: Check all UI states (loading, empty, error, active) to ensure consistent user experience.
- **NocoDB Logs**: Verify that relevant database records and transaction logs are properly recorded.
- **Context Update**: Ensure all context files and memory bank logs have been updated.
- **Old Branding**: Verify that no legacy references (such as "KarsaDesk") exist in the modified or added code.
- **Secret Leaks**: Check that no API keys, credentials, or secrets have been exposed or committed.

If any blocker remains unresolved, or if any check fails, do not mark the task as done.
