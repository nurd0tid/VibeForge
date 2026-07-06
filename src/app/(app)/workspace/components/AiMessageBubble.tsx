'use client';

import { memo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWorkspaceStore } from '@/stores/workspace.store';
import type { AgentStep } from '@/stores/workspace.store';
import {
  Bot,
  AlertCircle,
  Cpu,
  Loader2,
  ChevronRight,
  Bookmark,
  Pencil,
  FilePlus,
  RotateCcw,
  XCircle,
  CheckCircle2,
  FileCode,
  FolderOpen,
  Folder,
  Terminal,
  Brain,
} from 'lucide-react';

// Animate Monaco DiffEditor helper function used by ToolCallStep
function startLiveDiffAnimation(
  path: string,
  toolName: string,
  args: Record<string, unknown>,
  cancelRef: React.MutableRefObject<(() => void) | null>
) {
  if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
  const store = useWorkspaceStore.getState();
  let cancelled = false;

  if (toolName === 'edit_file') {
    const oldStr = String(args.old_string || '');
    const newStr = String(args.new_string || '');
    const currentContent = store.openFiles.find(f => f.path === path)?.content || '';
    if (!currentContent.includes(oldStr)) return;
    const insertPos = currentContent.indexOf(oldStr);
    const prefix = currentContent.substring(0, insertPos);
    const suffix = currentContent.substring(insertPos + oldStr.length);
    const finalModified = prefix + newStr + suffix;
    const lines = newStr.split('\n');
    let lineIdx = 0;
    store.setPendingDiff(path, currentContent, prefix + suffix);
    const tick = () => {
      if (cancelled) return;
      lineIdx = Math.min(lineIdx + 1, lines.length);
      const partial = lines.slice(0, lineIdx).join('\n');
      store.setPendingDiff(path, currentContent, prefix + partial + suffix);
      if (lineIdx < lines.length) {
        setTimeout(tick, Math.max(20, Math.min(80, 800 / lines.length)));
      } else {
        store.setPendingDiff(path, currentContent, finalModified);
        cancelRef.current = null;
      }
    };
    setTimeout(tick, 50);
    cancelRef.current = () => { cancelled = true; store.setPendingDiff(path, currentContent, finalModified); };
  } else if (toolName === 'write_file') {
    const content = String(args.content || '');
    const lines = content.split('\n');
    let lineIdx = 0;
    store.setPendingDiff(path, '', '');
    const tick = () => {
      if (cancelled) return;
      lineIdx = Math.min(lineIdx + 1, lines.length);
      const partial = lines.slice(0, lineIdx).join('\n');
      store.setPendingDiff(path, '', partial);
      if (lineIdx < lines.length) {
        setTimeout(tick, Math.max(15, Math.min(60, 600 / lines.length)));
      } else {
        cancelRef.current = null;
      }
    };
    setTimeout(tick, 50);
    cancelRef.current = () => { cancelled = true; store.setPendingDiff(path, '', content); };
  }
}

