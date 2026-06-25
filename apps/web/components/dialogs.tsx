"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Folder,
  FolderOpen,
  GitBranch,
  HardDrive,
  Home,
  Loader2,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import type {
  Project,
  Provider,
  Session,
  SmartPromptResult,
  Task,
} from "@vk/contracts";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const field =
  "w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15";
const label = "mb-1.5 block text-xs font-medium text-muted";

type FilesystemBrowser = {
  current: string;
  parent: string | null;
  isGit: boolean;
  roots: Array<{ name: string; path: string }>;
  directories: Array<{ name: string; path: string; isGit: boolean }>;
};

type PickFolderResult = { path: string | null };

type SmartPromptLog = {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "running" | "done" | "warning" | "error";
  at: string;
};

function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function SmartPromptThinkingConsole({
  logs,
  elapsed,
  busy,
}: {
  logs: SmartPromptLog[];
  elapsed: number;
  busy: boolean;
}) {
  if (!logs.length) return null;
  const active = logs.find((item) => item.status === "running");
  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-[#080b10] text-[11px] text-slate-200 shadow-inner"
      aria-live="polite"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="flex items-center gap-2 font-medium text-slate-100">
          {busy ? (
            <Loader2 className="size-3.5 animate-spin text-accent" />
          ) : (
            <TerminalSquare className="size-3.5 text-accent" />
          )}
          Agent thinking
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {busy ? "running" : "idle"} · {formatElapsed(elapsed)}
        </span>
      </div>
      <div className="scrollbar-thin max-h-40 space-y-1 overflow-auto p-3 font-mono">
        {logs.map((item) => {
          const tone =
            item.status === "error"
              ? "text-danger"
              : item.status === "warning"
                ? "text-warning"
                : item.status === "done"
                  ? "text-success"
                  : item.status === "running"
                    ? "text-accent"
                    : "text-slate-500";
          const prefix =
            item.status === "done"
              ? "✓"
              : item.status === "running"
                ? "…"
                : item.status === "warning"
                  ? "!"
                  : item.status === "error"
                    ? "×"
                    : "·";
          return (
            <div key={item.id} className="grid grid-cols-[42px_18px_1fr] gap-2">
              <span className="text-slate-500">{item.at}</span>
              <span className={tone}>{prefix}</span>
              <span>
                <span className={tone}>{item.label}</span>
                {item.detail && (
                  <span className="text-slate-400"> — {item.detail}</span>
                )}
              </span>
            </div>
          );
        })}
        {active && (
          <div className="pt-1 text-slate-500">
            Waiting for {active.label.toLowerCase()}…
          </div>
        )}
      </div>
    </section>
  );
}

