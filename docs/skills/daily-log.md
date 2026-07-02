# Skill: Daily Log

## Purpose
Document daily progress, summarize completed work, identify blockers, and plan immediate next steps to maintain momentum and context.

## When to Use
- End of a coding session
- User explicitly requests a daily summary or wrap-up
- Transitioning between major context shifts

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs
- [ ] Review `SESSION.md` and git history (if applicable) for the day's activity
- [ ] Verify NocoDB connection for logging

## Steps
1. Aggregate the day's completed tasks from chat history, git, or NocoDB
2. Identify and document any lingering blockers or unresolved issues
3. Draft a concise summary of the day's achievements
4. Outline the next logical steps for the following session
5. Use NocoDB field helpers to map data correctly
6. Save the log entry to NocoDB

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "Nothing notable happened" | Always log something. Even debugging attempts are progress. |
| "I'll just update memory bank" | Memory bank is high-level. Daily log tracks chronological progress. |
| "Too tired to write details" | Summarize concisely, but do not skip. |

## Verification (Definition of Done)
- [ ] Summary accurately reflects work done
- [ ] Blockers are clearly highlighted
- [ ] Build passes (ensure current state is stable)
- [ ] Log entry successfully saved to NocoDB
- [ ] Memory bank updated (`progress.md` sync)

## Output Format
Markdown summary printed to chat, followed by confirmation of save to NocoDB.

## Files Affected
- NocoDB remote records
- `.vibeforge/memory-bank/progress.md`
- `SESSION.md`

## Failure Handling
If NocoDB save fails, write the daily log to a local `.daily-log.md` file and alert the user.
