import { getRecord, createRecord, updateRecord } from '@/lib/nocodb';
import { getProviderLocalConfig, resolveApiKey } from '@/lib/local-config';
import { getField } from '@/lib/nocodb-fields';
import type { Provider } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function executeTool(name: string, args: Record<string, string>, projectRoot: string): Promise<string> {
  const resolve = (p: string) => path.resolve(projectRoot, p.replace(/^\//, ''));

  switch (name) {
    case 'list_directory': {
      try {
        const target = resolve(args.path || '.');
        const entries = await fs.readdir(target, { withFileTypes: true });
        return entries.map((e) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n') || '(empty)';
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
        const { stdout, stderr } = await execAsync(args.command, { cwd: projectRoot, timeout: 15000 });
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

/** Parse the LLM streaming response into a complete string and extract usage */
async function readStream(body: ReadableStream<Uint8Array>): Promise<StreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let usage: StreamResult['usage'] = undefined;
  
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
        fullText += chunk.choices?.[0]?.delta?.content || '';
        if (chunk.usage) {
          usage = chunk.usage;
        }
      } catch {
        // ignore partial
      }
    }
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
   Format: <tool_use><name>memory_write</name><args>{"file": "activeContext.md", "content": "## Current Focus\n..."}</args></tool_use>

RULES:
- ALWAYS read memory bank before starting work: run memory_list then memory_read for relevant files.
- After completing any task: run memory_write to update activeContext.md, progress.md, and updateLog.md.
- Do NOT make up file contents — always read them.
- All paths are relative to project root.
- Use list_directory first to understand structure.
- After tool results, continue reasoning and answer the user.
- Prefer memory_read over read_file for .vibeforge/memory-bank files.
- If user types UMB, update memory, or sync memory: update all relevant memory files.

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
        const emit = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
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

          while (iteration < MAX_ITERATIONS) {
            iteration++;

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

            // Read the full streamed response
            const streamRes = await readStream(llmRes.body);
            const responseText = streamRes.fullText;
            
            if (!responseText.trim()) {
              emit('content', { delta: `\n\n_AI returned an empty response. The provider may not support streaming, or the model did not generate any content. Try sending the message again._` });
              break;
            }
            
            if (streamRes.usage) {
              totalInputTokens += streamRes.usage.prompt_tokens || 0;
              totalOutputTokens += streamRes.usage.completion_tokens || 0;
              emit('usage', { used: streamRes.usage.prompt_tokens, total: streamRes.usage.total_tokens });
            }

            // Parse any tool calls from the response
            const toolCalls = parseToolCalls(responseText);

            if (toolCalls.length === 0) {
              // No tool calls — emit the final content and stop
              const cleanText = responseText
                .replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')
                .replace(/```tool[\s\S]*?```/g, '')
                .trim();
              fullOutputText = cleanText;
              emit('content', { delta: cleanText });
              break;
            }

            // Emit the thought (text before tool calls)
            const thoughtText = responseText
              .replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')
              .replace(/```tool[\s\S]*?```/g, '')
              .trim();
            if (thoughtText) {
              emit('thought', { text: thoughtText });
            }

            // Add assistant message to conversation
            chatMessages.push({ role: 'assistant', content: responseText });

            // Execute tool calls
            const toolResultParts: string[] = [];
            for (const tc of toolCalls) {
              const callId = `call_${Date.now()}_${tc.name}`;
              emit('tool_call', { id: callId, name: tc.name, args: tc.args });

              let output: string;
              let isError = false;
              try {
                output = await executeTool(tc.name, tc.args, workspaceRoot);
              } catch (e: unknown) {
                output = `Error: ${e instanceof Error ? e.message : String(e)}`;
                isError = true;
              }

              emit('tool_result', { id: callId, name: tc.name, output: output.slice(0, 2000), isError });
              toolResultParts.push(`<tool_result>\n<name>${tc.name}</name>\n<result>${output}</result>\n</tool_result>`);
            }

            // Add tool results to conversation
            chatMessages.push({
              role: 'user',
              content: toolResultParts.join('\n\n'),
            });
          }

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
        } catch (e: unknown) {
          const rawMsg = e instanceof Error ? e.message : String(e);
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
          controller.close();
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
