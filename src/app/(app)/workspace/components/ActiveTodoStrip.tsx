'use client';

import { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  ListTodo,
  X,
  CheckCircle2,
  Loader2,
  XCircle,
  Circle,
} from 'lucide-react';

export function ActiveTodoStrip() {
  const { activeTodoList, dismissTodoList } = useWorkspaceStore();
  const [collapsed, setCollapsed] = useState(true);

  if (!activeTodoList || activeTodoList.dismissedByUser || activeTodoList.status === 'dismissed') {
    return null;
  }

  const items = activeTodoList.items || [];
  const completedCount = items.filter(i => i.status === 'done' || i.status === 'skipped').length;
  const totalCount = items.length;
  const runningItem = items.find(i => i.status === 'running');

  return (
    <div className="bg-[#2d2d2d] border-t border-[#3a3a3a] px-2.5 py-1.5 flex flex-col gap-1 text-xs flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <ListTodo className="size-3 text-[#4ec9b0] flex-shrink-0" />
          <span className="font-semibold text-[#cccccc] text-[10px] uppercase tracking-wide flex-shrink-0">Working Plan</span>
          <span className="text-[#888] font-mono text-[10px] flex-shrink-0">{completedCount}/{totalCount}</span>
          {runningItem && (
            <span className="text-[#4ec9b0] font-mono text-[10px] truncate animate-pulse">
              ▶ {runningItem.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[9px] text-[#888] hover:text-[#cccccc] px-1 py-0.5 rounded hover:bg-[#383838] transition-colors"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            onClick={() => dismissTodoList()}
            className="text-[9px] text-[#888] hover:text-[#cccccc] px-1 py-0.5 rounded hover:bg-[#383838] transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-0.5 pl-1 py-1 max-h-28 overflow-y-auto border-t border-[#383838] mt-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[11px] py-0.5">
              {item.status === 'done' ? (
                <CheckCircle2 className="size-3 text-[#4ec9b0] shrink-0" />
              ) : item.status === 'running' ? (
                <Loader2 className="size-3 animate-spin text-[#007acc] shrink-0" />
              ) : item.status === 'failed' ? (
                <XCircle className="size-3 text-[#c74e39] shrink-0" />
              ) : item.status === 'skipped' ? (
                <Circle className="size-3 text-[#555] shrink-0" />
              ) : (
                <Circle className="size-3 text-[#888] shrink-0" />
              )}
              <span className={`truncate ${item.status === 'done' ? 'line-through text-[#666]' : item.status === 'failed' ? 'text-[#c74e39]' : 'text-[#cccccc]'}`}>
                {item.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
