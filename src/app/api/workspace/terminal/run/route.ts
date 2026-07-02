import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

const RUNNING_PROCESSES = new Map<string, ReturnType<typeof spawn>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, cwd, action, processId } = body;

    // Handle process kill
    if (action === 'kill' && processId) {
      const proc = RUNNING_PROCESSES.get(processId);
      if (proc) {
        // Kill process tree on Windows/Linux
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', proc.pid!.toString(), '/T', '/F']);
        } else {
          process.kill(-proc.pid!);
        }
        RUNNING_PROCESSES.delete(processId);
        return new Response(JSON.stringify({ ok: true, message: 'Process killed' }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'Process not found' }), { status: 404 });
    }

    if (!command) {
      return new Response(JSON.stringify({ error: 'Command is required' }), { status: 400 });
    }

    const pid = `proc_${Date.now()}`;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const emit = (event: string, data: any) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {}
        };

        const isWin = process.platform === 'win32';
        const shell = isWin ? 'powershell.exe' : 'bash';
        const args = isWin ? ['-Command', command] : ['-c', command];

        const child = spawn(shell, args, {
          cwd: cwd || process.cwd(),
          env: { ...process.env, FORCE_COLOR: '1' },
          detached: !isWin, // Detach to allow killing process group on Unix
        });

        RUNNING_PROCESSES.set(pid, child);
        emit('pid', { processId: pid });

        child.stdout.on('data', (data) => {
          emit('stdout', { text: data.toString() });
        });

        child.stderr.on('data', (data) => {
          emit('stderr', { text: data.toString() });
        });

        child.on('close', (code) => {
          RUNNING_PROCESSES.delete(pid);
          emit('close', { code });
          try { controller.close(); } catch {}
        });

        child.on('error', (err) => {
          RUNNING_PROCESSES.delete(pid);
          emit('error', { text: err.message });
          try { controller.close(); } catch {}
        });
      },
      cancel() {
        const proc = RUNNING_PROCESSES.get(pid);
        if (proc) {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', proc.pid!.toString(), '/T', '/F']);
          } else {
            process.kill(-proc.pid!);
          }
          RUNNING_PROCESSES.delete(pid);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
