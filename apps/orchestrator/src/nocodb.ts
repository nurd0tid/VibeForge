import { config } from "./config.js";
import { failOutbox, listOutbox, resolveOutbox } from "./db.js";

type TableDefinition = {
  name: string;
  columns: Array<{ title: string; uidt: string }>;
};

export const nocodbTables: TableDefinition[] = [
  {
    name: "vk_schema_versions",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "Version", uidt: "Number" },
      { title: "Checksum", uidt: "SingleLineText" },
      { title: "AppliedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_projects",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "Name", uidt: "SingleLineText" },
      { title: "RepoFingerprint", uidt: "SingleLineText" },
      { title: "RemoteUrl", uidt: "URL" },
      { title: "DefaultBranch", uidt: "SingleLineText" },
      { title: "MemoryFiles", uidt: "LongText" },
      { title: "DailyLogMirror", uidt: "Checkbox" },
      { title: "DailyLogPath", uidt: "SingleLineText" },
      { title: "UpdatedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_tasks",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "ProjectUid", uidt: "SingleLineText" },
      { title: "Number", uidt: "Number" },
      { title: "Title", uidt: "SingleLineText" },
      { title: "RoughPrompt", uidt: "LongText" },
      { title: "RefinedPrompt", uidt: "LongText" },
      { title: "AcceptanceCriteria", uidt: "LongText" },
      { title: "Verification", uidt: "LongText" },
      { title: "Priority", uidt: "SingleSelect" },
      { title: "Mode", uidt: "SingleSelect" },
      { title: "Status", uidt: "SingleSelect" },
      { title: "SortOrder", uidt: "Decimal" },
      { title: "AssignedSessionUid", uidt: "SingleLineText" },
      { title: "UpdatedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_task_dependencies",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "TaskUid", uidt: "SingleLineText" },
      { title: "DependsOnTaskUid", uidt: "SingleLineText" },
    ],
  },
  {
    name: "vk_prompt_templates",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "ProjectUid", uidt: "SingleLineText" },
      { title: "Name", uidt: "SingleLineText" },
      { title: "Version", uidt: "Number" },
      { title: "Template", uidt: "LongText" },
      { title: "Active", uidt: "Checkbox" },
    ],
  },
  {
    name: "vk_sessions",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "ProjectUid", uidt: "SingleLineText" },
      { title: "Name", uidt: "SingleLineText" },
      { title: "CliId", uidt: "SingleLineText" },
      { title: "ProviderId", uidt: "SingleLineText" },
      { title: "ModelId", uidt: "SingleLineText" },
      { title: "AgentMode", uidt: "SingleSelect" },
      { title: "PermissionMode", uidt: "SingleSelect" },
      { title: "TargetBranch", uidt: "SingleLineText" },
      { title: "Branch", uidt: "SingleLineText" },
      { title: "Status", uidt: "SingleSelect" },
      { title: "UpdatedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_batches",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "SessionUid", uidt: "SingleLineText" },
      { title: "Name", uidt: "SingleLineText" },
      { title: "QueueMode", uidt: "SingleSelect" },
      { title: "Status", uidt: "SingleSelect" },
      { title: "StartedAt", uidt: "DateTime" },
      { title: "FinishedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_batch_tasks",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "BatchUid", uidt: "SingleLineText" },
      { title: "TaskUid", uidt: "SingleLineText" },
      { title: "Sequence", uidt: "Number" },
      { title: "Status", uidt: "SingleSelect" },
    ],
  },
  {
    name: "vk_run_summaries",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "TaskUid", uidt: "SingleLineText" },
      { title: "SessionUid", uidt: "SingleLineText" },
      { title: "Status", uidt: "SingleSelect" },
      { title: "Summary", uidt: "LongText" },
      { title: "ChangedFiles", uidt: "LongText" },
      { title: "StartedAt", uidt: "DateTime" },
      { title: "FinishedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_reviews",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "SessionUid", uidt: "SingleLineText" },
      { title: "TaskUid", uidt: "SingleLineText" },
      { title: "Decision", uidt: "SingleSelect" },
      { title: "Summary", uidt: "LongText" },
      { title: "Comments", uidt: "LongText" },
      { title: "DiffHash", uidt: "SingleLineText" },
      { title: "CreatedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_daily_logs",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "ProjectUid", uidt: "SingleLineText" },
      { title: "SessionUid", uidt: "SingleLineText" },
      { title: "TaskUid", uidt: "SingleLineText" },
      { title: "Date", uidt: "Date" },
      { title: "Prompt", uidt: "LongText" },
      { title: "Plan", uidt: "LongText" },
      { title: "ChangedFiles", uidt: "LongText" },
      { title: "Verification", uidt: "LongText" },
      { title: "Result", uidt: "LongText" },
      { title: "Status", uidt: "SingleSelect" },
      { title: "Blockers", uidt: "LongText" },
      { title: "NextSteps", uidt: "LongText" },
      { title: "CreatedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_task_connected_files",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "TaskUid", uidt: "SingleLineText" },
      { title: "Provider", uidt: "SingleSelect" },
      { title: "FileType", uidt: "SingleSelect" },
      { title: "ExternalFileId", uidt: "SingleLineText" },
      { title: "ExternalFileUrl", uidt: "URL" },
      { title: "FileName", uidt: "SingleLineText" },
      { title: "ThumbnailUrl", uidt: "URL" },
      { title: "Metadata", uidt: "LongText" },
      { title: "Status", uidt: "SingleSelect" },
      { title: "ConnectedBy", uidt: "SingleLineText" },
      { title: "CreatedAt", uidt: "DateTime" },
      { title: "UpdatedAt", uidt: "DateTime" },
    ],
  },
  {
    name: "vk_ai_file_actions",
    columns: [
      { title: "Uid", uidt: "SingleLineText" },
      { title: "TaskUid", uidt: "SingleLineText" },
      { title: "ConnectedFileUid", uidt: "SingleLineText" },
      { title: "UserId", uidt: "SingleLineText" },
      { title: "Prompt", uidt: "LongText" },
      { title: "ActionType", uidt: "SingleLineText" },
      { title: "Status", uidt: "SingleSelect" },
      { title: "ResultSummary", uidt: "LongText" },
      { title: "ErrorMessage", uidt: "LongText" },
      { title: "CreatedAt", uidt: "DateTime" },
      { title: "UpdatedAt", uidt: "DateTime" },
    ],
  },
];

