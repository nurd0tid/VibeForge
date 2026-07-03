'use client';

import { useUiStore } from '@/stores/ui.store';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { useProject, useProjects } from '@/features/projects/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, CheckSquare, Clock, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const hasHydrated = useHasHydrated();
  const { activeProjectId } = useUiStore();
  
  const { data: projectsData, isLoading: isLoadingProjects, error: projectsError } = useProjects();
  const { data: activeProject } = useProject(activeProjectId);
  const { data: tasksData, isLoading: isLoadingTasks, error: tasksError } = useTasks(activeProjectId);
  
  if (isLoadingProjects || isLoadingTasks) {
    return <LoadingState />;
  }

  if (projectsError) {
    return <ErrorState message={projectsError.message} />;
  }
  if (activeProjectId && tasksError) {
    return <ErrorState message={tasksError.message} />;
  }

  const totalProjects = projectsData?.list.length || 0;
  const totalTasks = tasksData?.list.length || 0;
  const inProgressTasks = tasksData?.list.filter(t => t.status === 'in_progress').length || 0;
  const blockedTasks = tasksData?.list.filter(t => t.status === 'blocked').length || 0;
  
  const recentTasks = tasksData?.list
    ? [...tasksData.list].sort((a, b) => new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime()).slice(0, 5)
    : [];

  if (!hasHydrated) return null;

  return (
    <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full gap-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {activeProjectId && activeProject 
              ? `Overview for ${activeProject.name}` 
              : 'Overview of all your projects and tasks.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">In active project</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blocked Tasks</CardTitle>
            <AlertTriangle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{blockedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Recent Tasks</h2>
        
        {!activeProjectId ? (
          <EmptyState 
            icon={LayoutDashboard}
            title="No project selected"
            description="Select a project from the Projects page to view its tasks here."
          />
        ) : recentTasks.length === 0 ? (
          <EmptyState 
            icon={CheckSquare}
            title="No tasks found"
            description="Create tasks in the Tasks page to see them appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recentTasks.map(task => (
              <Card key={task.Id} className="flex flex-row items-center justify-between p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(task.UpdatedAt), { addSuffix: true })}
                  </span>
                </div>
                <Badge variant={
                  task.status === 'done' ? 'default' : 
                  task.status === 'in_progress' ? 'secondary' : 
                  task.status === 'blocked' ? 'destructive' : 'outline'
                }>
                  {task.status}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}