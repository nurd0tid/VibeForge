import { randomUUID, randomBytes } from "node:crypto";
import spawn from "cross-spawn";
import type { ChildProcess } from "node:child_process";
import { createOpencodeClient } from "@opencode-ai/sdk";
import type {
  CliProbe,
  NormalizedEvent,
  Provider,
  Session,
  SmartPromptResult,
  Task,
} from "@vk/contracts";
import { SmartPromptResultSchema } from "@vk/contracts";
import { config } from "./config.js";
import { updateSession } from "./db.js";

type Client = ReturnType<typeof createOpencodeClient>;
type Runtime = {
  process: ChildProcess;
  client: Client;
  baseUrl: string;
  password: string;
  eventAbort: AbortController;
};
type Emit = (event: NormalizedEvent) => void;

class OpenCodeTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenCodeTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new OpenCodeTimeoutError(
          `${label} timed out after ${Math.round(config.aiRequestTimeoutMs / 1000)} seconds`,
        ),
      );
    }, config.aiRequestTimeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface CliAdapter {
  probe(): Promise<CliProbe>;
  discover(projectPath: string): Promise<Provider[]>;
  send(
    session: Session,
    task: Task | null,
    prompt: string,
    emit: Emit,
  ): Promise<{ text: string; opencodeSessionId: string }>;
  cancel(session: Session): Promise<void>;
  stop(sessionUid: string): Promise<void>;
  respondPermission(
    session: Session,
    permissionId: string,
    response: "once" | "always" | "reject",
  ): Promise<void>;
}

function collect(proc: ChildProcess) {
  return new Promise<{ stdout: string; stderr: string; code: number }>(
    (resolve, reject) => {
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (value) => (stdout += value.toString()));
      proc.stderr?.on("data", (value) => (stderr += value.toString()));
      proc.on("error", reject);
      proc.on("close", (code) =>
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: code ?? 1,
        }),
      );
    },
  );
}

function basic(password: string) {
  return `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`;
}

export class OpenCodeAdapter implements CliAdapter {
  private runtimes = new Map<string, Runtime>();

  async probe(): Promise<CliProbe> {
    try {
      const proc = spawn(config.opencodeBin, ["--version"], {
        windowsHide: true,
      });
      const result = await collect(proc);
      if (result.code !== 0)
        throw new Error(result.stderr || "OpenCode exited with an error");
      return {
        installed: true,
        path: config.opencodeBin,
        version: result.stdout.split(/\r?\n/)[0] || null,
        error: null,
      };
    } catch (error) {
      return {
        installed: false,
        path: null,
        version: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async startServer(
    directory: string,
    autoApprove: boolean,
  ): Promise<Runtime> {
    const password = randomBytes(24).toString("hex");
    const args = ["serve", "--hostname", "127.0.0.1", "--port", "0"];
    const process = spawn(config.opencodeBin, args, {
      cwd: directory,
      windowsHide: true,
      env: {
        ...globalThis.process.env,
        OPENCODE_SERVER_USERNAME: "opencode",
        OPENCODE_SERVER_PASSWORD: password,
        OPENCODE_CONFIG_CONTENT: JSON.stringify(
          autoApprove ? { permission: "allow" } : {},
        ),
      },
    });
    const baseUrl = await new Promise<string>((resolve, reject) => {
      let output = "";
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              `OpenCode server startup timed out. ${output.slice(-600)}`,
            ),
          ),
        60_000,
      );
      const inspect = (chunk: Buffer) => {
        output += chunk.toString();
        const match = output.match(
          /opencode server listening on\s+(https?:\/\/[^\s]+)/i,
        );
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      };
      process.stdout?.on("data", inspect);
      process.stderr?.on("data", inspect);
      process.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      process.on("exit", (code) => {
        if (!output.match(/opencode server listening/i)) {
          clearTimeout(timer);
          reject(
            new Error(
              `OpenCode server exited (${code}). ${output.slice(-600)}`,
            ),
          );
        }
      });
    });
    const client = createOpencodeClient({
      baseUrl,
      directory,
      headers: { Authorization: basic(password) },
    });
    return {
      process,
      client,
      baseUrl,
      password,
      eventAbort: new AbortController(),
    };
  }

