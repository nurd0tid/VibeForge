"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  CircleStop,
  Code2,
  FileDiff,
  FileClock,
  GitCommit,
  GitCompareArrows,
  Hourglass,
  Loader2,
  MessageSquareText,
  Play,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type {
  NormalizedEvent,
  Paginated,
  Project,
  Session,
  Task,
} from "@vk/contracts";
import type { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DiffPanel, type DiffData } from "@/components/diff-panel";
import { TerminalPanel } from "@/components/terminal-panel";
import { cn } from "@/lib/utils";

type Tab = "console" | "changes" | "terminal" | "logs";

function eventTone(type: NormalizedEvent["type"]) {
  if (type === "error") return "border-danger/30 bg-danger/5 text-danger";
  if (type === "permission.request")
    return "border-warning/30 bg-warning/10 text-warning";
  if (type === "tool.result" || type === "process.exit")
    return "border-success/30 bg-success/10 text-success";
  if (type === "tool.start") return "border-accent/30 bg-accent/10 text-accent";
  if (type === "assistant.message")
    return "border-border bg-panel text-foreground";
  return "border-border/70 bg-background/50 text-muted";
}

function EventIcon({ type }: { type: NormalizedEvent["type"] }) {
  if (type === "assistant.message")
    return <MessageSquareText className="size-3.5 text-accent" />;
  if (type === "error") return <XCircle className="size-3.5 text-danger" />;
  if (type === "permission.request")
    return <ShieldCheck className="size-3.5 text-warning" />;
  if (type === "tool.start")
    return <Loader2 className="size-3.5 animate-spin text-accent" />;
  if (type === "tool.result" || type === "process.exit")
    return <CheckCircle2 className="size-3.5 text-success" />;
  return <Code2 className="size-3.5 text-muted" />;
}

function RunStatusStrip({
  session,
  activeTask,
  diff,
  events,
}: {
  session: Session;
  activeTask: Task | null;
  diff: DiffData | null;
  events: NormalizedEvent[];
}) {
  const latest = events.at(-1);
  const pendingApproval = events.filter(
    (event) => event.type === "permission.request",
  ).length;
  const changed = diff?.files.length || 0;
  return (
    <section className="grid shrink-0 grid-cols-4 gap-2 max-xl:grid-cols-2 max-sm:grid-cols-1">
      <div className="rounded-xl border border-border bg-panel p-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
          {session.status === "running" ? (
            <Loader2 className="size-3.5 animate-spin text-warning" />
          ) : (
            <Activity className="size-3.5 text-accent" />
          )}
          Agent state
        </div>
        <p className="mt-2 text-sm font-semibold capitalize">
          {session.status}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted">
          {latest?.title || "Waiting for a task run"}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-panel p-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
          <Bot className="size-3.5 text-accent" />
          Active task
        </div>
        <p className="mt-2 truncate text-sm font-semibold">
          {activeTask ? `KD-${activeTask.number}` : "None"}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted">
          {activeTask?.title || `${session.pendingTaskUids.length} queued`}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-panel p-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
          <ShieldCheck className="size-3.5 text-warning" />
          Approval
        </div>
        <p className="mt-2 text-sm font-semibold">
          {pendingApproval ? `${pendingApproval} waiting` : "No request"}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted">
          Supervised permission gate
        </p>
      </div>
      <div className="rounded-xl border border-border bg-panel p-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
          <FileDiff className="size-3.5 text-violet-500" />
          Diff
        </div>
        <p className="mt-2 text-sm font-semibold">
          {changed} changed file{changed === 1 ? "" : "s"}
        </p>
        <p className="mt-1 truncate font-mono text-[11px] text-muted">
          {diff?.hash ? diff.hash.slice(0, 10) : "no diff yet"}
        </p>
      </div>
    </section>
  );
}

