# Provider Rules

This document outlines the rules and adapters for integrating AI models and providers into VibeForge. The goal is to ensure the core workflow remains model-agnostic.

---

## 1. Supported Providers

VibeForge supports the following providers out of the box:

- **OpenAI** (GPT-4o, GPT-4o-mini, o1, o3-mini)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)
- **Google Gemini** (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash)
- **OpenRouter** (Unified interface for diverse LLMs)
- **DeepSeek** (DeepSeek-V3, DeepSeek-R1)
- **Ollama** (Local execution: llama3, mistral, codegellama)
- **vLLM** (Self-hosted hosting)
- **Groq** (Fast LLaMA, Mixtral, Gemma inference)
- **9Router** (Specialized proxy)
- **Custom / OpenAI Compatible** (Any endpoint conforming to the OpenAI chat completions schema)

---

## 2. Mandatory Adapter Pattern

All communication with AI models must go through the VibeForge Provider Adapter layer. Direct, provider-specific SDK calls are strictly forbidden in application code.

### Adapter Requirements

- **Unified Interface**: The adapter must expose a single method for chat completions:

  ```typescript
  export interface ChatCompletionRequest {
    messages: ChatMessage[]
    model: string
    temperature?: number
    max_tokens?: number
    stream?: boolean
    tools?: ToolDefinition[]
  }

  export interface ChatCompletionResponse {
    content: string | null
    tool_calls?: ToolCall[]
    usage?: {
      prompt_tokens: number
      completion_tokens: number
    }
  }

  export function executeChatCompletion(
    provider: ProviderRecord,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse | ReadableStream>
  ```

- **Metadata Parsing**: The adapter must normalize token usage, execution time, and finish reasons.
- **Error Normalization**: Raw API errors must be caught and wrapped in a standard `ProviderError` with descriptive codes (e.g., `RATE_LIMIT`, `AUTH_ERROR`, `CONTEXT_EXCEEDED`, `SERVICE_UNAVAILABLE`).

---

## 3. Fallback and Resilience Strategy

In the event of a provider error, rate limit, or timeout, the adapter layer must execute a fallback chain based on the `fallback_order` configuration in NocoDB.

### Fallback Rules

1. **Log the Failure**: Record the failure, including the target provider, model, error code, and latency, to the `agent_logs` table.
2. **Execute Fallback**: If a fallback provider is configured, instantly switch to it.
3. **Log the Switch**: Record the fallback execution.
4. **Notify the UI**: Keep the user informed (via the SSE stream) that a fallback provider has been engaged to prevent UI freezes.
5. **No Infinite Loops**: Maximize fallback attempts to **2** before failing completely.

---

## 4. Workflow Independence

- **No Model Lock-In**: The VibeForge agent workflow (planning, tasks, coding) must never depend on the quirks of a single model.
- **Graceful Degradation**: If a model does not support tool calling, the adapter must fall back to XML/JSON parsing from raw text.
- **Reasoning Handling**: For models that support reasoning (like OpenAI o1/o3-mini or DeepSeek R1), the adapter must capture and format the thinking process into SSE `thought` events before sending final `content`.
- **System Prompt Formatting**: System prompts must be structured cleanly using markdown to ensure they are understood by lower-tier models.

---

## 5. Security & Keys

- **Never** store API keys in the database.
- **Never** expose API keys in client-side network requests.
- Use the `resolveApiKey()` helper to load keys from `.env.local` or the local `.vibeforge/providers.json` config.
- If a provider record in NocoDB lacks a name, the adapter must default to the provider's ID or type as the name.
