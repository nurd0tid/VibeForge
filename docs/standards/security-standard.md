# Security Standard

The security of VibeForge user workspaces, credentials, and codebases is the top priority. "Security By Default" is a non-negotiable rule.

## Environment Variables & Secrets

- **Never Commit `.env.local`:** `.env.local` and `.env` files are in `.gitignore`. The agent may read `.env.local` to verify configuration but must never write sensitive keys into source code.
- **Use `.env.example`:** Provide placeholders for missing environment variables.
- **NEXT_PUBLIC Strictness:**
  - `NEXT_PUBLIC_` variables are shipped to the client browser.
  - Only non-sensitive URLs, flags, and public configuration may use the `NEXT_PUBLIC_` prefix.
  - API keys, NocoDB tokens, passwords, and private server URLs MUST NOT be prefixed with `NEXT_PUBLIC_`.

## Exposing Data

Do not expose secrets, credentials, internal paths, or personal user data in:
- `README.md`
- Markdown documentation
- AI generated code comments
- Console logs or terminal outputs
- UI components, toasts, or error banners
- GitHub commit messages
- NocoDB plain records
- Screenshots

## AI Provider Security

- API keys (OpenAI, Anthropic, Gemini, etc.) must be stored locally.
- Configuration resides in `.vibeforge/providers.json` or `.env.local`.
- No keys are sent to a remote proxy or telemetry server. The Next.js API route communicates directly with the provider endpoint.

## File System Protections

All API routes reading or writing to the local file system (e.g., `/api/workspace/file`, `/api/workspace/tree`) MUST enforce path traversal guards:
1. Prevent `../` or arbitrary absolute paths outside the allowed workspace scope.
2. Validate paths against `VIBEFORGE_WORKSPACE_ROOT` or the active project root.
3. Automatically block access to sensitive files (e.g., `.env`, `.git/config`) from tree listings unless explicitly overridden.

## NocoDB API Security

- The REST connection (`NOCODB_BASE_URL`, `NOCODB_API_TOKEN`) is managed server-side.
- The UI must never receive the NocoDB API token. Data requests must route through Next.js API handlers or Server Actions.

## Incident Response: Token Rotation

If an API key or sensitive token is exposed publicly (in a commit, screenshot, or public log):
1. Assume the token is compromised immediately.
2. The agent must log a blocker immediately.
3. Inform the user to rotate the token.
4. Purge the exposed credential from local cache/history.

## Input Validation

- Assume all user input is malicious.
- Validate all incoming API request bodies, path parameters, and query parameters using Zod v4 schemas before processing.
- Cleanly cast `zodResolver` as `any` in React Hook Form per the type definitions rule, but ensure the schema logic itself is robust.
