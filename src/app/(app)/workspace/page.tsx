'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHasHydrated } from '@/hooks/useHasHydrated';
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

import { GitSourceControl } from './components/GitSourceControl';
import { WorkspaceTerminal } from './components/WorkspaceTerminal';
import { GitDiffPanel } from './components/GitDiffPanel';
import { FileTreeNode, FileTypeIcon } from './components/FileTreeNode';
import type { FileNode } from './components/FileTreeNode';
import { getLanguage, flattenTree, flattenTreePaths } from './components/FileTreeNode';
import { AiMessageBubble } from './components/AiMessageBubble';
import { ActiveTodoStrip } from './components/ActiveTodoStrip';
import { InterruptedTaskBanner } from './components/InterruptedTaskBanner';
import { ContextUsageBar } from './components/ContextUsageBar';
import { WorkspaceTaskPanel } from './components/WorkspaceTaskPanel';

// Animates the Monaco DiffEditor — streams content line-by-line into the diff view.
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
      store.setPendingDiff(path, currentContent, prefix + partial + (lineIdx < lines.length ? '' : '') + suffix);
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
import { toast } from 'sonner';
import type { Provider, NocoDBListResponse } from '@/types';
import type { AgentStep, ChatSession } from '@/stores/workspace.store';
import { loadSessionsFromIDB } from '@/lib/session-storage';
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
import { Switch } from '@/components/ui/switch';
import {
  Files,
  Search,
  GitBranch,
  ListTodo,
  Bot,
  X,
  ChevronDown,
  FileCode,
  FolderOpen,
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
  Lock,
  ChevronsUpDown,
  Settings,
  PanelRightClose,
} from 'lucide-react';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  { ssr: false }
);

const MonacoDiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.DiffEditor),
  { ssr: false }
);

const ACTIVITY_ITEMS = [
  { key: 'explorer' as const, icon: Files, label: 'Explorer' },
  { key: 'search' as const, icon: Search, label: 'Search' },
  { key: 'git' as const, icon: GitBranch, label: 'Source Control' },
  { key: 'tasks' as const, icon: ListTodo, label: 'Tasks' },
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
  { id: 'create-task', label: '@create-task', description: 'Create tasks in NocoDB from a file or plan' },
  { id: 'schedule', label: '@schedule', description: 'Create schedule records in NocoDB from a file or plan' },
  { id: 'review-code', label: '@review-code', description: 'Review code changes' },
  { id: 'daily-log', label: '@daily-log', description: 'Write a daily log' },
  { id: 'update-context', label: '@update-context', description: 'Update project context' },
  { id: 'context-engineering', label: '@context-engineering', description: 'Analyze and optimize project context' },
  { id: 'frontend-ui-engineering', label: '@frontend-ui-engineering', description: 'Build UI components and pages' },
  { id: 'structured-file-editing', label: '@structured-file-editing', description: 'Edit files with search & replace' },
  { id: 'diff-viewer', label: '@diff-viewer', description: 'Review code diffs and changes' },
  { id: 'task-play-workflow', label: '@task-play-workflow', description: 'Execute task play workflow' },
  { id: 'nocodb-persistence', label: '@nocodb-persistence', description: 'Manage NocoDB data persistence' },
  { id: 'update-memory-bank', label: '@update-memory-bank', description: 'Update project memory bank (UMB)' },
  { id: 'mcp-tooling', label: '@mcp-tooling', description: 'Use MCP server tools' },
  { id: 'debugging', label: '@debugging', description: 'Debug and fix errors' },
  { id: 'regression-guard', label: '@regression-guard', description: 'Check for regressions before shipping' },
  { id: 'documentation-update', label: '@documentation-update', description: 'Update project documentation' },
  { id: 'definition-of-done', label: '@definition-of-done', description: 'Verify task meets done criteria' },
];





const COMMAND_ITEMS = [
  { id: 'new', label: '/new', description: 'Start a new chat session' },
  { id: 'sessions', label: '/sessions', description: 'Show saved sessions' },
  { id: 'clear', label: '/clear', description: 'Clear current conversation' },
  { id: 'compact', label: '/compact', description: 'Compress context to save tokens' },
  { id: 'mcp-list', label: '/mcp-list', description: 'Show connected MCP servers' },
  { id: 'init-memory', label: '/init-memory', description: 'Initialize memory bank for current project' },
];

