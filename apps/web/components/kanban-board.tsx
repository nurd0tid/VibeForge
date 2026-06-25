"use client";

import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bot,
  Ban,
  Check,
  CircleDot,
  Clock3,
  FileDiff,
  GitCommit,
  GitBranch,
  GripVertical,
  Hourglass,
  ListChecks,
  ShieldAlert,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import type { Task } from "@vk/contracts";
import { cn } from "@/lib/utils";

const columns = [
  { id: "backlog", title: "Backlog", icon: CircleDot, dot: "text-slate-400" },
  { id: "ready", title: "Ready", icon: ListChecks, dot: "text-blue-500" },
  { id: "running", title: "Running", icon: Bot, dot: "text-amber-500" },
  {
    id: "waiting_approval",
    title: "Waiting",
    icon: ShieldAlert,
    dot: "text-rose-500",
  },
  { id: "review", title: "Review", icon: GitBranch, dot: "text-violet-500" },
  { id: "done", title: "Done", icon: Check, dot: "text-emerald-500" },
  { id: "failed", title: "Failed", icon: XCircle, dot: "text-danger" },
  { id: "cancelled", title: "Cancelled", icon: Ban, dot: "text-muted" },
] as const;

type ColumnId = (typeof columns)[number]["id"];

function normalizeStatus(status: Task["status"]): ColumnId {
  return status;
}

function BoardColumn({
  column,
  tasks,
  children,
}: {
  column: (typeof columns)[number];
  tasks: Task[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", status: column.id },
  });
  const Icon = column.icon;
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[360px] w-[min(84vw,300px)] shrink-0 flex-col rounded-xl border border-border bg-panel/70 transition-colors sm:w-[292px]",
        isOver && "border-accent bg-accent/5",
      )}
    >
      <header className="flex min-h-11 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Icon className={cn("size-4", column.dot)} />
          <span className="truncate">{column.title}</span>
          <span className="rounded-full bg-panel-strong px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {tasks.length}
          </span>
        </div>
        <span
          className={cn(
            "status-dot size-1.5 rounded-full bg-current",
            column.dot,
          )}
        />
      </header>
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {children}
        {!tasks.length && (
          <div className="grid min-h-24 place-items-center rounded-lg border border-dashed border-border text-xs text-muted">
            Drag tasks here
          </div>
        )}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  selected,
  checked,
  onOpen,
  onCheck,
}: {
  task: Task;
  selected: boolean;
  checked: boolean;
  onOpen: () => void;
  onCheck: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.uid,
    data: { type: "task", status: normalizeStatus(task.status) },
  });
  const priorityClass =
    task.priority === "urgent"
      ? "bg-rose-500"
      : task.priority === "high"
        ? "bg-amber-500"
        : task.priority === "medium"
          ? "bg-blue-500"
          : "bg-slate-400";
  const runLane =
    task.status === "running"
      ? {
          icon: Clock3,
          label: "Agent running",
          text: "OpenCode is working in a managed session worktree",
          className: "border-warning/30 bg-warning/10 text-warning",
        }
      : task.status === "waiting_approval"
        ? {
            icon: Hourglass,
            label: "Waiting approval",
            text: "Permission or manual gate needs your decision",
            className: "border-warning/30 bg-warning/10 text-warning",
          }
        : task.status === "review"
          ? {
              icon: FileDiff,
              label: "Diff ready",
              text: "Open the session to inspect changes and review",
              className:
                "border-violet-500/30 bg-violet-500/10 text-violet-500",
            }
          : task.status === "done"
            ? {
                icon: GitCommit,
                label: "Merged/checkpointed",
                text: "Task has passed the review lifecycle",
                className: "border-success/30 bg-success/10 text-success",
              }
            : task.status === "failed"
              ? {
                  icon: ShieldAlert,
                  label: "Failed",
                  text: "Review partial work and decide retry or discard",
                  className: "border-danger/30 bg-danger/10 text-danger",
                }
              : null;
  const RunLaneIcon = runLane?.icon;
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onOpen}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-elevated p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md",
        selected && "border-accent ring-1 ring-accent/30",
        isDragging && "z-20 opacity-55 shadow-xl",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
            KD-{task.number}
          </span>
          <span className="line-clamp-2 block break-words text-[13px] font-medium leading-5">
            {task.title}
          </span>
        </button>
        <button
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          className="cursor-grab rounded p-1 text-muted opacity-0 transition group-hover:opacity-100 focus:opacity-100"
          aria-label={`Move ${task.title}`}
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <p className="line-clamp-2 min-h-8 break-words text-[11px] leading-4 text-muted">
        {task.refinedPrompt}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", priorityClass)} />
          <span className="text-[10px] capitalize text-muted">
            {task.priority}
          </span>
          <span className="max-w-full rounded bg-panel-strong px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted">
            {task.mode}
          </span>
        </div>
        <label
          className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={onCheck}
            className="size-3.5 accent-[var(--accent)]"
            aria-label={`Select ${task.title}`}
          />
        </label>
      </div>
      {!runLane && task.status === "failed" && (
        <div className="mt-2 flex items-center gap-1.5 rounded bg-danger/10 px-2 py-1 text-[10px] text-danger">
          <ShieldAlert className="size-3" /> Failed — review partial work
        </div>
      )}
      {!runLane && task.status === "running" && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-warning">
          <Clock3 className="size-3 pulse-soft" /> Agent is working
        </div>
      )}
      {runLane && (
        <div
          className={cn(
            "mt-2 rounded-lg border px-2 py-1.5 text-[10px]",
            runLane.className,
          )}
        >
          <div className="flex items-center gap-1.5 font-medium">
            {RunLaneIcon && (
              <RunLaneIcon
                className={cn(
                  "size-3",
                  task.status === "running" && "pulse-soft",
                )}
              />
            )}
            {runLane.label}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[9px] opacity-80">
            {runLane.text}
          </p>
        </div>
      )}
      {task.assignedSessionUid && (
        <div className="mt-2 flex items-center gap-1.5 rounded bg-panel-strong px-2 py-1 font-mono text-[9px] text-muted">
          <TerminalSquare className="size-3" />
          session {task.assignedSessionUid.slice(0, 8)}
        </div>
      )}
    </article>
  );
}

