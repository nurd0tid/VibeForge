---
name: deployment
description: Execute a safe, verified deployment of the application with pre-flight checks, environment validation, and post-deploy health verification.
---

# Overview
Runs the full pre-flight sequence (typecheck, lint, build), validates environment variables, executes the deployment, and confirms the application is live via a post-deploy health check.

# When to Use
- User requests a deployment or release
- After a feature branch is merged and ready for production
- Verifying deployment readiness

# Process
1. Run `pnpm run typecheck` to verify no type errors
2. Run `pnpm run lint` to verify no lint errors
3. Run `pnpm build` to produce the production build
4. Verify the build output has no warnings or errors
5. Check that all required environment variables exist (names only, never values)
6. Deploy using the configured deployment method
7. Run a post-deploy health check (verify the app loads, key routes respond)
8. Log deployment result to NocoDB and update `progress.md`

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "It built locally, it'll be fine" | Run all checks in order. Local builds miss env differences. |
| "I'll skip tests this time" | Never. Tests exist to prevent regressions. |
| "Health check is overkill" | A deployment without verification is a gamble. Always verify. |
| "I'll log the env values to check them" | Never log secret values. Check names only. |

# Red Flags
- Deploying without a passing `pnpm build`
- Environment variable values logged or committed
- No post-deploy health check performed
- Deployment executed without typecheck and lint passing first

# Verification
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm build` succeeds with no errors
- [ ] No secrets or keys exposed in logs or output
- [ ] Health check confirms the application is live and functional
- [ ] Memory bank updated with deployment record
