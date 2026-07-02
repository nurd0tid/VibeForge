'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, RefreshCw, CheckCircle2, XCircle, Clock, Activity, Zap, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDistanceToNow, differenceInMilliseconds, subHours, format } from 'date-fns';
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getField } from '@/lib/nocodb-fields';
import type { AgentRun, NocoDBListResponse } from '@/types';

function useAgentRuns(page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ['agent-runs', page, pageSize],
    queryFn: async () => {
      // limit max fetches so we don't blow up NocoDB
      const offset = (page - 1) * pageSize;
      const res = await fetch(`/api/agents?limit=${pageSize}&offset=${offset}`);
      if (!res.ok) throw new Error('Failed to fetch agent runs');
      return res.json() as Promise<NocoDBListResponse<AgentRun>>;
    },
    refetchInterval: 60000,
  });
}

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
  pending: 'outline',
};

function toSafeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.id ?? record.name ?? record.providerId ?? '');
  }
  return '';
}

function inferProvider(model: unknown, providerId: unknown): string {
  const m = toSafeString(model).toLowerCase();
  const p = toSafeString(providerId).toLowerCase();
  if (m.includes('9router') || m.includes('opus-sonnet') || p.includes('9router')) return '9Router';
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4') || p.includes('openai')) return 'OpenAI';
  if (m.includes('claude') || p.includes('anthropic')) return 'Anthropic';
  if (m.includes('gemini') || p.includes('gemini') || p.includes('google')) return 'Google Gemini';
  if (m.includes('deepseek') || p.includes('deepseek')) return 'DeepSeek';
  if (m.includes('mistral') || p.includes('mistral')) return 'Mistral';
  if (m.includes('groq') || p.includes('groq')) return 'Groq';
  if (m.includes('openrouter') || p.includes('openrouter')) return 'OpenRouter';
  if (m.includes('llama') || m.includes('qwen')) return 'OpenRouter';
  if (p.includes('ollama') || m.includes('ollama')) return 'Ollama';
  if (m.includes('lmstudio') || m.includes('lm-studio') || p.includes('lmstudio') || p.includes('lm-studio')) return 'LM Studio';
  return 'Custom Provider';
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildBuckets(runs: AgentRun[]) {
  const now = new Date();
  const buckets = Array.from({ length: 24 }, (_, i) => {
    const bucketEnd = subHours(now, 23 - i);
    const bucketStart = subHours(bucketEnd, 1);
    return { label: format(bucketEnd, 'HH:mm'), start: bucketStart, end: bucketEnd, count: 0 };
  });

  for (const run of runs) {
    const r = run as unknown as Record<string, unknown>;
    const startedAtStr = getField(r, 'started_at', 'Started At') || (run.CreatedAt ?? '');
    if (!startedAtStr) continue;
    const d = new Date(startedAtStr);
    for (const bucket of buckets) {
      if (d >= bucket.start && d < bucket.end) {
        bucket.count++;
        break;
      }
    }
  }

  return buckets;
}

function UsageChart({ buckets }: { buckets: ReturnType<typeof buildBuckets> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={buckets}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#007acc" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#007acc" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          stroke="rgba(255, 255, 255, 0.4)"
          dy={10}
          interval={3}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={10}
          stroke="rgba(255, 255, 255, 0.4)"
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            fontSize: '11px',
          }}
          labelClassName="text-white"
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#007acc"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#areaGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function AgentsPage() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const { data, isLoading, error, refetch } = useAgentRuns(page, PAGE_SIZE);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refetch();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [refetch]);

  const runs = useMemo(() => data?.list ?? [], [data]);

  const buckets = useMemo(() => buildBuckets(runs), [runs]);

  const activeRunsCount = useMemo(
    () => runs.filter(r => getField(r as unknown as Record<string, unknown>, 'status', 'Status') === 'running').length,
    [runs]
  );

  const modelStats = useMemo(() => {
    const map: Record<string, {
      provider: string;
      model: string;
      requests: number;
      lastUsed: Date | null;
      totalLatencyMs: number;
      latencyCount: number;
      lastStatus: string;
      inputTokens: number;
      outputTokens: number;
    }> = {};

    for (const run of runs) {
      const r = run as unknown as Record<string, unknown>;
      const model = getField(r, 'model', 'Model') || 'Unknown';
      const providerId = getField(r, 'provider_id', 'Provider ID');
      const provider = inferProvider(model, providerId);
      const startedAtStr = getField(r, 'started_at', 'Started At');
      const finishedAtStr = getField(r, 'finished_at', 'Finished At');
      const status = getField(r, 'status', 'Status');
      const inTok = Number(getField(r, 'input_tokens', 'Input Tokens') || 0);
      const outTok = Number(getField(r, 'output_tokens', 'Output Tokens') || 0);

      if (!map[model]) {
        map[model] = { provider, model, requests: 0, lastUsed: null, totalLatencyMs: 0, latencyCount: 0, lastStatus: '', inputTokens: 0, outputTokens: 0 };
      }
      map[model].requests++;
      map[model].inputTokens += inTok;
      map[model].outputTokens += outTok;

      const startedAt = startedAtStr ? new Date(startedAtStr) : null;
      if (startedAt) {
        if (!map[model].lastUsed || startedAt > map[model].lastUsed!) {
          map[model].lastUsed = startedAt;
          map[model].lastStatus = status;
        }
      }

      if (startedAtStr && finishedAtStr) {
        const ms = differenceInMilliseconds(new Date(finishedAtStr), new Date(startedAtStr));
        if (ms >= 0) {
          map[model].totalLatencyMs += ms;
          map[model].latencyCount++;
        }
      }
    }

    return Object.values(map).sort((a, b) => b.requests - a.requests);
  }, [runs]);

  const recentRuns = useMemo(() => runs, [runs]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col p-6 max-w-7xl mx-auto w-full gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-40 rounded-full ml-auto" />
        </div>
        <Skeleton className="h-52 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col p-6 max-w-7xl mx-auto w-full">
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6 max-w-7xl mx-auto w-full gap-5">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-blue-500" />
        <h1 className="text-2xl font-semibold tracking-tight">AI Agents</h1>
        {activeRunsCount > 0 && (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {activeRunsCount} Running
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          <span>Auto-refreshing in <span className="font-mono font-semibold text-foreground">{countdown}s</span></span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-base font-medium">Requests Over 24 Hours</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">by hour</span>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-44 w-full">
            {runs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <UsageChart buckets={buckets} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-base font-medium">Model Statistics</CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">all contexts: chat · planning · tasks</span>
        </CardHeader>
        <CardContent className="pt-0">
          {modelStats.length === 0 ? (
            <EmptyState icon={Bot} title="No model data" description="Agent runs will appear here as AI agents execute tasks." />
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-medium">Provider</TableHead>
                    <TableHead className="text-xs font-medium">Model</TableHead>
                    <TableHead className="text-xs font-medium text-right">Requests</TableHead>
                    <TableHead className="text-xs font-medium">Last Used</TableHead>
                    <TableHead className="text-xs font-medium text-right">Input Tokens</TableHead>
                    <TableHead className="text-xs font-medium text-right">Output Tokens</TableHead>
                    <TableHead className="text-xs font-medium text-right">Avg Latency</TableHead>
                    <TableHead className="text-xs font-medium text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelStats.map(stat => {
                    const avgLatency = stat.latencyCount > 0
                      ? formatLatency(Math.round(stat.totalLatencyMs / stat.latencyCount))
                      : '—';
                    return (
                      <TableRow key={stat.model} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground">{stat.provider}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{stat.model}</span>
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">{stat.requests}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {stat.lastUsed ? formatDistanceToNow(stat.lastUsed, { addSuffix: true }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">{stat.inputTokens > 0 ? stat.inputTokens.toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">{stat.outputTokens > 0 ? stat.outputTokens.toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{avgLatency}</TableCell>
                        <TableCell className="text-center">
                          {stat.lastStatus === 'completed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                          ) : stat.lastStatus === 'failed' ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive mx-auto" />
                          ) : stat.lastStatus === 'running' ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-base font-medium">Recent Agent Runs</CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">
            Page {page} · {recentRuns.length} items
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {recentRuns.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No agent runs yet"
              description="Agent runs will appear here as AI agents execute tasks."
            />
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-medium">Agent</TableHead>
                    <TableHead className="text-xs font-medium">Model</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                    <TableHead className="text-xs font-medium">Started</TableHead>
                    <TableHead className="text-xs font-medium text-right">Duration</TableHead>
                    <TableHead className="text-xs font-medium w-[180px]">I/O Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRuns.map(run => {
                    const r = run as unknown as Record<string, unknown>;
                    const agentName = getField(r, 'agent_name', 'Agent Name');
                    const skill = getField(r, 'skill', 'Skill');
                    const model = getField(r, 'model', 'Model');
                    const status = getField(r, 'status', 'Status');
                    const startedAt = getField(r, 'started_at', 'Started At');
                    const finishedAt = getField(r, 'finished_at', 'Finished At');
                    const inputSummary = getField(r, 'input_summary', 'Input Summary');
                    const outputSummary = getField(r, 'output_summary', 'Output Summary');

                    let duration = '—';
                    if (startedAt && finishedAt) {
                      const ms = differenceInMilliseconds(new Date(finishedAt), new Date(startedAt));
                      duration = formatLatency(ms);
                    } else if (startedAt && status === 'running') {
                      const ms = differenceInMilliseconds(new Date(), new Date(startedAt));
                      duration = `${formatLatency(ms)} •`;
                    }

                    const ioSummary = [
                      inputSummary ? `→ ${inputSummary.substring(0, 22)}` : null,
                      outputSummary ? `← ${outputSummary.substring(0, 22)}` : null,
                    ].filter(Boolean).join('\n') || '—';

                    return (
                      <TableRow key={run.Id} className="hover:bg-muted/30 align-top">
                        <TableCell>
                          <div className="font-medium text-xs">{agentName || 'Unknown Agent'}</div>
                          {skill && <div className="text-xs text-muted-foreground mt-0.5">{skill}</div>}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{model || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColor[status?.toLowerCase()] ?? 'outline'} className="text-xs">
                            {status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {startedAt ? formatDistanceToNow(new Date(startedAt), { addSuffix: true }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono whitespace-nowrap">
                          {duration}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="truncate max-w-[180px] whitespace-pre-wrap leading-relaxed" title={ioSummary}>
                            {ioSummary}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>Live data · refreshes every 60s</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="text-xs text-muted-foreground font-mono px-1">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            disabled={recentRuns.length < PAGE_SIZE}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
