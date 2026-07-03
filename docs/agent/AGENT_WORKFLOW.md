# Agent Workflow

The VibeForge AI Agent operates within a structured lifecycle of modes, phases, and guardrails. This document defines how work is initiated, executed, and completed.

---

## 1. Task Lifecycle

Every non-trivial task flows through these phases sequentially. Skipping a phase is a protocol violation.

| Phase | Action | Output |
|-------|--------|--------|
| **Define** | Establish requirements. Identify scope. Confirm what "done" means. | Written requirements statement. |
| **Plan** | Select the appropriate agent mode. Design the approach. Write the plan to the memory bank **before** any code changes. | Architecture sketch or implementation plan in `activeContext.md`. |
| **Build** | Execute changes using incremental implementation (thin vertical slices). Each slice must leave the codebase in a valid state. | Modified source files, each verified individually. |
| **Verify** | Run the full verification suite: `pnpm run typecheck`, `pnpm run lint`, `pnpm build`. | Clean output for all commands — pasted as evidence. |
| **Review** | Evaluate output against `DONE_CRITERIA.md`. Confirm all criteria are met with evidence. | Done Declaration (see `DONE_CRITERIA.md` template). |
| **Ship** | Finalize: sync the memory bank, summarize files changed, surface remaining risks. | Updated memory bank, session summary. |

---

## 2. Agent Modes

The agent operates in one of four modes at any given time. Mode selection is explicit and must match the nature of the task.

### Architect Mode

- **Purpose**: High-level system design, dependency mapping, and decision-making.
- **Constraint**: No code generation. No file modification. Output is plans, diagrams, and written decisions only.
- **When to Use**: Starting a new feature, making structural decisions, planning database schema changes, selecting libraries.
- **Required**: Write architectural decisions to `decisionLog.md` in the memory bank.

### Code Mode

- **Purpose**: Incremental implementation of features, bug fixes, and refactors.
- **Constraint**: Obeys Chesterton's Fence — code is not removed or rewritten unless its purpose is fully understood. Changes are made in thin vertical slices.
- **When to Use**: All implementation tasks.
- **Required**: Use `edit_file` for structured editing. Verify each slice. Sync memory bank on completion.

### Ask Mode

- **Purpose**: Answering questions based on documented evidence or inspected codebase state.
- **Constraint**: No file modification. Answers must be grounded in what can be verified — not in assumptions or general knowledge.
- **When to Use**: The user asks a question about the codebase, architecture, or project state.

### Debug Mode

- **Purpose**: Root cause analysis using the Doubt-Driven Development protocol.
- **Constraint**: Systematic, not reactive. Follows the 5-step protocol below strictly.
- **When to Use**: Investigating errors, unexpected behavior, or flaky tests.

---

## 3. Doubt-Driven Development Protocol (Debug Mode)

When debugging or validating logic, follow this protocol exactly:

| Step | Action | Output |
|------|--------|--------|
| **1. CLAIM** | State what you believe is happening. Form a concrete hypothesis. | Written hypothesis. |
| **2. EXTRACT** | Pull the exact code, logs, error messages, and data that relate to the claim. | Relevant snippets, pasted verbatim. |
| **3. DOUBT** | Actively challenge the claim. Look for edge cases, alternative explanations, and hidden assumptions. | List of counter-hypotheses or identified gaps. |
| **4. RECONCILE** | Match the evidence against reality. Determine if the claim holds, fails, or is indeterminate. | Confirmed diagnosis or narrowed investigation. |
| **5. STOP** | If reconciled, implement the targeted fix. If indeterminate, **stop and ask the user**. Do not guess. Do not rationalize. | Fix or explicit request for user input. |

---

## 4. Context Loading (Session Start)

At the beginning of every session, before any work begins:

1. Read `AGENTS.md` for project-level directives.
2. Read `SESSION.md` for current phase, recent changes, and blockers.
3. Read `NEXT_ACTION.md` for the next concrete action to take.
4. Read the memory bank — at minimum: `activeContext.md`, `progress.md`, `knownIssues.md`, `fixedDoNotBreak.md`.
5. Confirm understanding of the task before entering any mode.

Context loading is not optional. An agent operating without loaded context will produce unreliable results.

---

## 5. Mandatory Sync (Session End)

At the end of every session or upon task completion:

1. Update `activeContext.md` with current state and next steps.
2. Update `progress.md` with milestones reached.
3. Update `knownIssues.md` if new issues were discovered.
4. Update `fixedDoNotBreak.md` if any non-obvious fix was applied.
5. Update `updateLog.md` with a timestamped entry of what was done.
6. List all files modified during the session.

Memory sync is atomic with task completion — the task is not done until the memory bank is current.

---

## 6. Guardrails

These rules apply at all times, in every mode:

- Read relevant docs and inspect files **before** editing.
- Verify all file paths exist — never assume.
- Make small, focused changes — not sweeping refactors.
- Run the full verification suite after every change.
- Do not claim done without evidence (see `DONE_CRITERIA.md`).
- Summarize all changed files in the session update.
- Surface remaining risks explicitly.
- Stop and ask if uncertain — do not invent assumptions.

---

## 7. When to Stop and Ask

Stop immediately and escalate to the user when:

- Required context is missing and cannot be found via available tools.
- An unknown or undocumented API is encountered.
- Multiple consecutive attempts to fix a bug have failed.
- You are about to delete code whose purpose is not fully understood.
- The task scope appears to have changed or expanded beyond the original definition.
- An error or behavior cannot be explained after applying the Doubt-Driven Development protocol.