export function KanbanBoard({
  tasks,
  selectedTaskUid,
  checkedUids,
  onOpen,
  onCheck,
  onMove,
}: {
  tasks: Task[];
  selectedTaskUid: string | null;
  checkedUids: Set<string>;
  onOpen: (task: Task) => void;
  onCheck: (uid: string) => void;
  onMove: (task: Task, status: Task["status"], sortOrder: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        columns.map((column) => [
          column.id,
          tasks
            .filter((task) => normalizeStatus(task.status) === column.id)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        ]),
      ),
    [tasks],
  ) as Record<string, Task[]>;

  function handleDragEnd(event: DragEndEvent) {
    const activeTask = tasks.find((task) => task.uid === event.active.id);
    if (!activeTask || !event.over) return;
    const overTask = tasks.find((task) => task.uid === event.over!.id);
    const overColumn = columns.find((column) => column.id === event.over?.id);
    const targetStatus = (
      overTask ? normalizeStatus(overTask.status) : overColumn?.id
    ) as Task["status"] | undefined;
    if (!targetStatus) return;

    const targetTasks = (grouped[targetStatus] || []).filter(
      (task) => task.uid !== activeTask.uid,
    );
    let targetIndex = targetTasks.length;
    if (overTask) {
      const overIndex = targetTasks.findIndex(
        (task) => task.uid === overTask.uid,
      );
      if (overIndex >= 0) {
        const translated = event.active.rect.current.translated;
        const isBelow =
          translated &&
          translated.top > event.over.rect.top + event.over.rect.height / 2;
        targetIndex = overIndex + (isBelow ? 1 : 0);
      }
    }
    const previous = targetTasks[targetIndex - 1]?.sortOrder || 0;
    const next = targetTasks[targetIndex]?.sortOrder || previous + 2000;
    onMove(activeTask, targetStatus, previous + (next - previous) / 2);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="scrollbar-thin flex h-full min-h-0 gap-3 overflow-x-auto overflow-y-hidden p-3">
        {columns.map((column) => {
          const items = grouped[column.id] || [];
          return (
            <BoardColumn key={column.id} column={column} tasks={items}>
              <SortableContext
                items={items.map((task) => task.uid)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((task) => (
                  <TaskCard
                    key={task.uid}
                    task={task}
                    selected={selectedTaskUid === task.uid}
                    checked={checkedUids.has(task.uid)}
                    onOpen={() => onOpen(task)}
                    onCheck={() => onCheck(task.uid)}
                  />
                ))}
              </SortableContext>
            </BoardColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
