import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import sensible from "@fastify/sensible";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  CreateProjectSchema,
  CreateAiFileActionSchema,
  CreateConnectedFileFromProviderSchema,
  CreateConnectedFileSchema,
  FigmaPatConnectSchema,
  CreateTaskSchema,
  QueueModeSchema,
  ReviewDecisionSchema,
  type ConnectedFile,
  type NormalizedEvent,
  type Task,
} from "@vk/contracts";
import { config } from "./config.js";
import {
  activeTemplate,
  detachConnectedFile,
  deleteConnectedAccount,
  deleteSessionLocal,
  getConnectedFile,
  getProject,
  getSession,
  getTask,
  listConnectedAccountStatus,
  listAiFileActions,
  listConnectedFiles,
  listDailyLogs,
  listEvents,
  listAllTasks,
  listProjects,
  listSessions,
  listTasks,
  nextTaskNumber,
  saveDailyLog,
  saveConnectedFile,
  saveProject,
  saveReview,
  saveSession,
  saveTask,
  updateSession,
  updateTask,
} from "./db.js";
import {
  connectedProviderConfigStatus,
  connectFigmaPat,
  createAiFileActionWithContext,
  createGoogleWorkspaceFile,
  figmaStartUrl,
  getFigmaFile,
  getGoogleFile,
  googleStartUrl,
  handleFigmaCallback,
  handleGoogleCallback,
  importGoogleWorkspaceFile,
  listGoogleFiles,
  readConnectedFileContext,
  syncConnectedFileMetadata,
} from "./connected-providers.js";
import {
  checkpoint,
  createWorktree,
  discardManagedChanges,
  getDiff,
  inspectProject,
  listDirectories,
  pickFolderNative,
  openInVsCode,
  paginateDiff,
  removeManagedWorktree,
  squashMerge,
} from "./git.js";
import { eventHub } from "./event-hub.js";
import { fallbackBrainstorm, fallbackSmartPrompt } from "./ai-fallback.js";
import { nocoHealth, setupNocoDb, syncOutboxOnce } from "./nocodb.js";
import { openCode } from "./opencode.js";
import { terminals } from "./terminal.js";

const app = Fastify({
  logger: { level: process.env.NODE_ENV === "test" ? "silent" : "info" },
  bodyLimit: 40 * 1024 * 1024,
});

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Origin is not allowed"), false);
  },
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["content-type", "x-vk-local-secret"],
});
await app.register(sensible);
await app.register(websocket);

function isAuthorized(request: {
  headers: Record<string, unknown>;
  query?: unknown;
}) {
  const header = request.headers["x-vk-local-secret"];
  const query = request.query as { token?: string } | undefined;
  return header === config.localSecret || query?.token === config.localSecret;
}

app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") return;
  if (
    request.url.startsWith("/api/connect/google/callback") ||
    request.url.startsWith("/api/connect/figma/callback")
  )
    return;
  const origin = request.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin))
    return reply.code(403).send({ error: "Origin is not allowed" });
  if (!isAuthorized(request))
    return reply.code(401).send({ error: "Invalid local runtime token" });
});

app.get("/health", async () => ({
  ok: true,
  service: "karsadesk-orchestrator",
  noco: nocoHealth(),
}));

app.get("/api/filesystem", async (request) => {
  const query = z.object({ path: z.string().optional() }).parse(request.query);
  return listDirectories(query.path);
});

app.post("/api/filesystem/pick-folder", async () => pickFolderNative());

app.get("/api/opencode/probe", async () => ({ probe: await openCode.probe() }));

app.get("/api/connect/status", async () =>
  listConnectedAccountStatus(connectedProviderConfigStatus()),
);

app.post("/api/connect/google/start", async () => googleStartUrl());

app.get("/api/connect/google/callback", async (request, reply) => {
  const query = z
    .object({
      code: z.string().optional(),
      state: z.string().optional(),
      error: z.string().optional(),
    })
    .parse(request.query);
  return reply.type("text/html").send(await handleGoogleCallback(query));
});

app.post("/api/connect/figma/start", async () => figmaStartUrl());

app.get("/api/connect/figma/callback", async (request, reply) => {
  const query = z
    .object({
      code: z.string().optional(),
      state: z.string().optional(),
      error: z.string().optional(),
    })
    .parse(request.query);
  return reply.type("text/html").send(await handleFigmaCallback(query));
});

app.post("/api/connect/figma/pat", async (request) => {
  const input = z
    .object({ token: z.string().min(10).optional() })
    .parse(request.body || {});
  if (input.token) FigmaPatConnectSchema.parse(input);
  connectFigmaPat(input.token);
  return listConnectedAccountStatus(connectedProviderConfigStatus());
});

app.delete("/api/connect/:provider", async (request) => {
  const { provider } = z
    .object({ provider: z.enum(["google", "figma"]) })
    .parse(request.params);
  deleteConnectedAccount(provider);
  return listConnectedAccountStatus(connectedProviderConfigStatus());
});

app.get("/api/connect/google/files", async (request) => {
  const query = z
    .object({
      q: z.string().default(""),
      type: z.enum(["docs", "sheets", "slides"]).optional(),
    })
    .parse(request.query);
  return { files: await listGoogleFiles(query.q, query.type) };
});

