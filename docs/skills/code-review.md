---
name: code-review
description: Perform a thorough review of code changes for style, security, performance, and correctness before acceptance.
---

# Overview
Analyzes code changes against project conventions, framework rules, security requirements, and type safety. Produces a structured findings report with severity levels and actionable feedback.

# When to Use
- User asks to review a pull request, diff, or specific file
- Before finalizing a major feature implementation
- Periodic codebase health checks

# Process
1. Analyze structure: Does it follow Next.js 16 App Router conventions?
2. Check style: Is it using Tailwind v4 and shadcn/ui correctly?
3. Verify types: Are Zod schemas correct? Are types tight?
4. Assess security: Are inputs validated? Are secrets exposed?
5. Review performance: Are there N+1 queries? Unnecessary re-renders?
6. Check test coverage: Are edge cases handled?
7. Compile a list of findings with actionable feedback, file paths, and line numbers
8. Update memory bank with review outcomes

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "Looks good to me" | Not enough. Point to specific lines with evidence. |
| "They probably tested it" | Assume it is broken until proven otherwise. |
| "Style doesn't matter here" | Consistency matters everywhere. Enforce conventions. |
| "It's a small change, no review needed" | Small changes are where subtle bugs hide. |

# Red Flags
- Feedback is vague without file/line references
- Security inputs left unvalidated
- `asChild` used on `DialogTrigger` instead of `render={}`
- Zod schemas cast incorrectly without `as any` where required

# Verification
- [ ] All code reviewed line-by-line
- [ ] Actionable feedback provided with file paths and line numbers
- [ ] Findings categorized by severity: Critical, Warning, Nitpick
- [ ] No undefined/null errors spotted
- [ ] Memory bank updated with review outcomes
