# Skill: Weekly Log

## Purpose
Aggregate daily progress into a comprehensive weekly summary that captures decisions made, work completed, and upcoming priorities.

## When to Use
- End of a work week (or user-defined cycle)
- User requests a weekly report or summary
- Before sprint planning sessions

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs
- [ ] Collect all daily log entries for the week from NocoDB
- [ ] Review `SESSION.md` for high-level context

## Steps
1. Retrieve daily log entries from NocoDB for the current week
2. Aggregate completed tasks by category (features, bug fixes, chores)
3. Summarize key decisions and their rationale
4. List unfinished or pending work items
5. Identify risks or blockers that persisted across the week
6. Draft the weekly summary with metrics where available
7. Save the weekly log to NocoDB

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "The daily logs cover everything" | Weekly logs synthesize patterns. Dailies are raw, weeklies are analyzed. |
| "No decisions were made this week" | Any code written implies a decision. Document the reasoning. |
| "I'll just copy the daily logs" | Summarize and analyze, do not paste raw data. |

## Verification (Definition of Done)
- [ ] All daily logs for the week are incorporated
- [ ] Decisions are listed with rationale
- [ ] Pending items are clearly categorized (blocked, in-progress, deferred)
- [ ] Build passes (ensure current state is stable)
- [ ] Log saved to NocoDB successfully
- [ ] Memory bank updated

## Output Format
Structured markdown weekly report printed to chat, saved to NocoDB with week identifier.

## Files Affected
- NocoDB remote records
- `.vibeforge/memory-bank/progress.md`

## Failure Handling
If daily log retrieval fails, reconstruct the week from git history, chat logs, and memory bank files. Log the reconstruction gap.
