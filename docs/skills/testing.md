---
name: testing
description: Run and write tests to verify functionality, prevent regression, and ensure code reliability.
---

# Overview
Locates existing test files, identifies the correct test runner, writes new test cases for positive paths, edge cases, and error handling, and runs both targeted and full test suites.

# When to Use
- After writing a feature or a bug fix
- Before committing changes
- Before executing a deployment

# Process
1. Locate existing tests for the target module
2. Identify the appropriate test command (e.g., `pnpm test`, `jest`, `vitest`)
3. Inspect existing test files for style, imports, and mocking conventions
4. Write test cases covering: positive path, edge cases, error handling
5. Mock dependencies where necessary, respecting project conventions
6. Run the test suite for the modified file
7. Run the full test suite to ensure no regressions
8. Update memory bank with test results

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "The changes are too simple to test" | Simple changes often break unexpected dependencies. Test anyway. |
| "I'll write tests after deployment" | Never deploy untested code. |
| "Mocking is too hard" | Use existing mocks as examples. Don't skip tests. |
| "The test framework isn't set up" | Check README and package.json first. Never assume. |

# Red Flags
- Tests skipped entirely before a deployment or commit
- Test framework assumed without reading project configuration
- Mocking pattern used is inconsistent with existing test files
- Coverage requirements not checked

# Verification
- [ ] Tests run successfully with no failures
- [ ] Test coverage meets project standards
- [ ] Build passes
- [ ] No undefined/null errors in test execution
- [ ] Memory bank updated with test results
