'use client';

import { useState } from 'react';
import { useUiStore } from '@/stores/ui.store';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarRange, Sparkles, Save, ListTodo, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from 'sonner';

export default function PlannerPage() {
  const hasHydrated = useHasHydrated();
  const { activeProjectId } = useUiStore();
  const [objective, setObjective] = useState('');
  const [planOutput, setPlanOutput] = useState('');
  const [planData, setPlanData] = useState<{
    objective: string;
    steps: string[];
    risks: string;
    dependencies: string;
    estimatedEffort: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGeneratePlan = () => {
    if (!objective.trim()) {
      toast.error('Please enter an objective first');
      return;
    }
    
    setIsGenerating(true);
    
    setTimeout(() => {
      const plan = {
        objective: objective.trim(),
        steps: [
          'Setup & Configuration',
          'Core Implementation',
          'Testing & Review',
          'Deploy & Document',
        ],
        risks: 'Scope creep, dependency delays, integration complexity.',
        dependencies: 'NocoDB, Next.js, Tailwind CSS, existing project infrastructure.',
        estimatedEffort: '3-5 days',
      };

      setPlanData(plan);
      setPlanOutput(
        `Objective: ${plan.objective}\n\nSteps:\n${plan.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nRisks: ${plan.risks}\n\nDependencies: ${plan.dependencies}\n\nEstimated Effort: ${plan.estimatedEffort}`
      );
      setIsGenerating(false);
      toast.success('Plan generated successfully');
    }, 1500);
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
          plan_steps: planData.steps.join('\n'),
          risks: planData.risks,
          dependencies: planData.dependencies,
          estimated_effort: planData.estimatedEffort,
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

  const handleConvertToTasks = () => {
    toast.info('Convert to Tasks will be available after saving the plan.');
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
              <div className="prose prose-sm dark:prose-invert max-w-none bg-background p-4 rounded-md border min-h-[300px] whitespace-pre-wrap">
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
            <Button 
              variant="outline" 
              onClick={handleConvertToTasks}
              disabled={!planOutput || isGenerating}
              className="w-full"
            >
              <ListTodo className="mr-2 size-4" />
              Convert to Tasks
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}