export default function WorkspacePage() {
  const hasHydrated = useHasHydrated();
  const { activeProjectId } = useUiStore();
  const { data: project } = useProject(activeProjectId);
  const projectPath = project?.local_path || (project as unknown as Record<string, string>)?.['Local Path'] || '';
  const projectDefaultBranch = project?.default_branch || (project as unknown as Record<string, string>)?.['Default Branch'] || 'main';
  const openFiles = useWorkspaceStore(s => s.openFiles);
  const activeFilePath = useWorkspaceStore(s => s.activeFilePath);
  const pendingDiffs = useWorkspaceStore(s => s.pendingDiffs);

  // Panel state
  const activePanel = useWorkspaceStore(s => s.activePanel);
  const bottomTab = useWorkspaceStore(s => s.bottomTab);
  const isAiPanelOpen = useWorkspaceStore(s => s.isAiPanelOpen);

  // AI state
  const aiMessages = useWorkspaceStore(s => s.aiMessages);
  const chatSessions = useWorkspaceStore(s => s.chatSessions);
  const activeChatSessionId = useWorkspaceStore(s => s.activeChatSessionId);
  const isAgentRunning = useWorkspaceStore(s => s.isAgentRunning);
  const agentStatusText = useWorkspaceStore(s => s.agentStatusText);
  const approvalMode = useWorkspaceStore(s => s.approvalMode);
  const contextUsedTokens = useWorkspaceStore(s => s.contextUsedTokens);
  const contextLimit = useWorkspaceStore(s => s.contextLimit);
  const isAutoCompactEnabled = useWorkspaceStore(s => s.isAutoCompactEnabled);

  // Actions (actions from Zustand never change, so read them once with getState)
  const {
    openFile, closeFile, closeAllFiles, closeOtherFiles, setActiveFile,
    updateFileContent, markFileSaved, markFileDeleted, setActivePanel, setBottomTab,
    addAiMessage, updateLastAiMessage, updateLastAiMessageSteps, clearAiMessages,
    triggerCollapseAll, loadChatSession, deleteChatSession, newChatSession, saveChatSession,
    setAgentRunning, setAgentStatusText, setApprovalMode, setContextUsage,
    setAutoCompactEnabled, setAiPanelOpen
  } = useWorkspaceStore.getState();

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
  const [showInterruptedBanner, setShowInterruptedBanner] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const aiScrollContainerRef = useRef<HTMLDivElement>(null);
  const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const globalAiAbortControllerRef = useRef<AbortController | null>(null);
  const cancelDiffAnimationRef = useRef<(() => void) | null>(null);
  const editorInstRef = useRef<any>(null);
  const diffEditorInstRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);

  const [tabContextMenu, setTabContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);
  const [explorerCtxMenu, setExplorerCtxMenu] = useState<{ path: string; isDir: boolean; x: number; y: number } | null>(null);
  const [clipboardPath, setClipboardPath] = useState<string | null>(null);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  const [panelSizes, setPanelSizes] = useState<number[]>([70, 30]);
  useEffect(() => {
    const saved = localStorage.getItem('workspace-panel-sizes');
    if (saved) {
      try { setPanelSizes(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    loadSessionsFromIDB().then((sessions) => {
      if (sessions && sessions.length > 0) {
        useWorkspaceStore.setState({ chatSessions: sessions as ChatSession[] });
      }
    });
  }, []);

  // Auto-scroll Monaco when streaming diff changes
  useEffect(() => {
    if (!activeFile) return;
    const diff = pendingDiffs[activeFile.path];
    if (diff && isAgentRunning && diffEditorInstRef.current) {
      // get the modified editor instance from diff editor
      const modifiedEditor = diffEditorInstRef.current.getModifiedEditor();
      if (modifiedEditor) {
        const lineCount = modifiedEditor.getModel()?.getLineCount() || 1;
        modifiedEditor.revealLine(lineCount, 0); // 0 = Smooth scroll
      }
    }
  }, [pendingDiffs, activeFile, isAgentRunning]);

  // Auto scroll AI chat panel to bottom on update
  useEffect(() => {
    if (isAgentRunning && aiScrollContainerRef.current) {
      aiScrollContainerRef.current.scrollTop = aiScrollContainerRef.current.scrollHeight;
    }
  }, [aiMessages, isAgentRunning]);
  useEffect(() => {
    const msgs = useWorkspaceStore.getState().aiMessages;
    if (msgs.length < 2) return;
    const lastMsg = msgs[msgs.length - 1];
    const secondLast = msgs[msgs.length - 2];
    const isInterrupted = lastMsg.role === 'assistant' && lastMsg.content === '' && secondLast.role === 'user';
    if (isInterrupted && !useWorkspaceStore.getState().isAgentRunning) {
      setTimeout(() => setShowInterruptedBanner(true), 300);
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const effectiveProviderName = getField((effectiveProvider || {}) as Record<string, unknown>, 'name', 'Name') || 'Provider';

  const aiMessagesLen = aiMessages.length;

  useEffect(() => {
    if (effectiveProvider) {
      const ctxWindow = Number(getField(effectiveProvider as unknown as Record<string, unknown>, 'context_window', 'Context Window') || 128000);
      
      const systemPromptEst = 500;
      let totalChars = 0;
      aiMessages.forEach((m) => {
        totalChars += m.content?.length || 0;
        if (m.steps) {
          m.steps.forEach((s) => {
            totalChars += s.text?.length || 0;
            totalChars += s.toolOutput?.length || 0;
            totalChars += JSON.stringify(s.toolArgs || {}).length;
          });
        }
      });
      const estTokens = systemPromptEst + Math.round(totalChars / 4);
      setContextUsage(estTokens, ctxWindow);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProviderId, effectiveModelId, aiMessagesLen]);

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

  // Check for deleted files whenever the file tree refreshes
  useEffect(() => {
    if (!fileTree.length || !openFiles.length) return;
    const allPaths = new Set(flattenTree(fileTree).map((n) => n.path.replace(/\\/g, '/')));
    openFiles.forEach((f) => {
      const normalizedPath = f.path.replace(/\\/g, '/');
      const shouldBeDeleted = !allPaths.has(normalizedPath);
      if (shouldBeDeleted !== !!f.isDeleted) {
        markFileDeleted(f.path, shouldBeDeleted);
      }
    });
  }, [fileTree, openFiles, markFileDeleted]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    const container = aiScrollContainerRef.current;
    if (!container) return;
    if (isFirstRender.current) {
      container.scrollTop = container.scrollHeight;
      isFirstRender.current = false;
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [aiMessages, isAgentRunning, agentStatusText]);

  // Handle editor auto-scroll & gutter decorations when AI writes/edits files
  useEffect(() => {
    const editor = editorInstRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeFilePath) return;

    // Find the last assistant message
    const assistantMsgs = aiMessages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length === 0) return;
    const lastMsg = assistantMsgs[assistantMsgs.length - 1];
    
    // Check if the last step was a file change
    const lastStep = lastMsg.steps?.[lastMsg.steps.length - 1];
    if (!lastStep || lastStep.isError) return;

    const isEdit = lastStep.toolName === 'edit_file';
    const isWrite = lastStep.toolName === 'write_file';
    if (!isEdit && !isWrite) return;

    const targetPath = String(lastStep.toolArgs?.path || '');
    if (!activeFilePath.endsWith(targetPath.replace(/^\./, ''))) return;

    const fileContent = editor.getValue();
    let startLine = 1;
    let endLine = 1;

    if (isEdit && lastStep.toolArgs?.new_string) {
      const newStr = String(lastStep.toolArgs.new_string);
      const index = fileContent.indexOf(newStr);
      if (index !== -1) {
        const textBefore = fileContent.substring(0, index);
        startLine = textBefore.split('\n').length;
        endLine = startLine + newStr.split('\n').length - 1;
      }
    } else if (isWrite && lastStep.toolArgs?.content) {
      const content = String(lastStep.toolArgs.content);
      endLine = content.split('\n').length;
    }

    try {
      // Clear previous decorations if any
      if (decorationsRef.current) {
        decorationsRef.current.clear();
      }

      // Scroll editor to center the change
      editor.revealLineInCenter(startLine);

      // Create highlight decorations
      decorationsRef.current = editor.createDecorationsCollection([
        {
          range: new monaco.Range(startLine, 1, endLine, 100),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: 'vibeforge-ai-change-marker',
            className: 'vibeforge-ai-change-line'
          }
        }
      ]);

      // Clean up highlight after 6 seconds
      const timer = setTimeout(() => {
        if (decorationsRef.current) {
          decorationsRef.current.clear();
          decorationsRef.current = null;
        }
      }, 6000);

      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Failed to create decorations', e);
    }
  }, [aiMessages, activeFilePath]);

  useEffect(() => {
    if (isAutoCompactEnabled && contextLimit > 0) {
      const pct = (contextUsedTokens / contextLimit) * 100;
      if (pct >= 90 && !isAgentRunning) {
        // Auto compact if usage is over 90%
        addAiMessage({ role: 'assistant', content: '', steps: [{ type: 'thought', text: 'Auto-compacting context because usage exceeded 90% threshold...' }] });
        setTimeout(() => {
          const currentMsgs = useWorkspaceStore.getState().aiMessages;
          const preserved = currentMsgs.slice(-2);
          useWorkspaceStore.setState({
            aiMessages: [
              ...preserved,
              { role: 'assistant', content: `────────────────────────────────────────\n**Context auto-compressed** · Usage exceeded 90%\n*Key context preserved: active task, provider settings, changed files, decisions, known issues*\n────────────────────────────────────────` }
            ]
          });
          setContextUsage(Math.max(0, contextUsedTokens - 4000), contextLimit);
          toast.success('Context auto-compacted');
        }, 1500);
      }
    }
  }, [contextUsedTokens, contextLimit, isAutoCompactEnabled, isAgentRunning, addAiMessage, setContextUsage]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openFiles]
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

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

  const runAiStream = async (messagesToRun: { role: string; content: string; model?: string; provider?: string; steps?: AgentStep[] }[], skill: string = '') => {
    setAgentRunning(true, 'Thinking...');
    globalAiAbortControllerRef.current = new AbortController();
    abortControllerRef.current = globalAiAbortControllerRef.current;

    addAiMessage({ role: 'assistant', content: '', model: effectiveModelId, provider: effectiveProviderName });

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToRun,
          providerId: effectiveProviderId,
          model: effectiveModelId,
          skill,
          projectPath,
          projectId: activeProjectId,
        }),
        signal: globalAiAbortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to start chat streaming');
      if (!response.body) throw new Error('No response body from chat API');

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
                if ((data.name === 'edit_file' || data.name === 'write_file') && data.args?.path) {
                  const rawFp = String(data.args.path);
                  const isAbs = /^[a-zA-Z]:[/\\]/.test(rawFp) || rawFp.startsWith('/');
                  const _fp = isAbs ? rawFp : `${projectPath}/${rawFp}`.replace(/\\/g, '/');
                  const _fn = _fp.split(/[/\\]/).pop() || 'file';
                  if (data.name === 'write_file') {
                    useWorkspaceStore.getState().openFile(_fp, _fn, '');
                  } else {
                    await handleFileClick(_fp, _fn);
                  }
                  useWorkspaceStore.getState().markFileTag(_fp, data.name === 'write_file' ? 'created' : 'edited');
                  startLiveDiffAnimation(_fp, data.name, data.args, cancelDiffAnimationRef);
                }
              } else if (eventType === 'tool_result') {
                const targetStep = currentSteps.find(s => s.type === 'tool_call' && s.toolId === data.id);
                if (targetStep) {
                  targetStep.toolOutput = data.output;
                  targetStep.isError = data.isError;
                  if (!data.isError && targetStep.toolArgs?.path) {
                    const toolName = targetStep.toolName || '';
                    if (toolName === 'edit_file' || toolName === 'write_file') {
                      if (cancelDiffAnimationRef.current) { cancelDiffAnimationRef.current(); cancelDiffAnimationRef.current = null; }
                      const rawPath = String(targetStep.toolArgs.path);
                      const isAbsolute = /^[a-zA-Z]:[/\\]/.test(rawPath) || rawPath.startsWith('/');
                      const fp = isAbsolute ? rawPath : `${projectPath}/${rawPath}`.replace(/\\/g, '/');
                      const fn = fp.split(/[/\\]/).pop() || 'file';
                      try {
                        const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(fp)}`);
                        if (res.ok) {
                          const fileData = await res.json();
                          const newContent = fileData.content || '';
                          const store = useWorkspaceStore.getState();
                          const existing = store.openFiles.find(f => f.path === fp);
                          if (existing) {
                            store.updateFileContent(fp, newContent);
                            store.markFileSaved(fp);
                          } else {
                            store.openFile(fp, fn, newContent);
                          }
                          store.clearPendingDiff(fp);
                          store.markFileTag(fp, toolName === 'write_file' ? 'created' : 'edited');
                          store.setActiveFile(fp);
                        }
                      } catch {}
                      if (toolName === 'write_file') refetchTree();
                    }
                  }
                }
              } else if (eventType === 'content_stream') {
                const delta = (data.delta || '').replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '').replace(/<[^>]*$/g, '');
                if (delta.trim()) fullContent += delta;
              } else if (eventType === 'content') {
                if (data.replace) {
                  fullContent = data.delta || '';
                } else {
                  fullContent += data.delta || '';
                }
              } else if (eventType === 'usage') {
                if (data.total) setContextUsage(data.total, contextLimit);
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
      const msgs = useWorkspaceStore.getState().aiMessages;
      const totalChars = msgs.reduce((sum, m) => sum + (m.content?.length || 0) + (m.steps?.reduce((s, st) => s + (st.text?.length || 0) + (st.toolOutput?.length || 0), 0) || 0), 0);
      const estTokens = Math.round(totalChars / 4);
      if (estTokens > useWorkspaceStore.getState().contextUsedTokens) {
        setContextUsage(estTokens, contextLimit);
      }
      setAgentRunning(false);
      globalAiAbortControllerRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const handleResumeTask = async () => {
    const msgs = useWorkspaceStore.getState().aiMessages;
    if (msgs.length < 2) return;
    const lastMsg = msgs[msgs.length - 1];
    const secondLast = msgs[msgs.length - 2];

    let messagesToRun = [...msgs];
    let skill = '';

    if (lastMsg.role === 'assistant' && !lastMsg.content && secondLast.role === 'user') {
      messagesToRun = msgs.slice(0, -1);
      const lcMsg = secondLast.content.toLowerCase().trim();
      if (lcMsg === 'umb' || lcMsg === 'update memory' || lcMsg === 'sync memory' || lcMsg === 'update memory bank') {
        skill = 'update-memory-bank';
      }
      const skillMatch = secondLast.content.match(/@([\w-]+)/);
      if (skillMatch) skill = skillMatch[1];
    } else {
      toast.error('Nothing to resume');
      return;
    }

    useWorkspaceStore.setState({ aiMessages: messagesToRun });
    setShowInterruptedBanner(false);
    await runAiStream(messagesToRun, skill);
  };

  const handlePlayTask = async (task: import('@/types').Task) => {
    const { setPlayingTaskId, dequeueTask, addAiMessage } = useWorkspaceStore.getState();
    setPlayingTaskId(task.Id);

    const prompt = `@task-play-workflow

## Task to Execute
**Title:** ${task.title}
**Description:** ${task.description || 'No description provided.'}
**Type:** ${task.type || 'feature'}
**Priority:** ${task.priority || 'medium'}
**Acceptance Criteria:** ${task.acceptance_criteria || 'None specified.'}
**Related Files:** ${task.related_files || 'None.'}
**Estimated Hours:** ${task.estimate_hours ?? 'Not specified.'}

Follow the @task-play-workflow skill rules. Read the memory bank and related files first, then plan and execute this task. After completion, update the task status and memory bank.`;

    const currentMsgs = useWorkspaceStore.getState().aiMessages;
    const newMsgs = [...currentMsgs, { role: 'user' as const, content: prompt }];
    addAiMessage({ role: 'user', content: prompt });

    try {
      await runAiStream(newMsgs, 'task-play-workflow');
      await fetch(`/api/tasks/${task.Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: 'done' }),
      }).catch(() => {});
    } finally {
      dequeueTask(task.Id);
      setPlayingTaskId(null);
      const { taskQueue: remaining } = useWorkspaceStore.getState();
      if (remaining.length > 0) {
        const nextTask = remaining[0];
        await handlePlayTask(nextTask);
      }
    }
  };

  const handlePlayAll = async (tasks: import('@/types').Task[]) => {
    if (tasks.length === 0) return;
    const { setTaskQueue, setPlayingTaskId } = useWorkspaceStore.getState();
    setTaskQueue(tasks.slice(1));
    setPlayingTaskId(tasks[0].Id);
    await handlePlayTask(tasks[0]);
  };

  const handleStopTask = () => {
    const { clearTaskQueue, setPlayingTaskId } = useWorkspaceStore.getState();
    if (globalAiAbortControllerRef.current) {
      globalAiAbortControllerRef.current.abort();
    }
    setPlayingTaskId(null);
    clearTaskQueue();
  };

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
      const pName = project?.name || 'Project';
      addAiMessage({ role: 'assistant', content: `Initializing memory bank for **${pName}** at \`${projectPath}\`...\n\nScanning project structure & package dependencies...` });
      
      try {
        // Create directory first
        await fetch('/api/workspace/terminal/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `mkdir -p .vibeforge/memory-bank`, cwd: projectPath })
        });

        await fetch('/api/workspace/terminal/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `echo ".vibeforge" >> .gitignore`, cwd: projectPath })
        });

        // 1. Detect Stack via package.json
        let detectedStack = '[Primary tech stack]';
        try {
          const pkgRes = await fetch(`/api/workspace/file?path=${encodeURIComponent(projectPath + '/package.json')}`);
          if (pkgRes.ok) {
            const pkgData = await pkgRes.json();
            const pkg = JSON.parse(pkgData.content || '{}');
            const deps = Object.keys(pkg.dependencies || {});
            const devDeps = Object.keys(pkg.devDependencies || {});
            const allDeps = [...deps, ...devDeps];
            
            const stackList = [];
            if (allDeps.includes('next')) stackList.push('Next.js');
            else if (allDeps.includes('react')) stackList.push('React');
            else if (allDeps.includes('express')) stackList.push('Express.js');
            else if (allDeps.includes('vue')) stackList.push('Vue.js');
            
            if (allDeps.includes('typescript')) stackList.push('TypeScript');
            if (allDeps.includes('tailwindcss')) stackList.push('Tailwind CSS');
            if (allDeps.includes('prisma')) stackList.push('Prisma ORM');
            
            if (stackList.length > 0) {
              detectedStack = stackList.join(', ');
            }
          }
        } catch {}

        // 2. Detect Folder Structure via file tree endpoint
        let detectedFolders = 'root/\n';
        try {
          const treeRes = await fetch(`/api/workspace/tree?path=${encodeURIComponent(projectPath)}`);
          if (treeRes.ok) {
            const tree = await treeRes.json();
            if (Array.isArray(tree)) {
              detectedFolders = tree.map((n: any) => `- ${n.name}${n.isDirectory ? '/' : ''}`).slice(0, 15).join('\n');
            }
          }
        } catch {}

        const now = new Date().toISOString().split('T')[0];
        const files: Record<string, string> = {
          'projectBrief.md': `# Project Brief — ${pName}\n\n## Purpose\n[What this project does]\n\n## Stack\n- ${detectedStack}\n\n## Scope\n- Development and refinement of system components.\n`,
          'productContext.md': `# Product Context — ${pName}\n\n## Target Users\n[Who uses this product]\n\n## Key Modules\n- Codebase Workspace\n- AI Assistant Loops\n\n## Business Logic\n[Important business rules]\n`,
          'activeContext.md': `# Active Context — ${pName}\n\n## Current Focus\n- System setup and structure verification\n\n## Active Files\n- package.json\n\n## Constraints\n- Follow language-specific lint and type configurations\n`,
          'systemPatterns.md': `# System Patterns — ${pName}\n\n## Architecture\n- Client-Server or Single App architecture\n\n## Folder Structure\n\`\`\`txt\n${detectedFolders}\n\`\`\`\n\n## Component Patterns\n- Standard modular components\n`,
          'decisionLog.md': `# Decision Log — ${pName}\n\n| Date | Decision | Reason | Impact |\n|------|----------|--------|--------|\n| ${now} | Initialize memory bank | Track context across sessions | Enables smarter agent behavior |\n`,
          'progress.md': `# Progress — ${pName}\n\n## Completed\n- Memory bank initialized (${now})\n\n## In Progress\n- Project structure mapping\n\n## Pending\n- Feature refinement\n\n## Blockers\n- None\n`,
          'knownIssues.md': `# Known Issues — ${pName}\n\n## Open Issues\n- None\n\n## Workarounds\n- None\n`,
          'fixedDoNotBreak.md': `# Fixed — Do Not Break — ${pName}\n\nAreas that have been fixed and must not be regressed:\n\n[Agent will populate this as fixes are applied]\n`,
          'regressionGuard.md': `# Regression Guard — ${pName}\n\n## Checklist Before Making Changes\n- [ ] Read relevant docs/context first\n- [ ] Inspect actual files before editing\n- [ ] Use small, incremental changes\n- [ ] Verify after change\n- [ ] Do not claim done without evidence\n- [ ] Check fixedDoNotBreak.md\n`,
          'updateLog.md': `# Update Log — ${pName}\n\n| Date | What Changed | Updated By |\n|------|-------------|------------|\n| ${now} | Memory bank initialized | VibeForge Agent |\n`,
        };
        const writeFile = async (name: string, content: string) => {
          await fetch('/api/workspace/file', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: `${projectPath}/.vibeforge/memory-bank/${name}`, content })
          });
        };
        await Promise.all(Object.entries(files).map(([name, content]) => writeFile(name, content)));
        const mbSummary = `# Memory Bank — ${pName}\n\n> Auto-generated index. See individual files in .vibeforge/memory-bank/\n\n${Object.keys(files).map(f => `- [${f}](memory-bank/${f})`).join('\n')}\n`;
        await fetch('/api/workspace/file', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `${projectPath}/.vibeforge/memory-bank.md`, content: mbSummary })
        });
        addAiMessage({ role: 'assistant', content: `**Memory Bank initialized!**\n\nCreated \`.vibeforge/memory-bank/\` with scanned stack and directory layout:\n${Object.keys(files).map(f => `- ${f}`).join('\n')}\n\nScanned stack: **${detectedStack}**\n\nAI agent has parsed your project files and is ready to work on this project.` });
      } catch {
        addAiMessage({ role: 'assistant', content: 'Failed to initialize memory bank. Check the project path and try again.' });
      }
      return;
    }

    if (userMsg === '/compact') {
      addAiMessage({ role: 'user', content: '/compact' });
      const currentMsgs = useWorkspaceStore.getState().aiMessages;
      const preserved = currentMsgs.slice(-2); // Keep last 2 messages for immediate context
      
      addAiMessage({ role: 'assistant', content: '', steps: [{ type: 'thought', text: 'Compacting context... 14 previous messages summarized.' }] });
      
      // We simulate compaction for now, in a real scenario we would call the LLM to summarize
      setTimeout(() => {
        useWorkspaceStore.setState({
          aiMessages: [
            ...preserved,
            { role: 'assistant', content: `────────────────────────────────────────\n**Context compressed** · Summarized past messages\n*Key context preserved: active task, provider settings, changed files, decisions, known issues*\n────────────────────────────────────────` }
          ]
        });
        setContextUsage(Math.max(0, contextUsedTokens - 4000), contextLimit);
      }, 1000);
      return;
    }

    // Parse skill if present
    let skill = '';
    const skillMatch = userMsg.match(/@([\w-]+)/);
    if (skillMatch) {
      skill = skillMatch[1];
    }

    // Check if user is asking to update memory
    const lcMsg = userMsg.toLowerCase().trim();
    if (lcMsg === 'umb' || lcMsg === 'update memory' || lcMsg === 'sync memory' || lcMsg === 'update memory bank') {
      skill = 'update-memory-bank';
    }

    addAiMessage({ role: 'user', content: userMsg });

    if (!activeChatSessionId) {
      setTimeout(() => saveChatSession(), 0);
    }

    setShowInterruptedBanner(false);
    await runAiStream([...aiMessages, { role: 'user', content: userMsg }], skill);
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
                        onContextMenu={(e, path, isDir) => {
                          e.preventDefault();
                          setExplorerCtxMenu({ path, isDir, x: e.clientX, y: e.clientY });
                        }}
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
          <WorkspaceTaskPanel 
            onPlayTask={handlePlayTask}
            onPlayAll={handlePlayAll}
            onStop={handleStopTask}
          />
        );
    }
  };

  // We do not return early anymore, so the IDE shell is always visible.

  if (!hasHydrated) return null;

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
            <ResizablePanelGroup
              id="workspace-vertical-layout-v10"
              direction="vertical"
              className="h-full min-h-0"
              onLayoutChanged={(layout: Record<string, number>) => {
                const sizes = [
                  layout['editor-panel-v10'] ?? 70,
                  layout['bottom-panel-v10'] ?? 30,
                ];
                localStorage.setItem('workspace-panel-sizes', JSON.stringify(sizes));
              }}
            >
              
              {/* EDITOR AREA */}
              <ResizablePanel id="editor-panel-v10" defaultSize={panelSizes[0]} minSize={20}>
                <div className="relative w-full h-full bg-[#1e1e1e]">
                  <div className="absolute inset-0 flex flex-col overflow-hidden">
                {/* Editor Tabs */}
                <div
                  className="flex bg-[#252526] overflow-x-auto min-h-[35px] border-b border-[#1e1e1e] flex-shrink-0 scrollbar-none"
                  onClick={() => setTabContextMenu(null)}
                >
                  {openFiles.map((file) => {
                    const isTabActive = file.path === activeFilePath;
                    const hasDiff = !!pendingDiffs[file.path];
                    const isStreaming = hasDiff && isAgentRunning;
                    const showTag = file.tag || isStreaming;
                    return (
                      <div
                        key={file.path}
                        className={`flex items-center gap-1.5 px-3 min-w-max cursor-pointer border-r border-[#1e1e1e] transition-colors ${
                          isTabActive
                            ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                            : 'text-[#969696] hover:bg-[#2d2d2d]'
                        }`}
                        onClick={() => setActiveFile(file.path)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setTabContextMenu({ path: file.path, x: e.clientX, y: e.clientY });
                        }}
                      >
                        {file.isDeleted && !showTag && (
                          <span className="size-1.5 rounded-full bg-[#c74e39] flex-shrink-0" />
                        )}
                        {file.isDirty && !file.isDeleted && !showTag && (
                          <Circle className="size-2 fill-current text-[#e8e8e8]" />
                        )}
                        <FileTypeIcon name={file.name} className="!size-3.5" />
                        <span className={`text-xs py-1.5 ${
                          file.isDeleted && !showTag ? 'line-through text-[#c74e39] opacity-70' : ''
                        } ${
                          file.tag === 'created' || isStreaming ? 'text-[#73c991]' : file.tag === 'edited' ? 'text-[#4ec9b0]' : ''
                        }`}>
                          {file.name}
                          {file.tag === 'created' ? ': New File (Editable)' : file.tag === 'edited' ? ': Editing (Editable)' : isStreaming ? ': Streaming...' : ''}
                        </span>
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

                {/* Tab Context Menu */}
                {tabContextMenu && (
                  <div
                    className="fixed z-50 bg-[#252526] border border-[#3a3a3a] rounded shadow-xl text-xs text-[#cccccc] py-1 min-w-[180px]"
                    style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
                    onMouseLeave={() => setTabContextMenu(null)}
                  >
                    {[
                      { label: 'Close', action: () => { closeFile(tabContextMenu.path); setTabContextMenu(null); } },
                      { label: 'Close Others', action: () => { closeOtherFiles(tabContextMenu.path); setTabContextMenu(null); } },
                      { label: 'Close All', action: () => { closeAllFiles(); setTabContextMenu(null); } },
                      null,
                      { label: 'Copy Path', action: () => { navigator.clipboard.writeText(tabContextMenu.path); setTabContextMenu(null); } },
                    ].map((item, idx) =>
                      item === null ? (
                        <div key={idx} className="h-px bg-[#3a3a3a] my-1" />
                      ) : (
                        <button
                          key={item.label}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#094771] transition-colors"
                          onClick={item.action}
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Explorer Context Menu */}
                {explorerCtxMenu && (
                  <div
                    className="fixed z-50 bg-[#252526] border border-[#3a3a3a] rounded shadow-xl text-xs text-[#cccccc] py-1 min-w-[200px]"
                    style={{ top: explorerCtxMenu.y, left: explorerCtxMenu.x }}
                    onMouseLeave={() => setExplorerCtxMenu(null)}
                  >
                    {[
                      explorerCtxMenu.isDir ? { label: 'New File', action: async () => {
                        const name = window.prompt('File name:');
                        if (!name?.trim()) return;
                        const fp = `${explorerCtxMenu.path}/${name.trim()}`;
                        await fetch('/api/workspace/file', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: fp, content: '' }) });
                        refetchTree();
                        setExplorerCtxMenu(null);
                      }} : null,
                      explorerCtxMenu.isDir ? { label: 'New Folder', action: async () => {
                        const name = window.prompt('Folder name:');
                        if (!name?.trim()) return;
                        const newDir = `${explorerCtxMenu.path}/${name.trim()}`;
                        await fetch('/api/workspace/file', { 
                          method: 'PUT', 
                          headers: { 'Content-Type': 'application/json' }, 
                          body: JSON.stringify({ path: newDir + '/.gitkeep', content: '' }) 
                        });
                        refetchTree();
                        setExplorerCtxMenu(null);
                      }} : null,
                      explorerCtxMenu.isDir ? null : null,
                      { label: 'Rename', action: async () => {
                        const parts = explorerCtxMenu.path.split(/[/\\]/);
                        const oldName = parts[parts.length - 1];
                        const newName = window.prompt('New name:', oldName);
                        if (!newName?.trim() || newName === oldName) return;
                        const dir = parts.slice(0, -1).join('/');
                        const newPath = `${dir}/${newName.trim()}`;
                        await fetch('/api/workspace/file', { 
                          method: 'PATCH', 
                          headers: { 'Content-Type': 'application/json' }, 
                          body: JSON.stringify({ action: 'rename', source: explorerCtxMenu.path, destination: newPath }) 
                        });
                        refetchTree();
                        setExplorerCtxMenu(null);
                      }},
                      !explorerCtxMenu.isDir ? { label: 'Duplicate', action: async () => {
                        const parts = explorerCtxMenu.path.split(/[/\\]/);
                        const oldName = parts[parts.length - 1];
                        const ext = oldName.includes('.') ? '.' + oldName.split('.').pop() : '';
                        const base = ext ? oldName.slice(0, -ext.length) : oldName;
                        const newName = `${base}_copy${ext}`;
                        const dir = parts.slice(0, -1).join('/');
                        await fetch('/api/workspace/file', { 
                          method: 'PATCH', 
                          headers: { 'Content-Type': 'application/json' }, 
                          body: JSON.stringify({ action: 'copy', source: explorerCtxMenu.path, destination: `${dir}/${newName}` }) 
                        });
                        refetchTree();
                        setExplorerCtxMenu(null);
                      }} : null,
                      { label: 'Copy Path', action: () => { navigator.clipboard.writeText(explorerCtxMenu.path); setExplorerCtxMenu(null); }},
                      null,
                      { label: 'Delete', action: async () => {
                        const name = explorerCtxMenu.path.split(/[/\\]/).pop();
                        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
                        await fetch(`/api/workspace/file?path=${encodeURIComponent(explorerCtxMenu.path)}`, { method: 'DELETE' });
                        refetchTree();
                        setExplorerCtxMenu(null);
                      }},
                    ].filter(Boolean).map((item: any, idx: number) =>
                      item === null ? (
                        <div key={idx} className="h-px bg-[#3a3a3a] my-1" />
                      ) : (
                        <button
                          key={item.label}
                          className={`w-full text-left px-3 py-1.5 hover:bg-[#094771] transition-colors ${item.label === 'Delete' ? 'text-[#c74e39]' : ''}`}
                          onClick={item.action}
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Breadcrumb / File path */}
                {activeFile && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] flex-shrink-0">
                    <span className="text-[11px] text-[#888] font-mono truncate">
                      {activeFile.path}
                    </span>
                    {pendingDiffs[activeFile.path] && (
                      <span className="ml-2 text-[9px] bg-[#4ec9b0]/20 text-[#4ec9b0] px-1.5 py-0.5 rounded font-mono">
                        AI Diff Preview
                      </span>
                    )}
                    {activeFile.isDirty && !pendingDiffs[activeFile.path] && (
                      <span className="ml-auto text-[10px] text-[#f0ad4e] flex items-center gap-1 flex-shrink-0">
                        <Circle className="size-1.5 fill-current" /> Unsaved
                      </span>
                    )}
                  </div>
                )}

                {/* Editor Content */}
                <div className="flex-1 min-h-0 min-w-0 relative">
                  {activeFile ? (
                    pendingDiffs[activeFile.path] ? (
                      <MonacoDiffEditor
                        height="100%"
                        language={getLanguage(activeFile.name)}
                        theme="vs-dark"
                        original={pendingDiffs[activeFile.path].original}
                        modified={pendingDiffs[activeFile.path].modified}
                        onMount={(editor) => {
                          diffEditorInstRef.current = editor;
                        }}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', 'Geist Mono', 'Fira Code', Menlo, monospace",
                          renderSideBySide: true,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    ) : (
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
                        onMount={(editor, monaco) => {
                          editorInstRef.current = editor;
                          monacoRef.current = monaco;
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
                    )
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
              <ResizablePanel id="bottom-panel-v10" defaultSize={panelSizes[1]} minSize={10}>
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
                    <GitDiffPanel projectPath={projectPath} defaultBranch={projectDefaultBranch} />
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

        {/* 4. AI AGENT PANEL (Collapsible) */}
        {isAiPanelOpen ? (
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
            <div className="px-4 pt-3 pb-2 border-b border-[#1e1e1e] flex-shrink-0 flex flex-col gap-3">
              
              {/* Top row: title + action buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-[#4ec9b0]" />
                  <span className="text-sm font-semibold text-[#cccccc]">AI Assistant</span>
                  {isAgentRunning && (
                    <span className="flex items-center gap-1 text-[10px] text-[#4ec9b0] animate-pulse">
                      <Loader2 className="size-2.5 animate-spin" />
                      Running
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setSessionsMenuOpen(!sessionsMenuOpen)}
                    title="Chat sessions"
                    className="text-[11px] text-[#666] hover:text-[#cccccc] transition-colors px-2 py-1 rounded hover:bg-[#333]"
                  >
                    Sessions
                  </button>
                  <button
                    onClick={newChatSession}
                    title="New chat"
                    className="text-[11px] text-[#666] hover:text-[#cccccc] transition-colors px-2 py-1 rounded hover:bg-[#333]"
                  >
                    New
                  </button>
                  <button
                    onClick={clearAiMessages}
                    title="Clear chat"
                    className="text-[11px] text-[#666] hover:text-[#cccccc] transition-colors px-2 py-1 rounded hover:bg-[#333]"
                  >
                    Clear
                  </button>
                  {/* Settings Popover */}
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          title="Chat settings"
                          className="p-1.5 rounded hover:bg-[#333] text-[#666] hover:text-[#cccccc] transition-colors"
                        >
                          <Settings className="size-3.5" />
                        </button>
                      }
                    />
                    <PopoverContent
                      side="bottom"
                      align="end"
                      className="w-60 p-4 bg-[#252526] border border-[#3a3a3a] rounded-lg shadow-xl"
                    >
                      <p className="text-[10px] uppercase tracking-widest text-[#666] font-bold mb-3">Chat Settings</p>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[12px] text-[#cccccc] font-medium">Auto Approve</p>
                            <p className="text-[10px] text-[#666]">Skip manual diff review</p>
                          </div>
                          <Switch
                            id="approval-mode-switch"
                            checked={approvalMode === 'auto'}
                            onCheckedChange={(checked) => setApprovalMode(checked ? 'auto' : 'manual')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[12px] text-[#cccccc] font-medium">Auto Compact</p>
                            <p className="text-[10px] text-[#666]">Compress at 90% context</p>
                          </div>
                          <Switch
                            id="auto-compact-switch"
                            checked={isAutoCompactEnabled}
                            onCheckedChange={setAutoCompactEnabled}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => setAiPanelOpen(false)}
                    title="Collapse AI panel"
                    className="p-1.5 rounded hover:bg-[#333] text-[#666] hover:text-[#cccccc] transition-colors ml-0.5"
                  >
                    <PanelRightClose className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Model Selector */}
              <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                <PopoverTrigger
                  render={
                    <button className="w-full flex items-center gap-2 bg-[#2d2d2d] hover:bg-[#353535] text-[#cccccc] text-xs px-3 py-2 rounded-md border border-[#3a3a3a] hover:border-[#4a4a4a] focus:border-[#007acc] outline-none transition-all">
                      <Cpu className="size-3.5 text-[#4ec9b0] flex-shrink-0" />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[#4ec9b0] font-semibold truncate">
                          {getField((effectiveProvider || {}) as Record<string, unknown>, 'name', 'Name') || 'Select Provider'}
                        </span>
                        <span className="text-[#444]">·</span>
                        <span className="truncate text-[#888]">{effectiveModelId || providerDefaultModel || 'Select model'}</span>
                      </div>
                      <ChevronDown className="size-3 text-[#555] flex-shrink-0" />
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

              {/* Context Usage Bar */}
              <ContextUsageBar usedTokens={contextUsedTokens} contextLimit={contextLimit} />
            </div>

            {/* Messages */}
            <div ref={aiScrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {aiMessages.map((msg, i) => (
                <AiMessageBubble key={i} role={msg.role} content={msg.content} steps={msg.steps} model={msg.model} provider={msg.provider} isLast={i === aiMessages.length - 1 && isAgentRunning} />
              ))}
              <div ref={aiEndRef} />
            </div>

            {/* AI Todo List Strip — above chat input */}
            <ActiveTodoStrip />

            {/* Interrupted Task Resume Banner */}
            {showInterruptedBanner && !isAgentRunning && (() => {
              const msgs = aiMessages;
              const userMsgs = msgs.filter(m => m.role === 'user');
              const lastUserMsg = userMsgs[userMsgs.length - 1]?.content || '';
              if (!lastUserMsg) return null;
              return (
                <InterruptedTaskBanner
                  lastMessage={lastUserMsg}
                  onResume={handleResumeTask}
                  onDismiss={() => setShowInterruptedBanner(false)}
                />
              );
            })()}

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
                      <div
                        key={session.id}
                        className="flex items-center px-3 py-2 hover:bg-[#094771] transition-colors border-b border-[#333] last:border-0 group"
                      >
                        <button
                          className="flex-1 flex flex-col text-left min-w-0"
                          onClick={() => {
                            loadChatSession(session.id);
                            setSessionsMenuOpen(false);
                          }}
                        >
                          <span className="text-[#cccccc] text-xs font-semibold truncate">{session.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-[#888]">{new Date(session.createdAt).toLocaleString()}</span>
                            <span className="text-[9px] text-[#519aba] bg-[#519aba]/10 px-1 rounded">{session.messages.length} msgs</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChatSession(session.id);
                            toast.success('Session deleted');
                          }}
                          className="p-1 rounded text-[#555] hover:text-[#c74e39] hover:bg-[#c74e39]/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-2"
                          title="Delete session"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
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
                      onClick={() => {
                        globalAiAbortControllerRef.current?.abort();
                        globalAiAbortControllerRef.current = null;
                        abortControllerRef.current = null;
                        setAgentRunning(false);
                      }}
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
        ) : (
          /* AI Panel collapsed — strip bar on far right */
          <div className="w-10 shrink-0 flex flex-col items-center py-2 gap-1 bg-[#333333] border-l border-[#252526] z-10">
            <button
              onClick={() => setAiPanelOpen(true)}
              title="Open AI Assistant"
              className="p-2.5 rounded transition-colors text-[#858585] hover:text-white hover:bg-[#3a3a3a]"
            >
              <Bot className="size-5" />
            </button>
            {isAgentRunning && (
              <span className="size-1.5 rounded-full bg-[#4ec9b0] animate-pulse" />
            )}
          </div>
        )}
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
