# Skill: Deployment

## Purpose
Execute a safe, verified deployment of the application with pre-flight checks, environment validation, and post-deploy health verification.

## When to Use
- User requests a deployment or release
- After a feature branch is merged and ready for production
- Verifying deployment readiness

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`docs/agent/REGRESSION_GUARD.md`)
- [ ] Ensure all tests pass locally
- [ ] Verify environment variables are configured (never log secrets)

## Steps
1. Run `pnpm run typecheck` to verify no type errors
2. Run `pnpm run lint` to verify no lint errors
3. Run `pnpm build` to produce the production build
4. Verify the build output has no warnings or errors
5. Check that all required environment variables exist (names only, never values)
6. Deploy using the configured deployment method
7. Run a post-deploy health check (verify the app loads, key routes respond)
8. Log deployment result to NocoDB or `progress.md`

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "It built locally, it'll be fine" | Run all checks in order. Local builds miss env differences. |
| "I'll skip tests this time" | Never. Tests exist to prevent regressions. |
| "Health check is overkill" | A deployment without verification is a gamble. Always verify. |

## Verification (Definition of Done)
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm build` succeeds with no errors
- [ ] No secrets or keys exposed in logs or output
- [ ] Health check confirms the application is live and functional
- [ ] Memory bank updated with deployment record

## Output Format
Deployment status report with build result, health check result, and any warnings surfaced in chat.

## Files Affected
- Build output (`.next/`)
- `.vibeforge/memory-bank/progress.md`
- NocoDB deployment records

## Failure Handling
If build fails, stop immediately and report the error. Do not proceed to deploy. If health check fails post-deploy, flag immediately and prepare a rollback plan.