function EventTimeline({
  events,
  selectedTaskUid,
}: {
  events: NormalizedEvent[];
  selectedTaskUid: string | null;
}) {
  const timeline = events.filter((event) => event.type !== "assistant.message");
  return (
    <section className="rounded-xl border border-border bg-[#080b10] text-slate-200">
      <header className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <TerminalSquare className="size-3.5 text-accent" />
          <span className="truncate">Thinking & tool timeline</span>
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          {timeline.length} event{timeline.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="scrollbar-thin max-h-56 space-y-1 overflow-auto p-3 font-mono text-[11px]">
        {!timeline.length && (
          <div className="text-slate-500">
            No run events yet. Start a task to see agent steps here.
          </div>
        )}
        {timeline.slice(-30).map((event) => {
          const active = selectedTaskUid && event.taskUid === selectedTaskUid;
          return (
            <div
              key={event.uid}
              className={cn(
                "grid grid-cols-[52px_18px_minmax(0,1fr)] gap-2 rounded px-1 py-0.5 sm:grid-cols-[58px_18px_minmax(0,1fr)]",
                active && "bg-accent/10",
              )}
            >
              <span className="text-slate-500">
                {new Date(event.createdAt).toLocaleTimeString()}
              </span>
              <EventIcon type={event.type} />
              <span className="min-w-0">
                <span className="text-slate-100">{event.title}</span>
                {event.body && (
                  <span className="text-slate-500">
                    {" "}
                    — {event.body.split("\n")[0].slice(0, 120)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SessionWorkspace({
  api,
  project,
  session,
  tasks,
  onBack,
  onRefresh,
}: {
  api: ApiClient;
  project: Project;
  session: Session;
  tasks: Task[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("console");
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [eventPage, setEventPage] = useState(1);
  const [hasOlderEvents, setHasOlderEvents] = useState(false);
  const [diff, setDiff] = useState<DiffData | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [logPage, setLogPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"approve" | "request_changes">(
    "request_changes",
  );
  const [summary, setSummary] = useState("");
  const [commentPath, setCommentPath] = useState("");
  const [commentLine, setCommentLine] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualConsoleTaskUid, setManualConsoleTaskUid] = useState<
    string | null
  >(null);
  const sessionTasks = tasks.filter(
    (task) => task.assignedSessionUid === session.uid,
  );
  const activeTask =
    tasks.find((task) => task.uid === session.activeTaskUid) ||
    sessionTasks.find((task) => task.status === "running") ||
    null;
  async function load() {
    const [eventData, diffData, logData] = await Promise.all([
      api.get<Paginated<NormalizedEvent>>(
        `/api/sessions/${session.uid}/events?page=1&pageSize=100`,
      ),
      api.get<DiffData>(
        `/api/sessions/${session.uid}/diff?page=1&pageSize=1200`,
      ),
      api.get<Paginated<Record<string, unknown>>>(
        `/api/projects/${project.uid}/daily-logs?page=1&pageSize=30`,
      ),
    ]);
    setEvents(eventData.items);
    setEventPage(1);
    setHasOlderEvents(eventData.hasMore);
    setDiff(diffData);
    setLogs(logData.items.filter((log) => log.sessionUid === session.uid));
    setLogPage(1);
    setHasMoreLogs(logData.hasMore);
  }
  async function refreshDiffSnapshot() {
    const diffData = await api.get<DiffData>(
      `/api/sessions/${session.uid}/diff?page=1&pageSize=1200`,
    );
    setDiff(diffData);
  }
  async function loadOlderEvents() {
    const next = eventPage + 1;
    const data = await api.get<Paginated<NormalizedEvent>>(
      `/api/sessions/${session.uid}/events?page=${next}&pageSize=100`,
    );
    setEvents((current) => [...data.items, ...current]);
    setEventPage(next);
    setHasOlderEvents(data.hasMore);
  }
  async function loadMoreLogs() {
    const next = logPage + 1;
    const data = await api.get<Paginated<Record<string, unknown>>>(
      `/api/projects/${project.uid}/daily-logs?page=${next}&pageSize=30`,
    );
    setLogs((current) => [
      ...current,
      ...data.items.filter((log) => log.sessionUid === session.uid),
    ]);
    setLogPage(next);
    setHasMoreLogs(data.hasMore);
  }
  async function loadMoreDiff() {
    if (!diff?.hasMore) return;
    const next = diff.page + 1;
    const data = await api.get<DiffData>(
      `/api/sessions/${session.uid}/diff?page=${next}&pageSize=${diff.pageSize}`,
    );
    setDiff({ ...data, diff: `${diff.diff}\n${data.diff}`, page: next });
  }
  useEffect(() => {
    void load();
    const socket = api.websocket(
      `/ws/events?sessionUid=${encodeURIComponent(session.uid)}`,
    );
    socket.addEventListener("message", (event) => {
      const value = JSON.parse(event.data) as NormalizedEvent;
      setEvents((current) => [...current, value]);
      if (
        ["tool.result", "process.exit", "session.status", "error"].includes(
          value.type,
        )
      ) {
        void refreshDiffSnapshot();
      }
      if (["process.exit", "session.status", "error"].includes(value.type)) {
        void load();
        void onRefresh();
      }
    });
    const timer = window.setInterval(() => {
      if (["running", "review", "paused"].includes(session.status))
        void refreshDiffSnapshot();
    }, 5000);
    return () => {
      window.clearInterval(timer);
      socket.close();
    };
  }, [api, session.uid, session.status]);
  const tabs: Array<{ id: Tab; label: string; icon: typeof Bot }> = [
    { id: "console", label: "Agent", icon: Bot },
    {
      id: "changes",
      label: `Changes ${diff?.files.length || 0}`,
      icon: GitCompareArrows,
    },
    { id: "terminal", label: "Terminal", icon: TerminalSquare },
    { id: "logs", label: "Daily logs", icon: FileClock },
  ];
  const lastMessages = useMemo(
    () =>
      events.filter(
        (event, index, array) =>
          event.type !== "assistant.message" ||
          index === array.length - 1 ||
          array[index + 1]?.body !== event.body,
      ),
    [events],
  );
  const taskEvents = useMemo(
    () =>
      new Map(
        sessionTasks.map((task) => [
          task.uid,
          events.filter((event) => event.taskUid === task.uid),
        ]),
      ),
    [events, sessionTasks],
  );
  const selectedConsoleTaskUid =
    manualConsoleTaskUid || activeTask?.uid || sessionTasks[0]?.uid || null;
  async function cancel() {
    try {
      await api.post(`/api/sessions/${session.uid}/cancel`);
      await onRefresh();
      toast.info("Session paused");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }
  async function submitReview(action: "continue" | "merge" = "merge") {
    if (!diff) return;
    setBusy(true);
    try {
      const comments = commentBody
        ? [
            {
              path: commentPath || diff.files[0]?.path || "general",
              line: commentLine ? Number(commentLine) : undefined,
              body: commentBody,
            },
          ]
        : [];
      await api.post(`/api/sessions/${session.uid}/review`, {
        decision: reviewMode,
        action,
        summary,
        comments,
        diffHash: diff.hash,
      });
      setReviewOpen(false);
      setSummary("");
      setCommentBody("");
      await onRefresh();
      await load();
      toast.success(
        reviewMode === "approve"
          ? action === "continue"
            ? "Review accepted; next queued task started"
            : "Changes merged"
          : "Feedback sent to the same OpenCode session",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function openInCode() {
    try {
      await api.post(`/api/sessions/${session.uid}/open-vscode`);
      toast.success("Opening this session worktree in VS Code");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }
  async function respondPermission(
    event: NormalizedEvent,
    response: "once" | "reject",
  ) {
    const nested = event.metadata.permission as { id?: string } | undefined;
    const permissionId = String(
      event.metadata.id || event.metadata.permissionID || nested?.id || "",
    );
    if (!permissionId)
      return toast.error("OpenCode did not include a permission identifier");
    try {
      await api.post(
        `/api/sessions/${session.uid}/permissions/${encodeURIComponent(permissionId)}`,
        { response },
      );
      toast.success(
        response === "once" ? "Permission allowed once" : "Permission rejected",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <div className="flex h-screen min-h-0 flex-col bg-background">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-panel px-3 py-2 sm:gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{session.name}</h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase",
                session.status === "running"
                  ? "bg-warning/15 text-warning"
                  : session.status === "review"
                    ? "bg-violet-500/15 text-violet-500"
                    : "bg-panel-strong text-muted",
              )}
            >
              {session.status}
            </span>
            {session.pendingTaskUids.length > 0 && (
              <span className="rounded-full bg-panel-strong px-2 py-0.5 text-[9px] text-muted">
                {session.pendingTaskUids.length} queued
              </span>
            )}
          </div>
          <p className="truncate font-mono text-[10px] text-muted">
            {session.branch} · {session.providerId}/{session.modelId}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void openInCode()}
          >
            <Code2 className="size-3.5" />
            <span className="hidden sm:inline">Open in VS Code</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {session.status === "running" && (
            <Button variant="danger" size="sm" onClick={() => void cancel()}>
              <CircleStop className="size-3.5" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          )}
        </div>
      </header>
      <div className="scrollbar-thin flex min-h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-panel px-3 py-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-xs text-muted transition hover:bg-panel-strong hover:text-foreground",
                tab === item.id && "bg-panel-strong text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
      <main className="min-h-0 flex-1 p-3">
        {tab === "console" && (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <RunStatusStrip
              session={session}
              activeTask={activeTask}
              diff={diff}
              events={events}
            />
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-3 max-lg:grid-cols-1">
              <section className="scrollbar-thin overflow-auto rounded-xl border border-border bg-elevated">
                <div className="mx-auto max-w-3xl space-y-3 p-4">
                  <EventTimeline
                    events={events}
                    selectedTaskUid={selectedConsoleTaskUid}
                  />
                  {hasOlderEvents && (
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void loadOlderEvents()}
                      >
                        Load older messages
                      </Button>
                    </div>
                  )}
                  {!lastMessages.length && (
                    <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border text-center">
                      <div>
                        <Bot className="mx-auto mb-3 size-8 text-muted" />
                        <p className="text-sm font-medium">
                          This session is ready
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Queue a Ready task from the board to start OpenCode.
                        </p>
                      </div>
                    </div>
                  )}
                  {lastMessages.map((event) => (
                    <article
                      key={event.uid}
                      className={cn(
                        "rounded-xl border p-3 shadow-sm",
                        eventTone(event.type),
                        event.taskUid === selectedConsoleTaskUid &&
                          "ring-1 ring-accent/30",
                      )}
                    >
                      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
                        <EventIcon type={event.type} />
                        <span>{event.title}</span>
                        {event.taskUid && (
                          <span className="rounded bg-panel-strong px-1.5 py-0.5 font-mono text-[9px] normal-case">
                            task
                          </span>
                        )}
                        <time className="ml-auto font-mono normal-case">
                          {new Date(event.createdAt).toLocaleTimeString()}
                        </time>
                      </div>
                      {event.type === "assistant.message" ? (
                        <div className="prose prose-sm max-w-none text-[13px] leading-6 dark:prose-invert">
                          <ReactMarkdown>{event.body}</ReactMarkdown>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted">
                          {event.body}
                        </pre>
                      )}
                      {event.type === "permission.request" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              void respondPermission(event, "once")
                            }
                          >
                            <ShieldCheck className="size-3.5" /> Allow once
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              void respondPermission(event, "reject")
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
              <aside className="scrollbar-thin overflow-auto rounded-xl border border-border bg-panel p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Session queue
                  </h2>
                  <span className="rounded bg-panel-strong px-2 py-1 font-mono text-[9px] uppercase text-muted">
                    {session.reviewGate.replace("_", " ")}
                  </span>
                </div>
                <div className="space-y-2">
                  {sessionTasks.map((task) => {
                    const eventsForTask = taskEvents.get(task.uid) || [];
                    const latest = eventsForTask.at(-1);
                    const active = selectedConsoleTaskUid === task.uid;
                    return (
                      <button
                        key={task.uid}
                        onClick={() => setManualConsoleTaskUid(task.uid)}
                        className={cn(
                          "w-full rounded-lg border bg-elevated p-2.5 text-left transition hover:border-accent/50",
                          active
                            ? "border-accent shadow-sm ring-1 ring-accent/20"
                            : "border-border",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-muted">
                            KD-{task.number}
                          </span>
                          {task.status === "running" && (
                            <Loader2 className="size-3 animate-spin text-warning" />
                          )}
                          {task.status === "review" && (
                            <FileDiff className="size-3 text-violet-500" />
                          )}
                          {task.status === "done" && (
                            <GitCommit className="size-3 text-success" />
                          )}
                          {task.status === "waiting_approval" && (
                            <Hourglass className="size-3 text-warning" />
                          )}
                          <span className="ml-auto rounded bg-panel-strong px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted">
                            {task.status}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs font-medium">
                          {task.title}
                        </p>
                        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-muted">
                          {latest
                            ? `${latest.title}: ${latest.body || latest.type}`
                            : "No agent event yet"}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted">
                          <span className="rounded bg-panel-strong px-1.5 py-0.5">
                            {eventsForTask.length} events
                          </span>
                          {task.uid === session.activeTaskUid && (
                            <span className="rounded bg-warning/10 px-1.5 py-0.5 text-warning">
                              active
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {!sessionTasks.length && (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
                      No assigned tasks yet.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
        {tab === "changes" && (
          <div className="flex h-full flex-col gap-3">
            <div className="flex shrink-0 items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Review workspace changes
                </h2>
                <p className="text-xs text-muted">
                  Compare against {session.targetBranch}. Approval is
                  invalidated when this hash changes.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={!diff?.diff}
                  onClick={() => {
                    setReviewMode("request_changes");
                    setReviewOpen(true);
                  }}
                >
                  <MessageSquareText className="size-4" /> Request changes
                </Button>
                <Button
                  disabled={!diff?.diff || session.status !== "review"}
                  onClick={() => {
                    setReviewMode("approve");
                    setReviewOpen(true);
                  }}
                >
                  <Check className="size-4" />{" "}
                  {session.pendingTaskUids.length
                    ? "Review decision"
                    : "Approve & merge"}
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              {diff ? (
                <DiffPanel data={diff} onLoadMore={() => void loadMoreDiff()} />
              ) : (
                <div className="grid h-full place-items-center">
                  <Loader2 className="size-5 animate-spin text-muted" />
                </div>
              )}
            </div>
          </div>
        )}
        {tab === "terminal" && (
          <TerminalPanel
            api={api}
            sessionUid={session.uid}
            active={tab === "terminal"}
          />
        )}
        {tab === "logs" && (
          <div className="scrollbar-thin h-full overflow-auto rounded-xl border border-border bg-elevated p-4">
            <div className="mx-auto max-w-3xl space-y-3">
              {logs.map((log) => (
                <article
                  key={String(log.uid)}
                  className="rounded-xl border border-border bg-panel p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <FileClock className="size-4 text-accent" />
                    <h3 className="text-sm font-semibold">
                      {String(log.date)}
                    </h3>
                    <span className="ml-auto rounded bg-success/10 px-2 py-1 text-[9px] uppercase text-success">
                      {String(log.status)}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-muted">
                    {String(log.result)}
                  </p>
                  <div className="mt-3 font-mono text-[10px] text-muted">
                    {Array.isArray(log.changedFiles)
                      ? log.changedFiles.join(" · ")
                      : ""}
                  </div>
                </article>
              ))}
              {hasMoreLogs && (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadMoreLogs()}
                  >
                    Load more daily logs
                  </Button>
                </div>
              )}
              {!logs.length && (
                <div className="grid min-h-72 place-items-center text-sm text-muted">
                  Daily logs appear after a task completes.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewMode === "approve"
                ? session.pendingTaskUids.length
                  ? "Approve this review gate"
                  : "Approve and merge"
                : "Request changes"}
            </DialogTitle>
            <DialogDescription>
              {reviewMode === "approve"
                ? session.pendingTaskUids.length
                  ? `You checked this result manually. Continue the remaining ${session.pendingTaskUids.length} task(s), or merge the current reviewed batch now.`
                  : "This explicitly squash-merges the reviewed diff into the clean target branch, then resets only the managed session worktree."
                : "Feedback is sent as a follow-up in the same OpenCode session."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              className="min-h-24 w-full rounded-lg border border-border bg-panel p-3 text-sm outline-none focus:border-accent"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                reviewMode === "approve"
                  ? `Review ${session.name}`
                  : "Describe what should change..."
              }
            />
            {reviewMode === "request_changes" && (
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <input
                  className="rounded-lg border border-border bg-panel px-3 py-2 text-sm"
                  value={commentPath}
                  onChange={(e) => setCommentPath(e.target.value)}
                  placeholder="File path (optional)"
                />
                <input
                  className="rounded-lg border border-border bg-panel px-3 py-2 text-sm"
                  value={commentLine}
                  onChange={(e) => setCommentLine(e.target.value)}
                  placeholder="Line"
                />
                <textarea
                  className="col-span-2 min-h-20 rounded-lg border border-border bg-panel p-3 text-sm"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Inline comment (optional)"
                />
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setReviewOpen(false)}>
                Cancel
              </Button>
              {reviewMode === "approve" &&
                session.pendingTaskUids.length > 0 && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void submitReview("continue")}
                  >
                    <Play className="size-4" /> Approve & continue queue
                  </Button>
                )}
              <Button
                variant={reviewMode === "approve" ? "default" : "secondary"}
                disabled={
                  busy ||
                  (reviewMode === "request_changes" && !summary && !commentBody)
                }
                onClick={() => void submitReview("merge")}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : reviewMode === "approve" ? (
                  <Check className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {reviewMode === "approve"
                  ? "Merge reviewed diff"
                  : "Send feedback"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
