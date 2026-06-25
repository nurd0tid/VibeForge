import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  uid: text("uid").primaryKey(),
  name: text("name").notNull(),
  localPath: text("local_path").notNull().unique(),
  repoFingerprint: text("repo_fingerprint").notNull(),
  remoteUrl: text("remote_url"),
  defaultBranch: text("default_branch").notNull(),
  currentBranch: text("current_branch").notNull(),
  isGit: integer("is_git", { mode: "boolean" }).notNull(),
  isClean: integer("is_clean", { mode: "boolean" }).notNull(),
  memoryFiles: text("memory_files", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  dailyLogMirror: integer("daily_log_mirror", { mode: "boolean" }).notNull(),
  dailyLogPath: text("daily_log_path").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  uid: text("uid").primaryKey(),
  projectUid: text("project_uid").notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  roughPrompt: text("rough_prompt").notNull(),
  refinedPrompt: text("refined_prompt").notNull(),
  acceptanceCriteria: text("acceptance_criteria", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  verification: text("verification", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  dependencyUids: text("dependency_uids", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"],
  }).notNull(),
  mode: text("mode", { enum: ["plan", "build"] }).notNull(),
  status: text("status").notNull(),
  sortOrder: real("sort_order").notNull(),
  source: text("source", { enum: ["manual", "ai"] }).notNull(),
  assignedSessionUid: text("assigned_session_uid"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  uid: text("uid").primaryKey(),
  projectUid: text("project_uid").notNull(),
  name: text("name").notNull(),
  cliId: text("cli_id").notNull(),
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  agentMode: text("agent_mode").notNull(),
  permissionMode: text("permission_mode").notNull(),
  targetBranch: text("target_branch").notNull(),
  baseCommit: text("base_commit").notNull(),
  branch: text("branch").notNull(),
  worktreePath: text("worktree_path").notNull(),
  opencodeSessionId: text("opencode_session_id"),
  status: text("status").notNull(),
  activeTaskUid: text("active_task_uid"),
  pendingTaskUids: text("pending_task_uids", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  reviewGate: text("review_gate", {
    enum: ["each_task", "batch_end"],
  }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const events = sqliteTable("events", {
  uid: text("uid").primaryKey(),
  sessionUid: text("session_uid").notNull(),
  taskUid: text("task_uid"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadata: text("metadata", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  createdAt: text("created_at").notNull(),
});

export const reviews = sqliteTable("reviews", {
  uid: text("uid").primaryKey(),
  sessionUid: text("session_uid").notNull(),
  taskUid: text("task_uid"),
  decision: text("decision").notNull(),
  summary: text("summary").notNull(),
  comments: text("comments", { mode: "json" }).$type<unknown[]>().notNull(),
  diffHash: text("diff_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dailyLogs = sqliteTable("daily_logs", {
  uid: text("uid").primaryKey(),
  projectUid: text("project_uid").notNull(),
  sessionUid: text("session_uid"),
  taskUid: text("task_uid"),
  date: text("date").notNull(),
  prompt: text("prompt").notNull(),
  plan: text("plan").notNull(),
  changedFiles: text("changed_files", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  verification: text("verification", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  result: text("result").notNull(),
  status: text("status").notNull(),
  blockers: text("blockers").notNull(),
  nextSteps: text("next_steps").notNull(),
  mirroredAt: text("mirrored_at"),
  createdAt: text("created_at").notNull(),
});

export const promptTemplates = sqliteTable("prompt_templates", {
  uid: text("uid").primaryKey(),
  projectUid: text("project_uid"),
  name: text("name").notNull(),
  version: integer("version").notNull(),
  template: text("template").notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const connectedAccounts = sqliteTable("connected_accounts", {
  uid: text("uid").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider", { enum: ["google", "figma"] }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").notNull(),
  scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
  expiresAt: text("expires_at"),
  accountLabel: text("account_label"),
  status: text("status", {
    enum: [
      "not_configured",
      "not_connected",
      "connected",
      "token_expired",
      "missing_permission",
      "error",
    ],
  }).notNull(),
  metadata: text("metadata", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const connectedFiles = sqliteTable("task_connected_files", {
  uid: text("uid").primaryKey(),
  taskUid: text("task_uid").notNull(),
  provider: text("provider", { enum: ["google", "figma"] }).notNull(),
  fileType: text("file_type", {
    enum: ["docs", "sheets", "slides", "figma"],
  }).notNull(),
  externalFileId: text("external_file_id").notNull(),
  externalFileUrl: text("external_file_url").notNull(),
  fileName: text("file_name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  metadata: text("metadata", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  status: text("status", {
    enum: [
      "not_connected",
      "connected",
      "token_expired",
      "missing_permission",
      "inaccessible",
      "synced",
    ],
  }).notNull(),
  connectedBy: text("connected_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const aiFileActions = sqliteTable("ai_file_actions", {
  uid: text("uid").primaryKey(),
  taskUid: text("task_uid").notNull(),
  connectedFileUid: text("connected_file_uid").notNull(),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  actionType: text("action_type").notNull(),
  status: text("status", {
    enum: ["pending", "running", "needs_confirmation", "success", "failed"],
  }).notNull(),
  resultSummary: text("result_summary").notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const outbox = sqliteTable("sync_outbox", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableName: text("table_name").notNull(),
  entityUid: text("entity_uid").notNull(),
  operation: text("operation").notNull(),
  payload: text("payload", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
});
