# Backend Checklist

This checklist covers all server-side requirements for any API route, library function, or data access layer implemented in VibeForge.

---

## 1. Environment & Configuration

- [ ] **Server-side only**: All environment variables used by API routes are server-side (no `NEXT_PUBLIC_` prefix for secrets).
- [ ] **No hardcoded values**: No base URLs, API tokens, or passwords are hardcoded. All secrets come from `process.env`.
- [ ] **Env validation**: Required environment variables are validated at startup (or at runtime in the route handler) and fail fast with a descriptive error if missing.

---

## 2. NocoDB Integration

- [ ] **Uses wrapper**: All NocoDB operations use the client wrapper at `src/lib/nocodb.ts`. No raw `fetch` calls to NocoDB in route handlers.
- [ ] **Title Case field access**: All record field access uses `getField(record, 'column_name', 'Column Title')` or `getFieldBool(...)` from `src/lib/nocodb-fields.ts`. Never access `record.column_name` directly.
- [ ] **ID validation**: All route parameters (e.g., `[id]`) are validated as valid numeric IDs before making database requests.
- [ ] **Relationship integrity**: Foreign key fields (e.g., `Project Id`, `Task Id`) reference valid records before insertion.

---

## 3. Error Handling

- [ ] **Try/catch**: Every async operation is wrapped in a `try/catch` block.
- [ ] **HTTP status codes**: Errors return appropriate HTTP status codes (400 for bad requests, 404 for not found, 500 for server errors).
- [ ] **Error messages**: Error responses include a descriptive `message` field. Stack traces are never exposed to the client.
- [ ] **Graceful degradation**: If a non-critical operation fails (e.g., saving a daily log), the primary response is not blocked.

---

## 4. Request Validation

- [ ] **Body validation**: POST and PATCH request bodies are validated using Zod schemas on the server side.
- [ ] **Type safety**: All request and response data is typed using interfaces from `src/types/index.ts`.
- [ ] **Required fields check**: Required fields are verified before making database calls, with clear 400 responses if missing.

---

## 5. Response Standards

- [ ] **Typed responses**: All API responses conform to typed interfaces, not arbitrary `any` shaped objects.
- [ ] **Consistent format**: Success responses follow a consistent JSON format:
  ```json
  { "data": { ... } }
  { "data": [ ... ] }
  ```
  Error responses follow:
  ```json
  { "error": "Descriptive error message" }
  ```
- [ ] **Pagination**: List endpoints support pagination where the data set could be large.
- [ ] **No over-fetching**: API routes return only the data needed by the consuming component.

---

## 6. Security

- [ ] **No secret exposure**: API keys, tokens, and database credentials never appear in API responses, even in error details.
- [ ] **Input sanitization**: User-supplied strings are not directly interpolated into SQL, system commands, or template strings without sanitization.
- [ ] **Safe agent tools**: The `run_command` agent tool must never allow user input to be passed directly as a shell command without explicit authorization.

---

## 7. API Route Organization

- [ ] **File naming**: Routes follow the Next.js App Router convention: `src/app/api/[resource]/route.ts` and `src/app/api/[resource]/[id]/route.ts`.
- [ ] **HTTP verbs**: `GET` for reads, `POST` for creates, `PATCH` for partial updates, `DELETE` for deletions.
- [ ] **Route guards**: Routes that require an active project context validate `projectId` is present and valid.
