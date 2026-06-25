"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileDiff,
  Loader2,
  SearchCode,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import type { NormalizedEvent, Paginated, Task } from "@vk/contracts";
import type { ApiClient } from "@/lib/api";
import type { DiffData } from "@/components/diff-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function eventIcon(type: NormalizedEvent["type"]) {
  if (type === "error") return <XCircle className="size-3.5 text-danger" />;
  if (type === "tool.start")
    return <Loader2 className="size-3.5 animate-spin text-accent" />;
  if (type === "tool.result" || type === "process.exit")
    return <CheckCircle2 className="size-3.5 text-success" />;
  if (type === "assistant.message")
    return <Bot className="size-3.5 text-accent" />;
  return <SearchCode className="size-3.5 text-muted" />;
}

function eventTone(type: NormalizedEvent["type"]) {
  if (type === "error") return "border-danger/30 bg-danger/10";
  if (type === "tool.start") return "border-accent/30 bg-accent/10";
  if (type === "tool.result" || type === "process.exit")
    return "border-success/30 bg-success/10";
  if (type === "permission.request") return "border-warning/30 bg-warning/10";
  return "border-border bg-panel";
}

export function TaskActivityPreview({
  api,
  task,
  onOpenSession,
}: {
  api: ApiClient;
  task: Task;
  onOpenSession: (sessionUid: string) => void;
}) {
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [diff, setDiff] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionUid = task.assignedSessionUid;

  async function load() {
    if (!sessionUid) return;
    setLoading(true);
    try {
      const [eventData, diffData] = await Promise.all([
        api.get<Paginated<NormalizedEvent>>(
          `/api/sessions/${sessionUid}/events?page=1&pageSize=80`,
        ),
        api.get<DiffData>(`/api/sessions/${sessionUid}/diff?page=1&pageSize=1`),
      ]);
      setEvents(eventData.items.filter((event) => event.taskUid === task.uid));
      setDiff(diffData);
    } catch {
      setEvents([]);
      setDiff(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (
      !sessionUid ||
      !["running", "waiting_approval", "review", "failed"].includes(task.status)
    )
      return;
    const timer = window.setInterval(() => void load(), 3500);
    return () => window.clearInterval(timer);
  }, [api, sessionUid, task.uid, task.status]);

  const latest = events.at(-1);
  const visibleEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.type !== "assistant.message" || event.body.trim().length > 0,
        )
        .slice(-8),
    [events],
  );
  const changedFiles = diff?.files || [];

  return (
    <section className="rounded-xl border border-border bg-panel p-3">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Live activity
          </h3>
          <p className="mt-1 truncate text-xs text-muted">
            {sessionUid
              ? latest?.title || "Waiting for agent event"
              : "Task has not been assigned to a session"}
          </p>
        </div>
        {sessionUid && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenSession(sessionUid)}
          >
            <TerminalSquare className="size-3.5" />
            Open
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-elevated p-2">
          <p className="font-mono text-[9px] uppercase text-muted">Status</p>
          <p className="mt-1 truncate text-xs font-semibold capitalize">
            {task.status.replace("_", " ")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-elevated p-2">
          <p className="font-mono text-[9px] uppercase text-muted">Events</p>
          <p className="mt-1 text-xs font-semibold">{events.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-elevated p-2">
          <p className="font-mono text-[9px] uppercase text-muted">Diff</p>
          <p className="mt-1 text-xs font-semibold">
            {changedFiles.length} file{changedFiles.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="scrollbar-thin mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
        {loading && !events.length && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated p-3 text-xs text-muted">
            <Loader2 className="size-3.5 animate-spin" />
            Loading agent activity…
          </div>
        )}
        {!loading && sessionUid && !visibleEvents.length && (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs leading-5 text-muted">
            Belum ada event untuk task ini. Saat agent mulai search file,
            menjalankan tool, meminta approval, atau membuat diff, timeline-nya
            muncul di sini.
          </div>
        )}
        {!sessionUid && (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs leading-5 text-muted">
            Jalankan task lewat session supaya thinking, tool call, terminal,
            dan diff bisa dipantau.
          </div>
        )}
        {visibleEvents.map((event) => (
          <article
            key={event.uid}
            className={cn("rounded-lg border p-2.5", eventTone(event.type))}
          >
            <div className="flex min-w-0 items-center gap-2">
              {eventIcon(event.type)}
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {event.title}
              </span>
              <time className="shrink-0 font-mono text-[9px] text-muted">
                {new Date(event.createdAt).toLocaleTimeString()}
              </time>
            </div>
            {event.body && (
              <p className="mt-1 line-clamp-3 break-words text-[11px] leading-4 text-muted">
                {event.body}
              </p>
            )}
          </article>
        ))}
      </div>

      {!!changedFiles.length && (
        <div className="mt-3 rounded-lg border border-violet-500/20 bg-violet-500/10 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-violet-500">
            <FileDiff className="size-3" />
            Changed files
          </div>
          <div className="flex flex-wrap gap-1">
            {changedFiles.slice(0, 6).map((file) => (
              <span
                key={file.path}
                className="max-w-full truncate rounded bg-background/70 px-1.5 py-0.5 font-mono text-[9px] text-muted"
                title={file.path}
              >
                {file.path}
              </span>
            ))}
            {changedFiles.length > 6 && (
              <span className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[9px] text-muted">
                +{changedFiles.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