export function InlineDiffViewer({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  const oldLines = (oldStr || '').split('\n');
  const newLines = (newStr || '').split('\n');
  
  return (
    <div className="font-mono text-[10px] overflow-x-auto">
      {oldLines.map((line, i) => (
        <div key={`old-${i}`} className="flex">
          <span className="w-4 text-center text-[#c74e39] flex-shrink-0">-</span>
          <span className="text-[#c74e39] bg-[#c74e39]/10 flex-1 whitespace-pre-wrap break-all px-1">{line}</span>
        </div>
      ))}
      {newLines.map((line, i) => (
        <div key={`new-${i}`} className="flex">
          <span className="w-4 text-center text-[#4ec9b0] flex-shrink-0">+</span>
          <span className="text-[#4ec9b0] bg-[#4ec9b0]/10 flex-1 whitespace-pre-wrap break-all px-1">{line}</span>
        </div>
      ))}
    </div>
  );
}

export function ActivityDivider() {
  return (
    <div className="flex items-center gap-1.5 my-2">
      <Bookmark className="size-2.5 text-[#555] shrink-0" />
      <div className="flex-1 border-t border-[#333]" />
    </div>
  );
}

export function ToolCallStep({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);
  const [editStatus, setEditStatus] = useState<'applied' | 'rejected' | null>(null);
  const isFinished = !!step.toolOutput;
  const isEditFile = step.toolName === 'edit_file';
  const isWriteFile = step.toolName === 'write_file';
  const { approvalMode, clearPendingDiff } = useWorkspaceStore();

  useEffect(() => {
    if (isFinished && (isEditFile || isWriteFile) && !step.isError && approvalMode === 'auto') {
      const path = String(step.toolArgs?.path || '');
      if (path) {
        const timer = setTimeout(() => {
          useWorkspaceStore.getState().markFileTag(path, null);
          useWorkspaceStore.getState().clearPendingDiff(path);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, isEditFile, isWriteFile, step.isError, approvalMode]);

  const handleAccept = () => {
    setEditStatus('applied');
    const path = String(step.toolArgs?.path || '');
    if (path) { clearPendingDiff(path); useWorkspaceStore.getState().markFileTag(path, null); }
  };

  const handleReject = async () => {
    if (!step.toolArgs?.path || !step.toolArgs?.old_string || !step.toolArgs?.new_string) return;
    try {
      const readRes = await fetch(`/api/workspace/file?path=${encodeURIComponent(String(step.toolArgs.path))}`);
      if (!readRes.ok) throw new Error('Failed');
      const { content } = await readRes.json();
      const reverted = content.replace(String(step.toolArgs.new_string), String(step.toolArgs.old_string));
      await fetch('/api/workspace/file', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: String(step.toolArgs.path), content: reverted }) });
      setEditStatus('rejected');
      clearPendingDiff(String(step.toolArgs.path));
      useWorkspaceStore.getState().updateFileContent(String(step.toolArgs.path), reverted);
      useWorkspaceStore.getState().markFileTag(String(step.toolArgs.path), null);
      toast.info('Reverted');
    } catch { toast.error('Failed to revert'); }
  };

  const filePath = String(step.toolArgs?.path || step.toolArgs?.file || '');
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const command = String(step.toolArgs?.command || '');
  const isRunning = !isFinished;

  if (isEditFile || isWriteFile) {
    const actionIcon = isEditFile ? <Pencil className="size-3 text-[#4ec9b0] shrink-0" /> : <FilePlus className="size-3 text-[#4ec9b0] shrink-0" />;
    const actionLabel = isEditFile ? 'AI wants to edit this file' : 'AI wants to create this file';
    const oldLines = String(step.toolArgs?.old_string || '').split('\n').length;
    const newLines = String(step.toolArgs?.new_string || step.toolArgs?.content || '').split('\n').length;

    return (
      <div className="text-[10px] font-mono">
        <div className="flex items-center gap-1.5 py-0.5">
          {isRunning ? <Loader2 className="size-3 animate-spin text-[#007acc] shrink-0" /> : editStatus === 'rejected' ? <RotateCcw className="size-3 text-[#e2c08d] shrink-0" /> : step.isError ? <XCircle className="size-3 text-[#c74e39] shrink-0" /> : editStatus === 'applied' ? <CheckCircle2 className="size-3 text-[#4ec9b0] shrink-0" /> : actionIcon}
          <span className={`font-semibold ${isRunning ? 'vibeforge-wave-text' : 'text-[#cccccc]'}`}>{actionLabel}:</span>
          {editStatus && <span className={`ml-1 text-[9px] ${editStatus === 'rejected' ? 'text-[#e2c08d]' : 'text-[#4ec9b0]'}`}>{editStatus}</span>}
        </div>

        <details className="ml-5" onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer flex items-center gap-1.5 text-[9px] text-[#888] hover:text-[#cccccc] transition-colors py-0.5 list-none">
            <ChevronRight className={`size-2.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            <FileCode className="size-3 text-[#519aba] shrink-0" />
            <span className="text-[#cccccc]">{fileName}</span>
            {isEditFile && !isRunning && (
              <span className="text-[#555] ml-1">{oldLines} → {newLines} lines</span>
            )}
          </summary>
          <div className="pl-4 pt-1 flex flex-col gap-1">
            <div className="text-[#555] truncate py-0.5 text-[9px]">{filePath}</div>
            {isFinished && (isEditFile ? !!step.toolArgs?.old_string : !!step.toolArgs?.content) && (
              <div className="border border-[#333] rounded overflow-hidden text-[9px]">
                {isEditFile ? (
                  <>
                    {String(step.toolArgs?.old_string || '').split('\n').slice(0, 6).map((line, i) => (
                      <div key={`old-${i}`} className="flex bg-[#c74e39]/8 px-2 py-px">
                        <span className="w-3 text-[#c74e39]/60 shrink-0">-</span>
                        <span className="text-[#c74e39]/80 whitespace-pre truncate">{line}</span>
                      </div>
                    ))}
                    {String(step.toolArgs?.new_string || '').split('\n').slice(0, 6).map((line, i) => (
                      <div key={`new-${i}`} className="flex bg-[#4ec9b0]/8 px-2 py-px">
                        <span className="w-3 text-[#4ec9b0]/60 shrink-0">+</span>
                        <span className="text-[#4ec9b0]/80 whitespace-pre truncate">{line}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  String(step.toolArgs?.content || '').split('\n').slice(0, 8).map((line, i) => (
                    <div key={i} className="flex bg-[#4ec9b0]/8 px-2 py-px">
                      <span className="w-3 text-[#4ec9b0]/60 shrink-0">+</span>
                      <span className="text-[#4ec9b0]/80 whitespace-pre truncate">{line}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </details>

        {isFinished && !step.isError && !editStatus && approvalMode !== 'auto' && (
          <div className="flex items-center gap-2 ml-5 mt-1">
            <button onClick={handleAccept} className="text-[9px] px-2 py-0.5 rounded bg-[#4ec9b0]/15 text-[#4ec9b0] hover:bg-[#4ec9b0]/25 border border-[#4ec9b0]/30 flex items-center gap-1 transition-colors">
              <CheckCircle2 className="size-2.5" />Approve
            </button>
            <button onClick={handleReject} className="text-[9px] px-2 py-0.5 rounded bg-[#c74e39]/15 text-[#c74e39] hover:bg-[#c74e39]/25 border border-[#c74e39]/30 flex items-center gap-1 transition-colors">
              <XCircle className="size-2.5" />Reject
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step.toolName === 'read_file') {
    const lineCount = step.toolOutput ? step.toolOutput.split('\n').length : 0;
    return (
      <div className="text-[9px] font-mono">
        <div className="flex items-center gap-1.5 py-0.5">
          {isRunning ? <Loader2 className="size-2.5 animate-spin text-[#007acc] shrink-0" /> : <FileCode className="size-2.5 text-[#519aba] shrink-0" />}
          <span className={`truncate max-w-[200px] ${isRunning ? 'vibeforge-wave-text' : 'text-[#d4d4d4]'}`}>{filePath}</span>
          {isFinished && lineCount > 0 && (
            <span className="text-[#888] ml-1 shrink-0">lines 1–{lineCount}</span>
          )}
          {isFinished && step.toolOutput && (
            <button onClick={() => setExpanded(!expanded)} className="ml-auto text-[#888] hover:text-[#cccccc]">
              <ChevronRight className={`size-2.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
        {expanded && step.toolOutput && (
          <div className="ml-4 text-[9px] text-[#aaa] bg-[#1a1a1a] border border-[#333] rounded p-1.5 mt-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap">
            {step.toolOutput.slice(0, 600)}{step.toolOutput.length > 600 ? '\n…' : ''}
          </div>
        )}
      </div>
    );
  }

  if (step.toolName === 'list_directory') {
    const lines = step.toolOutput ? step.toolOutput.trim().split('\n') : [];
    const preview = lines.slice(0, 5);
    return (
      <div className="text-[9px] font-mono">
        <div className="flex items-center gap-1.5 py-0.5">
          {isRunning ? <Loader2 className="size-2.5 animate-spin text-[#007acc] shrink-0" /> : <FolderOpen className="size-2.5 text-[#dcb67a] shrink-0" />}
          <span className={`truncate max-w-[200px] ${isRunning ? 'vibeforge-wave-text' : 'text-[#d4d4d4]'}`}>{filePath}</span>
          {isFinished && preview.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="ml-auto text-[#888] hover:text-[#cccccc]">
              <ChevronRight className={`size-2.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
        {expanded && (
          <div className="ml-4 flex flex-col gap-0.5 py-0.5">
            {preview.map((line, i) => {
              const isDir = line.includes('[DIR]');
              const clean = line.replace(/^\[(DIR|FILE)\]\s*/, '').trim();
              return (
                <div key={i} className="flex items-center gap-1 text-[#aaa]">
                  {isDir ? <Folder className="size-2 text-[#dcb67a] shrink-0" /> : <FileCode className="size-2 text-[#519aba] shrink-0" />}
                  <span>{clean}</span>
                </div>
              );
            })}
            {lines.length > 5 && <span className="text-[#888]">+{lines.length - 5} more…</span>}
          </div>
        )}
      </div>
    );
  }

  if (step.toolName === 'run_command') {
    const statusColor = step.isError ? '#c74e39' : isFinished ? '#4ec9b0' : '#e2c08d';
    const statusLabel = step.isError ? 'failed' : isFinished ? 'completed' : 'running';
    return (
      <div className="text-[9px] font-mono">
        <div className="flex items-center gap-1.5 py-0.5">
          {isRunning ? <Loader2 className="size-2.5 animate-spin text-[#007acc] shrink-0" /> : <Terminal className="size-2.5 text-[#888] shrink-0" />}
          <span className={`font-semibold ${isRunning ? 'vibeforge-wave-text' : 'text-[#cccccc]'}`}>AI wants to execute this command</span>
        </div>

        <div className="ml-3 mt-1 border border-[#3a3a3a] rounded overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#252526] border-b border-[#333]">
            <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
            <span className="text-[9px] capitalize" style={{ color: statusColor }}>{statusLabel}</span>
            <span className="text-[#4ec9b0] font-mono truncate flex-1 text-[9px]">$ {command}</span>
          </div>

          {(step.toolOutput || isRunning) && (
            <div className="bg-[#0e0e0e] h-[120px] overflow-y-auto p-2 whitespace-pre-wrap text-[9px] font-mono leading-relaxed" style={{ color: step.isError ? '#f48771' : '#4ec9b0' }}>
              {step.toolOutput || (isRunning ? <span className="vibeforge-wave-text">Executing...</span> : null)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (['memory_read', 'memory_list', 'memory_write'].includes(step.toolName || '')) {
    const label = step.toolName === 'memory_write' ? 'updated memory' : step.toolName === 'memory_read' ? 'read memory' : 'indexed memory';
    return (
      <div className="text-[9px] font-mono flex items-center gap-1.5 py-0.5">
        {isRunning ? <Loader2 className="size-2.5 animate-spin text-[#007acc] shrink-0" /> : <Brain className="size-2.5 text-[#888] shrink-0" />}
        <span className={isRunning ? 'vibeforge-wave-text' : 'text-[#aaa]'}>{label}</span>
        {filePath && <span className="text-[#d4d4d4] truncate max-w-[180px]">{filePath}</span>}
      </div>
    );
  }

  return (
    <div className="text-[9px] font-mono flex items-center gap-1.5 py-0.5">
      {isRunning ? <Loader2 className="size-2.5 animate-spin text-[#007acc] shrink-0" /> : <Cpu className="size-2.5 text-[#888] shrink-0" />}
      <span className={isRunning ? 'vibeforge-wave-text' : 'text-[#aaa]'}>{step.toolName}</span>
      {filePath && <span className="text-[#d4d4d4] truncate max-w-[180px]">{filePath}</span>}
    </div>
  );
}

export const AiMessageBubble = memo(function AiMessageBubble({ role, content, steps, model, provider, isLast }: { role: string; content: string; steps?: AgentStep[]; model?: string; provider?: string; isLast?: boolean }) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-[#264f78] text-[#d4e4f7] min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Cpu className="size-3 text-[#9cdcfe]" />
            <span className="font-semibold text-[10px] uppercase tracking-wide text-[#9cdcfe]">You</span>
          </div>
          <p className="whitespace-pre-wrap break-words overflow-hidden">{content}</p>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-md px-3 py-1.5 text-[10px] bg-[#1e1e1e] text-[#888] border border-[#333] italic flex items-center gap-1.5">
          <AlertCircle className="size-3" />
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] min-w-0 rounded-lg text-xs leading-relaxed bg-[#2d2d2d] text-[#cccccc] border border-[#3a3a3a] overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 border-b border-[#3a3a3a]">
          <Bot className="size-3.5 text-[#4ec9b0]" />
          <span className="font-semibold text-[10px] uppercase tracking-wide text-[#4ec9b0]">VibeForge AI</span>
          {(provider || model) && (
            <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-[#1e1e1e] text-[#888] rounded font-mono flex items-center gap-1">
              {provider && <span className="text-[#4ec9b0]/80">{provider}</span>}
              {provider && model && <span className="text-[#444]">·</span>}
              {model && <span>{model}</span>}
            </span>
          )}
        </div>

        {steps && steps.length > 0 && (() => {
          const allFinished = steps.every(s => s.type === 'thought' || !!s.toolOutput);
          const toolSteps = steps.filter(s => s.type === 'tool_call');
          const isActivelyStreaming = isLast && !allFinished;

          if (!isActivelyStreaming && content && toolSteps.length > 0) {
            return null;
          }

          return (
            <div className="flex flex-col mx-3 mt-2 gap-0">
              {steps.map((step, idx) => {
                if (step.type === 'thought') {
                  const isActive = !step.toolOutput && idx === steps.length - 1;
                  return (
                    <div key={idx} className="text-[10px] py-1 px-1">
                      <span className={isActive ? 'vibeforge-wave-text' : 'text-[#999] italic'}>
                        {step.text ? step.text.slice(0, 150) + (step.text.length > 150 ? '...' : '') : (isActive ? 'Thinking...' : '')}
                      </span>
                    </div>
                  );
                }
                if (step.type === 'tool_call') {
                  return (
                    <div key={idx}>
                      <ActivityDivider />
                      <ToolCallStep step={step} />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        })()}

        {content && (() => {
          // Strip any raw tool XML that leaked into the content stream
          const cleanContent = content
            .replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')
            .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
            .replace(/<\/?tool[^>]*>/g, '')
            .trim();
          if (!cleanContent) return null;
          return (
            <div className="px-3 py-2 prose prose-invert prose-ide max-w-none text-[#d4d4d4] [&_code]:text-[#ce9178] [&_pre]:bg-[#1e1e1e] [&_pre]:border [&_pre]:border-[#3a3a3a] [&_h1]:text-[#4ec9b0] [&_h2]:text-[#4ec9b0] [&_h3]:text-[#4ec9b0] [&_blockquote]:border-[#3a3a3a] [&_strong]:text-[#e0e0e0] [&_a]:text-[#4fc1ff] [&_p]:text-[#d4d4d4] [&_li]:text-[#d4d4d4] overflow-hidden break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown>
            </div>
          );
        })()}

        {steps && steps.length > 0 && (() => {
          const allFinished = steps.every(s => s.type === 'thought' || !!s.toolOutput);
          const toolSteps = steps.filter(s => s.type === 'tool_call');
          const readSteps = toolSteps.filter(s => s.toolName === 'read_file');
          const searchSteps = toolSteps.filter(s => s.toolName === 'list_directory');
          const isActivelyStreaming = isLast && !allFinished;

          if (isActivelyStreaming || !content || toolSteps.length === 0) return null;

          return (
            <details className="mx-3 mt-1 mb-2 group">
              <summary className="flex items-center gap-1.5 text-[9px] text-[#888] cursor-pointer hover:text-[#cccccc] transition-colors select-none list-none">
                <ChevronRight className="size-2.5 shrink-0 group-open:rotate-90 transition-transform" />
                <span>Show output</span>
                <span className="text-[#777]">
                  {readSteps.length > 0 && `${readSteps.length} file${readSteps.length > 1 ? 's' : ''}`}
                  {readSteps.length > 0 && searchSteps.length > 0 && ' · '}
                  {searchSteps.length > 0 && `${searchSteps.length} folder${searchSteps.length > 1 ? 's' : ''}`}
                  {(readSteps.length === 0 && searchSteps.length === 0) && `${toolSteps.length} step${toolSteps.length > 1 ? 's' : ''}`}
                </span>
              </summary>
              <div className="flex flex-col gap-0 mt-1 pl-1">
                {steps.map((step, idx) => {
                  if (step.type === 'thought') return <div key={idx} className="text-[9px] text-[#888] italic py-0.5 truncate">{step.text?.slice(0, 80)}</div>;
                  if (step.type === 'tool_call') return (
                    <div key={idx}>
                      <ActivityDivider />
                      <ToolCallStep step={step} />
                    </div>
                  );
                  return null;
                })}
              </div>
            </details>
          );
        })()}

        {isLast && !content && (!steps || steps.length === 0) && (
          <div className="px-3 py-3 flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin text-[#4ec9b0] shrink-0" />
            <span className="text-[10px] vibeforge-wave-text font-medium">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
});
