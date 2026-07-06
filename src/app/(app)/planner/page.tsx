'use client';

import { useState } from 'react';
import { useUiStore } from '@/stores/ui.store';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarRange, Sparkles, Save, ListTodo, Loader2, CalendarClock } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface TaskDef {
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'chore' | 'refactor' | 'docs';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimate_hours: number;
}

interface PhaseDef {
  name: string;
  tasks: TaskDef[];
}

interface PlanJSON {
  objective: string;
  phases: PhaseDef[];
  risks: string;
  dependencies: string;
  estimated_effort: string;
}

export default function PlannerPage() {
  const hasHydrated = useHasHydrated();
  const { activeProjectId } = useUiStore();
  const [objective, setObjective] = useState('');
  const [planOutput, setPlanOutput] = useState('');
  const [planData, setPlanData] = useState<PlanJSON | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConvertingTasks, setIsConvertingTasks] = useState(false);
  const [isConvertingSchedule, setIsConvertingSchedule] = useState(false);

  // Fetch Providers to select default/active AI provider
  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers?limit=100');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
  });

  const allProviders = providersData?.list || [];
  const activeAiProvider = allProviders[0]; // Fallback to first provider

  const handleGeneratePlan = async () => {
    if (!objective.trim()) {
      toast.error('Please enter an objective first');
      return;
    }
    if (!activeAiProvider) {
      toast.error('Please connect an AI provider in the Providers page first');
      return;
    }

    setIsGenerating(true);
    setPlanData(null);
    setPlanOutput('');

    try {
      const providerId = activeAiProvider.Id;
      const model = activeAiProvider.default_model || activeAiProvider['Default Model'] || '';

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Create a structured development plan for this objective: ${objective}

Output ONLY a JSON block matching this exact structure:
{
  "objective": "...",
  "phases": [
    {
      "name": "Phase 1: Setup & Layout",
      "tasks": [
        { "title": "Setup repository", "description": "Initialize Vite project", "type": "chore", "priority": "high", "estimate_hours": 2 }
      ]
    }
  ],
  "risks": "Scope creep, integration latency",
  "dependencies": "NocoDB, Next.js",
  "estimated_effort": "3-5 days"
}`
            }
          ],
          providerId: providerId.toString(),
          model,
          skill: 'planning',
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to call AI provider');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const lines = part.split('\n').map(l => l.trim()).filter(Boolean);
          const eventLine = lines.find(l => l.startsWith('event:'));
          const dataLine = lines.find(l => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;
          const eventType = eventLine.replace(/^event:\s*/, '').trim();
          const dataStr = dataLine.replace(/^data:\s*/, '').trim();
          if (eventType === 'content') {
            try {
              const delta = JSON.parse(dataStr).delta || '';
              fullContent += delta;
              setPlanOutput(prev => prev + delta);
            } catch {}
          }
        }
      }

      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as PlanJSON;
        setPlanData(parsed);
        
        // Re-format visual output
        let visualText = `Objective: ${parsed.objective}\n\n`;
        parsed.phases.forEach((p, pi) => {
          visualText += `[${p.name}]\n`;
          p.tasks.forEach((t, ti) => {
            visualText += `  ${pi + 1}.${ti + 1} ${t.title} (${t.estimate_hours}h) - ${t.description}\n`;
          });
          visualText += `\n`;
        });
        visualText += `Risks: ${parsed.risks}\n`;
        visualText += `Dependencies: ${parsed.dependencies}\n`;
        visualText += `Estimated Effort: ${parsed.estimated_effort}`;
        setPlanOutput(visualText);
        
        toast.success('Plan generated successfully');
      } else {
        throw new Error('No valid JSON object found in AI response');
      }
    } catch (err: any) {
      toast.error('AI plan generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!activeProjectId || !planData) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: Number(activeProjectId),
          task_id: 0,
          title: `Plan: ${planData.objective.slice(0, 80)}`,
          objective: planData.objective,
          plan_steps: JSON.stringify(planData.phases),
          risks: planData.risks,
          dependencies: planData.dependencies,
          estimated_effort: planData.estimated_effort,
          created_by_agent: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to save plan');
      toast.success('Plan saved to NocoDB');
    } catch (err) {
      toast.error('Failed to save plan', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToTasks = async () => {
    if (!activeProjectId || !planData) return;
    setIsConvertingTasks(true);
    try {
      let created = 0;
      for (const phase of planData.phases) {
        for (const task of phase.tasks) {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: Number(activeProjectId),
              title: task.title,
              description: task.description,
              type: task.type,
              priority: task.priority,
              status: 'todo',
              estimate_hours: task.estimate_hours,
            }),
          });
          if (res.ok) created++;
        }
      }
      toast.success(`Successfully converted plan into ${created} tasks in NocoDB!`);
    } catch (err: any) {
      toast.error('Failed to convert tasks: ' + err.message);
    } finally {
      setIsConvertingTasks(false);
    }
  };

  const handleConvertToSchedule = async () => {
    if (!activeProjectId || !planData) return;
    setIsConvertingSchedule(true);
    try {
      let created = 0;
      // Convert each phase into a schedule item (Day 1 = Phase 1, Day 2 = Phase 2, etc.)
      for (let i = 0; i < planData.phases.length; i++) {
        const phase = planData.phases[i];
        const res = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: Number(activeProjectId),
            title: phase.name,
            day_index: i + 1,
            description: `Tasks: ${phase.tasks.map(t => t.title).join(', ')}`,
            expected_output: `Completed tasks for ${phase.name}`,
            status: 'planned',
          }),
        });
        if (res.ok) created++;
      }
      toast.success(`Successfully converted plan into ${created} schedule milestones!`);
    } catch (err: any) {
      toast.error('Failed to convert schedule: ' + err.message);
    } finally {
      setIsConvertingSchedule(false);
    }
  };

  if (!hasHydrated) return null;

  if (!activeProjectId) {
    return (
      <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full">
        <EmptyState 
          icon={CalendarRange}
          title="No project selected"
          description="Select a project from the Projects page to use the Planner."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full gap-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planner</h1>
          <p className="text-muted-foreground mt-1">Define objectives and generate task plans.</p>
        </div>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/20 rounded-md px-4 py-3 flex items-center gap-3">
        <Sparkles className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
        <p className="text-sm text-purple-700 dark:text-purple-400">
          Uses the <Badge variant="outline" className="text-xs mx-1">Planning skill</Badge> to break down objectives into actionable plans.
          See <code className="text-xs bg-purple-500/10 px-1 rounded">docs/skills/planning.md</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Objective</CardTitle>
            <CardDescription>What do you want to accomplish?</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <Textarea 
              placeholder="e.g. Implement user authentication with NextAuth and Google provider..."
              className="min-h-[300px] resize-none"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleGeneratePlan} 
              disabled={isGenerating || !objective.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  AI is thinking...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate Plan
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col bg-muted/30">
          <CardHeader>
            <CardTitle>Plan Output</CardTitle>
            <CardDescription>AI generated plan will appear here</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {planOutput ? (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-background p-4 rounded-md border min-h-[300px] whitespace-pre-wrap font-mono text-xs">
                {planOutput}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground bg-background rounded-md border border-dashed">
                <CalendarRange className="size-12 mb-4 opacity-20" />
                <p>Waiting for objective...</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              variant="default" 
              onClick={handleSavePlan}
              disabled={!planOutput || isGenerating || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 size-4" />Save Plan to NocoDB</>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={handleConvertToTasks}
                disabled={!planData || isGenerating || isConvertingTasks}
                className="w-full text-xs"
              >
                {isConvertingTasks ? (
                  <><Loader2 className="mr-1 size-3.5 animate-spin" />Converting...</>
                ) : (
                  <><ListTodo className="mr-1.5 size-3.5" />Convert to Tasks</>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleConvertToSchedule}
                disabled={!planData || isGenerating || isConvertingSchedule}
                className="w-full text-xs"
              >
                {isConvertingSchedule ? (
                  <><Loader2 className="mr-1 size-3.5 animate-spin" />Converting...</>
                ) : (
                  <><CalendarClock className="mr-1.5 size-3.5" />Convert to Schedule</>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
