import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { asc, desc, eq, sql } from "drizzle-orm";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AiFileAction,
  ConnectedAccountPublic,
  ConnectedFile,
  NormalizedEvent,
  Project,
  Session,
  Task,
} from "@vk/contracts";
import { config } from "./config.js";
import * as schema from "./schema.js";

const sqlite = new Database(path.join(config.dataDir, "karsadesk.sqlite"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (uid TEXT PRIMARY KEY, name TEXT NOT NULL, local_path TEXT NOT NULL UNIQUE, repo_fingerprint TEXT NOT NULL, remote_url TEXT, default_branch TEXT NOT NULL, current_branch TEXT NOT NULL, is_git INTEGER NOT NULL, is_clean INTEGER NOT NULL, memory_files TEXT NOT NULL, daily_log_mirror INTEGER NOT NULL, daily_log_path TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS tasks (uid TEXT PRIMARY KEY, project_uid TEXT NOT NULL, number INTEGER NOT NULL, title TEXT NOT NULL, rough_prompt TEXT NOT NULL, refined_prompt TEXT NOT NULL, acceptance_criteria TEXT NOT NULL, verification TEXT NOT NULL, dependency_uids TEXT NOT NULL, priority TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL, sort_order REAL NOT NULL, source TEXT NOT NULL, assigned_session_uid TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON tasks(project_uid, status, sort_order);
  CREATE TABLE IF NOT EXISTS sessions (uid TEXT PRIMARY KEY, project_uid TEXT NOT NULL, name TEXT NOT NULL, cli_id TEXT NOT NULL, provider_id TEXT NOT NULL, model_id TEXT NOT NULL, agent_mode TEXT NOT NULL, permission_mode TEXT NOT NULL, target_branch TEXT NOT NULL, base_commit TEXT NOT NULL, branch TEXT NOT NULL, worktree_path TEXT NOT NULL, opencode_session_id TEXT, status TEXT NOT NULL, active_task_uid TEXT, pending_task_uids TEXT NOT NULL DEFAULT '[]', review_gate TEXT NOT NULL DEFAULT 'batch_end', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS events (uid TEXT PRIMARY KEY, session_uid TEXT NOT NULL, task_uid TEXT, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, metadata TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS events_session_idx ON events(session_uid, created_at);
  CREATE TABLE IF NOT EXISTS reviews (uid TEXT PRIMARY KEY, session_uid TEXT NOT NULL, task_uid TEXT, decision TEXT NOT NULL, summary TEXT NOT NULL, comments TEXT NOT NULL, diff_hash TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS daily_logs (uid TEXT PRIMARY KEY, project_uid TEXT NOT NULL, session_uid TEXT, task_uid TEXT, date TEXT NOT NULL, prompt TEXT NOT NULL, plan TEXT NOT NULL, changed_files TEXT NOT NULL, verification TEXT NOT NULL, result TEXT NOT NULL, status TEXT NOT NULL, blockers TEXT NOT NULL, next_steps TEXT NOT NULL, mirrored_at TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS prompt_templates (uid TEXT PRIMARY KEY, project_uid TEXT, name TEXT NOT NULL, version INTEGER NOT NULL, template TEXT NOT NULL, active INTEGER NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS connected_accounts (uid TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL UNIQUE, access_token TEXT NOT NULL, refresh_token TEXT, token_type TEXT NOT NULL, scopes TEXT NOT NULL, expires_at TEXT, account_label TEXT, status TEXT NOT NULL, metadata TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS task_connected_files (uid TEXT PRIMARY KEY, task_uid TEXT NOT NULL, provider TEXT NOT NULL, file_type TEXT NOT NULL, external_file_id TEXT NOT NULL, external_file_url TEXT NOT NULL, file_name TEXT NOT NULL, thumbnail_url TEXT, metadata TEXT NOT NULL, status TEXT NOT NULL, connected_by TEXT NOT NULL DEFAULT 'local-user', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS task_connected_files_task_idx ON task_connected_files(task_uid, created_at);
  CREATE TABLE IF NOT EXISTS ai_file_actions (uid TEXT PRIMARY KEY, task_uid TEXT NOT NULL, connected_file_uid TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT 'local-user', prompt TEXT NOT NULL, action_type TEXT NOT NULL, status TEXT NOT NULL, result_summary TEXT NOT NULL, error_message TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS ai_file_actions_task_idx ON ai_file_actions(task_uid, created_at);
  CREATE TABLE IF NOT EXISTS sync_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, table_name TEXT NOT NULL, entity_uid TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL);
`);

export const db = drizzle(sqlite, { schema });

const sessionColumns = sqlite
  .prepare("PRAGMA table_info(sessions)")
  .all() as Array<{ name: string }>;
if (!sessionColumns.some((column) => column.name === "pending_task_uids"))
  sqlite.exec(
    "ALTER TABLE sessions ADD COLUMN pending_task_uids TEXT NOT NULL DEFAULT '[]'",
  );
if (!sessionColumns.some((column) => column.name === "review_gate"))
  sqlite.exec(
    "ALTER TABLE sessions ADD COLUMN review_gate TEXT NOT NULL DEFAULT 'batch_end'",
  );

const connectedFileColumns = sqlite
  .prepare("PRAGMA table_info(task_connected_files)")
  .all() as Array<{ name: string }>;
if (!connectedFileColumns.some((column) => column.name === "connected_by"))
  sqlite.exec(
    "ALTER TABLE task_connected_files ADD COLUMN connected_by TEXT NOT NULL DEFAULT 'local-user'",
  );

const aiFileActionColumns = sqlite
  .prepare("PRAGMA table_info(ai_file_actions)")
  .all() as Array<{ name: string }>;
if (!aiFileActionColumns.some((column) => column.name === "user_id"))
  sqlite.exec(
    "ALTER TABLE ai_file_actions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local-user'",
  );

const defaultTemplate = `You are KarsaDesk Smart Prompt, a kanban task planner for an existing software repository.

Your output must follow the user's tmp-kanban style:
- One task/card should contain one ready-to-run prompt.
- Always require the executor to read AGENTS.md and docs/ai/README.md first.
- Include project-context and daily-log rules inside every task prompt.
- Include clear sections: Request user, Tujuan, Kerjakan, Acceptance criteria, Verifikasi, Daily log.
- Add Frontend demo wajib only when the task affects UI/UX/frontend/responsive behavior.
- Do not split a request into many tasks unless the work has clearly separate phases, dependencies, or review gates.
- If the user asks to audit/check existing tmp-kanban prompts, create a planning/audit task first instead of inventing implementation tasks.
- Preserve the user's intent and language. Do not invent unrelated scope.

Before deciding task count, inspect relevant project memory files and, when useful, project folders such as docs/ai/tmp-kanban-prompts, docs/ai/daily-logs, AGENTS.md, and docs/ai/project-context.md.

Return JSON only with this shape:
{"summary":"...","tasks":[{"title":"...","prompt":"# Prompt - ...\\n\\nIkuti ...","mode":"plan","priority":"high","acceptanceCriteria":["..."],"verification":["..."],"dependsOn":[]}]}

Rules for task count:
- 1 task for a single coherent request, audit, investigation, or small implementation.
- 2-6 tasks only when the request explicitly lists multiple independent items or requires sequential phases.
- Dependencies use zero-based task indexes.`;

if (
  db
    .select({ count: sql<number>`count(*)` })
    .from(schema.promptTemplates)
    .get()?.count === 0
) {
  db.insert(schema.promptTemplates)
    .values({
      uid: randomUUID(),
      projectUid: null,
      name: "Repository-aware decomposition",
      version: 1,
      template: defaultTemplate,
      active: true,
      createdAt: new Date().toISOString(),
    })
    .run();
}

if (
  !db
    .select()
    .from(schema.promptTemplates)
    .where(eq(schema.promptTemplates.name, "Tmp-kanban ready task planner"))
    .get()
) {
  db.insert(schema.promptTemplates)
    .values({
      uid: randomUUID(),
      projectUid: null,
      name: "Tmp-kanban ready task planner",
      version: 2,
      template: defaultTemplate,
      active: true,
      createdAt: new Date().toISOString(),
    })
    .run();
}

function enqueue(
  tableName: string,
  entityUid: string,
  payload: Record<string, unknown>,
) {
  db.insert(schema.outbox)
    .values({
      tableName,
      entityUid,
      operation: "upsert",
      payload,
      attempts: 0,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function listProjects(): Project[] {
  return db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.updatedAt))
    .all() as Project[];
}

export function getProject(uid: string): Project | undefined {
  return db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.uid, uid))
    .get() as Project | undefined;
}

export function saveProject(project: Project) {
  db.insert(schema.projects)
    .values(project)
    .onConflictDoUpdate({ target: schema.projects.uid, set: project })
    .run();
  const { localPath: _localPath, ...portable } = project;
  enqueue("vk_projects", project.uid, portable);
}

export function listTasks(
  projectUid: string,
  page = 1,
  pageSize = 60,
  query = "",
) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(200, Math.max(10, pageSize));
  const all = db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectUid, projectUid))
    .orderBy(asc(schema.tasks.sortOrder))
    .all() as Task[];
  const filtered = query
    ? all.filter((task) =>
        `${task.title} ${task.refinedPrompt} KD-${task.number} VK-${task.number}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : all;
  const offset = (safePage - 1) * safeSize;
  return {
    items: filtered.slice(offset, offset + safeSize),
    page: safePage,
    pageSize: safeSize,
    total: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / safeSize)),
    hasMore: offset + safeSize < filtered.length,
  };
}

export function listAllTasks(projectUid: string): Task[] {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectUid, projectUid))
    .orderBy(asc(schema.tasks.sortOrder))
    .all() as Task[];
}

export function getTask(uid: string): Task | undefined {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.uid, uid))
    .get() as Task | undefined;
}

export function nextTaskNumber(projectUid: string): number {
  const row = db
    .select({ max: sql<number>`coalesce(max(${schema.tasks.number}), 0)` })
    .from(schema.tasks)
    .where(eq(schema.tasks.projectUid, projectUid))
    .get();
  return Number(row?.max || 0) + 1;
}

export function saveTask(task: Task) {
  db.insert(schema.tasks)
    .values(task)
    .onConflictDoUpdate({ target: schema.tasks.uid, set: task })
    .run();
  enqueue("vk_tasks", task.uid, task as unknown as Record<string, unknown>);
}

export function updateTask(uid: string, values: Partial<Task>): Task {
  const updatedAt = new Date().toISOString();
  db.update(schema.tasks)
    .set({ ...values, updatedAt })
    .where(eq(schema.tasks.uid, uid))
    .run();
  const task = getTask(uid);
  if (!task) throw new Error("Task not found");
  enqueue("vk_tasks", uid, task as unknown as Record<string, unknown>);
  return task;
}

export function listSessions(projectUid: string): Session[] {
  return db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.projectUid, projectUid))
    .orderBy(desc(schema.sessions.createdAt))
    .all() as Session[];
}

export function getSession(uid: string): Session | undefined {
  return db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.uid, uid))
    .get() as Session | undefined;
}

