import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentTodoList, TodoStatus } from '@/types';

interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  isDeleted?: boolean;
  tag?: 'created' | 'edited';
}

export interface AgentStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'content';
  text?: string;
  toolId?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
}

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  steps?: AgentStep[];
  model?: string;
  provider?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: string;
}

type SidePanel = 'explorer' | 'search' | 'git' | 'tasks';
type BottomTab = 'problems' | 'output' | 'terminal' | 'git-diff' | 'agent-logs';

interface WorkspaceState {
  openFiles: OpenFile[];
  activeFilePath: string | null;
  activePanel: SidePanel;
  bottomTab: BottomTab;
  aiMessages: AiMessage[];
  collapseAllTrigger: number;
  chatSessions: ChatSession[];
  activeChatSessionId: string | null;
  isAgentRunning: boolean;
  agentStatusText: string;
  activeTodoList: AgentTodoList | null;
  approvalMode: 'manual' | 'auto';
  contextUsedTokens: number;
  contextLimit: number;
  isAutoCompactEnabled: boolean;
  isAiPanelOpen: boolean;
  pendingDiffs: Record<string, { original: string; modified: string }>;
  expandedFolders: Record<string, boolean>;

  openFile: (path: string, name: string, content: string) => void;
  closeFile: (path: string) => void;
  closeAllFiles: () => void;
  closeOtherFiles: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string) => void;
  markFileDeleted: (path: string, deleted: boolean) => void;
  markFileTag: (path: string, tag: 'created' | 'edited' | null) => void;
  setActivePanel: (panel: SidePanel) => void;
  setBottomTab: (tab: BottomTab) => void;
  setAiPanelOpen: (isOpen: boolean) => void;
  addAiMessage: (msg: AiMessage) => void;
  updateLastAiMessage: (content: string) => void;
  updateLastAiMessageSteps: (steps: AgentStep[], content: string) => void;
  clearAiMessages: () => void;
  triggerCollapseAll: () => void;
  saveChatSession: () => void;
  loadChatSession: (id: string) => void;
  deleteChatSession: (id: string) => void;
  newChatSession: () => void;
  setAgentRunning: (running: boolean, status?: string) => void;
  setAgentStatusText: (text: string) => void;
  setActiveTodoList: (list: AgentTodoList | null) => void;
  updateTodoItemStatus: (itemId: string, status: TodoStatus) => void;
  dismissTodoList: () => void;
  setApprovalMode: (mode: 'manual' | 'auto') => void;
  setContextUsage: (used: number, limit: number) => void;
  setAutoCompactEnabled: (enabled: boolean) => void;
  setPendingDiff: (path: string, original: string, modified: string) => void;
  clearPendingDiff: (path: string) => void;
  toggleFolder: (path: string, expanded: boolean) => void;
  collapseAllFolders: () => void;
}

