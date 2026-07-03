---
name: nocodb-sync
description: Synchronize local project data with NocoDB, ensuring field mappings are correct and records are consistent between the app and the database.
---

# Overview
Verifies NocoDB table schemas, tests individual read/writes, applies Title-based field mappings, handles pagination, and verifies remote record changes.

# When to Use
- Creating or updating records in NocoDB
- Debugging data discrepancies between app state and NocoDB
- After schema changes in NocoDB tables

# Process
1. Validate the NocoDB table schema matches expected fields
2. Check field mappings: use column Title (not column_name) as JSON keys
3. Use `getField` and `getFieldBool` helpers from `src/lib/nocodb-fields.ts`
4. Test with a single record read before bulk operations
5. Handle pagination for large datasets (NocoDB returns paginated results)
6. Verify each record after creation or update with a follow-up read
7. Log sync results to chat and update memory bank

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "I know the field names" | Always check both `record.field_name` and `record['Field Name']`. |
| "One record worked, bulk will too" | Test edge cases. Bulk ops have different failure modes. |
| "Schema hasn't changed" | Verify it. NocoDB schema can be changed externally. |
| "I don't need a follow-up read" | Network latency or database constraints can cause silent drops. |

# Red Flags
- Using database column names (`column_name`) instead of Titles in request payload
- Bulk writes executed without testing a single write first
- No pagination handling for lists larger than NocoDB default limit
- Database helper methods bypassed in favor of raw JSON property access

# Verification
- [ ] Schema validated against expected structure
- [ ] Field mappings use Title keys (not column_name)
- [ ] Records created/updated successfully
- [ ] Build passes
- [ ] No undefined/null errors from missing fields
- [ ] Memory bank updated with sync event