app.post("/api/connect/google/files", async (request, reply) => {
  const input = z
    .object({
      fileType: z.enum(["docs", "sheets", "slides"]),
      title: z.string().min(1),
      prompt: z.string().optional(),
    })
    .parse(request.body);
  return reply.code(201).send(await createGoogleWorkspaceFile(input));
});

app.post("/api/connect/google/import", async (request, reply) => {
  const input = z
    .object({
      fileType: z.enum(["docs", "sheets", "slides"]),
      name: z.string().min(1),
      base64: z.string().min(1),
      mimeType: z.string().optional(),
    })
    .parse(request.body);
  return reply.code(201).send(await importGoogleWorkspaceFile(input));
});

app.post("/api/documents/read", async (request) => {
  const input = z.object({ path: z.string().min(1) }).parse(request.body);
  const resolved = await fs.promises.realpath(path.resolve(input.path));
  const stat = await fs.promises.stat(resolved);
  if (!stat.isFile())
    throw app.httpErrors.badRequest("Selected path is not a file");
  if (stat.size > 25 * 1024 * 1024)
    throw app.httpErrors.badRequest(
      "Document preview supports files up to 25 MB",
    );
  const ext = path.extname(resolved).toLowerCase();
  const allowed = new Set([
    ".docx",
    ".pptx",
    ".xlsx",
    ".csv",
    ".tsv",
    ".md",
    ".txt",
  ]);
  if (!allowed.has(ext))
    throw app.httpErrors.badRequest(
      "Supported documents: .docx, .pptx, .xlsx, .csv, .tsv, .md, .txt",
    );
  const buffer = await fs.promises.readFile(resolved);
  return {
    name: path.basename(resolved),
    size: stat.size,
    base64: buffer.toString("base64"),
  };
});

app.get("/api/projects", async () => listProjects());
app.post("/api/projects", async (request, reply) => {
  const input = CreateProjectSchema.parse(request.body);
  const existing = listProjects().find(
    (project) =>
      path.resolve(project.localPath).toLowerCase() ===
      path.resolve(input.path).toLowerCase(),
  );
  if (existing) return existing;
  const project = await inspectProject(input.path, input.name);
  saveProject(project);
  return reply.code(201).send(project);
});

app.post("/api/projects/:projectUid/refresh", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const project = getProject(projectUid);
  if (!project) throw app.httpErrors.notFound("Project not found");
  const refreshed = await inspectProject(project.localPath, project.name);
  const result = {
    ...refreshed,
    uid: project.uid,
    createdAt: project.createdAt,
    dailyLogMirror: project.dailyLogMirror,
    dailyLogPath: project.dailyLogPath,
  };
  saveProject(result);
  return result;
});

app.get("/api/projects/:projectUid/tasks", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(200).default(60),
      query: z.string().default(""),
    })
    .parse(request.query);
  return listTasks(projectUid, query.page, query.pageSize, query.query);
});

app.post("/api/projects/:projectUid/tasks", async (request, reply) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  if (!getProject(projectUid))
    throw app.httpErrors.notFound("Project not found");
  const input = CreateTaskSchema.parse(request.body);
  const number = nextTaskNumber(projectUid);
  const now = new Date().toISOString();
  const task: Task = {
    uid: randomUUID(),
    projectUid,
    number,
    title: input.title,
    roughPrompt: input.roughPrompt || input.refinedPrompt,
    refinedPrompt: input.refinedPrompt,
    acceptanceCriteria: input.acceptanceCriteria || [],
    verification: input.verification || [],
    dependencyUids: input.dependencyUids || [],
    priority: input.priority || "medium",
    mode: input.mode || "build",
    status: "backlog",
    sortOrder: number * 1000,
    source: input.source || "manual",
    assignedSessionUid: null,
    createdAt: now,
    updatedAt: now,
  };
  saveTask(task);
  void syncOutboxOnce().catch((error) =>
    app.log.warn({ error }, "NocoDB task sync failed"),
  );
  return reply.code(201).send(task);
});

app.patch("/api/tasks/:taskUid", async (request) => {
  const { taskUid } = z
    .object({ taskUid: z.string().uuid() })
    .parse(request.params);
  const input = z
    .object({
      title: z.string().min(1).optional(),
      roughPrompt: z.string().optional(),
      refinedPrompt: z.string().optional(),
      acceptanceCriteria: z.array(z.string()).optional(),
      verification: z.array(z.string()).optional(),
      dependencyUids: z.array(z.string().uuid()).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      mode: z.enum(["plan", "build"]).optional(),
      status: z
        .enum([
          "backlog",
          "ready",
          "running",
          "waiting_approval",
          "review",
          "done",
          "failed",
          "cancelled",
        ])
        .optional(),
      sortOrder: z.number().optional(),
      assignedSessionUid: z.string().uuid().nullable().optional(),
    })
    .parse(request.body);
  const task = updateTask(taskUid, input);
  void syncOutboxOnce().catch((error) =>
    app.log.warn({ error }, "NocoDB task sync failed"),
  );
  return task;
});

