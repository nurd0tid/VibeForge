# Skill: Documentation

## Purpose
Keep project documentation accurate, up-to-date, and consistent with the actual codebase to prevent knowledge drift.

## When to Use
- After implementing a new feature or significant change
- When docs are flagged as outdated or missing
- User explicitly requests documentation updates

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`README.md`, `CLAUDE.md`, `AI.md`, `.clinerules`)
- [ ] Identify which docs are affected by the recent change
- [ ] Read the current content of target doc files

## Steps
1. List all documentation files that reference the changed module or feature
2. Read each target doc file to understand current content
3. Identify outdated sections by comparing against actual source code
4. Update content to reflect the current state of the codebase
5. Verify all internal links and references are valid
6. Check formatting consistency (headings, lists, code blocks)
7. Update `docs/agent/` files if agent behavior changed

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "The code is self-documenting" | Agent docs and architecture docs are required regardless. |
| "Nobody reads these docs" | The AI agent reads them every session. They are critical. |
| "It's a minor change" | Minor code changes cause major doc drift over time. |

## Verification (Definition of Done)
- [ ] Updated docs match the current codebase behavior
- [ ] No broken internal links or references
- [ ] Formatting follows existing conventions
- [ ] Build passes (ensure doc changes did not break imports)
- [ ] No undefined/null errors in any referenced code
- [ ] Memory bank updated

## Output Format
List of updated files with summary of changes, printed to chat.

## Files Affected
- `README.md`, `CLAUDE.md`, `AI.md`, `.clinerules`
- `docs/agent/*.md`
- `MASTER_PROMPT.md`, `AGENTS.md`
- `.vibeforge/memory-bank/` files

## Failure Handling
If unsure what a section of docs should say, read the actual source code to determine truth. Do not guess. Flag any sections that cannot be verified.
