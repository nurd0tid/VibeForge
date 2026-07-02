# Skill: Testing

## Purpose
Run and write tests to verify functionality, prevent regression, and ensure code reliability.

## When to Use
- After writing a feature or a bug fix
- Before committing changes
- Before executing a deployment

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`README.md`, `CLAUDE.md`, `docs/agent/REGRESSION_GUARD.md`)
- [ ] Identify the test framework used in this project
- [ ] Inspect existing test files for style and imports

## Steps
1. Locate existing tests for the target module
2. Identify the appropriate test command (e.g. `pnpm test`, `jest`, `vitest`)
3. Write test cases covering: positive path, edge cases, error handling
4. Mock dependencies where necessary, respecting project conventions
5. Run the test suite for the modified file
6. Run the full test suite to ensure no regressions
7. Verify test coverage if required by project guidelines

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "The changes are too simple to test" | Simple changes often break unexpected dependencies. Test anyway. |
| "I'll write tests after deployment" | Never deploy untested code. |
| "Mocking is too hard" | Use existing mocks as examples. Don't skip tests. |

## Verification (Definition of Done)
- [ ] Tests run successfully with no failures
- [ ] Test coverage meets project standards
- [ ] Build passes
- [ ] No undefined/null errors in test execution
- [ ] Memory bank updated with test results

## Output Format
Summary of executed tests, pass/fail status, and coverage metrics in chat.

## Files Affected
- Source files and adjacent `.test.ts` or `.spec.ts` files
- `.vibeforge/memory-bank/progress.md`

## Failure Handling
If tests fail, diagnose and fix the issue. Do not bypass or disable tests unless explicitly directed and documented.
