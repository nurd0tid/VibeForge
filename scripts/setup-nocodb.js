const fs = require('fs');
const path = require('path');

const url = process.env.NOCODB_BASE_URL || 'https://app.nocodb.com';
const baseId = process.env.NOCODB_BASE_ID;
const token = process.env.NOCODB_API_TOKEN;

if (!baseId || !token) {
  console.error('Error: NOCODB_BASE_ID and NOCODB_API_TOKEN must be set in your environment.');
  process.exit(1);
}

const TABLES = [
  {
    table_name: 'projects',
    title: 'Projects',
    columns: [
      { column_name: 'name', title: 'Name', uidt: 'SingleLineText' },
      { column_name: 'slug', title: 'Slug', uidt: 'SingleLineText' },
      { column_name: 'description', title: 'Description', uidt: 'LongText' },
      { column_name: 'status', title: 'Status', uidt: 'SingleLineText' },
      { column_name: 'repository_url', title: 'Repository URL', uidt: 'SingleLineText' },
      { column_name: 'local_path', title: 'Local Path', uidt: 'SingleLineText' },
      { column_name: 'default_branch', title: 'Default Branch', uidt: 'SingleLineText' },
      { column_name: 'tech_stack', title: 'Tech Stack', uidt: 'SingleLineText' },
      { column_name: 'ai_context_path', title: 'AI Context Path', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'tasks',
    title: 'Tasks',
    columns: [
      { column_name: 'project_id', title: 'Project ID', uidt: 'Number' },
      { column_name: 'title', title: 'Title', uidt: 'SingleLineText' },
      { column_name: 'description', title: 'Description', uidt: 'LongText' },
      { column_name: 'status', title: 'Status', uidt: 'SingleLineText' },
      { column_name: 'priority', title: 'Priority', uidt: 'SingleLineText' },
      { column_name: 'type', title: 'Type', uidt: 'SingleLineText' },
      { column_name: 'estimate_days', title: 'Estimate Days', uidt: 'Number' },
      { column_name: 'estimate_hours', title: 'Estimate Hours', uidt: 'Number' },
      { column_name: 'assigned_agent', title: 'Assigned Agent', uidt: 'SingleLineText' },
      { column_name: 'provider_id', title: 'Provider ID', uidt: 'Number' },
      { column_name: 'acceptance_criteria', title: 'Acceptance Criteria', uidt: 'LongText' },
      { column_name: 'related_files', title: 'Related Files', uidt: 'LongText' },
      { column_name: 'related_docs', title: 'Related Docs', uidt: 'LongText' },
      { column_name: 'branch_name', title: 'Branch Name', uidt: 'SingleLineText' },
      { column_name: 'progress', title: 'Progress', uidt: 'Number' },
      { column_name: 'dependencies', title: 'Dependencies', uidt: 'LongText' },
      { column_name: 'blocked_reason', title: 'Blocked Reason', uidt: 'LongText' }
    ]
  },
  {
    table_name: 'providers',
    title: 'Providers',
    columns: [
      { column_name: 'name', title: 'Name', uidt: 'SingleLineText' },
      { column_name: 'type', title: 'Type', uidt: 'SingleLineText' },
      { column_name: 'base_url', title: 'Base URL', uidt: 'SingleLineText' },
      { column_name: 'default_model', title: 'Default Model', uidt: 'SingleLineText' },
      { column_name: 'fallback_order', title: 'Fallback Order', uidt: 'SingleLineText' },
      { column_name: 'is_active', title: 'Is Active', uidt: 'Checkbox' },
      { column_name: 'supports_reasoning', title: 'Supports Reasoning', uidt: 'Checkbox' },
      { column_name: 'supports_tools', title: 'Supports Tools', uidt: 'Checkbox' }
    ]
  },
  {
    table_name: 'daily_logs',
    title: 'Daily Logs',
    columns: [
      { column_name: 'project_id', title: 'Project ID', uidt: 'Number' },
      { column_name: 'task_id', title: 'Task ID', uidt: 'Number' },
      { column_name: 'date', title: 'Date', uidt: 'Date' },
      { column_name: 'summary', title: 'Summary', uidt: 'LongText' },
      { column_name: 'completed_items', title: 'Completed Items', uidt: 'LongText' },
      { column_name: 'blockers', title: 'Blockers', uidt: 'LongText' },
      { column_name: 'next_steps', title: 'Next Steps', uidt: 'LongText' },
      { column_name: 'changed_files', title: 'Changed Files', uidt: 'LongText' },
      { column_name: 'notes', title: 'Notes', uidt: 'LongText' },
      { column_name: 'agent_id', title: 'Agent ID', uidt: 'Number' },
      { column_name: 'provider_id', title: 'Provider ID', uidt: 'Number' }
    ]
  },
  {
    table_name: 'weekly_logs',
    title: 'Weekly Logs',
    columns: [
      { column_name: 'project_id', title: 'Project ID', uidt: 'Number' },
      { column_name: 'week_start', title: 'Week Start', uidt: 'Date' },
      { column_name: 'week_end', title: 'Week End', uidt: 'Date' },
      { column_name: 'summary', title: 'Summary', uidt: 'LongText' },
      { column_name: 'completed_tasks', title: 'Completed Tasks', uidt: 'LongText' },
      { column_name: 'pending_tasks', title: 'Pending Tasks', uidt: 'LongText' },
      { column_name: 'blockers', title: 'Blockers', uidt: 'LongText' },
      { column_name: 'decisions', title: 'Decisions', uidt: 'LongText' },
      { column_name: 'next_week_plan', title: 'Next Week Plan', uidt: 'LongText' }
    ]
  },
  {
    table_name: 'agent_runs',
    title: 'Agent Runs',
    columns: [
      { column_name: 'project_id', title: 'Project ID', uidt: 'Number' },
      { column_name: 'task_id', title: 'Task ID', uidt: 'Number' },
      { column_name: 'agent_name', title: 'Agent Name', uidt: 'SingleLineText' },
      { column_name: 'provider_id', title: 'Provider ID', uidt: 'Number' },
      { column_name: 'model', title: 'Model', uidt: 'SingleLineText' },
      { column_name: 'skill', title: 'Skill', uidt: 'SingleLineText' },
      { column_name: 'status', title: 'Status', uidt: 'SingleLineText' },
      { column_name: 'input_summary', title: 'Input Summary', uidt: 'LongText' },
      { column_name: 'output_summary', title: 'Output Summary', uidt: 'LongText' },
      { column_name: 'started_at', title: 'Started At', uidt: 'DateTime' },
      { column_name: 'finished_at', title: 'Finished At', uidt: 'DateTime' },
      { column_name: 'error_message', title: 'Error Message', uidt: 'LongText' }
    ]
  },
  {
    table_name: 'task_plans',
    title: 'Task Plans',
    columns: [
      { column_name: 'project_id', title: 'Project ID', uidt: 'Number' },
      { column_name: 'task_id', title: 'Task ID', uidt: 'Number' },
      { column_name: 'title', title: 'Title', uidt: 'SingleLineText' },
      { column_name: 'objective', title: 'Objective', uidt: 'LongText' },
      { column_name: 'scope', title: 'Scope', uidt: 'LongText' },
      { column_name: 'out_of_scope', title: 'Out of Scope', uidt: 'LongText' },
      { column_name: 'plan_steps', title: 'Plan Steps', uidt: 'LongText' },
      { column_name: 'risks', title: 'Risks', uidt: 'LongText' },
      { column_name: 'dependencies', title: 'Dependencies', uidt: 'LongText' },
      { column_name: 'assumptions', title: 'Assumptions', uidt: 'LongText' },
      { column_name: 'estimated_effort', title: 'Estimated Effort', uidt: 'SingleLineText' },
      { column_name: 'created_by_agent', title: 'Created By Agent', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'schedules',
    title: 'Schedules',
    columns: [
      { column_name: 'project_id', title: 'Project ID', uidt: 'Number' },
      { column_name: 'task_id', title: 'Task ID', uidt: 'Number' },
      { column_name: 'plan_id', title: 'Plan ID', uidt: 'Number' },
      { column_name: 'day_index', title: 'Day Index', uidt: 'Number' },
      { column_name: 'scheduled_date', title: 'Scheduled Date', uidt: 'Date' },
      { column_name: 'title', title: 'Title', uidt: 'SingleLineText' },
      { column_name: 'description', title: 'Description', uidt: 'LongText' },
      { column_name: 'expected_output', title: 'Expected Output', uidt: 'LongText' },
      { column_name: 'status', title: 'Status', uidt: 'SingleLineText' }
    ]
  }
];

async function setup() {
  console.log(`Setting up NocoDB tables in base: ${baseId}`);
  
  for (const tableDef of TABLES) {
    try {
      console.log(`\nCreating table: ${tableDef.table_name}...`);
      
      const createTableRes = await fetch(`${url}/api/v1/db/meta/projects/${baseId}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xc-token': token
        },
        body: JSON.stringify({
          table_name: tableDef.table_name,
          title: tableDef.title,
          columns: tableDef.columns.map(col => ({
            column_name: col.column_name,
            title: col.title,
            uidt: col.uidt
          }))
        })
      });

      if (!createTableRes.ok) {
        const body = await createTableRes.text();
        console.error(`Failed to create table ${tableDef.table_name}: ${createTableRes.status} ${body}`);
        continue;
      }

      const tableData = await createTableRes.json();
      console.log(`Table ${tableDef.table_name} created with ID: ${tableData.id}`);
    } catch (err) {
      console.error(`Error processing table ${tableDef.table_name}:`, err.message);
    }
  }
  
  console.log('\nSetup complete! You can now use VibeForge.');
}

setup();
