"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  CircleDot,
  Code2,
  FileText,
  FolderGit2,
  GitBranch,
  KanbanSquare,
  Layers3,
  Loader2,
  MessageSquare,
  Moon,
  PanelRightClose,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Sun,
  TerminalSquare,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import type {
  CliProbe,
  Paginated,
  Project,
  Provider,
  Session,
  Task,
} from "@vk/contracts";
import { createApiClient, type ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban-board";
import {
  ProjectDialog,
  SessionDialog,
  SmartPromptDialog,
  TaskDialog,
} from "@/components/dialogs";
import { GoogleWorkspaceModal } from "@/components/google-workspace-modal";
import { FigmaLiveModal } from "@/components/figma-live-modal";
import { ConnectedFilesPanel } from "@/components/connected-files-panel";
import { AiBrainstormPanel } from "@/components/ai-brainstorm-panel";
import { TaskActivityPreview } from "@/components/task-activity-preview";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { useLocalTheme } from "@/components/providers";
import { SessionWorkspace } from "@/components/session-workspace";
import { cn } from "@/lib/utils";
import { confirmAction } from "@/lib/sweet-alert";

type Integration = { probe: CliProbe; providers: Provider[] };

export function Dashboard() {
  const { mounted: themeMounted, theme, toggleTheme } = useLocalTheme();
  const [api, setApi] = useState<ApiClient | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectUid, setProjectUid] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [sessionUid, setSessionUid] = useState<string>("");
  const [workspaceSessionUid, setWorkspaceSessionUid] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskPages, setTaskPages] = useState(1);
  const [taskTotal, setTaskTotal] = useState(0);
  const [reviewGate, setReviewGate] = useState<"each_task" | "batch_end">(
    "batch_end",
  );
  const [defaultProviderId, setDefaultProviderId] = useState("");
  const [defaultModelId, setDefaultModelId] = useState("");
  const [projectDialog, setProjectDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [smartDialog, setSmartDialog] = useState(false);
  const [smartPromptSeed, setSmartPromptSeed] = useState("");
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [quickSessionBusy, setQuickSessionBusy] = useState(false);
  const autoSessionProjectUid = useRef<string | null>(null);
  const [googleWorkspaceOpen, setGoogleWorkspaceOpen] = useState(false);
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const project = projects.find((item) => item.uid === projectUid) || null;
  const workspaceSession =
    sessions.find((item) => item.uid === workspaceSessionUid) || null;
  const defaultProvider =
    integration?.providers.find((item) => item.id === defaultProviderId) ||
    integration?.providers[0] ||
    null;
  const defaultModel =
    defaultProvider?.models.find((item) => item.id === defaultModelId) ||
    defaultProvider?.models[0] ||
    null;

  const loadOpenCodeProbe = useCallback(async (client: ApiClient) => {
    try {
      const value = await client.get<{ probe: CliProbe }>(
        "/api/opencode/probe",
      );
      setIntegration((current) => ({
        probe: value.probe,
        providers: current?.providers || [],
      }));
    } catch (error) {
      setIntegration({
        probe: {
          installed: false,
          path: null,
          version: null,
          error: error instanceof Error ? error.message : String(error),
        },
        providers: [],
      });
    }
  }, []);

  const loadProject = useCallback(
    async (client: ApiClient, uid: string, page = 1, search = "") => {
      const [taskData, sessionData] = await Promise.all([
        client.get<Paginated<Task>>(
          `/api/projects/${uid}/tasks?page=${page}&pageSize=60&query=${encodeURIComponent(search)}`,
        ),
        client.get<Session[]>(`/api/projects/${uid}/sessions`),
      ]);
      setTasks(taskData.items);
      setTaskPage(taskData.page);
      setTaskPages(taskData.totalPages);
      setTaskTotal(taskData.total);
      setSessions(sessionData);
      setSessionUid((value) =>
        value && sessionData.some((session) => session.uid === value)
          ? value
          : sessionData[0]?.uid || "",
      );
      void client
        .get<Integration>(`/api/projects/${uid}/opencode`)
        .then(setIntegration)
        .catch((error) => {
          setIntegration({
            probe: {
              installed: false,
              path: null,
              version: null,
              error: error instanceof Error ? error.message : String(error),
            },
            providers: [],
          });
        });
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!api) return;
    void loadOpenCodeProbe(api);
    const data = await api.get<Project[]>("/api/projects");
    setProjects(data);
    setConnected(true);
    const uid = projectUid || data[0]?.uid;
    if (uid) {
      setProjectUid(uid);
      await loadProject(api, uid, taskPage, query);
    }
  }, [api, loadOpenCodeProbe, loadProject, projectUid, query, taskPage]);

  useEffect(() => {
    void createApiClient().then(async (client) => {
      setApi(client);
      try {
        void loadOpenCodeProbe(client);
        const data = await client.get<Project[]>("/api/projects");
        setProjects(data);
        setConnected(true);
        if (data[0]) setProjectUid(data[0].uid);
      } catch (error) {
        setConnected(false);
        toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    });
  }, [loadOpenCodeProbe, loadProject]);
  useEffect(() => {
    if (api && projectUid) {
      setSelectedTask(null);
      setChecked(new Set());
      setTaskPage(1);
      setLoading(true);
      void loadProject(api, projectUid, 1, "").finally(() => setLoading(false));
    }
  }, [api, projectUid, loadProject]);
  useEffect(() => {
    if (!api || !projectUid) return;
    const timer = setTimeout(
      () => void loadProject(api, projectUid, 1, query),
      300,
    );
    return () => clearTimeout(timer);
  }, [api, projectUid, query, loadProject]);
  useEffect(() => {
    if (!integration?.providers.length) {
      setDefaultProviderId("");
      setDefaultModelId("");
      return;
    }
    const provider =
      integration.providers.find((item) => item.id === defaultProviderId) ||
      integration.providers[0];
    if (provider.id !== defaultProviderId) setDefaultProviderId(provider.id);
    if (!provider.models.some((model) => model.id === defaultModelId)) {
      setDefaultModelId(provider.models[0]?.id || "");
    }
  }, [integration, defaultProviderId, defaultModelId]);

  useEffect(() => {
    if (!projectUid) return;
    const saved = window.localStorage.getItem(
      `karsadesk-default-ai:${projectUid}`,
    );
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as {
        providerId?: string;
        modelId?: string;
      };
      setDefaultProviderId(value.providerId || "");
      setDefaultModelId(value.modelId || "");
    } catch {
      // Ignore old/broken local preference values.
    }
  }, [projectUid]);

  useEffect(() => {
    if (!projectUid || !defaultProviderId || !defaultModelId) return;
    window.localStorage.setItem(
      `karsadesk-default-ai:${projectUid}`,
      JSON.stringify({
        providerId: defaultProviderId,
        modelId: defaultModelId,
      }),
    );
  }, [projectUid, defaultProviderId, defaultModelId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("connected");
    const status = params.get("status");
    if (!provider) return;
    toast[status === "error" ? "error" : "success"](
      status === "error"
        ? `${provider} connection failed`
        : `${provider} connected. Dashboard refreshed.`,
    );
    window.history.replaceState({}, "", window.location.pathname);
    void refresh();
  }, [refresh]);

  const visibleTasks = useMemo(() => tasks, [tasks]);

  async function patchTask(task: Task, values: Partial<Task>) {
    if (!api) return;
    const optimistic = { ...task, ...values };
    setTasks((items) =>
      items
        .map((item) => (item.uid === task.uid ? optimistic : item))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
    if (selectedTask?.uid === task.uid) setSelectedTask(optimistic);
    try {
      const updated = await api.patch<Task>(`/api/tasks/${task.uid}`, values);
      setTasks((items) =>
        items
          .map((item) => (item.uid === updated.uid ? updated : item))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
      if (selectedTask?.uid === updated.uid) setSelectedTask(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      await refresh();
    }
  }

  async function deleteTasks(input: {
    taskUids?: string[];
    status?: Task["status"];
    label: string;
  }) {
    if (!api || !project) return;
    const count = input.taskUids?.length;
    const confirmed = await confirmAction({
      title: count
        ? `Delete ${count} selected task(s)?`
        : `Clear ${input.label}?`,
      text: "Assigned running sessions will be paused. Task records, reviews, file actions, and corresponding NocoDB rows will be deleted.",
      confirmText: count ? "Delete selected" : `Clear ${input.label}`,
      cancelText: "Keep tasks",
      danger: true,
    });
    if (!confirmed) {
      toast.info("Task deletion cancelled");
      return;
    }
    const optimisticUids = new Set(
      input.taskUids?.length
        ? input.taskUids
        : tasks
            .filter((task) => task.status === input.status)
            .map((task) => task.uid),
    );
    const toastId = toast.loading("Deleting tasks and refreshing board…");
    setTasks((items) => items.filter((task) => !optimisticUids.has(task.uid)));
    setTaskTotal((value) => Math.max(0, value - optimisticUids.size));
    setSelectedTask((current) =>
      current && optimisticUids.has(current.uid) ? null : current,
    );
    setChecked((current) => {
      const next = new Set(current);
      for (const uid of optimisticUids) next.delete(uid);
      return next;
    });
    setInspectorOpen(false);
    setQuickSessionBusy(true);
    try {
      const result = await api.post<{ deletedTasks: number }>(
        `/api/projects/${project.uid}/tasks/delete`,
        {
          confirmed: true,
          taskUids: input.taskUids || [],
          status: input.status,
        },
      );
      await loadProject(api, project.uid, 1, query);
      toast.success(`${result.deletedTasks} task(s) deleted; board refreshed`, {
        id: toastId,
      });
    } catch (error) {
      await loadProject(api, project.uid, 1, query).catch(() => undefined);
      toast.error(error instanceof Error ? error.message : String(error), {
        id: toastId,
      });
    } finally {
      setQuickSessionBusy(false);
    }
  }
  function toggleCheck(uid: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }
  const createQuickSession = useCallback(async () => {
    if (!api || !project) return null;
    const provider = defaultProvider;
    const model = defaultModel;
    if (!provider || !model) {
      setSessionDialog(true);
      toast.info(
        "OpenCode provider/model belum kebaca. Cek login OpenCode atau pilih manual.",
      );
      return null;
    }
    setQuickSessionBusy(true);
    try {
      const session = await api.post<Session>(
        `/api/projects/${project.uid}/sessions`,
        {
          name: `Build session ${sessions.length + 1}`,
          providerId: provider.id,
          modelId: model.id,
          agentMode: "build",
          permissionMode: "supervised",
          targetBranch: project.currentBranch,
        },
      );
      setSessions((items) => [session, ...items]);
      setSessionUid(session.uid);
      toast.success(`Session ready: ${provider.name} · ${model.name}`);
      return session;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setSessionDialog(true);
      return null;
    } finally {
      setQuickSessionBusy(false);
    }
  }, [api, defaultModel, defaultProvider, project, sessions.length]);

  async function ensureRunSession() {
    if (sessionUid) return sessionUid;
    if (sessions[0]) {
      setSessionUid(sessions[0].uid);
      return sessions[0].uid;
    }
    const created = await createQuickSession();
    return created?.uid || null;
  }
  useEffect(() => {
    if (
      !api ||
      !project ||
      sessions.length > 0 ||
      !defaultProvider ||
      !defaultModel ||
      quickSessionBusy ||
      autoSessionProjectUid.current === project.uid
    )
      return;
    autoSessionProjectUid.current = project.uid;
    void createQuickSession();
  }, [
    api,
    createQuickSession,
    project,
    sessions.length,
    defaultProvider,
    defaultModel,
    quickSessionBusy,
  ]);
  async function run(
    mode: "next" | "selected" | "all",
    directTaskUids: string[] = [],
  ) {
    if (!api || !projectUid) return;
    const targetSessionUid = await ensureRunSession();
    if (!targetSessionUid) return;
    const selectedTaskUids =
      directTaskUids.length > 0 ? directTaskUids : [...checked];
    try {
      const result = await api.post<{ accepted: true; taskUids: string[] }>(
        `/api/sessions/${targetSessionUid}/run`,
        {
          mode,
          taskUids: mode === "selected" ? selectedTaskUids : [],
          reviewGate,
        },
      );
      toast.success(
        reviewGate === "each_task"
          ? `${result.taskUids.length} task queued — manual review after each task`
          : `${result.taskUids.length} task queued — review at batch end`,
      );
      setChecked(new Set());
      await loadProject(api, projectUid, taskPage, query);
      setWorkspaceSessionUid(targetSessionUid);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }
  async function openProjectInCode() {
    if (!api || !project) return;
    try {
      await api.post(`/api/projects/${project.uid}/open-vscode`);
      toast.success("Opening the project in VS Code");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }
  async function changePage(next: number) {
    if (!api || !projectUid || next < 1 || next > taskPages) return;
    setLoading(true);
    try {
      await loadProject(api, projectUid, next, query);
    } finally {
      setLoading(false);
    }
  }
  async function setupNoco() {
    if (!api) return;
    try {
      const result = await api.post<{ created: string[] }>("/api/nocodb/setup");
      await api.post("/api/nocodb/sync-all");
      toast.success(
        result.created.length
          ? `Created ${result.created.length} NocoDB tables`
          : "NocoDB schema is current and structured data synced",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  if (workspaceSession && project && api)
    return (
      <SessionWorkspace
        api={api}
        project={project}
        session={workspaceSession}
        tasks={tasks}
        onBack={() => setWorkspaceSessionUid(null)}
        onRefresh={async () => {
          await loadProject(api, project.uid);
        }}
        providers={integration?.providers || []}
      />
    );

  if (googleWorkspaceOpen && api)
    return (
      <GoogleWorkspaceModal
        open
        onOpenChange={setGoogleWorkspaceOpen}
        api={api}
        project={project}
        providers={integration?.providers || []}
        initialProviderId={defaultProvider?.id || ""}
        initialModelId={defaultModel?.id || ""}
        onTaskCreated={(task) => {
          setTasks((items) => [...items, task]);
          setSelectedTask(task);
        }}
      />
    );

  if (figmaOpen && api)
    return (
      <FigmaLiveModal
        open
        onOpenChange={setFigmaOpen}
        api={api}
        project={project}
        providers={integration?.providers || []}
        initialProviderId={defaultProvider?.id || ""}
        initialModelId={defaultModel?.id || ""}
        onTaskCreated={(task) => {
          setTasks((items) => [...items, task]);
          setSelectedTask(task);
        }}
      />
    );

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <aside className="flex w-[72px] shrink-0 flex-col items-center border-r border-border bg-panel py-3">
        <button
          className="mb-5 grid size-10 place-items-center rounded-xl bg-foreground text-background shadow-sm"
          aria-label="KarsaDesk home"
        >
          <KanbanSquare className="size-5" />
        </button>
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2">
          {projects.map((item) => (
            <button
              key={item.uid}
              onClick={() => setProjectUid(item.uid)}
              title={item.name}
              className={cn(
                "relative grid size-10 shrink-0 place-items-center rounded-xl border text-xs font-semibold uppercase transition",
                projectUid === item.uid
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-transparent bg-panel-strong text-muted hover:border-border hover:text-foreground",
              )}
            >
              {item.name.slice(0, 2)}
              {projectUid === item.uid && (
                <span className="absolute -right-[17px] h-5 w-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
          <button
            onClick={() => setProjectDialog(true)}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-dashed border-border text-muted hover:border-accent hover:text-accent"
            aria-label="Add project"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <button
            onClick={toggleTheme}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-panel-strong hover:text-foreground"
            aria-label="Toggle theme"
          >
            {themeMounted && theme === "dark" ? (
              <Sun className="size-4" />
            ) : themeMounted ? (
              <Moon className="size-4" />
            ) : (
              <Moon className="size-4 opacity-0" />
            )}
          </button>
          <button
            onClick={() => void setupNoco()}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-panel-strong hover:text-foreground"
            title="Set up NocoDB"
          >
            <Settings2 className="size-4" />
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-panel px-3 py-2 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <FolderGit2 className="size-4 text-accent" />
            <h1 className="truncate text-sm font-semibold">
              {project?.name || "KarsaDesk"}
            </h1>
            {project && (
              <span className="hidden rounded bg-panel-strong px-2 py-1 font-mono text-[9px] text-muted sm:inline">
                {project.currentBranch}
              </span>
            )}
          </div>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {project && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void openProjectInCode()}
              >
                <Code2 className="size-3.5" />{" "}
                <span className="hidden md:inline">Open in VS Code</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setGoogleWorkspaceOpen(true)}
            >
              <FileText className="size-3.5" />{" "}
              <span className="hidden md:inline">Google Docs</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFigmaOpen(true)}
            >
              <Palette className="size-3.5" />{" "}
              <span className="hidden md:inline">Figma</span>
            </Button>
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] sm:flex",
                connected
                  ? "border-success/20 text-success"
                  : "border-danger/20 text-danger",
              )}
            >
              {connected ? (
                <Wifi className="size-3" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {connected ? "Local service" : "Offline"}
            </span>
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] md:flex",
                integration?.probe.installed
                  ? "border-success/20 text-success"
                  : "border-warning/20 text-warning",
              )}
            >
              <Bot className="size-3" />
              {!integration
                ? "Checking OpenCode..."
                : integration.probe.installed
                  ? `OpenCode ${integration.probe.version || "ready"}`
                  : "OpenCode unavailable"}
            </span>
            <Button variant="ghost" size="icon" onClick={() => void refresh()}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </header>
        {!project ? (
          <main className="grid flex-1 place-items-center grid-texture">
            <div className="max-w-md rounded-2xl border border-border bg-elevated p-8 text-center shadow-lg">
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
                <FolderGit2 className="size-7" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                Bring in your first repository
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                The board stores structured work in NocoDB while code, paths,
                terminal output, and diffs stay on this machine.
              </p>
              <Button className="mt-6" onClick={() => setProjectDialog(true)}>
                <Plus className="size-4" /> Add local project
              </Button>
            </div>
          </main>
        ) : (
          <>
            <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-panel/60 px-3 py-2">
              <div className="relative min-w-[180px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-elevated pl-9 pr-3 text-xs outline-none focus:border-accent"
                  placeholder="Search tasks…"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTaskDialog(true)}
              >
                <Plus className="size-3.5" />{" "}
                <span className="hidden sm:inline">New task</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSmartDialog(true)}
              >
                <Sparkles className="size-3.5 text-accent" />{" "}
                <span className="hidden sm:inline">Smart prompt</span>
              </Button>
              <Button
                variant={aiChatOpen ? "default" : "secondary"}
                size="sm"
                onClick={() => setAiChatOpen((value) => !value)}
              >
                <MessageSquare className="size-3.5" />{" "}
                <span className="hidden sm:inline">AI chat</span>
              </Button>
              <Button size="sm" onClick={() => setSessionDialog(true)}>
                <TerminalSquare className="size-3.5" />{" "}
                <span className="hidden sm:inline">New session</span>
              </Button>
            </div>
            <main className="flex min-h-0 flex-1 overflow-hidden">
              <section className="min-w-0 flex-1 overflow-hidden grid-texture">
                {loading ? (
                  <div className="grid h-full place-items-center">
                    <Loader2 className="size-6 animate-spin text-muted" />
                  </div>
                ) : (
                  <KanbanBoard
                    tasks={visibleTasks}
                    selectedTaskUid={selectedTask?.uid || null}
                    checkedUids={checked}
                    onOpen={(task) => {
                      setSelectedTask(task);
                      setInspectorOpen(true);
                    }}
                    onCheck={toggleCheck}
                    onMove={(task, status, sortOrder) =>
                      void patchTask(task, { status, sortOrder })
                    }
                    onClearColumn={(status) =>
                      void deleteTasks({
                        status,
                        label: status.replaceAll("_", " "),
                      })
                    }
                  />
                )}
              </section>
              {aiChatOpen && api && project && (
                <>
                  <button
                    aria-label="Close AI chat overlay"
                    className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
                    onClick={() => setAiChatOpen(false)}
                  />
                  <AiBrainstormPanel
                    api={api}
                    project={project}
                    providers={integration?.providers || []}
                    onClose={() => setAiChatOpen(false)}
                    onUseAsSmartPrompt={(value) => {
                      setSmartPromptSeed(value);
                      setSmartDialog(true);
                    }}
                  />
                </>
              )}
              {selectedTask && inspectorOpen && (
                <>
                  <button
                    aria-label="Close task inspector overlay"
                    className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden"
                    onClick={() => setInspectorOpen(false)}
                  />
                  <aside className="scrollbar-thin fixed inset-y-0 right-0 z-50 w-[min(94vw,440px)] shrink-0 overflow-y-auto border-l border-border bg-elevated shadow-2xl lg:static lg:z-auto lg:w-[360px] lg:shadow-none xl:w-[390px]">
                    <div className="flex h-12 items-center justify-between border-b border-border px-4">
                      <span className="font-mono text-[10px] text-muted">
                        KD-{selectedTask.number}
                      </span>
                      <button
                        onClick={() => setInspectorOpen(false)}
                        className="rounded p-1.5 text-muted hover:bg-panel-strong"
                      >
                        <PanelRightClose className="size-4" />
                      </button>
                    </div>
                    <div className="space-y-5 p-4">
                      <div>
                        <input
                          value={selectedTask.title}
                          onChange={(e) =>
                            setSelectedTask({
                              ...selectedTask,
                              title: e.target.value,
                            })
                          }
                          onBlur={() =>
                            void patchTask(selectedTask, {
                              title: selectedTask.title,
                            })
                          }
                          className="w-full border-0 bg-transparent text-lg font-semibold tracking-tight outline-none"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select
                            value={selectedTask.status}
                            onChange={(e) =>
                              void patchTask(selectedTask, {
                                status: e.target.value as Task["status"],
                              })
                            }
                            className="rounded-md border border-border bg-panel px-2 py-1 text-[10px] uppercase"
                          >
                            <option value="backlog">Backlog</option>
                            <option value="ready">Ready</option>
                            <option value="running">Running</option>
                            <option value="waiting_approval">Waiting</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <span className="rounded-md bg-panel-strong px-2 py-1 font-mono text-[10px] uppercase text-muted">
                            {selectedTask.mode}
                          </span>
                          <span className="rounded-md bg-panel-strong px-2 py-1 text-[10px] capitalize text-muted">
                            {selectedTask.priority}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Implementation prompt
                        </h3>
                        <MarkdownViewer>
                          {selectedTask.refinedPrompt}
                        </MarkdownViewer>
                        <details className="overflow-hidden rounded-xl border border-border bg-elevated">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted hover:text-foreground">
                            Edit markdown source
                          </summary>
                          <textarea
                            value={selectedTask.refinedPrompt}
                            onChange={(e) =>
                              setSelectedTask({
                                ...selectedTask,
                                refinedPrompt: e.target.value,
                              })
                            }
                            onBlur={() =>
                              void patchTask(selectedTask, {
                                refinedPrompt: selectedTask.refinedPrompt,
                              })
                            }
                            className="min-h-52 w-full resize-y border-0 border-t border-border bg-background p-3 font-mono text-xs leading-5 outline-none focus:ring-2 focus:ring-inset focus:ring-accent/20"
                          />
                        </details>
                      </div>
                      <div>
                        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Acceptance criteria
                        </h3>
                        <div className="space-y-2">
                          {selectedTask.acceptanceCriteria.map(
                            (item, index) => (
                              <div
                                key={index}
                                className="flex gap-2 text-xs leading-5"
                              >
                                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                                <span>{item}</span>
                              </div>
                            ),
                          )}
                          {!selectedTask.acceptanceCriteria.length && (
                            <p className="text-xs text-muted">
                              No explicit criteria.
                            </p>
                          )}
                        </div>
                      </div>
                      <ConnectedFilesPanel api={api} task={selectedTask} />
                      {api && (
                        <TaskActivityPreview
                          api={api}
                          task={selectedTask}
                          onOpenSession={(uid) => setWorkspaceSessionUid(uid)}
                        />
                      )}
                      <div>
                        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Execution
                        </h3>
                        <Button
                          className="mb-2 w-full justify-center"
                          size="sm"
                          disabled={
                            ["running", "waiting_approval", "done"].includes(
                              selectedTask.status,
                            ) || quickSessionBusy
                          }
                          onClick={() =>
                            void run("selected", [selectedTask.uid])
                          }
                        >
                          {quickSessionBusy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Play className="size-3.5" />
                          )}
                          Run this task
                        </Button>
                        {selectedTask.assignedSessionUid ? (
                          <button
                            onClick={() =>
                              setWorkspaceSessionUid(
                                selectedTask.assignedSessionUid,
                              )
                            }
                            className="flex w-full items-center gap-2 rounded-lg border border-border bg-panel p-3 text-left text-xs hover:border-accent"
                          >
                            <TerminalSquare className="size-4 text-accent" />
                            <span className="flex-1">
                              Open assigned session
                            </span>
                            <GitBranch className="size-3.5 text-muted" />
                          </button>
                        ) : (
                          <p className="text-xs text-muted">
                            Not assigned to a session.
                          </p>
                        )}
                      </div>
                      <div className="border-t border-border pt-4">
                        <Button
                          variant="danger"
                          size="sm"
                          className="w-full"
                          disabled={quickSessionBusy}
                          onClick={() =>
                            void deleteTasks({
                              taskUids: [selectedTask.uid],
                              label: `KD-${selectedTask.number}`,
                            })
                          }
                        >
                          {quickSessionBusy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Delete this task
                        </Button>
                      </div>
                    </div>
                  </aside>
                </>
              )}
            </main>
            <footer className="glass flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-t border-border px-3 py-2">
              <div className="hidden min-w-0 items-center gap-2 pr-3 text-xs text-muted lg:flex">
                <Layers3 className="size-4" />
                <span>
                  {taskTotal} task{taskTotal === 1 ? "" : "s"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={taskPage <= 1}
                  onClick={() => void changePage(taskPage - 1)}
                >
                  ←
                </Button>
                <span className="font-mono text-[10px]">
                  {taskPage}/{taskPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={taskPage >= taskPages}
                  onClick={() => void changePage(taskPage + 1)}
                >
                  →
                </Button>
              </div>
              <div className="flex min-w-[220px] flex-1 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-elevated/70 p-1 sm:flex-none">
                <span className="hidden px-1.5 text-[10px] uppercase tracking-wider text-muted xl:inline">
                  AI
                </span>
                <select
                  value={defaultProvider?.id || ""}
                  onChange={(event) => {
                    setDefaultProviderId(event.target.value);
                    const provider = integration?.providers.find(
                      (item) => item.id === event.target.value,
                    );
                    setDefaultModelId(provider?.models[0]?.id || "");
                    setSessionUid("");
                  }}
                  className="h-8 min-w-[120px] flex-1 rounded-lg border border-border bg-panel px-2 text-[11px] outline-none sm:flex-none"
                  title="Default provider for new quick sessions"
                >
                  {!integration?.providers.length && (
                    <option value="">No provider</option>
                  )}
                  {integration?.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                <select
                  value={defaultModel?.id || ""}
                  onChange={(event) => {
                    setDefaultModelId(event.target.value);
                    setSessionUid("");
                  }}
                  disabled={!defaultProvider}
                  className="h-8 min-w-[150px] flex-1 rounded-lg border border-border bg-panel px-2 text-[11px] outline-none sm:flex-none"
                  title="Default model for new quick sessions"
                >
                  {!defaultProvider && <option value="">No model</option>}
                  {defaultProvider?.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={sessionUid}
                onChange={(e) => setSessionUid(e.target.value)}
                className="h-9 min-w-[160px] max-w-full flex-1 rounded-lg border border-border bg-elevated px-3 text-xs outline-none sm:max-w-52 sm:flex-none"
              >
                <option value="">Select session…</option>
                {sessions.map((session) => (
                  <option key={session.uid} value={session.uid}>
                    {session.name} · {session.status}
                  </option>
                ))}
              </select>
              <select
                value={reviewGate}
                onChange={(e) =>
                  setReviewGate(e.target.value as "each_task" | "batch_end")
                }
                className="h-9 min-w-[150px] max-w-full rounded-lg border border-border bg-elevated px-3 text-xs outline-none sm:max-w-44"
                title="Review policy"
              >
                <option value="each_task">Manual each task</option>
                <option value="batch_end">Review at batch end</option>
              </select>
              {sessionUid && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWorkspaceSessionUid(sessionUid)}
                >
                  <TerminalSquare className="size-3.5" /> Workspace
                </Button>
              )}
              <div className="ml-auto flex flex-wrap justify-end gap-1.5">
                {!!checked.size && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={quickSessionBusy}
                    onClick={() =>
                      void deleteTasks({
                        taskUids: [...checked],
                        label: "selection",
                      })
                    }
                  >
                    <Trash2 className="size-3.5" /> Delete selected (
                    {checked.size})
                  </Button>
                )}
                {!sessionUid && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={quickSessionBusy}
                    onClick={() => void createQuickSession()}
                  >
                    {quickSessionBusy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Session
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={quickSessionBusy}
                  onClick={() => void run("next")}
                >
                  <CircleDot className="size-3.5" /> Next
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={quickSessionBusy || !checked.size}
                  onClick={() => void run("selected")}
                >
                  <Play className="size-3.5" /> Selected
                </Button>
                <Button
                  size="sm"
                  disabled={quickSessionBusy}
                  onClick={() => void run("all")}
                >
                  <Play className="size-3.5" /> Run all
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
      <ProjectDialog
        open={projectDialog}
        onOpenChange={setProjectDialog}
        api={api}
        onCreated={(value) => {
          setProjects((items) => [value, ...items]);
          setProjectUid(value.uid);
        }}
      />
      <TaskDialog
        open={taskDialog}
        onOpenChange={setTaskDialog}
        api={api}
        project={project}
        onCreated={(value) => setTasks((items) => [...items, value])}
      />
      <SmartPromptDialog
        open={smartDialog}
        onOpenChange={setSmartDialog}
        api={api}
        project={project}
        providers={integration?.providers || []}
        initialPrompt={smartPromptSeed}
        onInitialPromptConsumed={() => setSmartPromptSeed("")}
        onPublished={(values) => setTasks((items) => [...items, ...values])}
      />
      <SessionDialog
        open={sessionDialog}
        onOpenChange={setSessionDialog}
        api={api}
        project={project}
        providers={integration?.providers || []}
        onCreated={(value) => {
          setSessions((items) => [value, ...items]);
          setSessionUid(value.uid);
        }}
      />
    </div>
  );
}
