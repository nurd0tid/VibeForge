export interface BaseRecord {
  Id: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Project extends BaseRecord {
  name: string;
  slug: string;
  description?: string;
  status: string;
  repository_url?: string;
  local_path?: string;
  default_branch?: string;
  tech_stack?: string;
  ai_context_path?: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'testing' | 'done' | 'blocked';

export interface Task extends BaseRecord {
  project_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: string;
  type?: string;
  estimate_days?: number;
  estimate_hours?: number;
  assigned_agent?: string;
  provider_id?: number;
  acceptance_criteria?: string;
  related_files?: string;
  related_docs?: string;
  branch_name?: string;
  progress?: number;
  ai_confidence?: number;
  dependencies?: string;
  blocked_reason?: string;
}

export interface TaskPlan extends BaseRecord {
  project_id: number;
  task_id: number;
  title: string;
  objective?: string;
  scope?: string;
  out_of_scope?: string;
  plan_steps?: string;
  risks?: string;
  dependencies?: string;
  assumptions?: string;
  estimated_effort?: string;
  created_by_agent?: string;
}

export interface Schedule extends BaseRecord {
  project_id: number;
  task_id: number;
  plan_id?: number;
  day_index?: number;
  scheduled_date: string;
  title: string;
  description?: string;
  expected_output?: string;
  status: string;
}

export interface DailyLog extends BaseRecord {
  project_id: number;
  task_id?: number;
  date: string;
  summary: string;
  completed_items?: string;
  blockers?: string;
  next_steps?: string;
  changed_files?: string;
  notes?: string;
  agent_id?: number;
  provider_id?: number;
}

export interface WeeklyLog extends BaseRecord {
  project_id: number;
  week_start: string;
  week_end: string;
  summary: string;
  completed_tasks?: string;
  pending_tasks?: string;
  blockers?: string;
  decisions?: string;
  next_week_plan?: string;
}

export interface ProjectContextUpdate extends BaseRecord {
  project_id: number;
  task_id?: number;
  update_type: string;
  title: string;
  description?: string;
  affected_docs?: string;
  affected_files?: string;
  decision?: string;
  reason?: string;
  created_by_agent?: string;
}

export interface AgentRun extends BaseRecord {
  project_id: number;
  task_id?: number;
  agent_name: string;
  provider_id?: number;
  model?: string;
  skill?: string;
  status: string;
  input_summary?: string;
  output_summary?: string;
  input_tokens?: number;
  output_tokens?: number;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
}

export type TodoStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface AgentTodoItem {
  id: string;
  taskId?: string;
  sessionId: string;
  title: string;
  status: TodoStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface AgentTodoList {
  id: string;
  taskId?: string;
  sessionId: string;
  source: "chat" | "play_task" | "multi_task" | "subagent";
  status: "active" | "completed" | "dismissed";
  items: AgentTodoItem[];
  collapsed: boolean;
  dismissedByUser: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type AgentActivityEvent =
  | { type: "task.started"; taskId: string; title: string }
  | { type: "task.completed"; taskId: string; title: string }
  | { type: "task.failed"; taskId: string; title: string; error: string }
  | { type: "todo.created"; items: AgentTodoItem[] }
  | { type: "todo.updated"; itemId: string; status: TodoStatus }
  | { type: "file.read"; path: string; lineStart?: number; lineEnd?: number }
  | { type: "folder.search.started"; query: string; folder?: string }
  | { type: "folder.search.result"; query: string; matches: any[] }
  | { type: "file.edit.started"; path: string }
  | { type: "file.edit.patch.generated"; path: string; patch: string }
  | { type: "file.edit.applied"; path: string }
  | { type: "file.edit.rejected"; path: string }
  | { type: "terminal.command"; command: string }
  | { type: "terminal.output"; output: string }
  | { type: "error"; message: string }
  | { type: "context.compacted"; summary: string; preservedItems: string[]; beforeTokenCount?: number; afterTokenCount?: number };

export interface AgentLog extends BaseRecord {
  run_id: number;
  project_id: number;
  task_id?: number;
  level: string;
  message: string;
  metadata?: string;
}

export type ProviderType = 
  | 'openai' 
  | 'openrouter' 
  | 'anthropic' 
  | 'gemini' 
  | 'azure-openai' 
  | 'openai-compatible' 
  | 'ollama' 
  | 'lm-studio' 
  | 'vllm' 
  | 'litellm' 
  | 'opencode' 
  | 'zen' 
  | '9router' 
  | 'custom';

export type ApiKeyMode = 'env' | 'direct-local' | 'temporary' | 'none';

export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'untested';

export interface ProviderModel {
  id: string;
  name?: string;
  context_length?: number;
}

export interface ProviderConfig {
  apiKeyMode: ApiKeyMode;
  apiKeyEnvName?: string;
  directApiKey?: string;
  models?: ProviderModel[];
  customHeaders?: Record<string, string>;
  status?: ProviderStatus;
  lastTestedAt?: string;
}

export interface Provider extends BaseRecord {
  name: string;
  type: ProviderType | string;
  base_url?: string;
  default_model?: string;
  fallback_order?: number;
  is_active?: boolean;
  supports_reasoning?: boolean;
  supports_tools?: boolean;
  context_window?: number;
  max_output_tokens?: number;
  config?: ProviderConfig | string;
}

export interface Skill extends BaseRecord {
  name: string;
  command: string;
  description?: string;
  required_inputs?: string;
  output_target?: string;
  is_active?: boolean;
}

export interface Decision extends BaseRecord {
  project_id: number;
  title: string;
  decision: string;
  reason?: string;
  alternatives?: string;
  impact?: string;
}

export interface Blocker extends BaseRecord {
  project_id: number;
  task_id?: number;
  title: string;
  description?: string;
  severity?: string;
  status: string;
  resolution?: string;
  resolved_at?: string;
}

export interface NocoDBListResponse<T> {
  list: T[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}
