# AI Provider Architecture

## Goal
The AI Provider sub-system handles LLM connections, routing, fallbacks, and tool-calling capabilities while keeping the user experience unified and local.

## Supported Providers

VibeForge supports major foundation models, local engines, and custom proxy configurations:

- **OpenAI:** Direct integration using `openai` NPM package.
- **Anthropic:** Direct integration with Claude models.
- **Gemini:** Google AI SDK supporting large contexts.
- **OpenRouter:** Routing hub for open/closed-source models.
- **OpenAI Compatible:** Standard routing to custom proxy layers.
- **OpenCode & Zen:** Special coding environments.
- **Ollama / vLLM:** Local offline inference servers.
- **Custom Provider:** Any custom endpoint matching the OpenAI chat completions schema.

## Provider Configuration Schema

All configurations are stored locally in `.vibeforge/providers.json`.

```ts
export interface AIProviderConfig {
  id: string
  name: string // Human-readable label (e.g. "My Local Ollama")
  type:
    | "openai"
    | "anthropic"
    | "gemini"
    | "openrouter"
    | "openai-compatible"
    | "opencode"
    | "zen"
    | "ollama"
    | "vllm"
    | "custom"
  baseUrl?: string // Required for local/custom endpoints
  apiKeyEnv?: string // Env variable key containing the token (e.g., "OPENAI_API_KEY")
  defaultModel: string // Primary model (e.g., "gpt-4o", "claude-3-5-sonnet")
  fallbackModels?: string[] // Order of backup models if primary fails
  supportsReasoning?: boolean // Enforces reasoning formats (thinking tokens)
  supportsTools?: boolean // Flag indicating tool call support (function calling)
  enabled: boolean
}
```

## Resilient Routing & Fallback Protocol

LLM calls are wrapped in a fallback resolver. If an execution fails (due to rate limits, server downtime, or invalid output format):

1. **Log Failure:** Record the error details in `agent_logs` (NocoDB).
2. **Attempt Fallback:** Attempt the next model in `fallbackModels`.
3. **Provider Fallback:** If the entire provider is unreachable, fallback to the default designated `Provider` (using standard model definitions).
4. **Validation Check:** Verify the output meets JSON validation rules (Zod schemas) before returning.
5. **Fail Gracefully:** If all fallbacks fail, log a critical blocker on the active task and halt agent execution.

## Provider UI

The configuration sheet/page provides:
- **Status Connection:** Green/Red latency and connectivity indicator.
- **Model Selector:** Dropdown listing retrieved model endpoints.
- **Fallback Configuration:** Draggable list to set the order of fallback models.
- **Test Connection Button:** Performs a ping check with a minimal prompt. The test response must display the exact model version and provider name.
- **Error Registry:** Feed showing recent API failures for troubleshooting.