export function saveSession(session: Session) {
  db.insert(schema.sessions)
    .values(session)
    .onConflictDoUpdate({ target: schema.sessions.uid, set: session })
    .run();
  const { worktreePath: _worktreePath, ...portable } = session;
  enqueue("vk_sessions", session.uid, portable);
}

export function updateSession(uid: string, values: Partial<Session>): Session {
  db.update(schema.sessions)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(eq(schema.sessions.uid, uid))
    .run();
  const session = getSession(uid);
  if (!session) throw new Error("Session not found");
  const { worktreePath: _worktreePath, ...portable } = session;
  enqueue("vk_sessions", uid, portable);
  return session;
}

export function addEvent(event: NormalizedEvent) {
  db.insert(schema.events).values(event).run();
}

export function listEvents(sessionUid: string, page = 1, pageSize = 100) {
  const all = db
    .select()
    .from(schema.events)
    .where(eq(schema.events.sessionUid, sessionUid))
    .orderBy(desc(schema.events.createdAt))
    .all() as NormalizedEvent[];
  const safeSize = Math.min(250, Math.max(20, pageSize));
  const offset = (Math.max(1, page) - 1) * safeSize;
  const items = all.slice(offset, offset + safeSize).reverse();
  return {
    items,
    page: Math.max(1, page),
    pageSize: safeSize,
    total: all.length,
    totalPages: Math.max(1, Math.ceil(all.length / safeSize)),
    hasMore: offset + safeSize < all.length,
  };
}

