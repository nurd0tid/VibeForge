# Skill: NocoDB Sync

## Purpose
Synchronize local project data with NocoDB, ensuring field mappings are correct and records are consistent between the app and the database.

## When to Use
- Creating or updating records in NocoDB
- Debugging data discrepancies between app state and NocoDB
- After schema changes in NocoDB tables

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`docs/agent/HOW_VIBEFORGE_WORKS.md`)
- [ ] Read `src/lib/nocodb-fields.ts` for field helpers
- [ ] Verify NocoDB API token and base URL are configured

## Steps
1. Validate the NocoDB table schema matches expected fields
2. Check field mappings: use column Title (not column_name) as JSON keys
3. Use `getField` and `getFieldBool` helpers from `src/lib/nocodb-fields.ts`
4. Test with a single record read before bulk operations
5. Handle pagination for large datasets (NocoDB returns paginated results)
6. Verify each record after creation or update with a follow-up read
7. Log sync results to chat

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "I know the field names" | Always check both `record.field_name` and `record['Field Name']`. |
| "One record worked, bulk will too" | Test edge cases. Bulk ops have different failure modes. |
| "Schema hasn't changed" | Verify it. NocoDB schema can be changed externally. |

## Verification (Definition of Done)
- [ ] Schema validated against expected structure
- [ ] Field mappings use Title keys (not column_name)
- [ ] Records created/updated successfully
- [ ] Build passes
- [ ] No undefined/null errors from missing fields
- [ ] Memory bank updated

## Output Format
Sync report listing records processed, successes, and failures with error details.

## Files Affected
- `src/lib/nocodb-fields.ts`
- `src/lib/nocodb.ts` (or equivalent API client)
- NocoDB remote records

## Failure Handling
If a field is missing from the response, check if the column Title changed. If NocoDB returns 401/403, verify the API token. If 422, check the request body against the current schema. Log all errors with full context.