const INITIAL_MESSAGES: AiMessage[] = [
  { role: 'assistant', content: 'Hello! I\'m ready to help you with the current project. What would you like to build?' },
];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      openFiles: [],
      activeFilePath: null,
      activePanel: 'explorer',
      bottomTab: 'terminal',
      collapseAllTrigger: 0,
      aiMessages: [...INITIAL_MESSAGES],
      chatSessions: [],
      activeChatSessionId: null,
      isAgentRunning: false,
      agentStatusText: 'Analyzing your request...',
      activeTodoList: null,
      approvalMode: 'auto',
      contextUsedTokens: 0,
      contextLimit: 128000,
      isAutoCompactEnabled: false,
      isAiPanelOpen: true,
      pendingDiffs: {},
      expandedFolders: {},

      openFile: (path, name, content) => {
        const existing = get().openFiles.find((f) => f.path === path);
        if (existing) {
          set((state) => ({
            openFiles: state.openFiles.map((f) =>
              f.path === path ? { ...f, isDeleted: false, tag: f.tag } : f
            ),
            activeFilePath: path,
          }));
          return;
        }
        set((state) => ({
          openFiles: [...state.openFiles, { path, name, content, isDirty: false, isDeleted: false }],
          activeFilePath: path,
        }));
      },

      closeFile: (path) => {
        set((state) => {
          const filtered = state.openFiles.filter((f) => f.path !== path);
          let newActive = state.activeFilePath;
          if (state.activeFilePath === path) {
            newActive = filtered.length > 0 ? filtered[filtered.length - 1].path : null;
          }
          return { openFiles: filtered, activeFilePath: newActive };
        });
      },

      closeAllFiles: () => {
        set({ openFiles: [], activeFilePath: null });
      },

      closeOtherFiles: (path) => {
        set((state) => {
          const target = state.openFiles.find((f) => f.path === path);
          if (!target) return {};
          return { openFiles: [target], activeFilePath: path };
        });
      },

      setActiveFile: (path) => set({ activeFilePath: path }),

      updateFileContent: (path, content) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path ? { ...f, content, isDirty: true } : f
          ),
        }));
      },

      markFileSaved: (path) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path ? { ...f, isDirty: false } : f
          ),
        }));
      },

      markFileDeleted: (path, deleted) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path ? { ...f, isDeleted: deleted } : f
          ),
        }));
      },

      markFileTag: (path, tag) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path ? { ...f, tag: tag || undefined, isDeleted: false } : f
          ),
        }));
      },

      setActivePanel: (panel) => set({ activePanel: panel }),
      setBottomTab: (tab) => set({ bottomTab: tab }),
      setAiPanelOpen: (isOpen) => set({ isAiPanelOpen: isOpen }),

      addAiMessage: (msg) => {
        set((state) => ({
          aiMessages: [...state.aiMessages, msg],
        }));
      },
      updateLastAiMessage: (content) => {
        set((state) => {
          const msgs = [...state.aiMessages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
          }
          return { aiMessages: msgs };
        });
      },
      updateLastAiMessageSteps: (steps, content) => {
        set((state) => {
          const msgs = [...state.aiMessages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], steps, content };
          }
          return { aiMessages: msgs };
        });
      },
      clearAiMessages: () => {
        set({
          aiMessages: [...INITIAL_MESSAGES],
          activeChatSessionId: null,
          contextUsedTokens: 0,
        });
      },
      triggerCollapseAll: () => set((state) => ({ collapseAllTrigger: state.collapseAllTrigger + 1 })),

      saveChatSession: () => {
        const { aiMessages, activeChatSessionId, chatSessions } = get();
        const nonInitial = aiMessages.filter((m) => m.role !== 'assistant' || m.content !== INITIAL_MESSAGES[0].content);
        if (nonInitial.length === 0) return;

        const firstUser = aiMessages.find((m) => m.role === 'user');
        const title = firstUser ? firstUser.content.slice(0, 60) : `Session ${new Date().toLocaleTimeString()}`;

        if (activeChatSessionId) {
          set({
            chatSessions: chatSessions.map((s) =>
              s.id === activeChatSessionId
                ? { ...s, messages: [...aiMessages], title }
                : s
            ),
          });
        } else {
          const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title,
            messages: [...aiMessages],
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            chatSessions: [newSession, ...state.chatSessions],
            activeChatSessionId: newSession.id,
          }));
        }
      },

      loadChatSession: (id) => {
        const { chatSessions } = get();
        const session = chatSessions.find((s) => s.id === id);
        if (!session) return;
        const charCount = session.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
        const estTokens = Math.round(charCount / 4);
        set({
          aiMessages: [...session.messages],
          activeChatSessionId: id,
          contextUsedTokens: estTokens,
        });
      },

      deleteChatSession: (id) => {
        set((state) => {
          const filtered = state.chatSessions.filter((s) => s.id !== id);
          const wasActive = state.activeChatSessionId === id;
          return {
            chatSessions: filtered,
            ...(wasActive ? {
              activeChatSessionId: null,
              aiMessages: [...INITIAL_MESSAGES],
              contextUsedTokens: 0,
            } : {}),
          };
        });
      },

      newChatSession: () => {
        get().saveChatSession();
        set({
          aiMessages: [...INITIAL_MESSAGES],
          activeChatSessionId: null,
          contextUsedTokens: 0,
        });
      },

      setAgentRunning: (running, status) => {
        set({
          isAgentRunning: running,
          ...(status ? { agentStatusText: status } : {}),
        });
      },

      setAgentStatusText: (text) => set({ agentStatusText: text }),

      setActiveTodoList: (list) => set({ activeTodoList: list }),

      updateTodoItemStatus: (itemId, status) => {
        set((state) => {
          const todo = state.activeTodoList;
          if (!todo) return {};
          const items = todo.items.map((item) =>
            item.id === itemId ? { ...item, status, updatedAt: new Date().toISOString() } : item
          );
          const allDone = items.every((i) => i.status === 'done' || i.status === 'skipped');
          return {
            activeTodoList: {
              ...todo,
              items,
              status: allDone ? 'completed' : 'active',
              updatedAt: new Date().toISOString(),
              ...(allDone ? { completedAt: new Date().toISOString() } : {}),
            },
          };
        });
      },

      dismissTodoList: () => {
        set((state) => {
          if (!state.activeTodoList) return {};
          return {
            activeTodoList: {
              ...state.activeTodoList,
              dismissedByUser: true,
              status: 'dismissed',
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      setApprovalMode: (mode) => set({ approvalMode: mode }),

      setContextUsage: (used, limit) => set({ contextUsedTokens: used, contextLimit: limit }),

      setAutoCompactEnabled: (enabled) => set({ isAutoCompactEnabled: enabled }),

      setPendingDiff: (path, original, modified) => {
        set((state) => ({
          pendingDiffs: { ...state.pendingDiffs, [path]: { original, modified } },
        }));
      },

      clearPendingDiff: (path) => {
        set((state) => {
          const next = { ...state.pendingDiffs };
          delete next[path];
          return { pendingDiffs: next };
        });
      },

      toggleFolder: (path, expanded) => {
        set((state) => ({
          expandedFolders: { ...state.expandedFolders, [path]: expanded },
        }));
      },

      collapseAllFolders: () => {
        set({ expandedFolders: {} });
      },
    }),
    {
      name: 'vibeforge-workspace',
      partialize: (state) => ({
        chatSessions: state.chatSessions,
        activeChatSessionId: state.activeChatSessionId,
        aiMessages: state.aiMessages,
        approvalMode: state.approvalMode,
        contextLimit: state.contextLimit,
        contextUsedTokens: state.contextUsedTokens,
        isAutoCompactEnabled: state.isAutoCompactEnabled,
        isAiPanelOpen: state.isAiPanelOpen,
        expandedFolders: state.expandedFolders,
      }),
    }
  )
);