export function activeTemplate(): string {
  return (
    db
      .select()
      .from(schema.promptTemplates)
      .where(eq(schema.promptTemplates.active, true))
      .orderBy(desc(schema.promptTemplates.version))
      .get()?.template || defaultTemplate
  );
}

export function listOutbox() {
  return db
    .select()
    .from(schema.outbox)
    .orderBy(asc(schema.outbox.id))
    .limit(100)
    .all();
}

export function resolveOutbox(id: number) {
  db.delete(schema.outbox).where(eq(schema.outbox.id, id)).run();
}

export function failOutbox(id: number, attempts: number, error: string) {
  db.update(schema.outbox)
    .set({ attempts: attempts + 1, lastError: error.slice(0, 500) })
    .where(eq(schema.outbox.id, id))
    .run();
}

export function saveReview(value: typeof schema.reviews.$inferInsert) {
  db.insert(schema.reviews).values(value).run();
  enqueue("vk_reviews", value.uid, value as unknown as Record<string, unknown>);
}

export function saveDailyLog(value: typeof schema.dailyLogs.$inferInsert) {
  db.insert(schema.dailyLogs).values(value).run();
  enqueue(
    "vk_daily_logs",
    value.uid,
    value as unknown as Record<string, unknown>,
  );
}

export function listDailyLogs(projectUid: string, page = 1, pageSize = 30) {
  const all = db
    .select()
    .from(schema.dailyLogs)
    .where(eq(schema.dailyLogs.projectUid, projectUid))
    .orderBy(desc(schema.dailyLogs.createdAt))
    .all();
  const safeSize = Math.min(100, Math.max(10, pageSize));
  const offset = (Math.max(1, page) - 1) * safeSize;
  return {
    items: all.slice(offset, offset + safeSize),
    page: Math.max(1, page),
    pageSize: safeSize,
    total: all.length,
    totalPages: Math.max(1, Math.ceil(all.length / safeSize)),
    hasMore: offset + safeSize < all.length,
  };
}

