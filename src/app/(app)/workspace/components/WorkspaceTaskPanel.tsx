'use client';

import { useUiStore } from '@/stores/ui.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTasks } from '@/features/tasks/hooks';
import { 
  Play, 
  Square,
  RotateCcw,
  Loader2, 
  CheckCircle2, 
  Circle,
  ListTodo,
  ArrowRight,
  ListOrdered
} from 'lucide-react';
import type { Task } from '@/types';

export function WorkspaceTaskPanel({
  onPlayTask,
  onPlayAll,
  onStop
}: {
  onPlayTask: (task: Task) => void;
  onPlayAll: (tasks: Task[]) => void;
  onStop: () => void;
}) {
  const { activeProjectId } = useUiStore();
  const { data, isLoading } = useTasks(activeProjectId);
  const { taskQueue, playingTaskId } = useWorkspaceStore();

  const handlePlayAllClick = () => {
    if (!data?.list) return;
    const pendingTasks = data.list.filter((t) => t.status === 'todo' || t.status === 'in_progress');
    if (pendingTasks.length > 0) {
      onPlayAll(pendingTasks);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb] border-b border-[#1e1e1e]">
        <span>Tasks</span>
        {data?.list && data.list.filter(t => t.status === 'todo' || t.status === 'in_progress').length > 0 && (
          <button 
            onClick={handlePlayAllClick}
            className="flex items-center gap-1 text-[#4ec9b0] hover:text-[#4ec9b0]/80 transition-colors"
            title="Play all pending tasks sequentially"
          >
            <ListOrdered className="size-3" />
            <span>Play All</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!activeProjectId ? (
          <div className="text-xs text-[#666] text-center mt-4">
            No active project selected.
          </div>
        ) : isLoading ? (
          <div className="flex justify-center mt-4">
            <Loader2 className="size-4 animate-spin text-[#888]" />
          </div>
        ) : data?.list && data.list.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {data.list.map((task) => {
              const isPlaying = playingTaskId === task.Id;
              const isQueued = taskQueue.some(t => t.Id === task.Id);
              const isDone = task.status === 'done';

              return (
                <div 
                  key={task.Id} 
                  className={`group flex items-start gap-2 p-2 text-xs rounded border ${
                    isPlaying 
                      ? 'bg-[#37373d] border-[#007acc]' 
                      : 'bg-[#2d2d2d] border-transparent hover:border-[#383838]'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isPlaying ? (
                      <Loader2 className="size-3.5 animate-spin text-[#007acc]" />
                    ) : isDone ? (
                      <CheckCircle2 className="size-3.5 text-[#4ec9b0]" />
                    ) : (
                      <Circle className="size-3.5 text-[#555]" />
                    )}
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`truncate font-medium ${isDone ? 'text-[#888] line-through' : 'text-[#cccccc]'}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-1 rounded uppercase font-bold tracking-wide ${
                        task.status === 'todo' ? 'bg-[#333] text-[#aaa]' :
                        task.status === 'in_progress' ? 'bg-[#007acc]/20 text-[#4fc1ff]' :
                        'bg-[#4ec9b0]/20 text-[#4ec9b0]'
                      }`}>
                        {task.status}
                      </span>
                      {isQueued && (
                        <span className="text-[9px] text-[#e2c08d] bg-[#e2c08d]/10 px-1 rounded flex items-center gap-0.5">
                          Queued <ArrowRight className="size-2" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPlaying ? (
                      <button onClick={onStop} className="p-1 text-[#c74e39] hover:bg-[#c74e39]/10 rounded" title="Stop task execution">
                        <Square className="size-3.5 fill-current" />
                      </button>
                    ) : (
                      <button onClick={() => onPlayTask(task)} className="p-1 text-[#4ec9b0] hover:bg-[#4ec9b0]/10 rounded" title={isDone ? "Retry Task" : "Play Task"}>
                        {isDone ? <RotateCcw className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-[#666] text-center mt-4 flex flex-col items-center">
            <ListTodo className="size-8 opacity-20 mb-2" />
            <span>No tasks in this project.</span>
            <span className="text-[10px] mt-1">Use @create-task in chat.</span>
          </div>
        )}
      </div>
    </div>
  );
}