function inferConnectedFile(input: {
  externalFileUrl: string;
  provider?: "google" | "figma";
  fileType?: "docs" | "sheets" | "slides" | "figma";
  fileName?: string;
}) {
  const url = new URL(input.externalFileUrl);
  const provider =
    input.provider || (url.hostname.includes("figma.com") ? "figma" : "google");
  const pathParts = url.pathname.split("/").filter(Boolean);
  let fileType = input.fileType;
  let externalFileId = "";
  if (provider === "figma") {
    fileType = "figma";
    const fileIndex = pathParts.findIndex((part) =>
      ["file", "design", "proto", "board"].includes(part),
    );
    externalFileId =
      fileIndex >= 0 ? pathParts[fileIndex + 1] || url.pathname : url.pathname;
  } else {
    if (!fileType) {
      if (url.hostname.includes("docs.google.com")) {
        if (pathParts.includes("spreadsheets")) fileType = "sheets";
        else if (pathParts.includes("presentation")) fileType = "slides";
        else fileType = "docs";
      } else fileType = "docs";
    }
    const marker =
      fileType === "sheets" ? "d" : fileType === "slides" ? "d" : "d";
    const markerIndex = pathParts.findIndex((part) => part === marker);
    externalFileId =
      markerIndex >= 0
        ? pathParts[markerIndex + 1] || url.pathname
        : url.pathname;
  }
  const fileName =
    input.fileName?.trim() ||
    (provider === "figma" ? "Figma file" : `Google ${fileType}`);
  return { provider, fileType: fileType || "docs", externalFileId, fileName };
}

function connectedFileFromProviderResult(
  taskUid: string,
  file: {
    provider: "google" | "figma";
    fileType: "docs" | "sheets" | "slides" | "figma";
    externalFileId: string;
    externalFileUrl: string;
    fileName: string;
    thumbnailUrl: string | null;
    metadata: Record<string, unknown>;
  },
): ConnectedFile {
  const now = new Date().toISOString();
  return {
    uid: randomUUID(),
    taskUid,
    provider: file.provider,
    fileType: file.fileType,
    externalFileId: file.externalFileId,
    externalFileUrl: file.externalFileUrl,
    fileName: file.fileName,
    thumbnailUrl: file.thumbnailUrl,
    metadata: file.metadata,
    status: "synced",
    connectedBy: "local-user",
    createdAt: now,
    updatedAt: now,
  };
}

app.get("/api/tasks/:taskUid/connected-files", async (request) => {
  const { taskUid } = z
    .object({ taskUid: z.string().uuid() })
    .parse(request.params);
  if (!getTask(taskUid)) throw app.httpErrors.notFound("Task not found");
  return {
    files: listConnectedFiles(taskUid),
    actions: listAiFileActions(taskUid),
  };
});

app.post("/api/tasks/:taskUid/connected-files", async (request, reply) => {
  const { taskUid } = z
    .object({ taskUid: z.string().uuid() })
    .parse(request.params);
  if (!getTask(taskUid)) throw app.httpErrors.notFound("Task not found");
  const input = CreateConnectedFileSchema.parse(request.body);
  const inferred = inferConnectedFile(input);
  const now = new Date().toISOString();
  let value: ConnectedFile;
  try {
    const providerFile =
      inferred.provider === "google"
        ? await getGoogleFile(inferred.externalFileId)
        : await getFigmaFile(inferred.externalFileId);
    value = connectedFileFromProviderResult(taskUid, providerFile);
  } catch (error) {
    value = {
      uid: randomUUID(),
      taskUid,
      provider: inferred.provider,
      fileType: inferred.fileType,
      externalFileId: inferred.externalFileId,
      externalFileUrl: input.externalFileUrl,
      fileName: inferred.fileName,
      thumbnailUrl: null,
      metadata: {
        source: "manual-url",
        metadataError: error instanceof Error ? error.message : String(error),
        note: "Connect the provider account to sync metadata and allow AI to read context.",
      },
      status: "not_connected",
      connectedBy: "local-user",
      createdAt: now,
      updatedAt: now,
    };
  }
  saveConnectedFile(value);
  return reply.code(201).send(value);
});

app.post(
  "/api/tasks/:taskUid/connected-files/from-provider",
  async (request, reply) => {
    const { taskUid } = z
      .object({ taskUid: z.string().uuid() })
      .parse(request.params);
    if (!getTask(taskUid)) throw app.httpErrors.notFound("Task not found");
    const input = CreateConnectedFileFromProviderSchema.parse(request.body);
    const providerFile =
      input.provider === "google"
        ? await getGoogleFile(input.externalFileId)
        : await getFigmaFile(input.externalFileId);
    const value = connectedFileFromProviderResult(taskUid, {
      ...providerFile,
      externalFileUrl: input.externalFileUrl || providerFile.externalFileUrl,
      fileName: input.fileName || providerFile.fileName,
      fileType: input.fileType || providerFile.fileType,
    });
    saveConnectedFile(value);
    return reply.code(201).send(value);
  },
);

