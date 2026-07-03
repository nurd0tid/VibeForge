---
name: documentation
description: Keep project documentation accurate, up-to-date, and consistent with the actual codebase to prevent knowledge drift.
---

# Overview
Identifies affected documentation files, updates outdated content to match codebase reality, verifies internal links, and ensures formatting consistency.

# When to Use
- After implementing a new feature or significant change
- When docs are flagged as outdated or missing
- User explicitly requests documentation updates

# Process
1. List all documentation files that reference the changed module or feature
2. Read each target doc file to understand current content
3. Identify outdated sections by comparing against actual source code
4. Update content to reflect the current state of the codebase
5. Verify all internal links and references are valid
6. Check formatting consistency (headings, lists, code blocks)
7. Update `docs/agent/` files if agent behavior changed
8. Update memory bank with documentation changes

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "The code is self-documenting" | Agent docs and architecture docs are required regardless. |
| "Nobody reads these docs" | The AI agent reads them every session. They are critical. |
| "It's a minor change" | Minor code changes cause major doc drift over time. |
| "I'll do it in a later session" | Document it now while context and details are fresh. |

# Red Flags
- Broken internal links or dead references introduced
- Inaccuracies between actual codebase behavior and documentation
- Headings, lists, or code blocks inconsistent with existing style
- Agent instructions out of sync with actual workflows

# Verification
- [ ] Updated docs match the current codebase behavior
- [ ] No broken internal links or references
- [ ] Formatting follows existing conventions
- [ ] Build passes (ensure doc changes did not break imports)
- [ ] No undefined/null errors in any referenced code
- [ ] Memory bank updated
