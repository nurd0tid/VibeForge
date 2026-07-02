# Skill: Code Review

## Purpose
Perform a thorough review of code changes for style, security, performance, and correctness before acceptance.

## When to Use
- User asks to review a pull request, diff, or specific file
- Before finalizing a major feature implementation
- Periodic codebase health checks

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`CLAUDE.md`, `.clinerules`)
- [ ] Load the diff or target files into context
- [ ] Identify the framework/library versions in use

## Steps
1. Analyze structure: Does it follow Next.js 16 App Router conventions?
2. Check style: Is it using Tailwind v4 and shadcn/ui correctly?
3. Verify types: Are Zod schemas correct? Are types tight?
4. Assess security: Are inputs validated? Are secrets exposed?
5. Review performance: Are there N+1 queries? Unnecessary re-renders?
6. Check test coverage: Are edge cases handled?
7. Compile a list of findings with actionable feedback

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "Looks good to me" | Not enough. Run actual checks mentally or via tools. Point to specific lines. |
| "They probably tested it" | Assume it's broken until proven otherwise. |
| "Style doesn't matter here" | Consistency matters everywhere. Enforce conventions. |

## Verification (Definition of Done)
- [ ] All code reviewed line-by-line
- [ ] Actionable feedback provided with file paths and line numbers
- [ ] Build passes (mentally verified if not executed)
- [ ] No undefined/null errors spotted
- [ ] Memory bank updated with review outcomes

## Output Format
Structured markdown report categorizing findings by Severity (Critical, Warning, Nitpick) with specific file/line references and suggested fixes.

## Files Affected
- Target source files (read-only)
- `.vibeforge/memory-bank/progress.md` (if logging review)

## Failure Handling
If the code is too large to review in one pass, break it down by module and review sequentially.
