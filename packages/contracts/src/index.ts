import { z } from "zod";

export const taskStatuses = [
  "backlog",
  "ready",
  "running",
  "waiting_approval",
  "review",
  "done",
  "failed",
  "cancelled",
] as const;
export const sessionStatuses = [
  "idle",
  "starting",
  "running",
  "paused",
  "review",
  "blocked",
  "stopped",
  "completed",
] as const;

export const TaskStatusSchema = z.enum(taskStatuses);
export const SessionStatusSchema = z.enum(sessionStatuses);
export const AgentModeSchema = z.enum(["plan", "build"]);
export const PermissionModeSchema = z.enum(["supervised", "auto"]);
export const QueueModeSchema = z.enum(["next", "selected", "all"]);
export const ReviewDecisionSchema = z.enum([
  "approve",
  "request_changes",
  "reject",
]);

export const ProjectSchema = z.object({
  uid: z.string().uuid(),
  name: z.string().min(1),
  localPath: z.string(),
  repoFingerprint: z.string(),
  remoteUrl: z.string().nullable(),
  defaultBranch: z.string(),
  currentBranch: z.string(),
  isGit: z.boolean(),
  isClean: z.boolean(),
  memoryFiles: z.array(z.string()),
  dailyLogMirror: z.boolean(),
  dailyLogPath: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TaskSchema = z.object({
  uid: z.string().uuid(),
  projectUid: z.string().uuid(),
  number: z.number().int().positive(),
  title: z.string().min(1),
  roughPrompt: z.string(),
  refinedPrompt: z.string(),
  acceptanceCriteria: z.array(z.string()),
  verification: z.array(z.string()),
  dependencyUids: z.array(z.string().uuid()),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  mode: AgentModeSchema,
  status: TaskStatusSchema,
  sortOrder: z.number(),
  source: z.enum(["manual", "ai"]),
  assignedSessionUid: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SessionSchema = z.object({
  uid: z.string().uuid(),
  projectUid: z.string().uuid(),
  name: z.string(),
  cliId: z.literal("opencode"),
  providerId: z.string(),
  modelId: z.string(),
  agentMode: AgentModeSchema,
  permissionMode: PermissionModeSchema,
  targetBranch: z.string(),
  baseCommit: z.string(),
  branch: z.string(),
  worktreePath: z.string(),
  opencodeSessionId: z.string().nullable(),
  status: SessionStatusSchema,
  activeTaskUid: z.string().uuid().nullable(),
  pendingTaskUids: z.array(z.string().uuid()),
  reviewGate: z.enum(["each_task", "batch_end"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CliProbeSchema = z.object({
  installed: z.boolean(),
  path: z.string().nullable(),
  version: z.string().nullable(),
  error: z.string().nullable(),
});

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  providerId: z.string(),
  reasoning: z.boolean().default(false),
  attachment: z.boolean().default(false),
});

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  connected: z.boolean(),
  models: z.array(ModelSchema),
});

export const ConnectedProviderSchema = z.enum(["google", "figma"]);
export const ConnectedFileTypeSchema = z.enum([
  "docs",
  "sheets",
  "slides",
  "figma",
]);
export const ConnectedAccountStatusSchema = z.enum([
  "not_configured",
  "not_connected",
  "connected",
  "token_expired",
  "missing_permission",
  "error",
]);

export const ConnectedAccountPublicSchema = z.object({
  provider: ConnectedProviderSchema,
  status: ConnectedAccountStatusSchema,
  configured: z.boolean(),
  connected: z.boolean(),
  scopes: z.array(z.string()),
  expiresAt: z.string().nullable(),
  accountLabel: z.string().nullable(),
  updatedAt: z.string().nullable(),
  message: z.string().nullable(),
});

export const ConnectedFileSchema = z.object({
  uid: z.string().uuid(),
  taskUid: z.string().uuid(),
  provider: ConnectedProviderSchema,
  fileType: ConnectedFileTypeSchema,
  externalFileId: z.string(),
  externalFileUrl: z.string().url(),
  fileName: z.string(),
  thumbnailUrl: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  status: z.enum([
    "not_connected",
    "connected",
    "token_expired",
    "missing_permission",
    "inaccessible",
    "synced",
  ]),
  connectedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AiFileActionSchema = z.object({
  uid: z.string().uuid(),
  taskUid: z.string().uuid(),
  connectedFileUid: z.string().uuid(),
  userId: z.string(),
  prompt: z.string(),
  actionType: z.string(),
  status: z.enum([
    "pending",
    "running",
    "needs_confirmation",
    "success",
    "failed",
  ]),
  resultSummary: z.string(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateConnectedFileSchema = ConnectedFileSchema.pick({
  provider: true,
  fileType: true,
  externalFileUrl: true,
  fileName: true,
}).partial({
  provider: true,
  fileType: true,
  fileName: true,
});

export const ConnectedProviderFileSchema = z.object({
  provider: ConnectedProviderSchema,
  fileType: ConnectedFileTypeSchema,
  externalFileId: z.string(),
  externalFileUrl: z.string().url(),
  fileName: z.string(),
  thumbnailUrl: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  status: z.string().default("synced"),
});

export const ConnectAccountStartSchema = z.object({
  provider: ConnectedProviderSchema,
  configured: z.boolean(),
  url: z.string().url().nullable(),
  message: z.string(),
});

export const FigmaPatConnectSchema = z.object({
  token: z.string().min(10),
});

export const CreateConnectedFileFromProviderSchema = z.object({
  provider: ConnectedProviderSchema,
  externalFileId: z.string().min(1),
  externalFileUrl: z.string().url().optional(),
  fileType: ConnectedFileTypeSchema.optional(),
  fileName: z.string().optional(),
});

export const CreateAiFileActionSchema = z.object({
  connectedFileUid: z.string().uuid(),
  prompt: z.string().min(3),
  actionType: z.string().default("plan"),
  applyMode: z.enum(["preview", "auto_apply"]).default("preview"),
});

export const NormalizedEventSchema = z.object({
  uid: z.string().uuid(),
  sessionUid: z.string().uuid(),
  taskUid: z.string().uuid().nullable(),
  type: z.enum([
    "session.status",
    "assistant.message",
    "tool.start",
    "tool.result",
    "permission.request",
    "permission.resolved",
    "process.output",
    "process.exit",
    "error",
  ]),
  title: z.string(),
  body: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});

export const SmartTaskDraftSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  mode: AgentModeSchema.default("build"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  acceptanceCriteria: z.array(z.string()).default([]),
  verification: z.array(z.string()).default([]),
  dependsOn: z.array(z.number().int().nonnegative()).default([]),
});

export const SmartPromptResultSchema = z.object({
  summary: z.string(),
  tasks: z.array(SmartTaskDraftSchema).min(1),
});

export const CreateProjectSchema = z.object({
  path: z.string().min(1),
  name: z.string().optional(),
});
export const CreateTaskSchema = TaskSchema.pick({
  title: true,
  roughPrompt: true,
  refinedPrompt: true,
  acceptanceCriteria: true,
  verification: true,
  dependencyUids: true,
  priority: true,
  mode: true,
  source: true,
}).partial({
  roughPrompt: true,
  acceptanceCriteria: true,
  verification: true,
  dependencyUids: true,
  priority: true,
  mode: true,
  source: true,
});

export type Project = z.infer<typeof ProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CliProbe = z.infer<typeof CliProbeSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type ConnectedAccountPublic = z.infer<
  typeof ConnectedAccountPublicSchema
>;
export type ConnectedFile = z.infer<typeof ConnectedFileSchema>;
export type ConnectedProviderFile = z.infer<typeof ConnectedProviderFileSchema>;
export type AiFileAction = z.infer<typeof AiFileActionSchema>;
export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;
export type SmartPromptResult = z.infer<typeof SmartPromptResultSchema>;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};
