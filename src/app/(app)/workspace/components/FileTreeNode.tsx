'use client';

import { memo, useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  FileJson,
  Cog,
  Shield,
  Paintbrush,
  GitBranch,
  FileText,
  Database,
  FileCode,
  Hash,
  Globe,
  ImageIcon,
  Terminal,
  File as GenericFileIcon,
} from 'lucide-react';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export function getLanguage(name: string): string {
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

export function flattenTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const n of nodes) {
    if (!n.isDirectory) result.push(n);
    if (n.children) result.push(...flattenTree(n.children));
  }
  return result;
}

export function flattenTreePaths(nodes: FileNode[], prefix = ''): string[] {
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

export function FileTypeIcon({ name, className: extraClass }: { name: string; className?: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const base = `size-4 flex-shrink-0 ${extraClass || ''}`;

  if (name === 'package.json' || name === 'package-lock.json') return <FileJson className={`${base} text-[#73c991]`} />;
  if (name === 'tsconfig.json' || name.startsWith('tsconfig')) return <Cog className={`${base} text-[#519aba]`} />;
  if (name.startsWith('.env')) return <Shield className={`${base} text-[#e2c08d]`} />;
  if (name === 'pnpm-lock.yaml' || name === 'yarn.lock' || name === 'package-lock.json') return <FileJson className={`${base} text-[#888]`} />;
  if (name === 'next.config.ts' || name === 'next.config.js' || name === 'next.config.mjs') return <Cog className={`${base} text-[#fff]`} />;
  if (name === 'tailwind.config.ts' || name === 'tailwind.config.js') return <Paintbrush className={`${base} text-[#38bdf8]`} />;
  if (name === 'postcss.config.mjs' || name === 'postcss.config.js') return <Cog className={`${base} text-[#dd3a0a]`} />;
  if (name === 'eslint.config.mjs' || name.startsWith('.eslint')) return <Shield className={`${base} text-[#4b32c3]`} />;
  if (name === '.gitignore' || name === '.gitattributes') return <GitBranch className={`${base} text-[#f05032]`} />;
  if (name === 'README.md' || name === 'AGENTS.md' || name === 'CLAUDE.md') return <FileText className={`${base} text-[#519aba]`} />;
  if (name === 'Dockerfile' || name.startsWith('docker-compose')) return <Database className={`${base} text-[#2496ed]`} />;

  if (['ts', 'mts', 'cts'].includes(ext)) return <FileCode className={`${base} text-[#3178c6]`} />;
  if (['tsx'].includes(ext)) return <FileCode className={`${base} text-[#61dafb]`} />;
  if (['js', 'mjs', 'cjs'].includes(ext)) return <FileCode className={`${base} text-[#f7df1e]`} />;
  if (['jsx'].includes(ext)) return <FileCode className={`${base} text-[#61dafb]`} />;
  if (['json', 'jsonc'].includes(ext)) return <FileJson className={`${base} text-[#cbcb41]`} />;
  if (['css'].includes(ext)) return <Hash className={`${base} text-[#563d7c]`} />;
  if (['scss', 'sass'].includes(ext)) return <Hash className={`${base} text-[#c6538c]`} />;
  if (['less'].includes(ext)) return <Hash className={`${base} text-[#1d365d]`} />;
  if (['html', 'htm'].includes(ext)) return <Globe className={`${base} text-[#e44d26]`} />;
  if (['md', 'mdx'].includes(ext)) return <FileText className={`${base} text-[#519aba]`} />;
  if (['txt'].includes(ext)) return <FileText className={`${base} text-[#888]`} />;
  if (['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp'].includes(ext)) return <ImageIcon className={`${base} text-[#a074c4]`} />;
  if (['yml', 'yaml'].includes(ext)) return <FileCode className={`${base} text-[#cc3e44]`} />;
  if (['toml'].includes(ext)) return <Cog className={`${base} text-[#9c4221]`} />;
  if (['sh', 'bash', 'zsh', 'fish'].includes(ext)) return <Terminal className={`${base} text-[#4ec9b0]`} />;
  if (['py'].includes(ext)) return <FileCode className={`${base} text-[#3572A5]`} />;
  if (['rs'].includes(ext)) return <FileCode className={`${base} text-[#dea584]`} />;
  if (['go'].includes(ext)) return <FileCode className={`${base} text-[#00add8]`} />;
  if (['java'].includes(ext)) return <FileCode className={`${base} text-[#b07219]`} />;
  if (['php'].includes(ext)) return <FileCode className={`${base} text-[#4F5D95]`} />;
  if (['rb'].includes(ext)) return <FileCode className={`${base} text-[#701516]`} />;
  if (['sql'].includes(ext)) return <Database className={`${base} text-[#e38c00]`} />;
  if (['prisma'].includes(ext)) return <Database className={`${base} text-[#2d3748]`} />;

  return <GenericFileIcon className={`${base} text-[#cccccc]`} />;
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  onFileClick,
  onContextMenu: onCtxMenu,
}: {
  node: FileNode;
  depth: number;
  onFileClick: (path: string, name: string) => void;
  onContextMenu?: (e: React.MouseEvent, path: string, isDir: boolean) => void;
}) {
  const { expandedFolders, toggleFolder, activeFilePath, collapseAllTrigger } = useWorkspaceStore();
  
  // Default rule: root folder is NOT expanded automatically unless it's in the state explicitly.
  // The user wanted folders to be default closed: "defaultnya di explorer setiap folder tuh jangan langsung kebuka itu ketutup".
  const isExpanded = expandedFolders[node.path] ?? false;

  const isActive = !node.isDirectory && activeFilePath === node.path;

  const IGNORED_NAMES = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo', '__pycache__', '.DS_Store', 'coverage'];
  const isIgnored = node.name.startsWith('.') || IGNORED_NAMES.includes(node.name);

  useEffect(() => {
    if (collapseAllTrigger > 0 && isExpanded) {
      toggleFolder(node.path, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseAllTrigger]);

  if (node.isDirectory) {
    return (
      <div>
        <button
          className={`w-full flex items-center gap-1.5 min-h-[26px] leading-[1.5] hover:bg-[#2a2d2e] transition-colors ${isIgnored ? 'opacity-50' : 'text-[#cccccc]'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleFolder(node.path, !isExpanded)}
          onContextMenu={(e) => onCtxMenu?.(e, node.path, true)}
        >
          {isExpanded ? (
            <ChevronDown className="size-3 flex-shrink-0 text-[#cccccc]" />
          ) : (
            <ChevronRight className="size-3 flex-shrink-0 text-[#cccccc]" />
          )}
          {isExpanded ? (
            <FolderOpen className="size-4 flex-shrink-0 text-[#dcb67a]" />
          ) : (
            <Folder className="size-4 flex-shrink-0 text-[#dcb67a]" />
          )}
          <span className="text-[13px] text-ellipsis overflow-hidden whitespace-nowrap text-left">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onFileClick={onFileClick}
                onContextMenu={onCtxMenu}
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
      onContextMenu={(e) => onCtxMenu?.(e, node.path, false)}
    >
      <FileTypeIcon name={node.name} />
      <span className="text-[13px] text-ellipsis overflow-hidden whitespace-nowrap text-left">{node.name}</span>
    </button>
  );
});
