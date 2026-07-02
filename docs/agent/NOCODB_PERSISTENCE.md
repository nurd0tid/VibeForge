# NocoDB Persistence

VibeForge uses NocoDB as its primary data store for persistence.

## Core Tables
- `daily_logs`
- `weekly_logs`
- `tasks`
- `schedules`
- `agent_runs`
- `projects`
- `providers`

## API Access
- All CRUD operations must go through the VibeForge `/api/` routes, not directly to NocoDB from the client.

## Field Access Rules
- **Crucial**: NocoDB REST API v1 returns JSON with column titles as keys (Title-case, often with spaces).
- Do not assume standard snake_case or camelCase keys.
- Use a helper utility like `getField(obj, snake_case_key, title_case_key)` to safely extract values. Always check both `record.field_name` and `record['Field Name']`.

## Reliability
- Ensure API calls to NocoDB implement retry logic on failure.
- If a failure persists, surface clear, readable errors to the user rather than generic crash screens.