app.post("/api/connected-files/:fileUid/sync", async (request) => {
  const { fileUid } = z
    .object({ fileUid: z.string().uuid() })
    .parse(request.params);
  const file = getConnectedFile(fileUid);
  if (!file) throw app.httpErrors.notFound("Connected file not found");
  return syncConnectedFileMetadata(file);
});

app.get("/api/connected-files/:fileUid/context", async (request) => {
  const { fileUid } = z
    .object({ fileUid: z.string().uuid() })
    .parse(request.params);
  const file = getConnectedFile(fileUid);
  if (!file) throw app.httpErrors.notFound("Connected file not found");
  return { text: await readConnectedFileContext(file) };
});

app.delete("/api/connected-files/:fileUid", async (request) => {
  const { fileUid } = z
    .object({ fileUid: z.string().uuid() })
    .parse(request.params);
  detachConnectedFile(fileUid);
  return { ok: true };
});

app.post("/api/tasks/:taskUid/ai-file-actions", async (request, reply) => {
  const { taskUid } = z
    .object({ taskUid: z.string().uuid() })
    .parse(request.params);
  const task = getTask(taskUid);
  if (!task) throw app.httpErrors.notFound("Task not found");
  const input = CreateAiFileActionSchema.parse(request.body);
  const file = getConnectedFile(input.connectedFileUid);
  if (!file || file.taskUid !== taskUid)
    throw app.httpErrors.notFound("Connected file not found");
  const action = await createAiFileActionWithContext({
    taskUid,
    file,
    prompt: input.prompt,
    actionType: input.actionType || "plan",
    applyMode: input.applyMode,
  });
  return reply.code(201).send(action);
});

app.get("/api/projects/:projectUid/opencode", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const project = getProject(projectUid);
  if (!project) throw app.httpErrors.notFound("Project not found");
  const probe = await openCode.probe();
  if (!probe.installed) return { probe, providers: [] };
  return { probe, providers: await openCode.discover(project.localPath) };
});

async function smartPromptContext(projectUid: string) {
  const project = getProject(projectUid);
  if (!project) return "Project not found.";
  const lines: string[] = [];
  lines.push(
    project.memoryFiles.length
      ? `Project memory files: ${project.memoryFiles.join(", ")}.`
      : "No standard project memory files were detected.",
  );
  const existingTasks = listAllTasks(projectUid);
  lines.push(
    existingTasks.length
      ? `Existing KarsaDesk tasks: ${existingTasks
          .slice(0, 20)
          .map((task) => `KD-${task.number} [${task.status}] ${task.title}`)
          .join(
            "; ",
          )}${existingTasks.length > 20 ? `; ... ${existingTasks.length - 20} more` : ""}.`
      : "Existing KarsaDesk tasks: none.",
  );
  const tmpKanbanDir = path.join(
    project.localPath,
    "docs/ai/tmp-kanban-prompts",
  );
  try {
    const entries = await fs.promises.readdir(tmpKanbanDir, {
      withFileTypes: true,
    });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
    lines.push(
      files.length
        ? `Existing tmp-kanban prompt files (${files.length}): ${files.slice(0, 30).join(", ")}${files.length > 30 ? `, ... ${files.length - 30} more` : ""}.`
        : "Existing tmp-kanban prompt files: none.",
    );
  } catch {
    lines.push("Existing tmp-kanban prompt files: directory not found.");
  }
  return lines.join("\n");
}

app.post("/api/projects/:projectUid/smart-prompt", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const input = z
    .object({
      roughPrompt: z.string().min(10),
      providerId: optionalNonEmptyString,
      modelId: optionalNonEmptyString,
      promptProfile: z
        .enum(["coding", "docs", "figma", "general"])
        .default("coding"),
      customTuning: optionalNonEmptyString,
    })
    .parse(request.body);
  const project = getProject(projectUid);
  if (!project) throw app.httpErrors.notFound("Project not found");
  const context = await smartPromptContext(projectUid);
  const profileGuide = [
    `Smart Prompt profile: ${input.promptProfile}.`,
    input.promptProfile === "docs"
      ? "Prioritize Google Docs/Slides/Sheets workflows: structure, outline, references, tables, slide sections, editable review, and clear file-action tasks."
      : "",
    input.promptProfile === "figma"
      ? "Prioritize Figma design workflows: frames, components, layout, design review, handoff notes, and visual acceptance criteria."
      : "",
    input.promptProfile === "general"
      ? "Prioritize clear problem-solving tasks without assuming the work is code-only."
      : "",
    input.customTuning
      ? `User custom tuning:\n${input.customTuning}`
      : "User custom tuning: none.",
  ]
    .filter(Boolean)
    .join("\n");
  const prompt = `${activeTemplate()}\n\n${profileGuide}\n\n${context}\n\nRough request:\n${input.roughPrompt}`;
  if (!input.providerId || !input.modelId) {
    return fallbackSmartPrompt(
      `${profileGuide}\n\n${input.roughPrompt}`,
      "No provider/model selected for Smart Prompt.",
    );
  }
  try {
    return await openCode.generatePlan(
      project.localPath,
      input.providerId,
      input.modelId,
      prompt,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    app.log.warn({ error: message }, "Smart prompt fell back to local planner");
    return fallbackSmartPrompt(
      `${profileGuide}\n\n${input.roughPrompt}`,
      message,
    );
  }
});

