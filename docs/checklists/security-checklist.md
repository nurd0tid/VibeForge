# Security Checklist

This checklist covers security requirements that must be verified before any code is committed or deployed.

---

## 1. Secrets Management

- [ ] **No secrets in repository**: No API keys, NocoDB tokens, passwords, or provider API keys are hardcoded or committed to version control.
- [ ] **`.env.local` is ignored**: The `.env.local` file is explicitly listed in `.gitignore`.
- [ ] **`.vibeforge/providers.json` is ignored**: The local provider configuration file is explicitly listed in `.gitignore`.
- [ ] **No NEXT_PUBLIC secrets**: No sensitive environment variables (like NocoDB tokens or LLM API keys) have the `NEXT_PUBLIC_` prefix.
- [ ] **No secrets in logs**: Console logs, agent runs, and daily logs never output or store raw API keys.

---

## 2. Agent Execution Security

- [ ] **Tool constraints**: The `run_command` tool must never execute destructive commands (like `rm -rf /` or formatting drives) without explicit user confirmation.
- [ ] **File access constraints**: The `read_file` and `edit_file` tools must only operate within the VibeForge workspace directory. Path traversal (`../`) must be neutralized or rejected.
- [ ] **Sanitized command output**: Output from shell commands must be truncated if excessive, and any sensitive information should be redacted before returning to the LLM context.
- [ ] **Provider key resolution**: AI provider API keys are retrieved securely via `resolveApiKey()` and never passed in client-side API requests.

---

## 3. Data Protection

- [ ] **NocoDB authorization**: NocoDB access is strictly limited to server-side Next.js API routes using a secure API token.
- [ ] **Input sanitization**: All user inputs (especially Markdown and Code block inputs) are sanitized before rendering to prevent Cross-Site Scripting (XSS).
- [ ] **Error obscuration**: API errors returned to the client omit stack traces and sensitive internal paths.

---

## 4. Operational Security

- [ ] **Token rotation note**: Ensure there is a documented process for the user to rotate NocoDB and AI provider tokens if compromised.
- [ ] **Dependency auditing**: Run `pnpm audit` periodically to identify and patch vulnerable packages.
- [ ] **Server-only APIs**: All endpoints handling sensitive data (`/api/mcp`, `/api/providers`) ensure operations happen entirely server-side.
