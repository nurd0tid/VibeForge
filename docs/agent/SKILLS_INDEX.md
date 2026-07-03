# Skills Index

Skills in VibeForge are **Process over Prose** — they are strict, step-by-step workflows with explicit entry conditions, checkpoints, and exit criteria. They ensure the agent acts systematically and repeatably.

---

## 1. bug-fix
- **Purpose**: Systematically isolate, resolve, and verify codebase bugs.
- **When to Use**: When tests fail, build errors occur, or unexpected behavior is reported.
- **Coverage**: Diagnostics, root cause analysis, targeted code modification, and regression testing.

---

## 2. code-review
- **Purpose**: Analyze code changes for quality, performance, and adherence to standards.
- **When to Use**: Before merging pull requests or finalizing substantial feature implementations.
- **Coverage**: Code quality, security checks, style compliance, and feedback generation.

---

## 3. create-task
- **Purpose**: Structure and define new actionable items within the project.
- **When to Use**: When a new requirement, feature request, or bug is identified.
- **Coverage**: Defining task scope, acceptance criteria, priority, and NocoDB task creation.

---

## 4. daily-log
- **Purpose**: Document daily progress, decisions, and encountered blockers.
- **When to Use**: At the end of each development day or active session.
- **Coverage**: Summarizing completed tasks, unresolved issues, and planning next steps.

---

## 5. deployment
- **Purpose**: Manage the process of releasing code to production or staging environments.
- **When to Use**: When a release candidate has passed all verifications and is ready to ship.
- **Coverage**: Build verification, environment configuration, deployment execution, and post-deploy checks.

---

## 6. documentation
- **Purpose**: Keep project documentation accurate, synchronized, and easily understandable.
- **When to Use**: Whenever features are added/modified, or documentation is found lacking.
- **Coverage**: Writing/updating markdown docs, inline code comments, and READMEs.

---

## 7. memory-bank-update
- **Purpose**: Maintain the project's long-term context and knowledge base.
- **When to Use**: Atomic with completion of any task, or at session start/end.
- **Coverage**: Updating `activeContext.md`, `progress.md`, `fixedDoNotBreak.md`, and logging changes.

---

## 8. nocodb-sync
- **Purpose**: Interact with the NocoDB backend safely and consistently.
- **When to Use**: Modifying data structures, fetching, or writing data to database tables.
- **Coverage**: Verifying schemas, ensuring Title Case field usage, and executing CRUD operations.

---

## 9. planning
- **Purpose**: Outline the architectural approach and implementation steps for new features.
- **When to Use**: At the start of a complex task before writing code.
- **Coverage**: Requirements analysis, technical design, step-by-step implementation plans.

---

## 10. provider-setup
- **Purpose**: Configure and verify AI provider connections.
- **When to Use**: When adding or updating AI models, keys, or provider configurations.
- **Coverage**: Updating `.vibeforge/providers.json`, testing connections, and error handling.

---

## 11. schedule-breakdown
- **Purpose**: Deconstruct a large project or epic into scheduled, manageable phases.
- **When to Use**: During project initialization or major milestone planning.
- **Coverage**: Timeline estimation, dependency mapping, and milestone definition.

---

## 12. testing
- **Purpose**: Ensure code reliability through automated verification.
- **When to Use**: During or immediately after feature implementation and bug fixing.
- **Coverage**: Writing unit/integration tests, executing test suites, and verifying coverage.

---

## 13. ui-ux-review
- **Purpose**: Ensure user interfaces meet design standards and provide a good user experience.
- **When to Use**: After implementing new frontend components or layouts.
- **Coverage**: Visual consistency, responsiveness, accessibility (a11y), and interaction flows.

---

## 14. update-project-context
- **Purpose**: Refresh the high-level understanding of the project's state.
- **When to Use**: Upon returning to a project, or after major architectural shifts.
- **Coverage**: Reviewing recent changes, assessing current architecture, and updating global context files.

---

## 15. weekly-log
- **Purpose**: Summarize the week's accomplishments, metrics, and strategic adjustments.
- **When to Use**: At the end of the work week.
- **Coverage**: Aggregating daily logs, highlighting major wins, and setting goals for the next week.
