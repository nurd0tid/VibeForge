# Backend Architecture

## Overview
VibeForge has no separate backend server. All server-side operations execute inside **Next.js 16 API Route Handlers** (`src/app/api/`), running in the Next.js Node.js runtime. This means the "backend" lives within the same repository and process as the frontend.

## API Conventions

### Route Structure
- `src/app/api/<resource>/route.ts` — collection endpoints (LIST, CREATE)
- `src/app/api/<resource>/[id]/route.ts` — individual record endpoints (GET, UPDATE, DELETE)

### Standard Response Format
All API routes return a predictable JSON structure:
```json
// Success
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "Task not found." } }
```

### HTTP Status Codes
- `200 OK` — Successful GET or action.
- `201 Created` — Successful POST creating a resource.
- `400 Bad Request` — Invalid input or schema validation failure (Zod).
- `404 Not Found` — Resource does not exist.
- `500 Internal Server Error` — Unexpected system-level error.

## Key API Endpoints

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/projects` | GET, POST | List all projects; create a new project |
| `/api/projects/[id]` | GET, PATCH, DELETE | Single project CRUD |
| `/api/tasks` | GET, POST | List tasks; create task |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Single task CRUD |
| `/api/schedules` | GET, POST | List schedule items; create schedule entry |
| `/api/daily-logs` | GET, POST | List daily logs; create daily log entry |
| `/api/workspace/tree` | GET | Recursively list the project's file tree |
| `/api/workspace/file` | GET, PUT | Read or write a file by path |
| `/api/workspace/browse` | GET | Browse the local file system for directory picking |
| `/api/workspace/validate-path` | POST | Validate that a given path exists and is accessible |
| `/api/git/info` | GET | Get git branch, status (clean/dirty), and remote URL |
| `/api/docs` | GET | Serve and list `.md` documentation files |
| `/api/providers` | GET, POST | List AI provider configs; add a provider |
| `/api/providers/[id]` | PATCH, DELETE | Update or remove a provider configuration |
| `/api/providers/test` | POST | Test a provider connection and return display name/model info |

## File System Security

All file system API routes (file tree, read/write) enforce the following:
1. **Whitelist Validation:** Paths are checked against the active project's root path or the `VIBEFORGE_WORKSPACE_ROOT` environment variable.
2. **Traversal Prevention:** `../` sequences are normalized and blocked.
3. **Sensitive File Exclusion:** `.env`, `.env.local`, `.git/config`, and similar files are excluded from tree listings and read endpoints.

## NocoDB Integration

- **Connection:** REST API v1 via `NOCODB_BASE_URL` + `NOCODB_API_TOKEN` env variables.
- **Field Access:** Always use the **Title** column key (not snake_case `column_name`) when reading NocoDB JSON.
  - Use `getField(record, 'Field Name')` and `getFieldBool(record, 'Boolean Field')` helpers from `src/lib/nocodb-fields.ts`.
- **Error Handling:** Route handlers gracefully catch NocoDB errors (401 Unauthorized, 404 Table Not Found, network errors) and return structured error responses rather than crashing.

## Git Operations

Git commands are executed using Node.js `child_process.exec` wrapped in a safe utility:
- Allowed commands: `git status`, `git branch`, `git remote -v`, `git log --oneline -10`, `git diff --stat`.
- All commands are executed in a sandboxed project directory to prevent injection.
- Results are parsed into structured JSON before returning to the UI.