type ConnectedAccount = typeof schema.connectedAccounts.$inferSelect;
type ConnectedAccountInsert = typeof schema.connectedAccounts.$inferInsert;

function publicAccount(
  provider: "google" | "figma",
  configured: boolean,
  account?: ConnectedAccount,
  message?: string | null,
): ConnectedAccountPublic {
  return {
    provider,
    status: configured ? account?.status || "not_connected" : "not_configured",
    configured,
    connected: Boolean(configured && account?.status === "connected"),
    scopes: account?.scopes || [],
    expiresAt: account?.expiresAt || null,
    accountLabel: account?.accountLabel || null,
    updatedAt: account?.updatedAt || null,
    message: message || null,
  };
}

export function getConnectedAccount(provider: "google" | "figma") {
  return db
    .select()
    .from(schema.connectedAccounts)
    .where(eq(schema.connectedAccounts.provider, provider))
    .get() as ConnectedAccount | undefined;
}

export function listConnectedAccountStatus(configured: {
  google: boolean;
  figma: boolean;
}) {
  const google = getConnectedAccount("google");
  const figma = getConnectedAccount("figma");
  return {
    google: publicAccount(
      "google",
      configured.google,
      google,
      configured.google
        ? null
        : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local",
    ),
    figma: publicAccount(
      "figma",
      configured.figma,
      figma,
      configured.figma
        ? null
        : "Set FIGMA_CLIENT_ID/FIGMA_CLIENT_SECRET or FIGMA_PERSONAL_ACCESS_TOKEN",
    ),
  };
}

export function saveConnectedAccount(value: ConnectedAccountInsert) {
  db.insert(schema.connectedAccounts)
    .values(value)
    .onConflictDoUpdate({
      target: schema.connectedAccounts.provider,
      set: { ...value, updatedAt: new Date().toISOString() },
    })
    .run();
}

export function updateConnectedAccount(
  provider: "google" | "figma",
  values: Partial<ConnectedAccountInsert>,
) {
  db.update(schema.connectedAccounts)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(eq(schema.connectedAccounts.provider, provider))
    .run();
  return getConnectedAccount(provider);
}

export function deleteConnectedAccount(provider: "google" | "figma") {
  db.delete(schema.connectedAccounts)
    .where(eq(schema.connectedAccounts.provider, provider))
    .run();
}

export function listConnectedFiles(taskUid: string): ConnectedFile[] {
  return db
    .select()
    .from(schema.connectedFiles)
    .where(eq(schema.connectedFiles.taskUid, taskUid))
    .orderBy(desc(schema.connectedFiles.createdAt))
    .all() as ConnectedFile[];
}

export function getConnectedFile(uid: string): ConnectedFile | undefined {
  return db
    .select()
    .from(schema.connectedFiles)
    .where(eq(schema.connectedFiles.uid, uid))
    .get() as ConnectedFile | undefined;
}

export function saveConnectedFile(value: ConnectedFile) {
  db.insert(schema.connectedFiles)
    .values(value)
    .onConflictDoUpdate({ target: schema.connectedFiles.uid, set: value })
    .run();
  enqueue(
    "vk_task_connected_files",
    value.uid,
    value as unknown as Record<string, unknown>,
  );
}

export function detachConnectedFile(uid: string) {
  db.delete(schema.connectedFiles)
    .where(eq(schema.connectedFiles.uid, uid))
    .run();
}

export function listAiFileActions(taskUid: string): AiFileAction[] {
  return db
    .select()
    .from(schema.aiFileActions)
    .where(eq(schema.aiFileActions.taskUid, taskUid))
    .orderBy(desc(schema.aiFileActions.createdAt))
    .all() as AiFileAction[];
}

export function saveAiFileAction(value: AiFileAction) {
  db.insert(schema.aiFileActions)
    .values(value)
    .onConflictDoUpdate({ target: schema.aiFileActions.uid, set: value })
    .run();
  enqueue(
    "vk_ai_file_actions",
    value.uid,
    value as unknown as Record<string, unknown>,
  );
}