  async discover(projectPath: string): Promise<Provider[]> {
    const runtime = await this.startServer(projectPath, false);
    try {
      const response = await runtime.client.provider.list();
      if (response.error) throw new Error(JSON.stringify(response.error));
      const data = response.data as unknown as {
        all: Array<{
          id: string;
          name: string;
          models: Record<
            string,
            {
              id: string;
              name: string;
              reasoning?: boolean;
              attachment?: boolean;
            }
          >;
        }>;
        connected: string[];
      };
      const connected = new Set(data.connected || []);
      return (data.all || [])
        .filter((provider) => connected.has(provider.id))
        .map((provider) => ({
          id: provider.id,
          name: provider.name,
          connected: true,
          models: Object.values(provider.models || {}).map((model) => ({
            id: model.id,
            name: model.name,
            providerId: provider.id,
            reasoning: Boolean(model.reasoning),
            attachment: Boolean(model.attachment),
          })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } finally {
      runtime.eventAbort.abort();
      runtime.process.kill();
    }
  }

  private normalize(
    raw: unknown,
    session: Session,
    task: Task | null,
  ): NormalizedEvent | null {
    const event = raw as {
      type?: string;
      properties?: Record<string, unknown>;
    };
    const type = event.type || "";
    const props = event.properties || {};
    const eventSessionId = String(
      props.sessionID ||
        (props.part as { sessionID?: string } | undefined)?.sessionID ||
        "",
    );
    if (
      session.opencodeSessionId &&
      eventSessionId &&
      eventSessionId !== session.opencodeSessionId
    )
      return null;
    let normalizedType: NormalizedEvent["type"] = "process.output";
    let title = type || "OpenCode event";
    let body = "";
    if (
      type.includes("permission") &&
      (type.includes("asked") || type.includes("updated"))
    ) {
      normalizedType = "permission.request";
      title = String(
        (props.permission as { title?: string } | undefined)?.title ||
          props.permission ||
          "Permission required",
      );
      body = JSON.stringify(props);
    } else if (
      type.includes("tool") ||
      (props.part as { type?: string } | undefined)?.type === "tool"
    ) {
      const part = props.part as
        | {
            state?: { status?: string; title?: string; output?: string };
            tool?: string;
          }
        | undefined;
      normalizedType =
        part?.state?.status === "completed" ? "tool.result" : "tool.start";
      title = part?.state?.title || part?.tool || "Tool";
      body = part?.state?.output || "";
    } else if (
      type.includes("message.part") &&
      (props.part as { type?: string } | undefined)?.type === "text"
    ) {
      normalizedType = "assistant.message";
      title = "OpenCode";
      body = String(
        (props.part as { text?: string }).text || props.delta || "",
      );
      if (!body) return null;
    } else if (
      type.includes("session.status") ||
      type.includes("session.idle")
    ) {
      normalizedType = "session.status";
      title = "Session status";
      body = type.includes("idle")
        ? "OpenCode is idle"
        : JSON.stringify(props.status || props);
    } else if (type.includes("error")) {
      normalizedType = "error";
      title = "OpenCode error";
      body = JSON.stringify(props);
    } else {
      return null;
    }
    return {
      uid: randomUUID(),
      sessionUid: session.uid,
      taskUid: task?.uid || null,
      type: normalizedType,
      title,
      body,
      metadata: props,
      createdAt: new Date().toISOString(),
    };
  }

  private async runtime(session: Session, task: Task | null, emit: Emit) {
    let runtime = this.runtimes.get(session.uid);
    if (runtime && !runtime.process.killed) return runtime;
    runtime = await this.startServer(
      session.worktreePath,
      session.permissionMode === "auto",
    );
    this.runtimes.set(session.uid, runtime);
    const subscription = await runtime.client.event.subscribe({
      signal: runtime.eventAbort.signal,
    });
    void (async () => {
      try {
        for await (const raw of subscription.stream) {
          const normalized = this.normalize(raw, session, task);
          if (normalized) emit(normalized);
        }
      } catch (error) {
        if (!runtime?.eventAbort.signal.aborted) {
          emit({
            uid: randomUUID(),
            sessionUid: session.uid,
            taskUid: task?.uid || null,
            type: "error",
            title: "Event stream stopped",
            body: error instanceof Error ? error.message : String(error),
            metadata: {},
            createdAt: new Date().toISOString(),
          });
        }
      }
    })();
    return runtime;
  }

  async send(session: Session, task: Task | null, prompt: string, emit: Emit) {
    const runtime = await this.runtime(session, task, emit);
    let opencodeSessionId = session.opencodeSessionId;
    if (!opencodeSessionId) {
      const created = await runtime.client.session.create({
        body: { title: session.name },
      });
      if (created.error || !created.data)
        throw new Error(
          JSON.stringify(created.error || "Unable to create OpenCode session"),
        );
      opencodeSessionId = created.data.id;
      updateSession(session.uid, { opencodeSessionId });
      session = { ...session, opencodeSessionId };
    }
    const result = await runtime.client.session.prompt({
      path: { id: opencodeSessionId },
      body: {
        agent: task?.mode || session.agentMode,
        model: { providerID: session.providerId, modelID: session.modelId },
        parts: [{ type: "text", text: prompt }],
      },
    });
    if (result.error || !result.data)
      throw new Error(
        JSON.stringify(result.error || "OpenCode did not return a response"),
      );
    const text = result.data.parts
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("\n")
      .trim();
    if (text)
      emit({
        uid: randomUUID(),
        sessionUid: session.uid,
        taskUid: task?.uid || null,
        type: "assistant.message",
        title: "OpenCode completed",
        body: text,
        metadata: {},
        createdAt: new Date().toISOString(),
      });
    return { text, opencodeSessionId };
  }

  async generatePlan(
    directory: string,
    providerId: string,
    modelId: string,
    prompt: string,
  ): Promise<SmartPromptResult> {
    const runtime = await this.startServer(directory, false);
    try {
      const created = await runtime.client.session.create({
        body: { title: "Smart prompt draft" },
      });
      if (!created.data) throw new Error(JSON.stringify(created.error));
      const result = await withTimeout(
        runtime.client.session.prompt({
          path: { id: created.data.id },
          body: {
            agent: "plan",
            model: { providerID: providerId, modelID: modelId },
            parts: [{ type: "text", text: prompt }],
          },
        }),
        "Smart Prompt",
      );
      if (!result.data) throw new Error(JSON.stringify(result.error));
      const text = result.data.parts
        .filter((part) => part.type === "text")
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n");
      return parseSmartPrompt(text);
    } finally {
      runtime.eventAbort.abort();
      runtime.process.kill();
    }
  }

  async brainstorm(
    directory: string,
    providerId: string,
    modelId: string,
    prompt: string,
  ): Promise<string> {
    const runtime = await this.startServer(directory, false);
    try {
      const created = await runtime.client.session.create({
        body: { title: "KarsaDesk brainstorm" },
      });
      if (!created.data) throw new Error(JSON.stringify(created.error));
      const result = await withTimeout(
        runtime.client.session.prompt({
          path: { id: created.data.id },
          body: {
            agent: "plan",
            model: { providerID: providerId, modelID: modelId },
            parts: [{ type: "text", text: prompt }],
          },
        }),
        "AI chat",
      );
      if (!result.data) throw new Error(JSON.stringify(result.error));
      return result.data.parts
        .filter((part) => part.type === "text")
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n")
        .trim();
    } finally {
      runtime.eventAbort.abort();
      runtime.process.kill();
    }
  }

  async cancel(session: Session) {
    const runtime = this.runtimes.get(session.uid);
    if (runtime && session.opencodeSessionId)
      await runtime.client.session.abort({
        path: { id: session.opencodeSessionId },
      });
  }

  async stop(sessionUid: string) {
    const runtime = this.runtimes.get(sessionUid);
    if (!runtime) return;
    runtime.eventAbort.abort();
    runtime.process.kill();
    this.runtimes.delete(sessionUid);
  }

  async respondPermission(
    session: Session,
    permissionId: string,
    response: "once" | "always" | "reject",
  ) {
    const runtime = this.runtimes.get(session.uid);
    if (!runtime || !session.opencodeSessionId)
      throw new Error("Session is not running");
    await runtime.client.postSessionIdPermissionsPermissionId({
      path: { id: session.opencodeSessionId, permissionID: permissionId },
      body: { response },
    });
  }
}

export function parseSmartPrompt(text: string): SmartPromptResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source =
    fenced || text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!source) throw new Error("The planning agent did not return JSON");
  return SmartPromptResultSchema.parse(JSON.parse(source));
}

export const openCode = new OpenCodeAdapter();
