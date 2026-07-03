'use client';

import { AlertTriangle, X } from 'lucide-react';

export function InterruptedTaskBanner({ 
  lastMessage, 
  onResume, 
  onDismiss 
}: { 
  lastMessage: string, 
  onResume: () => void, 
  onDismiss: () => void 
}) {
  return (
    <div className="bg-[#c74e39]/10 border-t border-[#c74e39]/20 px-3 py-2 flex flex-col gap-1.5 text-xs flex-shrink-0 relative">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-3.5 text-[#c74e39] flex-shrink-0" />
        <span className="font-semibold text-[#cccccc]">Task Interrupted</span>
        <button onClick={onDismiss} className="ml-auto text-[#888] hover:text-[#cccccc]">
          <X className="size-3" />
        </button>
      </div>
      <p className="text-[#888] leading-relaxed">
        The agent connection was interrupted. The last prompt was:
        <br />
        <span className="text-[#cccccc] italic line-clamp-1 mt-1">&quot;{lastMessage}&quot;</span>
      </p>
      <div className="mt-1 flex gap-2">
        <button onClick={onResume} className="bg-[#c74e39] text-white px-2 py-1 rounded text-[10px] hover:bg-[#a63a28] transition-colors">
          Resume Task
        </button>
        <button onClick={onDismiss} className="bg-[#333] text-[#cccccc] px-2 py-1 rounded text-[10px] hover:bg-[#444] transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );
}
