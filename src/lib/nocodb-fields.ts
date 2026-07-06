export function toNocoDBFields(data: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (mapping[key]) {
      result[mapping[key]] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function getField(obj: Record<string, unknown>, snake: string, title: string): string {
  return (obj?.[snake] as string) || (obj?.[title] as string) || '';
}

export function getFieldBool(obj: Record<string, unknown>, snake: string, title: string): boolean {
  if (obj?.[snake] !== undefined) return !!obj[snake];
  if (obj?.[title] !== undefined) return !!obj[title];
  return false;
}

export const PROVIDER_FIELD_MAP: Record<string, string> = {
  base_url: 'Base URL',
  default_model: 'Default Model',
  fallback_order: 'Fallback Order',
  is_active: 'Is Active',
  supports_reasoning: 'Supports Reasoning',
  supports_tools: 'Supports Tools',
};

export const PROJECT_FIELD_MAP: Record<string, string> = {
  name: 'Name',
  slug: 'Slug',
  description: 'Description',
  status: 'Status',
  repository_url: 'Repository URL',
  local_path: 'Local Path',
  default_branch: 'Default Branch',
  tech_stack: 'Tech Stack',
  ai_context_path: 'AI Context Path',
};

export const TASK_FIELD_MAP: Record<string, string> = {
  project_id: 'Project ID',
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  type: 'Type',
  estimate_days: 'Estimate Days',
  estimate_hours: 'Estimate Hours',
  assigned_agent: 'Assigned Agent',
  provider_id: 'Provider ID',
  acceptance_criteria: 'Acceptance Criteria',
  related_files: 'Related Files',
  related_docs: 'Related Docs',
  branch_name: 'Branch Name',
  progress: 'Progress',
  dependencies: 'Dependencies',
  blocked_reason: 'Blocked Reason',
};

export const TASK_PLAN_FIELD_MAP: Record<string, string> = {
  project_id: 'Project ID',
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  target_date: 'Target Date',
  tasks: 'Tasks',
  notes: 'Notes',
};

export const SCHEDULE_FIELD_MAP: Record<string, string> = {
  project_id: 'Project ID',
  name: 'Name',
  description: 'Description',
  cron_expression: 'Cron Expression',
  is_active: 'Is Active',
  last_run: 'Last Run',
  next_run: 'Next Run',
};

export const DAILY_LOG_FIELD_MAP: Record<string, string> = {
  project_id: 'Project ID',
  date: 'Date',
  summary: 'Summary',
  tasks_completed: 'Tasks Completed',
  blockers: 'Blockers',
  notes: 'Notes',
};

export const WEEKLY_LOG_FIELD_MAP: Record<string, string> = {
  project_id: 'Project ID',
  week_start: 'Week Start',
  week_end: 'Week End',
  summary: 'Summary',
  goals_met: 'Goals Met',
  challenges: 'Challenges',
  notes: 'Notes',
};

export const AGENT_RUN_FIELD_MAP: Record<string, string> = {
  project_id: 'Project ID',
  task_id: 'Task ID',
  agent_name: 'Agent Name',
  status: 'Status',
  start_time: 'Start Time',
  end_time: 'End Time',
  logs: 'Logs',
  error: 'Error',
};
