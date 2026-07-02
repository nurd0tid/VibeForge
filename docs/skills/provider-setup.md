# Skill: Provider Setup

## Purpose
Configure AI provider connections (OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, 9Router, custom) with verified URLs, API keys, and working test connections.

## When to Use
- Adding a new AI provider to the project
- Debugging a failing provider connection
- Updating provider configuration after API changes

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`docs/agent/HOW_VIBEFORGE_WORKS.md`)
- [ ] Read `.vibeforge/providers.json` for current configuration
- [ ] Verify the provider's official documentation for current base URLs

## Steps
1. Identify the target provider from the supported list
2. Research the provider's official docs for the correct base URL and auth method
3. Set the base URL in `.vibeforge/providers.json`
4. Configure the API key securely (never log or commit it)
5. Set model identifiers and any provider-specific options
6. Run a test connection to verify the setup
7. Confirm the test shows the exact display name (fallback to "Provider" if name missing)
8. Save the verified configuration

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "I know the URL from memory" | No. Always verify from official docs. URLs change between versions. |
| "The API key looks right" | Test the connection. Visual inspection is not verification. |
| "I'll skip the test connection" | Never. An untested provider will fail at the worst time. |

## Verification (Definition of Done)
- [ ] Base URL matches official provider documentation
- [ ] Test connection succeeds and shows correct display name
- [ ] API key is stored securely, never logged or committed
- [ ] Build passes
- [ ] No undefined/null errors
- [ ] Memory bank updated with provider change

## Output Format
Provider configuration summary with test result, printed to chat. No secrets displayed.

## Files Affected
- `.vibeforge/providers.json`
- `.vibeforge/mcp.json` (if MCP provider)
- `.vibeforge/memory-bank/progress.md`

## Failure Handling
If test connection fails, check: 1) URL correctness, 2) API key validity, 3) network connectivity, 4) rate limits. Log the specific error code and message. Do not retry indefinitely.
