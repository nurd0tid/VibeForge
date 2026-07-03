# Provider Checklist

This checklist verifies the AI Provider configuration, connection management, and security boundaries within VibeForge.

- [ ] **Provider Settings UI**: The provider configuration interface correctly displays all supported providers (OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, 9Router, Custom).
- [ ] **Model Fallback Logic**: The system correctly steps through the configured fallback order if the primary provider or model fails or hits rate limits.
- [ ] **Display Name Fallback**: Provider displays its exact display name. If the name is missing, it correctly falls back to "Provider" in the UI.
- [ ] **Test Connection Logic**: The "Test Connection" button accurately verifies connectivity by executing a lightweight prompt and surfacing the exact display name upon success.
- [ ] **Connection Status UI**: Connection states (Disconnected, Connecting, Connected, Error) are clearly indicated to the user without showing `undefined` or generic object strings.
- [ ] **Credentials Encryption/Safety**: API keys and base URLs are stored securely locally (`.vibeforge/providers.json`). They are NEVER logged to the console, sent to telemetry, or exposed in plain text in client-side error toasts.
- [ ] **Error Propagation**: Provider API errors (e.g., 401 Unauthorized, 429 Too Many Requests) are caught gracefully and surfaced as actionable, human-readable notifications.