function headers(hasJsonBody = false) {
  if (!config.nocodb.token)
    throw new Error("NOCODB_API_TOKEN is not configured");
  return {
    "xc-token": config.nocodb.token,
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
  };
}

async function request(path: string, init: RequestInit = {}) {
  const hasJsonBody = init.body !== undefined && init.body !== null;
  const response = await fetch(`${config.nocodb.baseUrl}${path}`, {
    ...init,
    headers: { ...headers(hasJsonBody), ...(init.headers || {}) },
  });
  const body = await response.text();
  if (!response.ok)
    throw new Error(`NocoDB ${response.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}

export async function listNocoTables() {
  const response = await request(
    `/api/v2/meta/bases/${encodeURIComponent(config.nocodb.baseId)}/tables`,
  );
  const list = Array.isArray(response) ? response : response?.list || [];
  return new Map<string, { id: string; title: string }>(
    list.map((table: { id: string; title: string }) => [table.title, table]),
  );
}

export async function setupNocoDb() {
  if (!config.nocodb.baseId)
    throw new Error("NOCODB_BASE_ID is not configured");
  const existing = await listNocoTables();
  const created: string[] = [];
  for (const table of nocodbTables) {
    if (existing.has(table.name)) continue;
    await request(
      `/api/v2/meta/bases/${encodeURIComponent(config.nocodb.baseId)}/tables`,
      {
        method: "POST",
        body: JSON.stringify({
          title: table.name,
          table_name: table.name,
          columns: table.columns.map((column, index) => ({
            ...column,
            column_name: column.title,
            pk: index === 0,
          })),
        }),
      },
    );
    created.push(table.name);
  }
  return {
    created,
    existing: [...existing.keys()].filter((name) => name.startsWith("vk_")),
  };
}

function serialize(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key.charAt(0).toUpperCase() + key.slice(1),
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : value,
    ]),
  );
}

export async function syncOutboxOnce() {
  if (!config.nocodb.token || !config.nocodb.baseId)
    return { skipped: true, processed: 0 };
  const tables = await listNocoTables();
  let processed = 0;
  for (const item of listOutbox()) {
    const table = tables.get(item.tableName);
    if (!table) {
      failOutbox(
        item.id,
        item.attempts,
        `Missing NocoDB table ${item.tableName}`,
      );
      continue;
    }
    try {
      const where = encodeURIComponent(`(Uid,eq,${item.entityUid})`);
      const found = await request(
        `/api/v2/tables/${table.id}/records?where=${where}&limit=1`,
      );
      const record = (found?.list || [])[0];
      const payload = serialize(item.payload);
      if (record?.Id) {
        await request(`/api/v2/tables/${table.id}/records`, {
          method: "PATCH",
          body: JSON.stringify([{ Id: record.Id, ...payload }]),
        });
      } else {
        await request(`/api/v2/tables/${table.id}/records`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resolveOutbox(item.id);
      processed += 1;
    } catch (error) {
      failOutbox(
        item.id,
        item.attempts,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  return { skipped: false, processed };
}

export function nocoHealth() {
  return {
    configured: Boolean(config.nocodb.token && config.nocodb.baseId),
    baseUrl: config.nocodb.baseUrl,
    workspaceId: config.nocodb.workspaceId,
    baseId: config.nocodb.baseId,
  };
}
