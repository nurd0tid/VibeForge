# Provider Connections

VibeForge supports connecting to multiple LLM providers. Provider configuration is stored locally in `.vibeforge/providers.json`.

---

## Supported Presets

The system includes built-in configurations for the following providers:

| Provider | Type |
|----------|------|
| OpenAI | Cloud |
| Anthropic | Cloud |
| Google Gemini | Cloud |
| OpenRouter | Aggregator |
| 9Router | Aggregator |
| DeepSeek | Cloud |
| Groq | Cloud |
| Mistral | Cloud |
| Ollama | Local |
| LM Studio | Local |

---

## Custom Setup (OpenAI-Compatible Providers)

For any OpenAI-compatible provider not in the preset list, configure the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| **Display Name** | Yes | Human-readable identifier shown in the UI |
| **Base URL** | Yes | Full endpoint URL (e.g., `https://api.provider.com/v1`) |
| **API Key** | Yes | Authentication credential — never log or expose |
| **Model ID** | Yes | The exact model identifier string accepted by the API |

---

## Connection Testing

- Every provider must support a "Test Connection" action.
- The test flow must cycle through three clearly distinct visual states:
  - **Loading**: Indicates the request is in flight.
  - **Success**: Displays the provider's correct display name as returned by the test endpoint.
  - **Error**: Displays an actionable error message — never `undefined` or `[object Object]`.
- If the provider returns a name, that name (not a hardcoded label) must be shown on success.

---

## Provider Deletion Safety

- Deleting a provider must immediately reset the active provider selection in the UI.
- Failing to reset the active provider upon deletion will cause the UI to crash or render a broken state.
- All toast notifications triggered during deletion or disconnection must display valid, human-readable strings.

---

## Agent Rules for Provider Configuration

- Never write API keys to log files, console output, or chat messages.
- When editing provider configuration files, use structured file editing and target only the specific field being changed.
- After any provider configuration change, verify the connection using the Test Connection flow.
- `.vibeforge/providers.json` must be listed in `.gitignore` and must not be committed to any repository.
