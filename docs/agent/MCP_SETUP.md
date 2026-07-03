# MCP Setup and Integration

The Model Context Protocol (MCP) enables the VibeForge agent to discover and use external tools and data sources dynamically, extending its capabilities beyond built-in functionality.

---

## Configuration

- MCP servers are configured through the VibeForge Settings page.
- Configuration is stored locally at `.vibeforge/mcp.json`.
- Each server entry defines its connection details, available tools, and authentication credentials.

---

## Discovery and Usage

1. Once a server is configured and connected, the agent automatically discovers the tools it exposes.
2. The agent routes relevant queries and actions through these tools based on tool descriptions and the current task context.
3. Tool availability and descriptions are refreshed each time a connection is established.

---

## Security Requirements

These rules are non-negotiable:

| Rule | Detail |
|------|--------|
| **Never expose secrets** | API keys, tokens, and credentials associated with MCP servers must never appear in logs, chat messages, code comments, or committed files. |
| **Validate all I/O** | Data sent to and received from MCP tools must be validated to prevent injection attacks, unexpected schema violations, or malformed payloads. |
| **Secure configuration storage** | Ensure `.vibeforge/mcp.json` is listed in `.gitignore` and is never committed to a public or shared repository. |
| **Least privilege** | Only grant MCP servers access to the tools and data they need. Do not connect servers with broad permissions unless explicitly required. |

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Agent does not use MCP tools | Server not connected or tools not discovered | Open Settings, verify connection status, and re-connect. |
| Authentication errors | Invalid or expired API key | Update credentials in `.vibeforge/mcp.json` via the Settings page. |
| Unexpected tool behavior | Schema mismatch or API version change | Check the MCP server's documentation for breaking changes. |