app.post("/api/projects/:projectUid/ai-chat", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const input = z
    .object({
      message: z.string().min(2),
      providerId: z.string().optional(),
      modelId: z.string().optional(),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        )
        .default([]),
    })
    .parse(request.body);
  const project = getProject(projectUid);
  if (!project) throw app.httpErrors.notFound("Project not found");
  const context = project.memoryFiles.length
    ? `Project memory files: ${project.memoryFiles.join(", ")}.`
    : "No standard project memory files were detected.";
  const prompt = [
    "You are KarsaDesk's brainstorming assistant inside a local kanban.",
    "Help the user clarify ideas, test prompts, split work, and decide whether something should become tasks.",
    "Do not modify files. Keep the answer practical and concise.",
    context,
    "",
    "Recent conversation:",
    ...input.history.slice(-8).map((item) => `${item.role}: ${item.content}`),
    "",
    `User: ${input.message}`,
  ].join("\n");
  if (!input.providerId || !input.modelId) {
    return {
      message: fallbackBrainstorm(
        input.message,
        "No provider/model selected for AI chat.",
      ),
      fallback: true,
    };
  }
  try {
    const message = await openCode.brainstorm(
      project.localPath,
      input.providerId,
      input.modelId,
      prompt,
    );
    return { message, fallback: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    app.log.warn({ error: reason }, "AI chat fell back to local response");
    return {
      message: fallbackBrainstorm(input.message, reason),
      fallback: true,
    };
  }
});

app.get("/api/projects/:projectUid/sessions", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  return listSessions(projectUid);
});

app.post("/api/projects/:projectUid/sessions", async (request, reply) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const input = z
    .object({
      name: z.string().min(1),
      providerId: z.string().min(1),
      modelId: z.string().min(1),
      agentMode: z.enum(["plan", "build"]).default("build"),
      permissionMode: z.enum(["supervised", "auto"]).default("supervised"),
      targetBranch: z.string().min(1),
    })
    .parse(request.body);
  const project = getProject(projectUid);
  if (!project) throw app.httpErrors.notFound("Project not found");
  const session = await createWorktree(project, {
    sessionUid: randomUUID(),
    ...input,
  });
  saveSession(session);
  void syncOutboxOnce().catch((error) =>
    app.log.warn({ error }, "NocoDB session sync failed"),
  );
  return reply.code(201).send(session);
});

app.post("/api/projects/:projectUid/open-vscode", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const project = getProject(projectUid);
  if (!project) throw app.httpErrors.notFound("Project not found");
  openInVsCode(project.localPath);
  return { ok: true };
});

app.post("/api/sessions/:sessionUid/open-vscode", async (request) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  openInVsCode(session.worktreePath);
  return { ok: true };
});

app.patch("/api/sessions/:sessionUid", async (request) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const input = z
    .object({
      providerId: optionalNonEmptyString,
      modelId: optionalNonEmptyString,
      agentMode: z.enum(["plan", "build"]).optional(),
      permissionMode: z.enum(["supervised", "auto"]).optional(),
      reviewGate: z.enum(["each_task", "batch_end"]).optional(),
    })
    .parse(request.body);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  if (["running", "starting"].includes(session.status))
    throw app.httpErrors.conflict("Pause the session before changing AI/model");
  const updated = updateSession(sessionUid, input);
  void syncOutboxOnce().catch((error) =>
    app.log.warn({ error }, "NocoDB session sync failed"),
  );
  return updated;
});

app.delete("/api/sessions/:sessionUid", async (request) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  if (["running", "starting"].includes(session.status))
    await openCode.cancel(session);
  await openCode.stop(sessionUid);
  terminals.stop(sessionUid);
  const project = getProject(session.projectUid);
  if (!project) throw app.httpErrors.notFound("Project not found");
  if (fs.existsSync(session.worktreePath))
    await removeManagedWorktree(project, session);
  deleteSessionLocal(sessionUid);
  return { ok: true };
});

app.get("/api/sessions/:sessionUid/events", async (request) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(250).default(100),
    })
    .parse(request.query);
  return listEvents(sessionUid, query.page, query.pageSize);
});

function publish(
  sessionUid: string,
  taskUid: string | null,
  type: NormalizedEvent["type"],
  title: string,
  body: string,
  metadata: Record<string, unknown> = {},
) {
  eventHub.publish({
    uid: randomUUID(),
    sessionUid,
    taskUid,
    type,
    title,
    body,
    metadata,
    createdAt: new Date().toISOString(),
  });
}

