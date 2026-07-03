'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { getLanguage } from './FileTreeNode';

interface GitChange {
  status: string;
  file: string;
}

const MonacoDiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.DiffEditor),
  { ssr: false }
);

export function GitDiffPanel({ projectPath, defaultBranch }: { projectPath: string; defaultBranch: string }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<{ original: string; modified: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data } = useQuery<{ branch: string; changes: GitChange[]; error?: string }>({
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

  const changes = data?.changes || [];
  const modifiedFiles = changes.filter(c => c.status.trim() !== '??' && c.status.trim() !== 'A').map(c => c.file);

  useEffect(() => {
    let active = true;
    if (selectedFile && projectPath) {
      setTimeout(() => { if (active) setIsLoading(true); }, 0);
      fetch(`/api/workspace/git/diff?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(selectedFile)}`)
        .then(res => res.json())
        .then(data => {
          if (active && !data.error) {
            setDiffContent(data);
          }
        })
        .finally(() => { if (active) setIsLoading(false); });
    } else {
      setTimeout(() => { if (active) setDiffContent(null); }, 0);
    }
    return () => { active = false; };
  }, [selectedFile, projectPath]);

  if (!projectPath) {
    return <div className="p-3 text-xs text-[#888]">No project path configured.</div>;
  }

  if (modifiedFiles.length === 0) {
    return <div className="p-3 text-xs text-[#888]">Working tree clean. Branch: <code className="text-[#4ec9b0]">{data?.branch || defaultBranch}</code></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto min-h-[30px] flex-shrink-0 scrollbar-none">
        {modifiedFiles.map(file => (
          <button
            key={file}
            className={`px-3 py-1.5 text-[11px] font-mono whitespace-nowrap border-r border-[#1e1e1e] transition-colors ${selectedFile === file ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#4ec9b0]' : 'text-[#888] hover:bg-[#2d2d2d]'}`}
            onClick={() => setSelectedFile(file)}
          >
            {file.split(/[/\\]/).pop()}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 relative">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full text-xs text-[#555] p-4 text-center select-none">
            Select a modified file from the tabs above to view its diff
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-5 animate-spin text-[#888]" />
          </div>
        ) : diffContent ? (
          <MonacoDiffEditor
            height="100%"
            language={getLanguage(selectedFile)}
            theme="vs-dark"
            original={diffContent.original}
            modified={diffContent.modified}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "'JetBrains Mono', 'Geist Mono', 'Fira Code', Menlo, monospace",
              renderSideBySide: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderWhitespace: 'selection',
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-[#c74e39]">
            Failed to load diff
          </div>
        )}
      </div>
    </div>
  );
}
