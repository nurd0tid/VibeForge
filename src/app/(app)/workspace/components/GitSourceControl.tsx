'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileMinus,
  FilePlus,
  FileQuestion,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  GitBranch,
  GitCommit,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface GitChange {
  status: string;
  file: string;
}

export function GitSourceControl({ projectPath, defaultBranch }: { projectPath: string; defaultBranch: string }) {
  const [commitMessage, setCommitMessage] = useState('');
  const [isActionRunning, setIsActionRunning] = useState(false);
  
  const { data, isLoading, refetch } = useQuery<{ branch: string; changes: GitChange[]; error?: string; ahead?: number; behind?: number }>({
    queryKey: ['git-status', projectPath],
    queryFn: async () => {
      if (!projectPath) return { branch: defaultBranch, changes: [] };
      const res = await fetch(`/api/workspace/git/status?path=${encodeURIComponent(projectPath)}`);
      if (!res.ok) return { branch: defaultBranch, changes: [] , error: 'Failed to fetch' };
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
    if (s.includes('D')) return <FileMinus className="size-3.5 text-[#c74e39]" />;
    if (s.includes('M')) return <FilePlus className="size-3.5 text-[#e2c08d]" />;
    if (s.includes('A') || s.includes('?')) return <FilePlus className="size-3.5 text-[#73c991]" />;
    if (s.includes('R')) return <FilePlus className="size-3.5 text-[#4fc1ff]" />;
    return <FileQuestion className="size-3.5 text-[#888]" />;
  };

  const getStatusBadge = (status: string): { letter: string; color: string } => {
    const s = status.trim();
    if (s.includes('D')) return { letter: 'D', color: '#c74e39' };
    if (s.includes('M')) return { letter: 'M', color: '#e2c08d' };
    if (s.includes('A')) return { letter: 'A', color: '#73c991' };
    if (s.includes('R')) return { letter: 'R', color: '#4fc1ff' };
    if (s === '??') return { letter: 'U', color: '#73c991' };
    return { letter: s[0] || '?', color: '#888' };
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
        <span className="text-xs text-[#cccccc] font-mono">
          {branch}
          {(data?.ahead ?? 0) > 0 || (data?.behind ?? 0) > 0 ? (
            <span className="ml-2 text-[#888]">
              {data?.ahead ? `↑${data.ahead}` : ''} {data?.behind ? `↓${data.behind}` : ''}
            </span>
          ) : null}
        </span>
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
                    <span className="text-[9px] font-bold font-mono" style={{ color: getStatusBadge(change.status).color }}>{getStatusBadge(change.status).letter}</span>
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
                    <span className="text-[9px] font-bold font-mono" style={{ color: getStatusBadge(change.status).color }}>{getStatusBadge(change.status).letter}</span>
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
                    <span className="text-[9px] font-bold font-mono text-[#73c991]">U</span>
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
