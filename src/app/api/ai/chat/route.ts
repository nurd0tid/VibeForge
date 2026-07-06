import { getRecord, createRecord, updateRecord } from '@/lib/nocodb';
import { getProviderLocalConfig, resolveApiKey } from '@/lib/local-config';
import { getField, TASK_FIELD_MAP, SCHEDULE_FIELD_MAP, toNocoDBFields } from '@/lib/nocodb-fields';
import type { Provider } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let _debugLogPath: string | null = null;
async function debugLog(workspaceRoot: string, ...args: unknown[]) {
  try {
    if (!_debugLogPath) {
      const logDir = path.resolve(workspaceRoot || process.cwd(), '.vibeforge/agent-logs');
      await fs.mkdir(logDir, { recursive: true });
      _debugLogPath = path.join(logDir, 'chat_debug.log');
    }
    const ts = new Date().toISOString();
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
    await fs.appendFile(_debugLogPath, `[${ts}] ${msg}\n`, 'utf-8');
  } catch {}
}

async function executeTool(name: string, args: Record<string, string>, projectRoot: string, activeProjectId: string | null): Promise<string> {
  const resolve = (p: string) => path.resolve(projectRoot, p.replace(/^\//, ''));

  switch (name) {
    case 'list_directory': {
      try {
        const target = resolve(args.path || '.');
        const entries = await fs.readdir(target, { withFileTypes: true });
        return entries.map((e) => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n') || '(empty)';
      } catch (e: unknown) { return `Error: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'read_file': {
      try {
        const filePath = resolve(args.path);
        const content = await fs.readFile(filePath, 'utf-8');
        return content.length > 6000 ? content.slice(0, 6000) + '\n...(truncated)' : content;
      } catch (e: unknown) { return `Error: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'edit_file': {
      try {
        const filePath = resolve(args.path);
        const content = await fs.readFile(filePath, 'utf-8');
        if (!content.includes(args.old_string)) return `Error: old_string not found in ${args.path}`;
        await fs.writeFile(filePath, content.replace(args.old_string, args.new_string), 'utf-8');
        return `Successfully edited ${args.path}`;
      } catch (e: unknown) { return `Error: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'write_file': {
      try {
        const filePath = resolve(args.path);
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, args.content, 'utf-8');
        return `Successfully created ${args.path}`;
      } catch (e: unknown) { return `Error: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'run_command': {
      try {
        const childEnv = { ...process.env };
        delete childEnv['PORT'];
        const { stdout, stderr } = await execAsync(args.command, { cwd: projectRoot, timeout: 15000, env: childEnv });
        return ((stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '')).slice(0, 4000) || '(no output)';
      } catch (e: unknown) { return `Error: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'memory_list': {
      try {
        const memoryPath = path.resolve(projectRoot, '.vibeforge/memory-bank');
        const entries = await fs.readdir(memoryPath, { withFileTypes: true });
        return entries.map((e) => e.name).join('\n') || '(empty memory bank)';
      } catch (e: unknown) { return `Error reading memory bank: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'memory_read': {
      try {
        const filePath = path.resolve(projectRoot, `.vibeforge/memory-bank/${args.file.replace(/^\//, '')}`);
        if (!filePath.startsWith(path.resolve(projectRoot, '.vibeforge/memory-bank'))) {
          return 'Error: Invalid memory bank file path';
        }
        const content = await fs.readFile(filePath, 'utf-8');
        return content.length > 8000 ? content.slice(0, 8000) + '\n...(truncated)' : content;
      } catch (e: unknown) { return `Error reading memory file: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'memory_write': {
      try {
        const filePath = path.resolve(projectRoot, `.vibeforge/memory-bank/${args.file.replace(/^\//, '')}`);
        if (!filePath.startsWith(path.resolve(projectRoot, '.vibeforge/memory-bank'))) {
          return 'Error: Invalid memory bank file path';
        }
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content, 'utf-8');
        return `Successfully wrote to memory file ${args.file}`;
      } catch (e: unknown) { return `Error writing memory file: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'nocodb_create_task': {
      try {
        const resolvedProjectId = Number(args.project_id || activeProjectId || '1');
        const rawTask = {
          project_id: resolvedProjectId,
          title: args.title,
          description: args.description || '',
          status: args.status || 'todo',
          priority: args.priority || 'medium',
          type: args.type || 'feature',
          estimate_days: args.estimate_days ? Number(args.estimate_days) : null,
          estimate_hours: args.estimate_hours ? Number(args.estimate_hours) : null,
          acceptance_criteria: args.acceptance_criteria || ''
        };
        const recordData = toNocoDBFields(rawTask, TASK_FIELD_MAP);
        const result = await createRecord<{ Id?: number }>('tasks', recordData);
        return `Successfully created NocoDB Task record (ID: ${result.Id || 'unknown'}, Project ID: ${resolvedProjectId})`;
      } catch (e: unknown) { return `Error creating NocoDB task: ${e instanceof Error ? e.message : String(e)}`; }
    }
    case 'nocodb_create_schedule': {
      try {
        const resolvedProjectId = Number(args.project_id || activeProjectId || '1');
        const rawSchedule = {
          project_id: resolvedProjectId,
          title: args.title || args.name,
          description: args.description || '',
          expected_output: args.expected_output || '',
          scheduled_date: args.scheduled_date || '',
          day_index: args.day_index ? Number(args.day_index) : 1,
          status: args.status || 'planned',
        };
        const recordData = toNocoDBFields(rawSchedule, SCHEDULE_FIELD_MAP);
        const result = await createRecord<{ Id?: number }>('schedules', recordData);
        return `Successfully created Schedule item (ID: ${result.Id || 'unknown'}, Title: "${rawSchedule.title}", Project ID: ${resolvedProjectId})`;
      } catch (e: unknown) { return `Error creating NocoDB schedule: ${e instanceof Error ? e.message : String(e)}`; }
    }
    default: return `Unknown tool: ${name}`;
  }
}

interface StreamResult {
  fullText: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Stream LLM response — emit prose AND detect tool calls. Tool execution is done separately. */
async function readStreamWithEmit(
  body: ReadableStream<Uint8Array>,
  emitChunk: (delta: string) => void,
  onToolFound?: (toolXml: string) => Promise<void> | void
): Promise<StreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let usage: StreamResult['usage'] = undefined;
  let pending = '';
  let insideToolPhase = false;
  const toolXmlList: string[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data: ')) continue;
      const raw = t.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const chunk = JSON.parse(raw);
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          pending += delta;
          
          if (pending.includes('<tool_use>')) {
            insideToolPhase = true;
          }

          while (pending.includes('<tool_use>') && pending.includes('</tool_use>')) {
            const startIdx = pending.indexOf('<tool_use>');
            const endIdx = pending.indexOf('</tool_use>') + '</tool_use>'.length;
            
            const before = pending.slice(0, startIdx).trim();
            if (before) emitChunk(before);
            
            const toolXml = pending.slice(startIdx, endIdx);
            toolXmlList.push(toolXml);
            
            pending = pending.slice(endIdx);
            insideToolPhase = pending.includes('<tool_use>') || pending.includes('<');
          }
          
          if (!insideToolPhase && !pending.includes('<tool_use>') && !pending.includes('<tool')) {
            const safeEnd = pending.lastIndexOf('<');
            if (safeEnd <= 0) {
              if (pending && !pending.includes('<')) {
                emitChunk(pending);
                pending = '';
              }
            } else {
              const safe = pending.slice(0, safeEnd);
              if (safe.trim()) emitChunk(safe);
              pending = pending.slice(safeEnd);
            }
          }
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
      } catch {
        // ignore partial JSON
      }
    }
  }
  
  // Execute collected tool calls sequentially (not in parallel) to avoid flooding NocoDB
  for (const toolXml of toolXmlList) {
    if (onToolFound) {
      try {
        emitChunk('');
        await onToolFound(toolXml);
      } catch {}
    }
  }
  
  if (pending) {
    const clean = pending.replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '').replace(/<[^>]*>/g, '').trim();
    if (clean) emitChunk(clean);
  }
  return { fullText, usage };
}

/** Parse tool calls from LLM response (prompt-based, XML-like format) */
function parseToolCalls(text: string): Array<{ name: string; args: Record<string, string> }> {
  const calls: Array<{ name: string; args: Record<string, string> }> = [];
  // Match <tool_use><name>...</name><args>{...}</args></tool_use> or simpler patterns
  const toolPattern = /<tool_use>\s*<name>([\w_]+)<\/name>\s*<args>([\s\S]*?)<\/args>\s*<\/tool_use>/g;
  let match;
  while ((match = toolPattern.exec(text)) !== null) {
    try {
      calls.push({ name: match[1], args: JSON.parse(match[2]) });
    } catch {
      // try args as plain text key=value
    }
  }
  
  // Also try JSON block pattern: ```tool\n{"name":"...","args":{...}}\n```
  const jsonPattern = /```tool\n?([\s\S]*?)\n?```/g;
  while ((match = jsonPattern.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.name) calls.push({ name: parsed.name, args: parsed.args || {} });
    } catch {}
  }
  
  return calls;
}

export async function POST(req: Request) {
  try {
    const { messages, providerId, model, skill, projectPath, projectId } = await req.json();

    if (!providerId) {
      return new Response(JSON.stringify({ error: 'No providerId specified' }), { status: 400 });
    }

    let provider: Provider | null = null;
    try {
      provider = await getRecord<Provider>('providers', Number(providerId));
    } catch {
      return new Response(JSON.stringify({ error: 'Provider not found' }), { status: 404 });
    }

    const rec = provider as unknown as Record<string, unknown>;
    const localConfig = getProviderLocalConfig(provider.Id) || {};
    const mode = localConfig.apiKeyMode || 'direct-local';
    const envName = localConfig.apiKeyEnvName || '';
    const apiKey = resolveApiKey(provider.Id, mode, envName, localConfig.directApiKey);
    if (!apiKey && mode !== 'none') {
      return new Response(JSON.stringify({ error: 'API Key not configured' }), { status: 401 });
    }

    const baseUrl = (getField(rec, 'base_url', 'Base URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
    const targetModel = model || getField(rec, 'default_model', 'Default Model') || 'gpt-4o';
    const maxOutputTokensRaw = Number(getField(rec, 'max_output_tokens', 'Max Output Tokens') || -1);
    const contextWindowRaw = Number(getField(rec, 'context_window', 'Context Window') || 0);
    const url = `${baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };

    const workspaceRoot = projectPath || process.cwd();

    // Load memory bank from project if it exists
    let memoryBank = '';
    try {
      const mbPath = path.join(workspaceRoot, '.vibeforge', 'memory-bank.md');
      memoryBank = await fs.readFile(mbPath, 'utf-8').catch(() => '');
    } catch {}

    const SYSTEM_PROMPT = `You are VibeForge AI Agent — a powerful coding assistant with filesystem access tools.

PROJECT ROOT: ${workspaceRoot}
${memoryBank ? `\nPROJECT MEMORY:\n${memoryBank.slice(0, 2000)}\n` : ''}
${skill ? `CURRENT SKILL: ${skill}\n` : ''}

TOOLS AVAILABLE (use these to interact with the project):

1. list_directory — List files in a directory
   Format: <tool_use><name>list_directory</name><args>{"path": "."}</args></tool_use>

2. read_file — Read file contents
   Format: <tool_use><name>read_file</name><args>{"path": "src/app/page.tsx"}</args></tool_use>

3. edit_file — Edit a file (search & replace)
   Format: <tool_use><name>edit_file</name><args>{"path": "file.ts", "old_string": "old", "new_string": "new"}</args></tool_use>

4. write_file — Create a new file from scratch
   Format: <tool_use><name>write_file</name><args>{"path": "new-file.md", "content": "# Title\nNew content here"}</args></tool_use>

5. run_command — Run a shell command
   Format: <tool_use><name>run_command</name><args>{"command": "pnpm build"}</args></tool_use>

6. memory_list — List all files in the project memory bank (.vibeforge/memory-bank/)
   Format: <tool_use><name>memory_list</name><args>{}</args></tool_use>

7. memory_read — Read a specific memory bank file
   Format: <tool_use><name>memory_read</name><args>{"file": "activeContext.md"}</args></tool_use>

8. memory_write — Write or update a memory bank file
   Format: <tool_use><name>memory_write</name><args>{"file": "activeContext.md", "content": "## Current Focus\\n..."}</args></tool_use>

9. nocodb_create_task — Create a task record in NocoDB (persists to the Kanban /tasks page)
   Args: title (required), description, status (todo/in-progress/done/backlog), priority (low/medium/high/critical), type (feature/bug/chore), estimate_hours, estimate_days, acceptance_criteria, project_id
   Format: <tool_use><name>nocodb_create_task</name><args>{"title": "Implement auth", "description": "...", "status": "todo", "priority": "high", "type": "feature", "estimate_hours": "4", "acceptance_criteria": "..."}</args></tool_use>

10. nocodb_create_schedule — Create a schedule record in NocoDB (persists to the /schedule page)
    Args: title (required), description, expected_output, scheduled_date (ISO date e.g. "2026-07-06"), day_index (number e.g. 1), status ("planned"/"in_progress"/"done"), project_id
    Format: <tool_use><name>nocodb_create_schedule</name><args>{"title": "Implement core layout", "description": "...", "expected_output": "sidebar and header rendered", "day_index": 1, "status": "planned"}</args></tool_use>

RULES:
- YOU MUST USE TOOLS to interact with files. NEVER guess or make up file contents from memory.
- ALWAYS use read_file to read actual file contents. ALWAYS use list_directory to explore folders.
- ALWAYS read memory bank before starting work: run memory_list then memory_read for relevant files.
- After completing any task: run memory_write to update activeContext.md, progress.md, and updateLog.md.
- All paths are relative to project root.
- After tool results, continue reasoning and answer the user.
- Prefer memory_read over read_file for .vibeforge/memory-bank files.
- If user types UMB, update memory, or sync memory: update all relevant memory files.
- When you need to create a file, use write_file tool. When you need to edit, use edit_file tool.
- IMPORTANT: Output your reasoning as normal text FIRST, then output tool_use blocks. Do not mix text inside tool_use blocks.

SKILL INSTRUCTIONS:
${skill === 'create-task' ? `
## SKILL: create-task
You are in task creation mode. When the user references a file with #file.md or provides a plan/epic/description:
1. Use read_file to read the referenced file (if one is mentioned).
2. Parse and break it down into atomic tasks (max 4 hours each, ≤ one logical unit of work).
3. For each task, call nocodb_create_task with: title, description, type (feature/bug/chore), priority (low/medium/high), status="todo", estimate_hours, and acceptance_criteria.
4. After all tasks are saved, summarize what was created (task count, titles, NocoDB IDs).
5. Tell the user to check the /tasks Kanban board to see the newly created tasks.
` : ''}
${skill === 'schedule' ? `
## SKILL: schedule
You are in schedule creation mode. When the user references a file with #file.md or provides a plan:
1. Use read_file to read the referenced file (if one is mentioned).
2. Analyze the content and identify milestones, phases, and time-boxed work.
3. Assign day indexes (Day 1, Day 2, etc.) or calendar dates to each item.
4. For each schedule item, call nocodb_create_schedule with: title, description, expected_output, day_index (number), status="planned".
5. After all schedules are saved, summarize what was created (count, titles, NocoDB IDs).
6. Tell the user to check the /schedule page to see the newly created schedule items.
` : ''}
${skill === 'planning' ? `
## SKILL: planning
You are in planning mode. Your job is to take an objective and generate a structured, actionable development plan.
1. Read the memory bank (memory_list + relevant memory_read) to understand project context.
2. Clarify scope based on the objective.
3. Break work into phases (Phase 1: Data layer, Phase 2: UI, Phase 3: Tests).
4. Break each phase into atomic tasks (max 4 hours each) with effort estimates (S/M/L).
5. Identify dependencies and blockers.
6. Output a structured JSON plan in this exact format inside a markdown code block:
\\\`\\\`\\\`json
{
  "objective": "...",
  "phases": [
    {
      "name": "Phase 1: ...",
      "tasks": [
        { "title": "...", "description": "...", "type": "feature", "estimate_hours": 2, "priority": "high" }
      ]
    }
  ],
  "risks": "...",
  "dependencies": "...",
  "estimated_effort": "X days"
}
\\\`\\\`\\\`
7. After outputting the plan, ask the user if they want to convert it to tasks or save it as a plan.
` : ''}

When you need to use a tool, output the <tool_use> block. The system will execute it and return the result.`;

    let runId: number | null = null;
    try {
      const runRecord = await createRecord<Record<string, any>>('agent_runs', {
        'Agent Name': 'VibeForge AI',
        'Provider ID': provider.Id,
        'Model': targetModel,
        'Skill': skill || 'chat',
        'Status': 'running',
        'Started At': new Date().toISOString(),
        'Input Summary': messages[messages.length - 1]?.content?.slice(0, 300) || '',
      });
      runId = runRecord.Id;
    } catch (e) { console.error('Failed to log agent run:', e); }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const emit = (event: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            closed = true;
          }
        };

        try {
          const chatMessages: Array<{ role: string; content: string }> = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((m: any) => {
              let textContent = m.content || '';
              
              // If there are steps, reconstruct the XML representation of thoughts and tools
              // so the LLM remembers its actions across refreshes/subsequent turns.
              if (m.steps && m.steps.length > 0) {
                const stepParts: string[] = [];
                m.steps.forEach((step: any) => {
                  if (step.type === 'thought' && step.text) {
                    stepParts.push(step.text);
                  } else if (step.type === 'tool_call') {
                    stepParts.push(`<tool_use><name>${step.toolName}</name><args>${JSON.stringify(step.toolArgs || {})}</args></tool_use>`);
                    if (step.toolOutput) {
                      stepParts.push(`<tool_result><name>${step.toolName}</name><result>${step.toolOutput}</result></tool_result>`);
                    }
                  }
                });
                if (stepParts.length > 0) {
                  textContent = stepParts.join('\n\n') + (textContent ? `\n\n${textContent}` : '');
                }
              }

              return {
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: textContent,
              };
            }).filter((m: { role: string; content: string }) => m.content.trim()),
          ];

          const MAX_ITERATIONS = 8;
          const MAX_RETRIES = 2;
          let iteration = 0;
          let fullOutputText = '';
          let totalInputTokens = 0;
          let totalOutputTokens = 0;

          await debugLog(workspaceRoot, '>>> STARTING AGENT LOOP', { runId, skill });

          while (iteration < MAX_ITERATIONS) {
            iteration++;
            await debugLog(workspaceRoot, `--- Iteration ${iteration} started ---`);

            // Build request body — omit max_tokens if -1 or 0 (= unlimited / provider default)
            const requestBody: Record<string, unknown> = {
              model: targetModel,
              messages: chatMessages,
              stream: true,
            };
            if (maxOutputTokensRaw > 0) {
              requestBody.max_tokens = maxOutputTokensRaw;
            }

            // Retry network errors up to MAX_RETRIES times
            let llmRes: Response | null = null;
            let lastFetchError: string = '';
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
              try {
                // No signal timeout here — streaming LLM responses can take many minutes.
                // Retry logic handles actual network failures (fetch failed, ECONNREFUSED).
                llmRes = await fetch(url, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(requestBody),
                });
                lastFetchError = '';
                break; // success
              } catch (fetchErr: unknown) {
                lastFetchError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
                const isRetriable = lastFetchError === 'fetch failed' || lastFetchError.includes('ECONNREFUSED') || lastFetchError.includes('ETIMEDOUT');
                if (!isRetriable || attempt >= MAX_RETRIES) throw fetchErr;
                // Wait 2s before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                emit('content', { delta: '' }); // keep connection alive
              }
            }

            if (!llmRes) break; // should not happen but guard against null

            if (!llmRes.ok) {
              const errText = await llmRes.text();
              emit('content', { delta: `\n\nProvider Error: ${llmRes.status} — ${errText.slice(0, 300)}` });
              break;
            }

            if (!llmRes.body) {
              emit('content', { delta: '\n\nNo response body.' });
              break;
            }

            // Stream LLM response — detect tool calls inline, execute them sequentially
            const realtimeToolCount = { n: 0 };
            const inlineToolResults: string[] = [];
            
            const streamRes = await readStreamWithEmit(
              llmRes.body,
              (delta) => { emit('content_stream', { delta }); },
              async (toolXml) => {
                const nameMatch = toolXml.match(/<name>([\w_]+)<\/name>/);
                const argsMatch = toolXml.match(/<args>([\s\S]*?)<\/args>/);
                if (!nameMatch) return;
                
                const toolName = nameMatch[1];
                let toolArgs: Record<string, string> = {};
                try { if (argsMatch) toolArgs = JSON.parse(argsMatch[1]); } catch {}
                
                const callId = `call_${Date.now()}_${toolName}_${realtimeToolCount.n++}`;
                emit('tool_call', { id: callId, name: toolName, args: toolArgs });
                
                let output: string;
                let isError = false;
                try {
                  output = await executeTool(toolName, toolArgs, workspaceRoot, projectId);
                } catch (e: unknown) {
                  console.error('Inline tool execution failed:', e);
                  output = `Error: ${e instanceof Error ? e.message : String(e)}`;
                  isError = true;
                }
                
                emit('tool_result', { id: callId, name: toolName, output: output.slice(0, 2000), isError });
                inlineToolResults.push(`<tool_result>\n<name>${toolName}</name>\n<result>${output}</result>\n</tool_result>`);
              }
            );
            const responseText = streamRes.fullText;
            await debugLog(workspaceRoot, `Iter ${iteration}: responseText length=${responseText.length}, snippet="${responseText.slice(0, 200)}"...`);
            
            if (!responseText.trim()) {
              await debugLog(workspaceRoot, `Iter ${iteration}: EMPTY RESPONSE — chatMessages.length=${chatMessages.length}`);
              // Empty response from LLM — could be context too long, provider throttling, or bad format
              // Add a status update and try one more time with shorter context
              if (chatMessages.length > 10) {
                // Trim old tool results to reduce context size, keep first 3 and last 5 messages
                const systemMsg = chatMessages[0];
                const trimmed = [...chatMessages.slice(0, 4), ...chatMessages.slice(-3)];
                chatMessages.length = 0;
                chatMessages.push(systemMsg, ...trimmed.slice(1));
                emit('thought', { text: 'Context too long, trimming and retrying...' });
                continue; // retry the loop with smaller context
              }
              emit('content', { delta: `\n\n_The AI returned no response. The context may be too long for this model. Try using /compact to reduce context._` });
              break;
            }
            
            if (streamRes.usage) {
              totalInputTokens += streamRes.usage.prompt_tokens || 0;
              totalOutputTokens += streamRes.usage.completion_tokens || 0;
              emit('usage', { used: streamRes.usage.prompt_tokens, total: streamRes.usage.total_tokens });
            }

            // Parse any tool calls from the accumulated response
            const toolCalls = parseToolCalls(responseText);
            const inlineToolsExecuted = realtimeToolCount.n;
            await debugLog(workspaceRoot, `Iter ${iteration}: toolCalls=${toolCalls.length}, inlineExecuted=${inlineToolsExecuted}`);

            if (toolCalls.length === 0 && inlineToolsExecuted === 0) {
              const cleanText = responseText
                .replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')
                .replace(/```tool[\s\S]*?```/g, '')
                .trim();
              fullOutputText = cleanText;
              await debugLog(workspaceRoot, `Iter ${iteration}: FINAL RESPONSE (no tools) — breaking. length=${cleanText.length}`);
              // Only replace if it's the very first iteration, else append
              emit('content', { delta: cleanText, replace: iteration === 1 });
              break;
            }

            const thoughtText = responseText
              .replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')
              .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
              .replace(/```tool[\s\S]*?```/g, '')
              .trim();
            if (thoughtText) {
              emit('content', { delta: '\n\n' + thoughtText, replace: false });
              emit('thought', { text: thoughtText });
            }

            chatMessages.push({ role: 'assistant', content: responseText });

            const toolResultParts: string[] = [];

            if (inlineToolsExecuted > 0) {
              toolResultParts.push(...inlineToolResults);
            } else if (toolCalls.length > 0) {
              for (const tc of toolCalls) {
                const callId = `call_${Date.now()}_${tc.name}`;
                emit('tool_call', { id: callId, name: tc.name, args: tc.args });

                let output: string;
                let isError = false;
                try {
                  output = await executeTool(tc.name, tc.args, workspaceRoot, projectId);
                } catch (e: unknown) {
                  console.error('Tool execution failed:', e);
                  output = `Error: ${e instanceof Error ? e.message : String(e)}`;
                  isError = true;
                }

                emit('tool_result', { id: callId, name: tc.name, output: output.slice(0, 2000), isError });
                toolResultParts.push(`<tool_result>\n<name>${tc.name}</name>\n<result>${output}</result>\n</tool_result>`);
              }
            }

            if (toolResultParts.length > 0) {
              await debugLog(workspaceRoot, `Iter ${iteration}: user message pushed containing ${toolResultParts.length} tool results`);
              chatMessages.push({
                role: 'user',
                content: toolResultParts.join('\n\n'),
              });
            }
          }

          await debugLog(workspaceRoot, `>>> LOOP FINISHED: iterations=${iteration}`);

          if (runId) {
            try { await updateRecord('agent_runs', runId, {
              'Status': 'completed',
              'Finished At': new Date().toISOString(),
              'Output Summary': (fullOutputText || '').slice(0, 300),
              'Input Tokens': totalInputTokens,
              'Output Tokens': totalOutputTokens,
            }); } catch {}
          }

          emit('done', {});
          await debugLog(workspaceRoot, '>>> emit(done) sent OK');
        } catch (e: unknown) {
          const rawMsg = e instanceof Error ? e.message : String(e);
          await debugLog(workspaceRoot, '>>> CAUGHT ERROR:', rawMsg, e instanceof Error ? e.stack : '');
          
          try {
            const logDir = path.resolve(workspaceRoot, '.vibeforge/agent-logs');
            await fs.mkdir(logDir, { recursive: true });
            const logPath = path.join(logDir, 'chat_error.log');
            const logData = {
              timestamp: new Date().toISOString(),
              error: e instanceof Error ? { message: e.message, stack: e.stack } : String(e),
              lastMessages: messages.slice(-2),
            };
            await fs.appendFile(logPath, JSON.stringify(logData, null, 2) + '\n\n', 'utf-8');
          } catch (logErr) {
            console.error('Failed to write chat_error.log', logErr);
          }

          const isNetworkError = rawMsg === 'fetch failed' || rawMsg.includes('ECONNREFUSED') || rawMsg.includes('ENOTFOUND') || rawMsg.includes('network');
          const msg = isNetworkError 
            ? `Cannot connect to provider at ${url}. Check if the Base URL is correct and the server is reachable.`
            : rawMsg;
          if (runId) {
            try { await updateRecord('agent_runs', runId, {
              'Status': 'failed',
              'Finished At': new Date().toISOString(),
              'Error Message': msg.slice(0, 200),
            }); } catch {}
          }
          emit('content', { delta: `\n\nAgent Error: ${msg}` });
          emit('done', {});
        } finally {
          closed = true;
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
