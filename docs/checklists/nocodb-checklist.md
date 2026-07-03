# NocoDB Checklist

This checklist ensures the server-side integration and client-side usage of the NocoDB REST API v1 are robust, secure, and accurate.

- [ ] **Server-Side Integration**: All database calls are routed securely through server-side wrappers or API routes; database credentials/tokens are NEVER exposed to the client.
- [ ] **Env Resolution**: The `NOCODB_URL` and `NOCODB_API_TOKEN` environment variables are correctly resolved and validated before making API requests.
- [ ] **Title Case Key Access**: NocoDB records are accessed using the canonical Title Case keys (e.g., `record['Task Name']`), NOT the snake_case keys, as per NocoDB API structure.
- [ ] **Helper Functions Used**: Extraction of values utilizes `src/lib/nocodb-fields.ts` helpers (`getField()`, `getFieldBool()`) to safely handle missing or empty fields.
- [ ] **Tables and Views Exist**: Verify that the targeted tables and views exist in the NocoDB instance and match the expected schema.
- [ ] **Client Wrapper Exceptions**: The client wrapper handles API exceptions (404, 500, timeouts) gracefully, returning standardized error objects rather than crashing the application.
- [ ] **Paginated Results**: Queries that can return multiple records correctly implement pagination (handling `page` and `limit` parameters) and aggregate results if necessary.
- [ ] **CRUD Tested**: Create, Read, Update, and Delete operations for the specific feature have been fully tested and verified against the live NocoDB instance.
