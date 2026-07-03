---
name: provider-setup
description: Configure AI provider connections with verified URLs, API keys, and working test connections.
---

# Overview
Researches provider base URLs, configures connection parameters, securely registers API keys, runs connection tests, and verifies correct provider display names.

# When to Use
- Adding a new AI provider to the project
- Debugging a failing provider connection
- Updating provider configuration after API changes

# Process
1. Identify the target provider from the supported list
2. Research the provider's official docs for the correct base URL and auth method
3. Set the base URL in `.vibeforge/providers.json`
4. Configure the API key securely (never log or commit it)
5. Set model identifiers and any provider-specific options
6. Run a test connection to verify the setup
7. Confirm the test shows the exact display name (fallback to "Provider" if name missing)
8. Save the verified configuration
9. Update memory bank with provider change

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "I know the URL from memory" | Always verify from official docs. URLs change between versions. |
| "The API key looks right" | Test the connection. Visual inspection is not verification. |
| "I'll skip the test connection" | Never. An untested provider will fail at the worst time. |
| "I'll check in the key to git for testing" | Secrets must never be committed to git or logged in chat. |

# Red Flags
- Base URL configured without verifying against latest provider docs
- Test connection fails or is bypassed
- API key values visible in chat logs, configuration files in git, or console output
- Fallback logic to "Provider" missing when display name is absent

# Verification
- [ ] Base URL matches official provider documentation
- [ ] Test connection succeeds and shows correct display name
- [ ] API key is stored securely, never logged or committed
- [ ] Build passes
- [ ] No undefined/null errors
- [ ] Memory bank updated with provider change