async function writeDailyLog(
  projectUid: string,
  sessionUid: string,
  task: Task,
  result: string,
) {
  const project = getProject(projectUid);
  const session = getSession(sessionUid);
  if (!project || !session) return;
  const diff = await getDiff(session);
  const uid = randomUUID();
  const date = new Date().toISOString().slice(0, 10);
  const value = {
    uid,
    projectUid,
    sessionUid,
    taskUid: task.uid,
    date,
    prompt: task.refinedPrompt,
    plan:
      task.mode === "plan"
        ? result
        : "Executed the approved task prompt in the active OpenCode session.",
    changedFiles: diff.files.map((file) => file.path),
    verification: task.verification,
    result,
    status: "done",
    blockers: "",
    nextSteps:
      "Review the session diff and approve, request changes, or reject.",
    mirroredAt: null as string | null,
    createdAt: new Date().toISOString(),
  };
  if (project.dailyLogMirror) {
    const relative = project.dailyLogPath.replace("YYYY-MM-DD", date);
    const file = path.join(session.worktreePath, relative);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    const marker = `<!-- vk-log:${uid} -->`;
    const current = fs.existsSync(file)
      ? await fs.promises.readFile(file, "utf8")
      : `# Daily Log — ${date}\n`;
    if (!current.includes(marker)) {
      const block = `\n---\n\n## Kanban Task ${task.number} — ${task.title}\n${marker}\n\n### Prompt\n${task.refinedPrompt}\n\n### Plan\n${value.plan}\n\n### Changed Files\n${value.changedFiles.length ? value.changedFiles.map((item) => `- ${item}`).join("\n") : "- No file changes"}\n\n### Verification\n${value.verification.length ? value.verification.map((item) => `- ${item}`).join("\n") : "- Not recorded"}\n\n### Result\n${result}\n\n### Status\ndone\n\n### Blockers and Next Steps\nReview and merge the session diff.\n`;
      await fs.promises.writeFile(file, `${current.trimEnd()}${block}`, "utf8");
      value.mirroredAt = new Date().toISOString();
    }
  }
  saveDailyLog(value);
}

async function runBatch(sessionUid: string) {
  let session = getSession(sessionUid);
  if (!session) return;
  const taskUids = [...session.pendingTaskUids];
  updateSession(sessionUid, { status: "running" });
  publish(
    sessionUid,
    null,
    "session.status",
    "Batch started",
    `${taskUids.length} task(s) queued`,
  );
  for (const taskUid of taskUids) {
    const task = getTask(taskUid);
    session = getSession(sessionUid);
    if (!task || !session) continue;
    updateSession(sessionUid, {
      pendingTaskUids: session.pendingTaskUids.filter((uid) => uid !== taskUid),
    });
    const blocked = task.dependencyUids.some((dependencyUid) => {
      const dependency = getTask(dependencyUid);
      return dependency && !["done", "review"].includes(dependency.status);
    });
    if (blocked) {
      updateTask(task.uid, { status: "failed" });
      updateSession(sessionUid, { status: "paused", activeTaskUid: task.uid });
      publish(
        sessionUid,
        task.uid,
        "error",
        "Dependency blocked",
        "A required task has not completed",
      );
      return;
    }
    updateTask(task.uid, { status: "running", assignedSessionUid: sessionUid });
    updateSession(sessionUid, { status: "running", activeTaskUid: task.uid });
    publish(
      sessionUid,
      task.uid,
      "session.status",
      `Task ${task.number} started`,
      task.title,
    );
    const prompt = `${task.refinedPrompt}\n\nAcceptance criteria:\n${task.acceptanceCriteria.map((item) => `- ${item}`).join("\n") || "- Follow the task exactly."}\n\nVerification:\n${task.verification.map((item) => `- ${item}`).join("\n") || "- Run proportionate verification."}`;
    try {
      publish(
        sessionUid,
        task.uid,
        "tool.start",
        "Preparing task prompt",
        [
          `Mode: ${task.mode}`,
          `Acceptance criteria: ${task.acceptanceCriteria.length || 1}`,
          `Verification steps: ${task.verification.length || 1}`,
        ].join("\n"),
        { stage: "prepare_prompt" },
      );
      publish(
        sessionUid,
        task.uid,
        "tool.start",
        "OpenCode agent running",
        "Streaming normalized OpenCode events into the session console",
        {
          stage: "agent_running",
          providerId: session.providerId,
          modelId: session.modelId,
        },
      );
      const response = await openCode.send(session, task, prompt, (event) =>
        eventHub.publish(event),
      );
      publish(
        sessionUid,
        task.uid,
        "tool.result",
        "OpenCode response captured",
        response.text
          ? `${response.text.length} chars returned by the agent`
          : "OpenCode completed without a text summary",
        { stage: "agent_response" },
      );
      publish(
        sessionUid,
        task.uid,
        "tool.start",
        "Writing daily log and checkpoint",
        "Capturing result, changed files, and creating a review checkpoint",
        { stage: "checkpoint" },
      );
      await writeDailyLog(
        task.projectUid,
        sessionUid,
        task,
        response.text || "OpenCode completed the task.",
      );
      session = getSession(sessionUid)!;
      await checkpoint(session, task.number, task.title);
      updateTask(task.uid, { status: "review" });
      publish(
        sessionUid,
        task.uid,
        "tool.result",
        "Checkpoint ready",
        "Task result is ready for diff review",
        { stage: "review_ready" },
      );
      publish(
        sessionUid,
        task.uid,
        "process.exit",
        `Task ${task.number} completed`,
        "Checkpoint created",
        { exitCode: 0 },
      );
      session = getSession(sessionUid)!;
      if (
        session.reviewGate === "each_task" &&
        session.pendingTaskUids.length > 0
      ) {
        updateSession(sessionUid, {
          status: "review",
          activeTaskUid: task.uid,
        });
        publish(
          sessionUid,
          task.uid,
          "session.status",
          "Manual review required",
          `${session.pendingTaskUids.length} task(s) remain in this queue`,
        );
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateTask(task.uid, { status: "failed" });
      updateSession(sessionUid, { status: "paused", activeTaskUid: task.uid });
      publish(
        sessionUid,
        task.uid,
        "error",
        `Task ${task.number} failed`,
        message,
      );
      return;
    }
  }
  updateSession(sessionUid, { status: "review", activeTaskUid: null });
  publish(
    sessionUid,
    null,
    "session.status",
    "Batch ready for review",
    "Inspect the aggregate diff before merging",
  );
}

app.post("/api/sessions/:sessionUid/run", async (request, reply) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const input = z
    .object({
      mode: QueueModeSchema,
      taskUids: z.array(z.string().uuid()).default([]),
      reviewGate: z.enum(["each_task", "batch_end"]).default("batch_end"),
    })
    .parse(request.body);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  if (["running", "starting"].includes(session.status))
    return reply.code(409).send({ error: "Session is already running" });
  let taskUids = input.taskUids;
  const runnableStatuses = new Set(["backlog", "ready", "failed"]);
  const ready = listAllTasks(session.projectUid).filter((task) =>
    runnableStatuses.has(task.status),
  );
  if (input.mode === "next")
    taskUids = ready.slice(0, 1).map((task) => task.uid);
  if (input.mode === "all") taskUids = ready.map((task) => task.uid);
  if (!taskUids.length)
    return reply
      .code(400)
      .send({ error: "No runnable tasks found. Add or select a task first." });
  const tasksByUid = new Map(
    listAllTasks(session.projectUid).map((task) => [task.uid, task]),
  );
  for (const uid of taskUids) {
    const task = tasksByUid.get(uid);
    if (!task)
      return reply.code(400).send({ error: `Task ${uid} was not found` });
    if (task.projectUid !== session.projectUid)
      return reply.code(400).send({ error: "Task belongs to another project" });
    if (["running", "waiting_approval", "done"].includes(task.status))
      return reply.code(409).send({
        error: `Task KD-${task.number} is ${task.status} and cannot be queued`,
      });
  }
  for (const uid of taskUids)
    updateTask(uid, { assignedSessionUid: sessionUid, status: "ready" });
  updateSession(sessionUid, {
    pendingTaskUids: taskUids,
    reviewGate: input.reviewGate,
    status: "starting",
  });
  void runBatch(sessionUid);
  return reply.code(202).send({ accepted: true, taskUids });
});

