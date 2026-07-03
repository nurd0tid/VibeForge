'use client';

import { useState, useEffect, useRef } from 'react';

export function WorkspaceTerminal({ cwd: initialCwd }: { cwd: string }) {
  const [cwd, setCwd] = useState(initialCwd);
  const [output, setOutput] = useState<{ type: 'command' | 'stdout' | 'stderr' | 'info'; text: string }[]>([
    { type: 'info', text: `VibeForge Terminal` },
    { type: 'info', text: 'Type a command and press Enter. Long-running commands supported.' },
  ]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [processId, setProcessId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [output]);

  useEffect(() => {
    if (initialCwd && initialCwd !== cwd) {
      setCwd(initialCwd);
      setOutput(prev => [...prev, { type: 'info', text: `cwd: ${initialCwd}` }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCwd]);

  const appendOutput = (type: 'command' | 'stdout' | 'stderr' | 'info', text: string) => {
    setOutput(prev => [...prev, { type, text }]);
  };

  const handleKill = async () => {
    abortRef.current?.abort();
    if (processId) {
      try {
        await fetch('/api/workspace/terminal/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'kill', processId }),
        });
      } catch {}
    }
    setIsRunning(false);
    setProcessId(null);
    appendOutput('info', '^C');
  };

  const handleCommand = async () => {
    if (!input.trim()) return;
    const cmd = input.trim();
    setInput('');
    setHistoryIdx(-1);
    setHistory(prev => [cmd, ...prev.slice(0, 99)]);
    appendOutput('command', `$ ${cmd}`);

    if (cmd === 'clear' || cmd === 'cls') { setOutput([]); return; }

    if (cmd.startsWith('cd ')) {
      const target = cmd.substring(3).trim();
      const newCwd = target.match(/^([a-zA-Z]:\\|\/|~)/)
        ? target
        : cwd.replace(/\\/g, '/') + '/' + target;
      setCwd(newCwd);
      appendOutput('info', newCwd);
      return;
    }

    setIsRunning(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/workspace/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, cwd }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        appendOutput('stderr', err.error || 'Failed');
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split('\n');
          const eventLine = lines.find(l => l.startsWith('event:'));
          const dataLine = lines.find(l => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.replace('event:', '').trim();
          const data = JSON.parse(dataLine.replace('data:', '').trim());
          if (event === 'pid') { setProcessId(data.processId); }
          else if (event === 'stdout') { appendOutput('stdout', data.text); }
          else if (event === 'stderr') { appendOutput('stderr', data.text); }
          else if (event === 'error') { appendOutput('stderr', data.text); }
          else if (event === 'close') {
            if (data.code !== 0 && data.code !== null) appendOutput('info', `Exit code: ${data.code}`);
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') appendOutput('stderr', e.message || 'Execution failed');
    } finally {
      setIsRunning(false);
      setProcessId(null);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[#0e0e0e] font-mono text-xs"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto p-3 space-y-px">
        {output.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap leading-relaxed ${
              line.type === 'command' ? 'text-white font-semibold mt-1' :
              line.type === 'stderr' ? 'text-[#f48771]' :
              line.type === 'info' ? 'text-[#555] italic' :
              'text-[#cccccc]'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1e1e1e] bg-[#0e0e0e] shrink-0">
        <span className="text-[#4ec9b0] shrink-0 font-bold">
          {cwd.split(/[/\\]/).pop() || cwd}$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setHistoryIdx(-1); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleCommand(); }
            else if (e.key === 'c' && e.ctrlKey) { e.preventDefault(); handleKill(); }
            else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const idx = Math.min(historyIdx + 1, history.length - 1);
              setHistoryIdx(idx);
              setInput(history[idx] || '');
            }
            else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const idx = Math.max(historyIdx - 1, -1);
              setHistoryIdx(idx);
              setInput(idx === -1 ? '' : history[idx] || '');
            }
          }}
          disabled={false}
          placeholder={isRunning ? 'Running... (Ctrl+C to stop)' : ''}
          className="flex-1 bg-transparent outline-none border-none text-[#cccccc] placeholder:text-[#333]"
          autoFocus
          spellCheck={false}
        />
        {isRunning && (
          <button
            onClick={handleKill}
            className="shrink-0 text-[9px] text-[#f48771] border border-[#f48771]/30 px-2 py-0.5 rounded hover:bg-[#f48771]/10 transition-colors"
          >
            ■ Stop
          </button>
        )}
      </div>
    </div>
  );
}
