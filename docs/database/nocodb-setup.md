# NocoDB Setup

This document describes how to configure the NocoDB connection for VibeForge.

---

## 1. Environment Configuration

All NocoDB configuration is managed via environment variables. Create a `.env.local` file in the root of the project:

```env
# The base URL of the NocoDB instance (e.g., https://app.nocodb.com or a local docker instance)
NOCODB_BASE_URL=https://app.nocodb.com

# The ID of the workspace containing the VibeForge base
NOCODB_WORKSPACE_ID=your_workspace_id

# The ID of the base containing the VibeForge tables
NOCODB_BASE_ID=your_base_id

# The API token generated from the NocoDB UI (Settings -> Tokens)
NOCODB_API_TOKEN=your_nocodb_api_token
```

**Security Warning**: The `.env.local` file contains sensitive secrets and must **never** be committed to version control. It is already included in `.gitignore`.

---

## 2. User-Supplied Setup

VibeForge assumes the user has already provisioned a NocoDB instance (either Cloud or Self-hosted), created a Workspace, and created a Base.

During development, AI agents are permitted to read `.env.local` directly using the `read_file` tool to access the actual credentials when testing connections or executing scripts.

**Rule**: Agents must **never** print, log, or expose the `NOCODB_API_TOKEN` in the chat history, output streams, or logs.

---

## 3. Initial Setup Steps

If setting up a fresh VibeForge instance, follow these steps:

1. **Create Base**: Create a new empty Base in the NocoDB workspace.
2. **Create Tables**: Manually create the tables exactly as defined in `docs/database/nocodb-schema.md`. Pay close attention to the Column Titles (Title Case) and Types.
3. **Generate Token**: Go to Workspace Settings > Tokens and generate a new API token with read/write access to the base.
4. **Configure Env**: Copy the URL, Workspace ID, Base ID, and API Token into `.env.local`.
5. **Test Connection**: Run the server and verify that the API routes (e.g., `GET /api/projects`) can successfully fetch data from NocoDB.
6. **Validate CRUD**: Ensure Create, Read, Update, and Delete operations work flawlessly for the `projects` and `tasks` tables before proceeding to more complex features.

---

## 4. API Client Wrapper

All interaction with NocoDB must occur through the server-side client wrapper located at `src/lib/nocodb.ts`.

- Do not use `fetch` directly in API routes to call NocoDB.
- The wrapper handles authentication headers automatically.
- The wrapper normalizes responses and error handling.
- Always use the helper functions from `src/lib/nocodb-fields.ts` to extract values by their Title Case keys.