app.post("/api/sessions/:sessionUid/continue", async (request, reply) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  if (
    !["review", "paused"].includes(session.status) ||
    !session.pendingTaskUids.length
  )
    return reply
      .code(409)
      .send({ error: "No paused or reviewed queue is waiting to continue" });
  updateSession(sessionUid, { status: "starting", activeTaskUid: null });
  void runBatch(sessionUid);
  return reply
    .code(202)
    .send({ accepted: true, remaining: session.pendingTaskUids.length });
});

app.post("/api/sessions/:sessionUid/cancel", async (request) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  await openCode.cancel(session);
  updateSession(sessionUid, { status: "paused" });
  publish(
    sessionUid,
    session.activeTaskUid,
    "session.status",
    "Session paused",
    "The active OpenCode request was cancelled",
  );
  return { ok: true };
});

app.post("/api/sessions/:sessionUid/discard", async (request) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  await discardManagedChanges(session);
  if (session.activeTaskUid)
    updateTask(session.activeTaskUid, { status: "cancelled" });
  updateSession(sessionUid, { status: "paused", activeTaskUid: null });
  return { ok: true };
});

app.post(
  "/api/sessions/:sessionUid/permissions/:permissionId",
  async (request) => {
    const { sessionUid, permissionId } = z
      .object({ sessionUid: z.string().uuid(), permissionId: z.string() })
      .parse(request.params);
    const input = z
      .object({ response: z.enum(["once", "always", "reject"]) })
      .parse(request.body);
    const session = getSession(sessionUid);
    if (!session) throw app.httpErrors.notFound("Session not found");
    await openCode.respondPermission(session, permissionId, input.response);
    publish(
      sessionUid,
      session.activeTaskUid,
      "permission.resolved",
      "Permission resolved",
      input.response,
      { permissionId },
    );
    return { ok: true };
  },
);

app.get("/api/sessions/:sessionUid/diff", async (request) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(5000).default(1200),
      file: z.string().optional(),
    })
    .parse(request.query);
  return paginateDiff(
    await getDiff(session),
    query.page,
    query.pageSize,
    query.file,
  );
});