export function ProjectDialog({
  open,
  onOpenChange,
  api,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ApiClient | null;
  onCreated: (project: Project) => void;
}) {
  const [browser, setBrowser] = useState<FilesystemBrowser | null>(null);
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);

  async function browse(next?: string) {
    if (!api) return;
    setBrowsing(true);
    try {
      const value = await api.get<FilesystemBrowser>(
        `/api/filesystem${next ? `?path=${encodeURIComponent(next)}` : ""}`,
      );
      setBrowser(value);
      setPath(value.current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBrowsing(false);
    }
  }

  async function pickFolder() {
    if (!api) return;
    setPickerBusy(true);
    try {
      const result = await api.post<PickFolderResult>(
        "/api/filesystem/pick-folder",
      );
      if (!result.path) {
        toast.info(
          "System folder dialog was cancelled or unavailable. Use Folder tree or paste a path instead.",
        );
        return;
      }
      setPath(result.path);
      await browse(result.path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setPickerBusy(false);
    }
  }
  useEffect(() => {
    if (!open) return;
    setBrowser(null);
    setPath("");
  }, [open]);

  async function add() {
    if (!api || !path) return;
    setAdding(true);
    try {
      const project = await api.post<Project>("/api/projects", {
        path,
        name: name || undefined,
      });
      onCreated(project);
      onOpenChange(false);
      toast.success(`${project.name} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setAdding(false);
    }
  }

  function selectFolder(folderPath: string) {
    setPath(folderPath);
    toast.success("Folder selected. Click Add repository to register it.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(760px,calc(100vw-24px))]">
        <DialogHeader>
          <DialogTitle>Add a local project</DialogTitle>
          <DialogDescription>
            Select a Git repository. Paths and source code remain on this
            machine.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="project-name">
              Project name <span className="font-normal">(optional)</span>
            </label>
            <input
              id="project-name"
              className={field}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My application"
            />
          </div>
          <div>
            <label className={label} htmlFor="repository-path">
              Repository path
            </label>
            <div className="flex gap-2">
              <input
                id="repository-path"
                className={field}
                value={path}
                placeholder="C:\Users\you\Documents\Programming\Work\my-app"
                onChange={(event) => setPath(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void browse(path);
                }}
              />
              <Button
                variant="secondary"
                onClick={() => void pickFolder()}
                disabled={pickerBusy || adding}
              >
                {pickerBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FolderOpen className="size-4" />
                )}
                Browse…
              </Button>
              <Button
                variant="ghost"
                onClick={() => void browse(path || undefined)}
                disabled={browsing || adding}
              >
                {browsing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Folder className="size-4" />
                )}
                Folder tree
              </Button>
              <Button
                variant="ghost"
                onClick={() => void browse(path)}
                disabled={browsing || adding || !path.trim()}
              >
                Go to path
              </Button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Browse membuka folder picker dari OS. Kalau dialog OS tidak muncul
              di environment tertentu, pakai Folder tree sebagai fallback lokal.
            </p>
          </div>

          {browser && (
            <div className="rounded-xl border border-border bg-elevated p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {browser.roots.map((root) => (
                  <Button
                    key={`${root.name}:${root.path}`}
                    variant="secondary"
                    size="sm"
                    onClick={() => void browse(root.path)}
                  >
                    {root.name.toLowerCase().includes("home") ? (
                      <Home className="size-3.5" />
                    ) : (
                      <HardDrive className="size-3.5" />
                    )}
                    {root.name}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-panel p-2 text-xs">
                <FolderOpen className="size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate font-mono">
                  {browser.current}
                </span>
                {browser.isGit && (
                  <span className="rounded bg-success/10 px-2 py-1 text-[10px] text-success">
                    Git root
                  </span>
                )}
                <Button size="sm" onClick={() => selectFolder(browser.current)}>
                  Use this folder
                </Button>
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-auto rounded-xl border border-border bg-panel p-2">
            {!browser && (
              <p className="p-3 text-sm text-muted">
                Click Browse… to open the system folder picker, or Folder tree
                to browse local folders inside this modal.
              </p>
            )}
            {browser?.parent && (
              <button
                onClick={() => void browse(browser.parent!)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted hover:bg-panel-strong"
              >
                <ArrowLeft className="size-4" /> Parent folder
              </button>
            )}
            {browser?.directories.map((directory) => (
              <div
                key={directory.path}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-panel-strong"
              >
                <button
                  onClick={() => void browse(directory.path)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                >
                  <Folder className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate">
                    {directory.name}
                  </span>
                  {directory.isGit && (
                    <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] text-success">
                      git
                    </span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectFolder(directory.path)}
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void add()} disabled={!path || adding}>
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GitBranch className="size-4" />
              )}{" "}
              Add repository
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskDialog({
  open,
  onOpenChange,
  api,
  project,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ApiClient | null;
  project: Project | null;
  onCreated: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"plan" | "build">("build");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [acceptance, setAcceptance] = useState("");
  const [verification, setVerification] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!api || !project) return;
    setBusy(true);
    try {
      const task = await api.post<Task>(`/api/projects/${project.uid}/tasks`, {
        title,
        roughPrompt: prompt,
        refinedPrompt: prompt,
        mode,
        priority,
        acceptanceCriteria: acceptance
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        verification: verification
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        dependencyUids: [],
        source: "manual",
      });
      onCreated(task);
      setTitle("");
      setPrompt("");
      setAcceptance("");
      setVerification("");
      onOpenChange(false);
      toast.success("Task created in Backlog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Write the implementation intent. Acceptance and verification stay
            attached through review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className={label}>Title</label>
            <input
              className={field}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add repository-aware prompt builder"
            />
          </div>
          <div>
            <label className={label}>Prompt</label>
            <textarea
              className={`${field} min-h-28 resize-y`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe exactly what should change..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Mode</label>
              <select
                className={field}
                value={mode}
                onChange={(e) => setMode(e.target.value as "plan" | "build")}
              >
                <option value="build">Build</option>
                <option value="plan">Plan</option>
              </select>
            </div>
            <div>
              <label className={label}>Priority</label>
              <select
                className={field}
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Task["priority"])
                }
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
                <option>urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>
              Acceptance criteria{" "}
              <span className="font-normal">— one per line</span>
            </label>
            <textarea
              className={`${field} min-h-20`}
              value={acceptance}
              onChange={(e) => setAcceptance(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>
              Verification <span className="font-normal">— one per line</span>
            </label>
            <textarea
              className={`${field} min-h-20`}
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title || !prompt || busy}
              onClick={() => void create()}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Create task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SmartPromptDialog({
  open,
  onOpenChange,
  api,
  project,
  providers,
  initialPrompt,
  onInitialPromptConsumed,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ApiClient | null;
  project: Project | null;
  providers: Provider[];
  initialPrompt?: string;
  onInitialPromptConsumed?: () => void;
  onPublished: (tasks: Task[]) => void;
}) {
  const [roughPrompt, setRoughPrompt] = useState("");
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [draft, setDraft] = useState<SmartPromptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<SmartPromptLog[]>([]);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(
    null,
  );
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const provider = providers.find((item) => item.id === providerId) || null;
  useEffect(() => {
    if (!open || !initialPrompt) return;
    setRoughPrompt(initialPrompt);
    onInitialPromptConsumed?.();
  }, [open, initialPrompt, onInitialPromptConsumed]);
  useEffect(() => {
    if (open) return;
    setDraft(null);
    setThinkingLogs([]);
    setThinkingStartedAt(null);
    setThinkingElapsed(0);
  }, [open]);
  useEffect(() => {
    if (provider && !provider.models.some((model) => model.id === modelId))
      setModelId(provider.models[0]?.id || "");
    if (!provider) setModelId("");
  }, [provider, modelId]);
  useEffect(() => {
    if (!busy || !thinkingStartedAt) return;
    const timer = window.setInterval(() => {
      setThinkingElapsed(Date.now() - thinkingStartedAt);
    }, 500);
    return () => window.clearInterval(timer);
  }, [busy, thinkingStartedAt]);
  async function generate() {
    if (!api || !project || roughPrompt.trim().length < 10) return;
    const startedAt = Date.now();
    const timestamp = () => formatElapsed(Date.now() - startedAt);
    const remotePlan = Boolean(provider?.id && modelId);
    setDraft(null);
    setBusy(true);
    setThinkingStartedAt(startedAt);
    setThinkingElapsed(0);
    setThinkingLogs([
      {
        id: "prompt",
        label: "Received prompt",
        detail: `${roughPrompt.trim().length} chars`,
        status: "done",
        at: "00:00",
      },
      {
        id: "context",
        label: "Loaded project context",
        detail: project.memoryFiles.length
          ? `${project.memoryFiles.length} memory file(s): ${project.memoryFiles.slice(0, 3).join(", ")}${project.memoryFiles.length > 3 ? ", …" : ""}`
          : "no memory files detected",
        status: "done",
        at: "00:00",
      },
      {
        id: "provider",
        label: remotePlan ? "Selected OpenCode provider" : "Selected planner",
        detail: remotePlan
          ? `${provider?.name || provider?.id} · ${modelId}`
          : "Local fallback / instant",
        status: remotePlan ? "done" : "warning",
        at: "00:00",
      },
      {
        id: "plan",
        label: remotePlan
          ? "OpenCode Plan agent running"
          : "Local planner running",
        detail: remotePlan
          ? "waiting for normalized agent response"
          : "building a reviewable task draft without remote AI",
        status: "running",
        at: "00:00",
      },
      {
        id: "normalize",
        label: "Normalize draft tasks",
        detail: "waiting for planner output",
        status: "pending",
        at: "00:00",
      },
    ]);
    try {
      const result = await api.post<SmartPromptResult>(
        `/api/projects/${project.uid}/smart-prompt`,
        {
          roughPrompt,
          providerId: provider?.id,
          modelId: modelId || undefined,
        },
      );
      const usedFallback = result.summary.toLowerCase().includes("fallback");
      setDraft(result);
      setThinkingLogs((items) =>
        items.map((item) => {
          if (item.id === "plan")
            return {
              ...item,
              detail: usedFallback
                ? "finished with local fallback"
                : "agent response received",
              status: usedFallback ? "warning" : "done",
              at: timestamp(),
            };
          if (item.id === "normalize")
            return {
              ...item,
              detail: `${result.tasks.length} editable task(s) ready for review`,
              status: "done",
              at: timestamp(),
            };
          return item;
        }),
      );
      if (usedFallback)
        toast.info("Smart Prompt used the local fallback planner");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setThinkingLogs((items) =>
        items.map((item) =>
          item.id === "plan"
            ? {
                ...item,
                detail: message,
                status: "error",
                at: timestamp(),
              }
            : item.id === "normalize"
              ? {
                  ...item,
                  detail: "planner failed before producing a draft",
                  status: "error",
                  at: timestamp(),
                }
              : item,
        ),
      );
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      setThinkingElapsed(Date.now() - startedAt);
    }
  }
  async function publish() {
    if (!api || !project || !draft) return;
    setBusy(true);
    try {
      const created: Task[] = [];
      for (const item of draft.tasks) {
        const task = await api.post<Task>(
          `/api/projects/${project.uid}/tasks`,
          {
            title: item.title,
            roughPrompt,
            refinedPrompt: item.prompt,
            mode: item.mode,
            priority: item.priority,
            acceptanceCriteria: item.acceptanceCriteria,
            verification: item.verification,
            dependencyUids: item.dependsOn
              .map((index) => created[index]?.uid)
              .filter(Boolean),
            source: "ai",
          },
        );
        created.push(task);
      }
      onPublished(created);
      setDraft(null);
      setRoughPrompt("");
      onOpenChange(false);
      toast.success(`${created.length} draft tasks published`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  function updateDraft(index: number, key: "title" | "prompt", value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      tasks: draft.tasks.map((task, itemIndex) =>
        itemIndex === index ? { ...task, [key]: value } : task,
      ),
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1040px,calc(100vw-24px))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-accent" /> Smart prompt
          </DialogTitle>
          <DialogDescription>
            OpenCode Plan reads the repository rules and turns a rough request
            into editable, dependency-aware tasks.
          </DialogDescription>
        </DialogHeader>
        {!draft ? (
          <div className="space-y-4">
            <textarea
              className={`${field} min-h-40`}
              value={roughPrompt}
              onChange={(e) => setRoughPrompt(e.target.value)}
              placeholder="Paste the rough human request here..."
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Connected provider</label>
                <select
                  className={field}
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                >
                  <option value="">Local fallback / instant</option>
                  {providers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Model</label>
                <select
                  className={field}
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={!provider}
                >
                  {!provider && <option value="">No model</option>}
                  {provider?.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!providers.length && (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                No connected OpenCode provider was detected.
              </p>
            )}
            <SmartPromptThinkingConsole
              logs={thinkingLogs}
              elapsed={thinkingElapsed}
              busy={busy}
            />
            <div className="flex justify-end">
              <Button
                disabled={roughPrompt.length < 10 || busy}
                onClick={() => void generate()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}{" "}
                Generate draft
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-panel p-3 text-sm text-muted">
              {draft.summary}
            </div>
            <SmartPromptThinkingConsole
              logs={thinkingLogs}
              elapsed={thinkingElapsed}
              busy={busy}
            />
            <div className="scrollbar-thin max-h-[56vh] space-y-3 overflow-auto pr-1">
              {draft.tasks.map((task, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border bg-panel p-3 shadow-sm"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-accent/10 font-mono text-[10px] text-accent">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <input
                        className={`${field} h-10 text-base font-semibold`}
                        value={task.title}
                        onChange={(e) =>
                          updateDraft(index, "title", e.target.value)
                        }
                      />
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
                        <span className="rounded bg-panel-strong px-2 py-1 uppercase">
                          {task.mode}
                        </span>
                        <span className="rounded bg-panel-strong px-2 py-1 capitalize">
                          {task.priority}
                        </span>
                        {task.dependsOn.length > 0 && (
                          <span className="rounded bg-panel-strong px-2 py-1">
                            Depends on{" "}
                            {task.dependsOn
                              .map((value) => value + 1)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="prose prose-sm max-w-none text-[13px] leading-6 dark:prose-invert prose-headings:mb-2 prose-headings:mt-4 prose-h1:text-lg prose-h2:text-sm prose-ul:my-2 prose-li:my-0">
                      <ReactMarkdown>{task.prompt}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-elevated p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Acceptance
                      </p>
                      <ul className="space-y-1 text-[11px] leading-4 text-muted">
                        {task.acceptanceCriteria.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border bg-elevated p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Verification
                      </p>
                      <ul className="space-y-1 text-[11px] leading-4 text-muted">
                        {task.verification.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <details className="mt-3 rounded-lg border border-border bg-elevated">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted">
                      Edit raw prompt markdown
                    </summary>
                    <textarea
                      className={`${field} min-h-56 rounded-t-none border-0 bg-panel text-xs`}
                      value={task.prompt}
                      onChange={(e) =>
                        updateDraft(index, "prompt", e.target.value)
                      }
                    />
                  </details>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Back
              </Button>
              <Button disabled={busy} onClick={() => void publish()}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}{" "}
                Publish to Backlog
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SessionDialog({
  open,
  onOpenChange,
  api,
  project,
  providers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: ApiClient | null;
  project: Project | null;
  providers: Provider[];
  onCreated: (session: Session) => void;
}) {
  const [name, setName] = useState("Build session");
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [mode, setMode] = useState<"plan" | "build">("build");
  const [permission, setPermission] = useState<"supervised" | "auto">(
    "supervised",
  );
  const [busy, setBusy] = useState(false);
  const provider = useMemo(
    () => providers.find((item) => item.id === providerId) || providers[0],
    [providers, providerId],
  );
  useEffect(() => {
    if (provider && !providerId) setProviderId(provider.id);
  }, [provider, providerId]);
  useEffect(() => {
    if (provider && !provider.models.some((item) => item.id === modelId))
      setModelId(provider.models[0]?.id || "");
  }, [provider, modelId]);
  async function create() {
    if (!api || !project || !provider || !modelId) return;
    setBusy(true);
    try {
      const session = await api.post<Session>(
        `/api/projects/${project.uid}/sessions`,
        {
          name,
          providerId: provider.id,
          modelId,
          agentMode: mode,
          permissionMode: permission,
          targetBranch: project.currentBranch,
        },
      );
      onCreated(session);
      onOpenChange(false);
      toast.success("Managed worktree and session created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TerminalSquare className="size-5 text-accent" /> New execution
            session
          </DialogTitle>
          <DialogDescription>
            Creates an isolated branch and worktree while preserving one
            OpenCode session across queued tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className={label}>Session name</label>
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Provider</label>
              <select
                className={field}
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
              >
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Model</label>
              <select
                className={field}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              >
                {provider?.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Default agent</label>
              <select
                className={field}
                value={mode}
                onChange={(e) => setMode(e.target.value as "plan" | "build")}
              >
                <option value="build">Build</option>
                <option value="plan">Plan</option>
              </select>
            </div>
            <div>
              <label className={label}>Permissions</label>
              <select
                className={field}
                value={permission}
                onChange={(e) =>
                  setPermission(e.target.value as "supervised" | "auto")
                }
              >
                <option value="supervised">Supervised</option>
                <option value="auto">Auto — elevated risk</option>
              </select>
            </div>
          </div>
          {permission === "auto" && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              Auto mode allows OpenCode to execute approved-by-policy actions
              without pausing. Use only in a trusted repository.
            </p>
          )}
          <div className="rounded-lg border border-border bg-panel p-3 text-xs text-muted">
            <span className="font-medium text-foreground">Target:</span>{" "}
            {project?.currentBranch || "—"}
            <br />
            <span className="font-medium text-foreground">Worktree:</span>{" "}
            managed outside the repository
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void create()}
              disabled={!name || !modelId || busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Create
              session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
