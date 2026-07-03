---
name: weekly-log
description: Aggregate daily progress into a comprehensive weekly summary that captures decisions made, work completed, and upcoming priorities.
---

# Overview
Retrieves all daily log entries for the week from NocoDB, synthesizes them into a categorized summary with decision rationales and pending items, and saves the weekly report.

# When to Use
- End of a work week (or user-defined cycle)
- User requests a weekly report or summary
- Before sprint planning sessions

# Process
1. Retrieve daily log entries from NocoDB for the current week
2. Aggregate completed tasks by category (features, bug fixes, chores)
3. Summarize key decisions and their rationale
4. List unfinished or pending work items
5. Identify risks or blockers that persisted across the week
6. Draft the weekly summary with metrics where available
7. Save the weekly log to NocoDB
8. Update memory bank with weekly summary

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "The daily logs cover everything" | Weekly logs synthesize patterns. Dailies are raw, weeklies are analyzed. |
| "No decisions were made this week" | Any code written implies a decision. Document the reasoning. |
| "I'll just copy the daily logs" | Summarize and analyze; do not paste raw data. |
| "Sprint planning covers this" | Weekly logs feed into sprint planning. They are prerequisites, not duplicates. |

# Red Flags
- Weekly log is a copy-paste of daily entries without analysis
- Decisions listed without rationale
- Pending work items not categorized (blocked, in-progress, deferred)
- NocoDB save not confirmed

# Verification
- [ ] All daily logs for the week are incorporated
- [ ] Decisions are listed with rationale
- [ ] Pending items are clearly categorized (blocked, in-progress, deferred)
- [ ] Log saved to NocoDB successfully
- [ ] Memory bank updated with weekly summary
