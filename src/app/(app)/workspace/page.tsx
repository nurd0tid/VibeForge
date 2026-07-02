'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useProject } from '@/features/projects/hooks';
import { getField, getFieldBool } from '@/lib/nocodb-fields';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import type { Provider, NocoDBListResponse } from '@/types';
import type { AgentStep } from '@/stores/workspace.store';
import Link from 'next/link';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Files,
  Search,
  GitBranch,
  ListTodo,
  Bot,
  X,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileText,
  File as GenericFileIcon,
  FolderOpen,
  Folder,
  Circle,
  Send,
  Loader2,
  RefreshCw,
  FolderSearch,
  AlertTriangle,
  Terminal,
  AlertCircle,
  Cpu,
  CheckCircle2,
  SquareX,
  XCircle,
  FilePlus,
  FileMinus,
  FileQuestion,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  GitCommit,
  Lock,
  ChevronsUpDown,
} from 'lucide-react';

interface GitChange {
  status: string;
  file: string;
}

function GitSourceControl({ projectPath, defaultBranch }: { projectPath: string; defaultBranch: string }) {
  const [commitMessage, setCommitMessage] = useState('');
  const [isActionRunning, setIsActionRunning] = useState(false);
  
  const { data, isLoading, refetch } = useQuery<{ branch: string; changes: GitChange[]; error?: string }>({
    queryKey: ['git-status', projectPath],
    queryFn: async () => {
      if (!projectPath) return { branch: defaultBranch, changes: [] };
      const res = await fetch(`/api/workspace/git/status?path=${encodeURIComponent(projectPath)}`);
      if (!res.ok) return { branch: defaultBranch, changes: [], error: 'Failed to fetch' };
      return res.json();
    },
    enabled: !!projectPath,
    refetchInterval: 10000,
  });

  const runGitAction = async (action: 'pull' | 'push' | 'sync' | 'commit') => {
    if (!projectPath) {
      toast.error('No project path configured');
      return;
    }
    if (action === 'commit' && !commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }

    setIsActionRunning(true);
    const actionPromise = fetch('/api/workspace/git/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        path: projectPath,
        message: action === 'commit' ? commitMessage.trim() : undefined,
      }),
    });

    toast.promise(actionPromise, {
      loading: `Running git ${action}...`,
      success: async (res) => {
        const body = await res.json();
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Action failed');
        }
        if (action === 'commit') {
          setCommitMessage('');
        }
        refetch();
        return `Git ${action} succeeded`;
      },
      error: (err) => err.message || `Git ${action} failed`,
    });

    try {
      await actionPromise;
    } catch {} finally {
      setIsActionRunning(false);
    }
  };

  const branch = data?.branch || defaultBranch;
  const changes = data?.changes || [];
  const gitError = data?.error;

  const staged = changes.filter(c => {
    const x = c.status[0];
    return x !== ' ' && x !== '?';
  });
  const unstaged = changes.filter(c => {
    const y = c.status[1];
    return y !== ' ' && c.status[0] !== '?';
  });
  const untracked = changes.filter(c => c.status.trim() === '??');

  const getStatusIcon = (status: string) => {
    const s = status.trim();
    if (s.includes('M')) return <FilePlus className="size-3.5 text-[#e2c08d]" />;
    if (s.includes('A') || s.includes('?')) return <FilePlus className="size-3.5 text-[#73c991]" />;
    if (s.includes('D')) return <FileMinus className="size-3.5 text-[#c74e39]" />;
    return <FileQuestion className="size-3.5 text-[#888]" />;
  };

  const getStatusLabel = (status: string) => {
    const s = status.trim();
    if (s === 'M' || s === ' M') return 'Modified';
    if (s === 'A' || s === 'AM') return 'Added';
    if (s === 'D' || s === ' D') return 'Deleted';
    if (s === '??') return 'Untracked';
    if (s === 'R') return 'Renamed';
    return s;
  };

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb]">
          Source Control
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => runGitAction('pull')} disabled={isActionRunning} title="Pull" className="text-[#888] hover:text-[#cccccc] transition-colors disabled:opacity-40">
            <ArrowDown className="size-3.5" />
          </button>
          <button onClick={() => runGitAction('push')} disabled={isActionRunning} title="Push" className="text-[#888] hover:text-[#cccccc] transition-colors disabled:opacity-40">
            <ArrowUp className="size-3.5" />
          </button>
          <button onClick={() => runGitAction('sync')} disabled={isActionRunning} title="Sync (Pull + Push)" className="text-[#888] hover:text-[#cccccc] transition-colors disabled:opacity-40">
            <ArrowUpDown className="size-3.5" />
          </button>
          <button onClick={() => refetch()} title="Refresh" className="text-[#888] hover:text-[#cccccc] transition-colors">
            <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-[#1e1e1e] flex items-center gap-2">
        <GitBranch className="size-3.5 text-[#75beff]" />
        <span className="text-xs text-[#cccccc] font-mono">{branch}</span>
      </div>

      <div className="px-2 py-2 border-b border-[#1e1e1e]">
        <div className="flex gap-1">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runGitAction('commit');
            }}
            placeholder="Commit message"
            className="flex-1 bg-[#3c3c3c] text-[#cccccc] text-xs px-2 py-1.5 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none min-w-0"
          />
          <button
            onClick={() => runGitAction('commit')}
            disabled={isActionRunning || !commitMessage.trim()}
            title="Commit All"
            className="bg-[#007acc] text-white text-[10px] px-2 py-1 rounded hover:bg-[#006bb3] transition-colors disabled:opacity-40 flex items-center gap-1 flex-shrink-0"
          >
            <GitCommit className="size-3" />
            Commit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!projectPath ? (
          <div className="p-4 text-center">
            <p className="text-xs text-[#666]">No project path configured.</p>
          </div>
        ) : gitError && changes.length === 0 ? (
          <div className="p-4 text-center">
            <AlertTriangle className="size-6 text-[#cc6633] mx-auto mb-2" />
            <p className="text-xs text-[#888]">{gitError}</p>
          </div>
        ) : changes.length === 0 ? (
          <div className="p-4 text-center">
            <CheckCircle2 className="size-6 text-[#73c991] mx-auto mb-2" />
            <p className="text-xs text-[#888]">Working tree clean</p>
            <p className="text-[10px] text-[#555] mt-1">No uncommitted changes</p>
          </div>
        ) : (
          <div>
            {staged.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-[#888] uppercase tracking-widest border-b border-[#1e1e1e] flex items-center justify-between">
                  <span>Staged Changes</span>
                  <span className="text-[#4ec9b0]">{staged.length}</span>
                </div>
                {staged.map((change, i) => (
                  <div key={`s-${i}`} className="flex items-center gap-2 px-3 py-1 hover:bg-[#2a2d2e] transition-colors cursor-pointer group">
                    {getStatusIcon(change.status)}
                    <span className="text-xs text-[#cccccc] truncate flex-1 font-mono">{change.file}</span>
                    <span className="text-[9px] text-[#4ec9b0] font-bold">{change.status[0]}</span>
                  </div>
                ))}
              </>
            )}
            {unstaged.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-[#888] uppercase tracking-widest border-b border-[#1e1e1e] flex items-center justify-between">
                  <span>Changes</span>
                  <span className="text-[#e2c08d]">{unstaged.length}</span>
                </div>
                {unstaged.map((change, i) => (
                  <div key={`u-${i}`} className="flex items-center gap-2 px-3 py-1 hover:bg-[#2a2d2e] transition-colors cursor-pointer group">
                    {getStatusIcon(change.status)}
                    <span className="text-xs text-[#cccccc] truncate flex-1 font-mono">{change.file}</span>
                    <span className="text-[9px] text-[#e2c08d] font-bold opacity-0 group-hover:opacity-100">{getStatusLabel(change.status)}</span>
                  </div>
                ))}
              </>
            )}
            {untracked.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-[#888] uppercase tracking-widest border-b border-[#1e1e1e] flex items-center justify-between">
                  <span>Untracked Files</span>
                  <span className="text-[#888]">{untracked.length}</span>
                </div>
                {untracked.map((change, i) => (
                  <div key={`ut-${i}`} className="flex items-center gap-2 px-3 py-1 hover:bg-[#2a2d2e] transition-colors cursor-pointer group">
                    <FilePlus className="size-3.5 text-[#73c991]" />
                    <span className="text-xs text-[#cccccc] truncate flex-1 font-mono">{change.file}</span>
                    <span className="text-[9px] text-[#73c991]">U</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceTerminal({ cwd: initialCwd }: { cwd: string }) {
  const [cwd, setCwd] = useState(initialCwd);
  const [output, setOutput] = useState<{ type: 'command' | 'stdout' | 'stderr'; text: string }[]>([
    { type: 'stdout', text: 'VibeForge Terminal Ready.' },
    { type: 'stdout', text: `Directory: ${initialCwd}` }
  ]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [output]);

  const handleCommand = async () => {
    if (!input.trim()) return;
    const cmd = input.trim();
    setInput('');
    setOutput(prev => [...prev, { type: 'command', text: `$ ${cmd}` }]);

    if (cmd.startsWith('cd ')) {
      const target = cmd.substring(3).trim();
      const newCwd = target.startsWith('/') || target.match(/^[a-zA-Z]:\\/) 
        ? target 
        : `${cwd}/${target}`.replace(/\/{2,}/g, '/'); // Simple naive path join for MVP
      setCwd(newCwd);
      setOutput(prev => [...prev, { type: 'stdout', text: `Moved to ${newCwd}` }]);
      return;
    }
    
    if (cmd === 'clear') {
      setOutput([]);
      return;
    }

    setIsExecuting(true);
    try {
      const res = await fetch('/api/workspace/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, cwd })
      });
      const data = await res.json();
      
      if (data.stdout) {
        setOutput(prev => [...prev, { type: 'stdout', text: data.stdout }]);
      }
      if (data.stderr || data.error) {
        setOutput(prev => [...prev, { type: 'stderr', text: data.stderr || data.error }]);
      }
    } catch (e: any) {
      setOutput(prev => [...prev, { type: 'stderr', text: e.message || 'Execution failed' }]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e] text-[#4ec9b0] font-mono p-3 text-xs overflow-y-auto">
      {output.map((line, i) => (
        <div key={i} className={`whitespace-pre-wrap ${line.type === 'command' ? 'text-white font-semibold mt-1' : line.type === 'stderr' ? 'text-[#f48771]' : 'text-[#cccccc]'}`}>
          {line.text}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[#4ec9b0] shrink-0">$</span>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommand();
          }}
          disabled={isExecuting}
          className="flex-1 bg-transparent outline-none border-none text-[#cccccc]"
          autoFocus
          spellCheck={false}
        />
      </div>
      <div ref={scrollRef} />
    </div>
  );
}

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  { ssr: false }
);

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

function getLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    py: 'python',
    rs: 'rust',
    go: 'go',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    sh: 'shell',
    bash: 'shell',
    env: 'plaintext',
    txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
    return <FileCode className="size-4 flex-shrink-0 text-[#519aba]" />;
  }
  if (ext === 'json') {
    return <FileJson className="size-4 flex-shrink-0 text-[#cbcb41]" />;
  }
  if (['md', 'txt'].includes(ext)) {
    return <FileText className="size-4 flex-shrink-0 text-[#519aba]" />;
  }

  return <GenericFileIcon className="size-4 flex-shrink-0 text-[#cccccc]" />;
}

function FileTreeNode({
  node,
  depth,
  onFileClick,
}: {
  node: FileNode;
  depth: number;
  onFileClick: (path: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const collapseAllTrigger = useWorkspaceStore((s) => s.collapseAllTrigger);
  const isActive = !node.isDirectory && activeFilePath === node.path;

  const IGNORED_NAMES = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo', '__pycache__', '.DS_Store', 'coverage'];
  const isIgnored = node.name.startsWith('.') || IGNORED_NAMES.includes(node.name);

  useEffect(() => {
    if (collapseAllTrigger > 0 && expanded) {
      setTimeout(() => setExpanded(false), 0);
    }
  }, [collapseAllTrigger, expanded]);

  if (node.isDirectory) {
    return (
      <div>
        <button
          className={`w-full flex items-center gap-1.5 min-h-[26px] leading-[1.5] hover:bg-[#2a2d2e] transition-colors ${isIgnored ? 'opacity-50' : 'text-[#cccccc]'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="size-3 flex-shrink-0 text-[#cccccc]" />
          ) : (
            <ChevronRight className="size-3 flex-shrink-0 text-[#cccccc]" />
          )}
          {expanded ? (
            <FolderOpen className="size-4 flex-shrink-0 text-[#dcb67a]" />
          ) : (
            <Folder className="size-4 flex-shrink-0 text-[#dcb67a]" />
          )}
          <span className="text-[13px] text-ellipsis overflow-hidden whitespace-nowrap text-left">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`w-full flex items-center gap-1.5 min-h-[26px] leading-[1.5] transition-colors ${
        isActive
          ? 'bg-[#094771] text-white opacity-100'
          : `hover:bg-[#2a2d2e] ${isIgnored ? 'opacity-50 text-[#cccccc]' : 'text-[#cccccc]'}`
      }`}
      style={{ paddingLeft: `${depth * 16 + 24}px` }}
      onClick={() => onFileClick(node.path, node.name)}
    >
      <FileTypeIcon name={node.name} />
      <span className="text-[13px] text-ellipsis overflow-hidden whitespace-nowrap text-left">{node.name}</span>
    </button>
  );
}

const ACTIVITY_ITEMS = [
  { key: 'explorer' as const, icon: Files, label: 'Explorer' },
  { key: 'search' as const, icon: Search, label: 'Search' },
  { key: 'git' as const, icon: GitBranch, label: 'Source Control' },
  { key: 'tasks' as const, icon: ListTodo, label: 'Tasks' },
  { key: 'ai' as const, icon: Bot, label: 'AI Assistant' },
] as const;

const BOTTOM_TABS = [
  { key: 'problems' as const, label: 'Problems' },
  { key: 'output' as const, label: 'Output' },
  { key: 'terminal' as const, label: 'Terminal' },
  { key: 'git-diff' as const, label: 'Git Diff' },
  { key: 'agent-logs' as const, label: 'Agent Logs' },
] as const;

const AI_SKILLS = [
  { id: 'planning', label: '@planning', description: 'Generate a task plan' },
  { id: 'create-task', label: '@create-task', description: 'Create new tasks' },
  { id: 'review-code', label: '@review-code', description: 'Review code changes' },
  { id: 'daily-log', label: '@daily-log', description: 'Write a daily log' },
  { id: 'update-context', label: '@update-context', description: 'Update project context' },
];

function flattenTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const n of nodes) {
    if (!n.isDirectory) result.push(n);
    if (n.children) result.push(...flattenTree(n.children));
  }
  return result;
}

function flattenTreePaths(nodes: FileNode[], prefix = ''): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    result.push(fullPath);
    if (node.isDirectory && node.children) {
      result.push(...flattenTreePaths(node.children, fullPath));
    }
  }
  return result;
}

function ToolCallStep({ step }: { step: AgentStep }) {
  const [userCollapsed, setUserCollapsed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const isFinished = !!step.toolOutput;
  const isOpen = !isFinished || !userCollapsed;

  useEffect(() => {
    if (isOpen && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [step.toolOutput, isOpen]);

  return (
    <div className="border border-[#3a3a3a] rounded bg-[#252526] overflow-hidden">
      <button
        onClick={() => { if (isFinished) setUserCollapsed(!userCollapsed); }}
        className={`flex items-center gap-2 px-2.5 py-1.5 w-full text-left text-[10px] bg-[#2d2d2d] hover:bg-[#333] transition-colors ${!isFinished ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {!step.toolOutput ? (
          <Loader2 className="size-3 animate-spin text-[#007acc]" />
        ) : step.isError ? (
          <XCircle className="size-3 text-[#c74e39]" />
        ) : (
          <CheckCircle2 className="size-3 text-[#4ec9b0]" />
        )}
        <span className="text-[#cccccc] font-mono">{step.toolName}</span>
        {!!(step.toolArgs?.path) && (
          <span className="text-[#888] truncate">{String(step.toolArgs.path)}</span>
        )}
        <ChevronDown className={`size-3 text-[#666] ml-auto transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
      </button>
      {isOpen && (
        <div className="max-h-48 overflow-y-auto p-2 text-[10px] font-mono text-[#888] bg-[#1e1e1e] whitespace-pre-wrap">
          {step.toolOutput || 'Running...'}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

function AiMessageBubble({ role, content, steps, model }: { role: string; content: string; steps?: AgentStep[]; model?: string }) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-[#264f78] text-[#d4e4f7]">
          <div className="flex items-center gap-1.5 mb-1">
            <Cpu className="size-3 text-[#9cdcfe]" />
            <span className="font-semibold text-[10px] uppercase tracking-wide text-[#9cdcfe]">You</span>
          </div>
          <p className="whitespace-pre-wrap">{content}</p>
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
      <div className="max-w-[90%] rounded-lg text-xs leading-relaxed bg-[#2d2d2d] text-[#cccccc] border border-[#3a3a3a]">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 border-b border-[#3a3a3a]">
          <Bot className="size-3.5 text-[#4ec9b0]" />
          <span className="font-semibold text-[10px] uppercase tracking-wide text-[#4ec9b0]">VibeForge AI</span>
          {model && (
            <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-[#1e1e1e] text-[#888] rounded font-mono">{model}</span>
          )}
        </div>

        {steps && steps.length > 0 && (
          <div className="flex flex-col gap-1 mx-3 mt-2">
            {steps.map((step, idx) => {
              if (step.type === 'thought') {
                return (
                  <details key={idx} className="group">
                    <summary className="flex items-center gap-1 text-[10px] text-[#888] hover:text-[#cccccc] transition-colors cursor-pointer select-none">
                      <ChevronRight className="size-3 group-open:hidden" />
                      <ChevronDown className="size-3 hidden group-open:block" />
                      <span className="italic">Thinking...</span>
                    </summary>
                    <div className="mt-1 mb-1 text-[10px] text-[#777] italic bg-[#1a1a1a] rounded p-2 border border-[#333]">
                      {step.text}
                    </div>
                  </details>
                );
              }
              if (step.type === 'tool_call') {
                return <ToolCallStep key={idx} step={step} />;
              }
              return null;
            })}
          </div>
        )}

        {content && (
          <div className="px-3 py-2 prose prose-invert prose-ide max-w-none text-[#cccccc] [&_code]:text-[#ce9178] [&_pre]:bg-[#1e1e1e] [&_pre]:border [&_pre]:border-[#3a3a3a] [&_h1]:text-[#4ec9b0] [&_h2]:text-[#4ec9b0] [&_h3]:text-[#4ec9b0] [&_blockquote]:border-[#3a3a3a]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

const COMMAND_ITEMS = [
  { id: 'new', label: '/new', description: 'Start a new chat session' },
  { id: 'sessions', label: '/sessions', description: 'Show saved sessions' },
  { id: 'clear', label: '/clear', description: 'Clear current conversation' },
  { id: 'mcp-list', label: '/mcp-list', description: 'Show connected MCP servers' },
  { id: 'init-memory', label: '/init-memory', description: 'Initialize memory bank for current project' },
];

export default function WorkspacePage() {
  const { activeProjectId } = useUiStore();
  const { data: project } = useProject(activeProjectId);
  const projectPath = project?.local_path || (project as unknown as Record<string, string>)?.['Local Path'] || '';
  const projectDefaultBranch = project?.default_branch || (project as unknown as Record<string, string>)?.['Default Branch'] || 'main';
  const {
    openFiles,
    activeFilePath,
    activePanel,
    bottomTab,
    aiMessages,
    chatSessions,
    activeChatSessionId,
    isAgentRunning,
    agentStatusText,
    openFile,
    closeFile,
    setActiveFile,
    updateFileContent,
    markFileSaved,
    setActivePanel,
    setBottomTab,
    addAiMessage,
    updateLastAiMessage,
    updateLastAiMessageSteps,
    clearAiMessages,
    triggerCollapseAll,
    loadChatSession,
    newChatSession,
    saveChatSession,
    setAgentRunning,
    setAgentStatusText,
  } = useWorkspaceStore();

  const [aiInput, setAiInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [skillQuery, setSkillQuery] = useState('');
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [sessionsMenuOpen, setSessionsMenuOpen] = useState(false);
  const [fileSearchOpen, setFileSearchOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const aiEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const aiTextareaRef = useRef<HTMLTextAreaElement>(null);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  // --- AI Config State ---
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const { data: providersData } = useQuery<NocoDBListResponse<Provider>>({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers?limit=100');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
  });
  const providers = providersData?.list || [];
  const activeProviders = providers.filter(p => getFieldBool(p as unknown as Record<string, unknown>, 'is_active', 'Is Active'));
  const defaultProvider = activeProviders[0] || providers[0];
  const effectiveProviderId = selectedProviderId || defaultProvider?.Id?.toString() || '';
  const effectiveProvider = providers.find(p => p.Id?.toString() === effectiveProviderId);

  // Fetch models for active provider
  const { data: modelsData } = useQuery<{ models: { id: string, name: string }[] }>({
    queryKey: ['provider-models', effectiveProviderId],
    queryFn: async () => {
      if (!effectiveProvider) return { models: [] };
      const config = typeof effectiveProvider.config === 'string' ? JSON.parse(effectiveProvider.config || '{}') : (effectiveProvider.config || {});
      const baseUrl = getField(effectiveProvider as unknown as Record<string, unknown>, 'base_url', 'Base URL');
      const res = await fetch('/api/providers/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: effectiveProvider.Id,
          type: effectiveProvider.type,
          baseUrl,
          apiKeyMode: config.apiKeyMode,
          apiKeyEnvName: config.apiKeyEnvName,
          directApiKey: config.directApiKey,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json();
    },
    enabled: !!effectiveProviderId && !!effectiveProvider,
  });
  const activeModels = modelsData?.models || [];
  const providerDefaultModel = effectiveProvider ? getField(effectiveProvider as unknown as Record<string, unknown>, 'default_model', 'Default Model') : '';
  const defaultModelId = providerDefaultModel || activeModels[0]?.id || '';
  const effectiveModelId = (selectedModelId && activeModels.find(m => m.id === selectedModelId)) ? selectedModelId : defaultModelId;

  const { data: fileTree = [], isLoading: isLoadingTree, refetch: refetchTree } = useQuery<FileNode[]>({
    queryKey: ['workspace-tree', projectPath],
    queryFn: async () => {
      if (!projectPath) return [];
      const res = await fetch(`/api/workspace/tree?path=${encodeURIComponent(projectPath)}`);
      if (!res.ok) throw new Error('Failed to fetch tree');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!projectPath,
  });

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleFileClick = useCallback(
    async (filePath: string, fileName: string) => {
      const existing = openFiles.find((f) => f.path === filePath);
      if (existing) {
        setActiveFile(filePath);
        return;
      }
      try {
        const res = await fetch(
          `/api/workspace/file?path=${encodeURIComponent(filePath)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        openFile(filePath, fileName, data.content || '');
      } catch {
      }
    },
    [openFiles, setActiveFile, openFile]
  );

  const handleSave = useCallback(async () => {
    if (!activeFile || !activeFile.isDirty) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/workspace/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeFile.path,
          content: activeFile.content,
        }),
      });
      if (res.ok) {
        markFileSaved(activeFile.path);
      }
    } catch {
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, markFileSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleSendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setSkillMenuOpen(false);
    setFileSearchOpen(false);

    // Handle slash commands locally
    if (userMsg === '/new') {
      newChatSession();
      return;
    }
    if (userMsg === '/clear') {
      clearAiMessages();
      return;
    }
    if (userMsg === '/mcp-list') {
      addAiMessage({ role: 'user', content: '/mcp-list' });
      const res = await fetch('/api/mcp');
      const data = await res.json();
      const servers = data.servers || [];
      const content = servers.length === 0
        ? '**No MCP servers configured.**\n\nGo to Settings → MCP Servers to add one.'
        : `**Connected MCP Servers (${servers.filter((s: Record<string, unknown>) => s.enabled !== false).length} enabled):**\n\n${servers.map((s: Record<string, unknown>) => `- **${s.name}** — \`${s.commandOrUrl}\` ${s.enabled === false ? '(disabled)' : '✅'}`).join('\n')}`;
      addAiMessage({ role: 'assistant', content });
      return;
    }
    if (userMsg === '/init-memory') {
      addAiMessage({ role: 'user', content: '/init-memory' });
      if (!projectPath) {
        addAiMessage({ role: 'assistant', content: '**No project path configured.** Please set a local path for the project in the Projects page first.' });
        return;
      }
      addAiMessage({ role: 'assistant', content: `🔄 Initializing memory bank for project at \`${projectPath}\`...\n\nThis will create a \`.vibeforge/\` directory in your project with:\n- **memory-bank.md** — project context & AI memory\n- **skills.md** — available skill definitions\n- **AGENTS.md** — AI agent rules for this project` });
      // Actually create the files
      try {
        await fetch('/api/workspace/terminal/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `mkdir -p .vibeforge && echo "" > .vibeforge/memory-bank.md`, cwd: projectPath })
        });
        const mbContent = `# Memory Bank — ${project?.name || 'Project'}\n\n## Project Context\n\n> This file is auto-updated by VibeForge AI Agent.\n\n## Current Goal\n\n[Agent will fill this in]\n\n## Architecture Decisions\n\n[Agent will fill this in]\n\n## Key Conventions\n\n[Agent will fill this in]\n\n## Recent Changes\n\n[Agent will fill this in]\n`;
        await fetch('/api/workspace/file', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `${projectPath}/.vibeforge/memory-bank.md`, content: mbContent })
        });
        addAiMessage({ role: 'assistant', content: `✅ **Memory Bank initialized!**\n\nCreated \`.vibeforge/memory-bank.md\` in your project. The AI agent will now read and update this file on every session to maintain context about your project.\n\nYou can view it in the file explorer.` });
      } catch {
        addAiMessage({ role: 'assistant', content: '❌ Failed to initialize memory bank. Please check the project path.' });
      }
      return;
    }

    // Parse skill if present
    let skill = '';
    const skillMatch = userMsg.match(/@([\w-]+)/);
    if (skillMatch) {
      skill = skillMatch[1];
    }
    
    addAiMessage({ role: 'user', content: userMsg });
    addAiMessage({ role: 'assistant', content: '' });
    
    if (!activeChatSessionId) {
      setTimeout(() => saveChatSession(), 0);
    }
    
    setAgentRunning(true, 'Analyzing your request...');
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...aiMessages, { role: 'user', content: userMsg }],
          providerId: effectiveProviderId,
          model: effectiveModelId,
          skill,
          projectPath,
          projectId: activeProjectId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start chat streaming');
      }

      if (!response.body) {
        throw new Error('No response body from chat API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = '';
      const currentSteps: AgentStep[] = [];
      let fullContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulated += chunk;
          
          const parts = accumulated.split('\n\n');
          accumulated = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim()) continue;
            const lines = part.split('\n').map(l => l.trim()).filter(Boolean);
            const eventLine = lines.find(l => l.startsWith('event:'));
            const dataLine = lines.find(l => l.startsWith('data:'));
            if (!eventLine || !dataLine) continue;

            const eventType = eventLine.replace(/^event:\s*/, '').trim();
            const dataStr = dataLine.replace(/^data:\s*/, '').trim();
            
            if (eventType === 'done') {
              done = true;
              break;
            }

            try {
              const data = JSON.parse(dataStr);
              if (eventType === 'thought') {
                currentSteps.push({ type: 'thought', text: data.text });
                setAgentStatusText(`Thinking: ${(data.text || '').slice(0, 60)}...`);
              } else if (eventType === 'tool_call') {
                currentSteps.push({ type: 'tool_call', toolId: data.id, toolName: data.name, toolArgs: data.args });
                const argHint = data.args?.path || data.args?.command || '';
                setAgentStatusText(`Running: ${data.name}${argHint ? ' ' + argHint : ''}`.slice(0, 80));
              } else if (eventType === 'tool_result') {
                const targetStep = currentSteps.find(s => s.type === 'tool_call' && s.toolId === data.id);
                if (targetStep) {
                  targetStep.toolOutput = data.output;
                  targetStep.isError = data.isError;
                  // Optionally trigger handleFileClick if it was a file read/edit
                  if (!data.isError && (data.name === 'read_file' || data.name === 'edit_file')) {
                    // we could theoretically do handleFileClick(data.args.path, data.args.path.split('/').pop()) but we don't have the args here unless we stored them
                  }
                }
              } else if (eventType === 'content') {
                fullContent += data.delta || '';
              }
            } catch (e) {
              console.error('Failed to parse SSE JSON', e, dataStr);
            }
          }
          updateLastAiMessageSteps([...currentSteps], fullContent);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info('Generation stopped');
      } else {
        toast.error(err.message || 'Error occurred during streaming');
        updateLastAiMessage('An error occurred while communicating with the AI.');
      }
    } finally {
      setAgentRunning(false);
      abortControllerRef.current = null;
    }
  };

  const renderSidebarContent = () => {
    switch (activePanel) {
      case 'explorer':
        return (
          <div className="flex flex-col h-full bg-[#252526]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb]">
                Explorer
              </span>
              {projectPath && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={triggerCollapseAll}
                    title="Collapse All"
                    className="text-[#888] hover:text-[#cccccc] transition-colors"
                  >
                    <ChevronsUpDown className="size-3" />
                  </button>
                  <button
                    onClick={() => refetchTree()}
                    title="Refresh file tree"
                    className="text-[#888] hover:text-[#cccccc] transition-colors"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                </div>
              )}
            </div>

            {!activeProjectId ? (
              <div className="flex flex-col items-center justify-center flex-1 p-4 text-center gap-3">
                <Files className="size-8 text-[#555]" />
                <p className="text-xs text-[#888]">No project selected</p>
                <p className="text-[10px] text-[#555]">Select a project from the Projects page.</p>
              </div>
            ) : !projectPath ? (
              <div className="flex flex-col items-center justify-center flex-1 p-4 text-center gap-3">
                <AlertTriangle className="size-8 text-[#cc6633]" />
                <p className="text-xs text-[#888]">No local path</p>
                <p className="text-[10px] text-[#555]">Set a local path on the project settings.</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-[#1e1e1e]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-0.5">
                    {project?.name || 'Project'}
                  </p>
                  <p className="text-[10px] text-[#666] font-mono truncate" title={projectPath}>
                    {projectPath.split(/[/\\]/).pop() || projectPath}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto select-none pt-1">
                  {isLoadingTree ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="size-5 animate-spin text-[#888]" />
                    </div>
                  ) : fileTree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                      <FolderSearch className="size-8 text-[#555]" />
                      <p className="text-xs text-[#888]">No files found</p>
                      <button
                        onClick={() => refetchTree()}
                        className="text-[10px] text-[#007acc] hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="size-3" /> Refresh
                      </button>
                    </div>
                  ) : (
                    fileTree.map((node) => (
                      <FileTreeNode
                        key={node.path}
                        node={node}
                        depth={0}
                        onFileClick={handleFileClick}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        );
      case 'search':
        return (
          <div className="flex flex-col h-full bg-[#252526]">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb] border-b border-[#1e1e1e]">
              Search
            </div>
            <div className="p-3">
              <input
                type="text"
                placeholder="Search files..."
                className="w-full bg-[#3c3c3c] text-[#cccccc] text-sm px-3 py-1.5 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none"
              />
            </div>
            <div className="flex-1 p-3 text-xs text-[#666]">
              Search results will appear here.
            </div>
          </div>
        );
      case 'git':
        return <GitSourceControl projectPath={projectPath} defaultBranch={projectDefaultBranch} />;
      case 'tasks':
        return (
          <div className="flex flex-col h-full bg-[#252526]">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb] border-b border-[#1e1e1e]">
              Tasks
            </div>
            <div className="flex-1 p-3 text-xs text-[#666]">
              No active tasks. Create a task from the Tasks page.
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="flex flex-col h-full bg-[#252526]">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb] border-b border-[#1e1e1e]">
              Quick AI
            </div>
            <div className="flex-1 p-3 text-xs text-[#666]">
              Full AI panel is available on the right side of the editor.
            </div>
          </div>
        );
    }
  };

  // We do not return early anymore, so the IDE shell is always visible.

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
      
      {/* Main Workspace Area (Activity Bar + Panels) */}
      <div className="flex flex-1 h-full min-h-0 min-w-0 overflow-hidden">
        
        {/* 1. FIXED ACTIVITY BAR */}
        <div className="w-12 shrink-0 bg-[#333333] border-r border-[#252526] z-10 flex flex-col items-center py-2 gap-0.5">
          {ACTIVITY_ITEMS.map((item) => {
            const isActive = activePanel === item.key;
            return (
              <button
                key={item.key}
                title={item.label}
                className={`p-2.5 rounded transition-colors relative ${
                  isActive && isSidebarOpen ? 'text-white' : 'text-[#858585] hover:text-white'
                }`}
                onClick={() => {
                  if (isActive) {
                    setIsSidebarOpen(!isSidebarOpen);
                  } else {
                    setActivePanel(item.key);
                    setIsSidebarOpen(true);
                  }
                }}
              >
                {isActive && isSidebarOpen && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-white rounded-r" />
                )}
                <item.icon className="size-5" />
              </button>
            );
          })}
        </div>

        {/* 2. EXPLORER / SIDE PANEL (Fixed CSS width, collapsible) */}
        {isSidebarOpen && (
          <div className="w-[260px] shrink-0 flex flex-col bg-[#252526] border-r border-[#1e1e1e] overflow-hidden relative">
            <div className="absolute inset-0 flex flex-col overflow-hidden">
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* 3. CENTER COLUMN (Flexible flex-1, resizable vertically) */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
          <div className="absolute inset-0 flex flex-col overflow-hidden">
            <ResizablePanelGroup id="workspace-vertical-layout-v10" direction="vertical" className="h-full min-h-0">
              
              {/* EDITOR AREA */}
              <ResizablePanel id="editor-panel-v10" defaultSize={70} minSize={20}>
                <div className="relative w-full h-full bg-[#1e1e1e]">
                  <div className="absolute inset-0 flex flex-col overflow-hidden">
                {/* Editor Tabs */}
                <div className="flex bg-[#252526] overflow-x-auto min-h-[35px] border-b border-[#1e1e1e] flex-shrink-0 scrollbar-none">
                  {openFiles.map((file) => {
                    const isTabActive = file.path === activeFilePath;
                    return (
                      <div
                        key={file.path}
                        className={`flex items-center gap-1.5 px-3 min-w-max cursor-pointer border-r border-[#1e1e1e] transition-colors ${
                          isTabActive
                            ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                            : 'text-[#969696] hover:bg-[#2d2d2d]'
                        }`}
                        onClick={() => setActiveFile(file.path)}
                      >
                        {file.isDirty && (
                          <Circle className="size-2 fill-current text-[#e8e8e8]" />
                        )}
                        <span className="text-xs py-1.5">{file.name}</span>
                        <button
                          className="hover:bg-[#333333] rounded p-0.5 transition-colors ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeFile(file.path);
                          }}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                  {openFiles.length === 0 && (
                    <div className="flex items-center px-3 text-[10px] text-[#555]">
                      No open files
                    </div>
                  )}
                </div>

                {/* Breadcrumb / File path */}
                {activeFile && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] flex-shrink-0">
                    <span className="text-[11px] text-[#888] font-mono truncate">
                      {activeFile.path}
                    </span>
                    {activeFile.isDirty && (
                      <span className="ml-auto text-[10px] text-[#f0ad4e] flex items-center gap-1 flex-shrink-0">
                        <Circle className="size-1.5 fill-current" /> Unsaved
                      </span>
                    )}
                  </div>
                )}

                {/* Editor Content */}
                <div className="flex-1 min-h-0 min-w-0 relative">
                  {activeFile ? (
                    <MonacoEditor
                      height="100%"
                      language={getLanguage(activeFile.name)}
                      theme="vs-dark"
                      value={activeFile.content}
                      onChange={(value) => {
                        if (value !== undefined) {
                          updateFileContent(activeFile.path, value);
                        }
                      }}
                      options={{
                        minimap: { enabled: true },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Geist Mono', 'Fira Code', Menlo, monospace",
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        tabSize: 2,
                        renderWhitespace: 'selection',
                        bracketPairColorization: { enabled: true },
                        lineHeight: 20,
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center text-[#5a5a5a] select-none">
                      <Files className="size-16 mb-4 opacity-20 flex-shrink-0" />
                      <p className="text-sm text-[#666] w-full truncate">No file open</p>
                      <p className="text-xs mt-1 text-[#555] break-words">
                        Select a file from the explorer to begin editing
                      </p>
                    </div>
                  )}
                </div>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle className="h-1 bg-[#252526] hover:bg-[#007acc] transition-colors" />

              {/* BOTTOM PANEL */}
              <ResizablePanel id="bottom-panel-v10" defaultSize={30} minSize={10}>
                <div className="relative w-full h-full bg-[#1e1e1e]">
                  <div className="absolute inset-0 flex flex-col overflow-hidden">
                <div className="flex items-center px-2 bg-[#252526] border-b border-[#1e1e1e] min-h-[30px] flex-shrink-0 overflow-x-auto min-w-0">
                  {BOTTOM_TABS.map((tab) => {
                    const isActive = bottomTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                          isActive
                            ? 'text-white border-b-2 border-[#007acc]'
                            : 'text-[#858585] hover:text-[#cccccc]'
                        }`}
                        onClick={() => setBottomTab(tab.key)}
                      >
                        {tab.key === 'terminal' && <Terminal className="size-3" />}
                        {tab.key === 'problems' && <AlertCircle className="size-3" />}
                        {tab.key === 'agent-logs' && <Bot className="size-3" />}
                        {tab.label}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-1 pr-1">
                    <button
                      className="size-5 rounded flex items-center justify-center text-[#666] hover:text-[#cccccc] hover:bg-[#333] transition-colors"
                      title="Clear panel"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {bottomTab === 'terminal' && (
                    <WorkspaceTerminal cwd={projectPath || ''} />
                  )}
                  {bottomTab === 'problems' && (
                    <div className="p-3 text-xs">
                      <div className="flex items-center gap-2 text-[#888]">
                        <CheckCircle2 className="size-4 text-[#4ec9b0]" />
                        <span>No problems detected.</span>
                      </div>
                    </div>
                  )}
                  {bottomTab === 'output' && (
                    <div className="p-3 text-xs text-[#888] font-mono leading-relaxed">
                      <span className="text-[#666]">[output]</span> Output log will appear here.
                    </div>
                  )}
                  {bottomTab === 'git-diff' && (
                    <div className="p-3 text-xs text-[#888]">
                      <div className="flex items-center gap-2">
                        <GitBranch className="size-4 text-[#666]" />
                        <span>No git diff to display. Branch: <code className="text-[#4ec9b0]">{projectDefaultBranch}</code></span>
                      </div>
                    </div>
                  )}
                  {bottomTab === 'agent-logs' && (
                    <div className="p-3 text-xs text-[#888]">
                      <div className="flex items-center gap-2">
                        <Bot className="size-4 text-[#666]" />
                        <span>No agent logs yet. Agent runs will appear here.</span>
                      </div>
                    </div>
                  )}
                </div>
                  </div>
                </div>
              </ResizablePanel>

            </ResizablePanelGroup>
          </div>
        </div>

        {/* 4. AI AGENT PANEL (Fixed CSS width) */}
        <div className="w-[380px] shrink-0 flex flex-col bg-[#252526] border-l border-[#1e1e1e] overflow-hidden relative">
          {/* Provider not connected overlay */}
          {activeProviders.length === 0 && (
            <div className="absolute inset-0 z-50 bg-[#1e1e1e]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Lock className="size-10 text-[#555] mb-4" />
              <h3 className="text-[#cccccc] font-semibold text-sm mb-2">AI Provider Not Connected</h3>
              <p className="text-xs text-[#888] mb-5 leading-relaxed">Configure a provider in Settings to enable AI assistance.</p>
              <Link
                href="/providers"
                className="text-xs bg-[#007acc] text-white px-4 py-2 rounded hover:bg-[#006bb3] transition-colors inline-flex items-center gap-1.5"
              >
                Go to Providers &rarr;
              </Link>
            </div>
          )}
          <div className="absolute inset-0 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-[#1e1e1e] flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-[#4ec9b0]" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#cccccc]">
                    VibeForge AI
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSessionsMenuOpen(!sessionsMenuOpen)}
                    title="Chat sessions"
                    className="text-[10px] text-[#666] hover:text-[#cccccc] transition-colors px-1.5 py-0.5 rounded hover:bg-[#333]"
                  >
                    Sessions{chatSessions.length > 0 ? ` (${chatSessions.length})` : ''}
                  </button>
                  <button
                    onClick={newChatSession}
                    title="New chat session"
                    className="text-[10px] text-[#666] hover:text-[#cccccc] transition-colors px-1.5 py-0.5 rounded hover:bg-[#333]"
                  >
                    New
                  </button>
                  <button
                    onClick={clearAiMessages}
                    title="Clear conversation"
                    className="text-[10px] text-[#666] hover:text-[#cccccc] transition-colors px-1.5 py-0.5 rounded hover:bg-[#333]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Model Selector Combobox */}
              <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                <PopoverTrigger
                  render={
                    <button className="w-full flex items-center gap-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] text-[#cccccc] text-[11px] px-2.5 py-2 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none transition-colors">
                      <Cpu className="size-3.5 text-[#4ec9b0] flex-shrink-0" />
                      <span className="text-[#4ec9b0] font-semibold truncate">{getField((effectiveProvider || {}) as Record<string, unknown>, 'name', 'Name') || 'Select Provider'}</span>
                      <span className="text-[#555]">/</span>
                      <span className="truncate flex-1 text-left">{effectiveModelId || providerDefaultModel || 'Select model'}</span>
                      <ChevronDown className="size-3 opacity-50 flex-shrink-0" />
                    </button>
                  }
                />
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-[340px] p-0 bg-[#252526] border border-[#3a3a3a] rounded-lg shadow-xl"
                >
                  <Command className="bg-[#252526] text-[#cccccc]">
                    <CommandInput placeholder="Search provider or model..." className="text-[#cccccc] placeholder:text-[#555] text-xs" />
                    <CommandList className="max-h-64">
                      <CommandEmpty className="text-[#888] text-xs py-4 text-center">No models found.</CommandEmpty>
                      {activeProviders.map(p => {
                        const pName = getField(p as unknown as Record<string, unknown>, 'name', 'Name') || 'Provider';
                        const pDefaultModel = getField(p as unknown as Record<string, unknown>, 'default_model', 'Default Model');
                        const pBaseUrl = getField(p as unknown as Record<string, unknown>, 'base_url', 'Base URL');
                        const pModels: { id: string; name?: string }[] =
                          p.Id?.toString() === effectiveProviderId && activeModels.length > 0
                            ? activeModels
                            : pDefaultModel
                            ? [{ id: pDefaultModel, name: pDefaultModel }]
                            : [];
                        if (pModels.length === 0) return null;
                        return (
                          <CommandGroup key={p.Id} heading={
                            <span className="flex items-center gap-1.5 text-[10px]">
                              <Cpu className="size-3 text-[#4ec9b0]" />
                              <span className="text-[#4ec9b0] font-semibold">{pName}</span>
                              {pBaseUrl && <span className="text-[#555] font-mono text-[9px] truncate max-w-[150px]">{pBaseUrl}</span>}
                            </span>
                          }>
                            {pModels.map(m => {
                              const isSelected = effectiveProviderId === p.Id?.toString() && effectiveModelId === m.id;
                              return (
                                <CommandItem
                                  key={m.id}
                                  value={`${pName} ${m.name || m.id}`}
                                  onSelect={() => {
                                    setSelectedProviderId(p.Id?.toString() || '');
                                    setSelectedModelId(m.id);
                                    setModelPopoverOpen(false);
                                  }}
                                  className="text-[#cccccc] data-selected:bg-[#094771] py-2"
                                >
                                  <div className="flex items-center w-full gap-2">
                                    <span className="text-xs truncate flex-1">{m.name || m.id}</span>
                                    {isSelected && (
                                      <CheckCircle2 className="size-3.5 text-[#4ec9b0] flex-shrink-0 ml-auto" />
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        );
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Project context indicator */}
              {project && (
                <div className="flex items-center gap-1.5 text-[10px] text-[#666] overflow-hidden mt-1.5">
                  <FolderOpen className="size-3 text-[#dcb67a] flex-shrink-0" />
                  <span className="truncate font-mono">{project.name}</span>
                  <span className="text-[#444]">|</span>
                  <GitBranch className="size-3 flex-shrink-0" />
                  <span className="truncate">{projectDefaultBranch}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {aiMessages.map((msg, i) => (
                <AiMessageBubble key={i} role={msg.role} content={msg.content} steps={msg.steps} model={i > 0 && msg.role === 'assistant' ? effectiveModelId : undefined} />
              ))}
              {isAgentRunning && (
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <Loader2 className="size-3 animate-spin text-[#4ec9b0]" />
                  <span className="text-[10px]">🤔 {agentStatusText}</span>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>

            {/* Cline-style input area */}
            <div className="border-t border-[#1e1e1e] flex-shrink-0 p-2 relative">
              {/* Command menu popup */}
              {commandMenuOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg shadow-xl z-30 overflow-hidden">
                  {COMMAND_ITEMS.filter(c =>
                    aiInput.match(/^\/([\w-]*)$/) ? c.id.startsWith(aiInput.match(/^\/([\w-]*)$/)![1]) : true
                  ).map(c => (
                    <button
                      key={c.id}
                      className="w-full flex items-start gap-2 px-3 py-2 hover:bg-[#094771] text-left transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (c.id === 'new') {
                          newChatSession();
                          setAiInput('');
                        } else if (c.id === 'sessions') {
                          setSessionsMenuOpen(true);
                          setAiInput('');
                        } else if (c.id === 'clear') {
                          clearAiMessages();
                          setAiInput('');
                        }
                        setCommandMenuOpen(false);
                        aiTextareaRef.current?.focus();
                      }}
                    >
                      <span className="text-[#4ec9b0] text-xs font-mono font-semibold">{c.label}</span>
                      <span className="text-[10px] text-[#888]">{c.description}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sessions menu popup */}
              {sessionsMenuOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg shadow-xl z-30 overflow-hidden max-h-60 overflow-y-auto flex flex-col">
                  <div className="px-3 py-2 border-b border-[#3a3a3a] flex items-center justify-between sticky top-0 bg-[#2d2d2d] z-10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#cccccc]">Saved Sessions</span>
                    <button onClick={() => setSessionsMenuOpen(false)} className="text-[#888] hover:text-[#cccccc]">
                      <X className="size-3" />
                    </button>
                  </div>
                  {chatSessions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#888]">No saved sessions</div>
                  ) : (
                    chatSessions.map(session => (
                      <button
                        key={session.id}
                        className="w-full flex flex-col px-3 py-2 hover:bg-[#094771] text-left transition-colors border-b border-[#333] last:border-0"
                        onClick={() => {
                          loadChatSession(session.id);
                          setSessionsMenuOpen(false);
                        }}
                      >
                        <span className="text-[#cccccc] text-xs font-semibold truncate">{session.title}</span>
                        <div className="flex items-center justify-between w-full mt-1">
                          <span className="text-[9px] text-[#888]">{new Date(session.createdAt).toLocaleString()}</span>
                          <span className="text-[9px] text-[#519aba] bg-[#519aba]/10 px-1 rounded">{session.messages.length} msgs</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Skill menu popup */}
              {skillMenuOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg shadow-xl z-30 overflow-hidden max-h-60 overflow-y-auto flex flex-col">
                  {AI_SKILLS.filter(s =>
                    skillQuery ? s.id.toLowerCase().includes(skillQuery.toLowerCase()) : true
                  ).length > 0 && (
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#888] bg-[#1e1e1e] sticky top-0">
                      Skills
                    </div>
                  )}
                  {AI_SKILLS.filter(s =>
                    skillQuery ? s.id.toLowerCase().includes(skillQuery.toLowerCase()) : true
                  ).map(s => (
                    <button
                      key={s.id}
                      className="w-full flex items-start gap-2 px-3 py-2 hover:bg-[#094771] text-left transition-colors flex-shrink-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const newVal = aiInput.replace(/@[\w./\\-]*$/, `@${s.id} `);
                        setAiInput(newVal);
                        setSkillMenuOpen(false);
                        aiTextareaRef.current?.focus();
                      }}
                    >
                      <span className="text-[#4ec9b0] text-xs font-mono font-semibold">{s.label}</span>
                      <span className="text-[10px] text-[#888]">{s.description}</span>
                    </button>
                  ))}
                  
                  {flattenTreePaths(fileTree).filter(f =>
                    skillQuery ? f.toLowerCase().includes(skillQuery.toLowerCase()) : true
                  ).length > 0 && (
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#888] bg-[#1e1e1e] sticky top-0 border-t border-[#3a3a3a]">
                      Project Files
                    </div>
                  )}
                  {flattenTreePaths(fileTree).filter(f =>
                    skillQuery ? f.toLowerCase().includes(skillQuery.toLowerCase()) : true
                  ).slice(0, 20).map(f => (
                    <button
                      key={f}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#094771] text-left transition-colors flex-shrink-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const newVal = aiInput.replace(/@[\w./\\-]*$/, `@${f} `);
                        setAiInput(newVal);
                        setSkillMenuOpen(false);
                        aiTextareaRef.current?.focus();
                      }}
                    >
                      <FileCode className="size-3 text-[#519aba] flex-shrink-0" />
                      <span className="text-[#cccccc] text-xs font-mono truncate">{f}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* File search popup */}
              {fileSearchOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#2d2d2d] border border-[#3a3a3a] rounded-lg shadow-xl z-30 overflow-hidden max-h-40 overflow-y-auto">
                  {flattenTree(fileTree).filter(f =>
                    fileSearchQuery ? f.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) : true
                  ).slice(0, 10).map(f => (
                    <button
                      key={f.path}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#094771] text-left transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const newVal = aiInput.replace(/#[\w./\\-]*$/, `#${f.path} `);
                        setAiInput(newVal);
                        setFileSearchOpen(false);
                        aiTextareaRef.current?.focus();
                      }}
                    >
                      <FileCode className="size-3 text-[#519aba] flex-shrink-0" />
                      <span className="text-xs text-[#cccccc] truncate">{f.name}</span>
                      <span className="text-[9px] text-[#666] truncate ml-auto">{f.path}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* The input box */}
              <div className="relative bg-[#3c3c3c] border border-[#555] rounded-md focus-within:border-[#007acc] transition-all">
                <textarea
                  ref={aiTextareaRef}
                  value={aiInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAiInput(value);
                    const selectionStart = e.target.selectionStart;
                    const beforeCursor = value.slice(0, selectionStart);
                    const slashMatch = value.match(/^\/([\w-]*)$/);
                    const lastAtMatch = beforeCursor.match(/@([\w./\\-]*)$/);
                    const lastHashMatch = beforeCursor.match(/#([\w./\\-]*)$/);
                    if (slashMatch) {
                      setCommandMenuOpen(true);
                      setSkillMenuOpen(false);
                      setFileSearchOpen(false);
                      setSessionsMenuOpen(false);
                    } else if (lastAtMatch) {
                      setSkillMenuOpen(true);
                      setSkillQuery(lastAtMatch[1]);
                      setFileSearchOpen(false);
                      setCommandMenuOpen(false);
                      setSessionsMenuOpen(false);
                    } else if (lastHashMatch) {
                      setFileSearchOpen(true);
                      setFileSearchQuery(lastHashMatch[1]);
                      setSkillMenuOpen(false);
                      setCommandMenuOpen(false);
                      setSessionsMenuOpen(false);
                    } else {
                      setSkillMenuOpen(false);
                      setFileSearchOpen(false);
                      setCommandMenuOpen(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSkillMenuOpen(false);
                      setFileSearchOpen(false);
                      setCommandMenuOpen(false);
                      setSessionsMenuOpen(false);
                      return;
                    }
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSendAiMessage();
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAiMessage();
                    }
                  }}
                  placeholder="Message VibeForge AI... (@skill, #file, /command)"
                  rows={1}
                  className="w-full bg-transparent text-[#cccccc] text-xs px-2.5 pt-2 pb-8 outline-none resize-none leading-relaxed placeholder:text-[#555] min-h-[64px] max-h-[120px]"
                  style={{
                    height: `${Math.min(120, Math.max(64, (aiInput.split('\n').length) * 18 + 36))}px`,
                  }}
                   disabled={isAgentRunning}
                 />
                 <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                   {isAgentRunning ? (
                    <button
                      onClick={() => abortControllerRef.current?.abort()}
                      className="bg-[#c74e39] text-white p-1 rounded hover:bg-[#a63a28] transition-colors flex items-center justify-center"
                      title="Stop generating"
                    >
                      <SquareX className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSendAiMessage}
                      disabled={!aiInput.trim()}
                      className="bg-[#007acc] text-white p-1 rounded hover:bg-[#006bb3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Send (Enter)"
                    >
                      <Send className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
                  <span className="text-[9px] text-[#555]">@ skills &nbsp;# files &nbsp;Shift+Enter new line</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FIXED STATUS BAR */}
      <div className="h-6 shrink-0 bg-[#007acc] flex items-center px-3 gap-4 text-[11px] text-white overflow-hidden z-20">
        <span className="flex items-center gap-1 flex-shrink-0">
          <GitBranch className="size-3" />
          <span className="truncate">{projectDefaultBranch}</span>
        </span>
        <span className="flex-shrink-0 truncate">{project?.name}</span>
        {activeFile && (
          <>
            <span className="text-white/60 flex-shrink-0">
              {isSaving
                ? 'Saving...'
                : activeFile.isDirty
                ? '? Unsaved'
                : 'Saved'}
            </span>
            <span className="ml-auto flex-shrink-0">UTF-8</span>
            <span className="flex-shrink-0 truncate max-w-[80px]">{getLanguage(activeFile.name)}</span>
          </>
        )}
        {!activeFile && (
          <span className="ml-auto flex-shrink-0 text-white/70">
            <CheckCircle2 className="size-3 inline mr-1" />
            Ready
          </span>
        )}
      </div>
    </div>
  );
}
