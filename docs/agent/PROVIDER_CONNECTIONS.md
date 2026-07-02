# Provider Connections

VibeForge supports connecting to multiple LLM providers for execution.

## Presets
The system includes built-in configurations for:
- OpenAI
- Anthropic
- Google Gemini
- OpenRouter
- 9Router
- DeepSeek
- Groq
- Mistral
- Ollama
- LM Studio

## Custom Setup (OpenAI-compatible)
For any OpenAI-compatible provider, the setup requires:
- **Display Name**
- **Base URL**
- **API Key**
- **Model ID**

## Testing Connection
- The connection test flow must display visual states for **Loading**, **Success**, or **Error**.
- On success, it must show the correct provider name returned by the test endpoint.

## Provider Deletion Safety
- Deleting a provider must reset the active provider in the UI to prevent crashes.
- Toast notifications must never display "undefined" to the user.