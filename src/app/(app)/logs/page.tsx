'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Plus, Calendar, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useUiStore } from '@/stores/ui.store';
import type { DailyLog, WeeklyLog, NocoDBListResponse } from '@/types';

function useDailyLogs() {
  return useQuery({
    queryKey: ['logs', 'daily'],
    queryFn: async () => {
      const res = await fetch('/api/logs/daily');
      if (!res.ok) throw new Error('Failed to fetch daily logs');
      return res.json() as Promise<NocoDBListResponse<DailyLog>>;
    },
  });
}

function useWeeklyLogs() {
  return useQuery({
    queryKey: ['logs', 'weekly'],
    queryFn: async () => {
      const res = await fetch('/api/logs/weekly');
      if (!res.ok) throw new Error('Failed to fetch weekly logs');
      return res.json() as Promise<NocoDBListResponse<WeeklyLog>>;
    },
  });
}

export default function LogsPage() {
  const { activeProjectId } = useUiStore();
  const queryClient = useQueryClient();
  const { data: dailyData, isLoading: dailyLoading, error: dailyError, refetch: refetchDaily } = useDailyLogs();
  const { data: weeklyData, isLoading: weeklyLoading, error: weeklyError, refetch: refetchWeekly } = useWeeklyLogs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWeeklyDialogOpen, setIsWeeklyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [weeklySummary, setWeeklySummary] = useState('');
  const [completedTasks, setCompletedTasks] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');

  const createDailyLogMutation = useMutation({
    mutationFn: async (newLog: Partial<DailyLog>) => {
      const res = await fetch('/api/logs/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
      if (!res.ok) throw new Error('Failed to create daily log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', 'daily'] });
      toast.success('Daily log created successfully');
      setIsDialogOpen(false);
      setSummary('');
      setBlockers('');
      setNextSteps('');
    },
    onError: (err: any) => {
      toast.error('Failed to create daily log: ' + err.message);
    },
  });

  const createWeeklyLogMutation = useMutation({
    mutationFn: async (newLog: Partial<WeeklyLog>) => {
      const res = await fetch('/api/logs/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
      if (!res.ok) throw new Error('Failed to create weekly log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', 'weekly'] });
      toast.success('Weekly log created successfully');
      setIsWeeklyDialogOpen(false);
      setWeeklySummary('');
      setCompletedTasks('');
      setPendingTasks('');
    },
    onError: (err: any) => {
      toast.error('Failed to create weekly log: ' + err.message);
    },
  });

  const handleCreateWeeklyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) {
      toast.error('Please select an active project first.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createWeeklyLogMutation.mutateAsync({
        project_id: Number(activeProjectId),
        week_start: weekStart,
        week_end: weekEnd,
        summary: weeklySummary,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        blockers,
      });
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) {
      toast.error('Please select an active project first.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createDailyLogMutation.mutateAsync({
        project_id: Number(activeProjectId),
        date,
        summary,
        blockers,
        next_steps: nextSteps,
      });
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = dailyLoading || weeklyLoading;

  if (isLoading) {
    return <LoadingState />;
  }

  const dailyLogs = dailyData?.list || [];
  const weeklyLogs = weeklyData?.list || [];

  return (
    <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full gap-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground mt-1">Track daily and weekly progress summaries.</p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isWeeklyDialogOpen} onOpenChange={setIsWeeklyDialogOpen}>
            <DialogTrigger render={
              <Button variant="outline">
                <Plus className="mr-2 size-4" />
                Weekly Summary
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Weekly Summary</DialogTitle>
                <DialogDescription>Record your weekly progress.</DialogDescription>
              </DialogHeader>
              <form id="weekly-log-form" onSubmit={handleCreateWeeklyLog} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="week-start">Week Start</Label>
                    <Input id="week-start" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week-end">Week End</Label>
                    <Input id="week-end" type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly-summary">Summary</Label>
                  <Textarea id="weekly-summary" placeholder="What was accomplished this week?" required className="min-h-24" value={weeklySummary} onChange={(e) => setWeeklySummary(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly-completed">Completed Tasks</Label>
                  <Textarea id="weekly-completed" placeholder="Tasks completed this week" className="min-h-16" value={completedTasks} onChange={(e) => setCompletedTasks(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly-pending">Pending Tasks</Label>
                  <Textarea id="weekly-pending" placeholder="Tasks still pending" className="min-h-16" value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} />
                </div>
              </form>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsWeeklyDialogOpen(false)}>Cancel</Button>
                <Button type="submit" form="weekly-log-form" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</> : 'Save Weekly Log'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Daily Log
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Daily Log</DialogTitle>
              <DialogDescription>Record what you accomplished today.</DialogDescription>
            </DialogHeader>
            <form id="daily-log-form" onSubmit={handleCreateLog} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="log-date">Date</Label>
                <Input id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-summary">Summary</Label>
                <Textarea id="log-summary" placeholder="What did you accomplish today?" required className="min-h-24" value={summary} onChange={(e) => setSummary(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-blockers">Blockers</Label>
                <Textarea id="log-blockers" placeholder="Any blockers or issues?" className="min-h-16" value={blockers} onChange={(e) => setBlockers(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-next-steps">Next Steps</Label>
                <Textarea id="log-next-steps" placeholder="What's planned next?" className="min-h-16" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
              </div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" form="daily-log-form" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</> : 'Save Log'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600 dark:text-blue-400">
        <Info className="size-4 shrink-0" />
        <span>Daily logs are automatically generated when AI agents complete tasks. You can also create manual entries.</span>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily">Daily Logs</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6">
          {dailyError ? (
            <ErrorState message={dailyError.message} onRetry={() => refetchDaily()} />
          ) : dailyLogs.length === 0 ? (
            <EmptyState 
              icon={ScrollText}
              title="No daily logs yet"
              description="Start recording your daily progress to build a history of your work."
              actionLabel="Create Daily Log"
              onAction={() => setIsDialogOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {dailyLogs.map((log) => (
                <Card key={log.Id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <CardTitle className="text-base">{format(new Date(log.date), 'EEEE, MMM d, yyyy')}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{log.summary}</p>
                    {log.blockers && (
                      <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-sm mt-2">
                        <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                        <span className="text-destructive">{log.blockers}</span>
                      </div>
                    )}
                    {log.next_steps && (
                      <p className="text-sm text-muted-foreground mt-2">Next: {log.next_steps}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          {weeklyError ? (
            <ErrorState message={weeklyError.message} onRetry={() => refetchWeekly()} />
          ) : weeklyLogs.length === 0 ? (
            <EmptyState 
              icon={ScrollText}
              title="No weekly logs yet"
              description="Weekly summaries will be generated from your daily logs."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {weeklyLogs.map((log) => (
                <Card key={log.Id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        Week of {format(new Date(log.week_start), 'MMM d')} - {format(new Date(log.week_end), 'MMM d, yyyy')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{log.summary}</p>
                    {log.completed_tasks && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="mb-1">Completed</Badge>
                        <p className="text-sm text-muted-foreground">{log.completed_tasks}</p>
                      </div>
                    )}
                    {log.pending_tasks && (
                      <div className="mt-2">
                        <Badge variant="outline" className="mb-1">Pending</Badge>
                        <p className="text-sm text-muted-foreground">{log.pending_tasks}</p>
                      </div>
                    )}
                    {log.blockers && (
                      <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-sm mt-2">
                        <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                        <span className="text-destructive">{log.blockers}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}