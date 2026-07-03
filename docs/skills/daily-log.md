---
name: daily-log
description: Document daily progress, summarize completed work, identify blockers, and plan immediate next steps to maintain momentum and context.
---

# Overview
Aggregates the day's work into a concise, structured log entry saved to NocoDB, and syncs the memory bank with chronological progress so no context is lost between sessions.

# When to Use
- End of a coding session
- User explicitly requests a daily summary or wrap-up
- Transitioning between major context shifts

# Process
1. Aggregate the day's completed tasks from chat history, git, or NocoDB
2. Identify and document any lingering blockers or unresolved issues
3. Draft a concise summary of the day's achievements
4. Outline the next logical steps for the following session
5. Use NocoDB field helpers from `src/lib/nocodb-fields.ts` to map data correctly
6. Save the log entry to NocoDB
7. Sync `progress.md` in the memory bank

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "Nothing notable happened" | Always log something. Debugging attempts are progress too. |
| "I'll just update memory bank" | Memory bank is high-level. Daily log tracks chronological progress. |
| "Too tired to write details" | Summarize concisely, but do not skip. |
| "I'll log it tomorrow" | Context fades. Log it now while it is fresh. |

# Red Flags
- Log entry skipped entirely for a session
- Blockers not explicitly listed
- NocoDB save not confirmed
- Memory bank not synced after the log is written

# Verification
- [ ] Summary accurately reflects work done during the session
- [ ] Blockers are clearly highlighted
- [ ] Log entry successfully saved to NocoDB
- [ ] `progress.md` in memory bank synced
- [ ] Next steps are documented for the following session
