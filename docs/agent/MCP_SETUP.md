# MCP Setup and Integration

The Model Context Protocol (MCP) allows the VibeForge agent to discover and use external tools and data sources dynamically.

## Configuration
- MCP servers are configured via the VibeForge Settings page.
- The configuration is stored locally in `.vibeforge/mcp.json`.

## Discovery and Usage
- Once configured, the Agent automatically discovers tools provided by the connected MCP servers.
- The Agent will route relevant queries and actions through these tools based on their descriptions.

## Security and Best Practices
- **Never expose secrets**: Do not log API keys or sensitive credentials associated with MCP servers.
- **Validate inputs**: Ensure data sent to and received from MCP tools is validated to prevent injection or unexpected behavior.
- Ensure the MCP server configurations are kept secure and are not committed to public repositories.