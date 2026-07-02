# Tooling and Commands

VibeForge provides a variety of commands and tools to interact with the agent effectively.

## Slash Commands
- `/new`: Start a new chat session.
- `/clear`: Clear the current chat context.
- `/sessions`: View and manage past chat sessions.
- `/compact`: Compress the chat context to save tokens.
- `/mcp-list`: List available tools from configured MCP servers.
- `/init-memory`: Initialize the Memory Bank in a new project.

## Skill Mentions (@)
Use `@` to invoke specialized agent behaviors and workflows:
- `@planning`: Enter planning mode to outline steps.
- `@create-task`: Generate a new task ticket.
- `@review-code`: Request a code review for a specific file or snippet.
- `@daily-log`: Generate or update the daily log entry.
- `@update-context`: Manually trigger a context refresh.

## File Mentions (#)
Use `#` followed by a filename to explicitly attach the contents of that file to the current context. This ensures the agent has the necessary context to answer questions or perform edits.

## Core Tools
- `list_directory`: View the contents of a directory.
- `read_file`: Read the contents of a specific file.
- `edit_file`: Modify a file using search and replace.
- `run_command`: Execute a bash command (e.g., tests, build, lint).