app.post("/api/sessions/:sessionUid/review", async (request, reply) => {
  const { sessionUid } = z
    .object({ sessionUid: z.string().uuid() })
    .parse(request.params);
  const input = z
    .object({
      decision: ReviewDecisionSchema,
      action: z.enum(["continue", "merge"]).default("merge"),
      summary: z.string().default(""),
      comments: z
        .array(
          z.object({
            path: z.string(),
            line: z.number().optional(),
            body: z.string(),
          }),
        )
        .default([]),
      diffHash: z.string(),
    })
    .parse(request.body);
  let session = getSession(sessionUid);
  if (!session) throw app.httpErrors.notFound("Session not found");
  const currentDiff = await getDiff(session);
  if (currentDiff.hash !== input.diffHash)
    return reply.code(409).send({
      error: "The diff changed; review the latest version before deciding",
      diffHash: currentDiff.hash,
    });
  saveReview({
    uid: randomUUID(),
    sessionUid,
    taskUid: session.activeTaskUid,
    decision: input.decision,
    summary: input.summary,
    comments: input.comments,
    diffHash: input.diffHash,
    createdAt: new Date().toISOString(),
  });
  if (input.decision === "request_changes") {
    const feedback = `Address this review feedback without discarding unrelated valid work:\n${input.summary}\n${input.comments.map((comment) => `- ${comment.path}${comment.line ? `:${comment.line}` : ""}: ${comment.body}`).join("\n")}`;
    updateSession(sessionUid, { status: "running" });
    void openCode
      .send(session, null, feedback, (event) => eventHub.publish(event))
      .then(async () => {
        session = getSession(sessionUid)!;
        await checkpoint(session, 0, "review feedback");
        updateSession(sessionUid, { status: "review" });
      })
      .catch((error) => {
        updateSession(sessionUid, { status: "paused" });
        publish(
          sessionUid,
          null,
          "error",
          "Review follow-up failed",
          error instanceof Error ? error.message : String(error),
        );
      });
    return { accepted: true };
  }
  if (input.decision === "reject") {
    updateSession(sessionUid, { status: "paused" });
    return { accepted: true };
  }
  if (input.action === "continue") {
    if (!session.pendingTaskUids.length)
      return reply
        .code(409)
        .send({ error: "No queued task remains; use final merge instead" });
    updateSession(sessionUid, { status: "starting", activeTaskUid: null });
    void runBatch(sessionUid);
    return {
      accepted: true,
      continuing: true,
      remaining: session.pendingTaskUids.length,
    };
  }
  const project = getProject(session.projectUid)!;
  const head = await squashMerge(
    project,
    session,
    input.summary || `Merge ${session.name}`,
  );
  for (const task of listAllTasks(session.projectUid).filter(
    (item) =>
      item.assignedSessionUid === sessionUid && item.status === "review",
  ))
    updateTask(task.uid, { status: "done" });
  updateSession(sessionUid, {
    status: "idle",
    baseCommit: head,
    activeTaskUid: null,
    pendingTaskUids: [],
  });
  publish(sessionUid, null, "session.status", "Changes merged", head, { head });
  return { accepted: true, head };
});

app.get("/api/projects/:projectUid/daily-logs", async (request) => {
  const { projectUid } = z
    .object({ projectUid: z.string().uuid() })
    .parse(request.params);
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(30),
    })
    .parse(request.query);
  return listDailyLogs(projectUid, query.page, query.pageSize);
});

app.get("/api/nocodb/status", async () => nocoHealth());
app.post("/api/nocodb/setup", async () => setupNocoDb());
app.post("/api/nocodb/sync", async () => syncOutboxOnce());
app.post("/api/nocodb/sync-all", async () => {
  for (const project of listProjects()) {
    saveProject(project);
    for (const task of listAllTasks(project.uid)) saveTask(task);
    for (const session of listSessions(project.uid)) saveSession(session);
    for (const log of listDailyLogs(project.uid, 1, 500).items)
      saveDailyLog(log);
  }
  return syncOutboxOnce();
});

app.get("/ws/events", { websocket: true }, (socket, request) => {
  const query = z
    .object({ sessionUid: z.string().uuid(), token: z.string() })
    .parse(request.query);
  eventHub.subscribe(query.sessionUid, socket);
});

app.get("/ws/terminal", { websocket: true }, (socket, request) => {
  const query = z
    .object({ sessionUid: z.string().uuid(), token: z.string() })
    .parse(request.query);
  terminals.attach(query.sessionUid, socket);
});

app.setErrorHandler((error, _request, reply) => {
  const status =
    (error as { statusCode?: number }).statusCode ||
    (error instanceof z.ZodError ? 400 : 500);
  reply.code(status).send({
    error: error instanceof Error ? error.message : String(error),
    details: error instanceof z.ZodError ? error.issues : undefined,
  });
});

setInterval(
  () =>
    void syncOutboxOnce().catch((error) =>
      app.log.warn({ error }, "NocoDB sync failed"),
    ),
  15_000,
).unref();

const shutdown = async () => {
  for (const project of listProjects())
    for (const session of listSessions(project.uid)) {
      await openCode.stop(session.uid);
      terminals.stop(session.uid);
    }
  await app.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: config.host, port: config.port });
