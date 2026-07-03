'use client';

import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
} from '@/features/projects/hooks';
import { useUiStore } from '@/stores/ui.store';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Plus,
  Trash2,
  FolderKanban,
  CheckCircle2,
  Folder,
  ChevronRight,
  CornerLeftUp,
  Check,
  AlertCircle,
  Circle,
  Link2,
  GitBranch,
  RefreshCw,
  Copy,
  ExternalLink,
  FolderOpen,
  Loader2,
  Clock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '@/types';

function getField(obj: Record<string, unknown>, snake: string, title: string): string {
  return (obj?.[snake] || obj?.[title] || '') as string;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Never updated';
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return 'Never updated';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface GitInfo {
  branch?: string;
  status?: 'clean' | 'dirty' | 'not_git' | 'unknown';
  repository_url?: string;
  default_branch?: string;
  changes_count?: number;
}

function GitStatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'clean':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
          <CheckCircle2 className="size-3" />
          Clean
        </span>
      );
    case 'dirty':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">
          <AlertCircle className="size-3" />
          Changes
        </span>
      );
    case 'not_git':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-medium">
          <XCircle className="size-3" />
          Not a Git repo
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Circle className="size-3" />
          Unknown
        </span>
      );
  }
}

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  repository_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['active', 'archived', 'planning']),
  local_path: z.string().optional().or(z.literal('')),
  default_branch: z.string().optional().or(z.literal('')),
  tech_stack: z.string().optional().or(z.literal('')),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

function ProjectDetailSheet({
  project,
  gitInfo,
  onClose,
  onOpenWorkspace,
  onRefreshGit,
  onDelete,
  isRefreshingGit,
}: {
  project: Project | null;
  gitInfo: GitInfo | null;
  onClose: () => void;
  onOpenWorkspace: (p: Project) => void;
  onRefreshGit: (p: Project) => void;
  onDelete: (id: number) => void;
  isRefreshingGit: boolean;
}) {
  if (!project) return null;

  const rec = project as unknown as Record<string, unknown>;
  const localPath = getField(rec, 'local_path', 'Local Path');
  const repoUrl = getField(rec, 'repository_url', 'Repository URL');
  const defaultBranch = getField(rec, 'default_branch', 'Default Branch');
  const techStack = getField(rec, 'tech_stack', 'Tech Stack');
  const description = getField(rec, 'description', 'Description');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Sheet open={!!project} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-xl pr-4">{project.name}</SheetTitle>
          <SheetDescription>{project.slug}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 py-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={project.status === 'active' ? 'default' : project.status === 'archived' ? 'secondary' : 'outline'}>
              {project.status}
            </Badge>
            {gitInfo && <GitStatusIndicator status={gitInfo.status || 'unknown'} />}
          </div>

          {description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="text-sm text-foreground bg-muted/30 p-3 rounded border">{description}</p>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Local Path</p>
              {localPath ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">{localPath}</code>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => copyToClipboard(localPath, 'Path')}>
                    <Copy className="size-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No path configured</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Repository URL</p>
              {repoUrl ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">{repoUrl}</code>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => copyToClipboard(repoUrl, 'Repository URL')}>
                    <Copy className="size-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Not connected</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Default Branch</p>
                <p className="text-sm font-mono flex items-center gap-1.5">
                  <GitBranch className="size-3 text-muted-foreground" />
                  {defaultBranch || gitInfo?.default_branch || 'main'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Active Branch</p>
                <p className="text-sm font-mono flex items-center gap-1.5">
                  <GitBranch className="size-3 text-primary" />
                  {gitInfo?.branch || defaultBranch || '-'}
                </p>
              </div>
            </div>

            {techStack && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tech Stack</p>
                <div className="flex flex-wrap gap-1.5">
                  {techStack.split(',').map((tech) => (
                    <Badge key={tech.trim()} variant="secondary" className="text-[10px]">
                      {tech.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Created</p>
                <p className="text-xs text-foreground">{formatDate(project.CreatedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Updated</p>
                <p className="text-xs text-foreground">{formatDate(project.UpdatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 border-t pt-4">
          <div className="flex gap-2 w-full">
            {localPath && (
              <Button size="sm" className="flex-1" onClick={() => onOpenWorkspace(project)}>
                <ExternalLink className="size-3.5 mr-1.5" />
                Open in Workspace
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefreshGit(project)}
              disabled={isRefreshingGit || !localPath}
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${isRefreshingGit ? 'animate-spin' : ''}`} />
              Refresh Git
            </Button>
          </div>
          <div className="flex gap-2 w-full">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(project.Id)}
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function ProjectsPage() {
  const hasHydrated = useHasHydrated();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useProjects();
  const { activeProjectId, setActiveProjectId } = useUiStore();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [directories, setDirectories] = useState<string[]>([]);
  const [parentPath, setParentPath] = useState('');
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationMsg, setValidationMsg] = useState('');

  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [gitInfoMap, setGitInfoMap] = useState<Record<number, GitInfo>>({});
  const [refreshingGitId, setRefreshingGitId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projectSchema as any) as any,
    defaultValues: {
      status: 'active',
      name: '',
      slug: '',
      description: '',
      repository_url: '',
      local_path: '',
      default_branch: '',
      tech_stack: '',
    },
  });

  const localPathValue = watch('local_path');

  const onSubmit = (values: ProjectFormValues) => {
    createProject.mutate(values, {
      onSuccess: () => {
        toast.success('Project created successfully');
        setIsDialogOpen(false);
        reset();
      },
      onError: (err) => {
        toast.error('Failed to create project', {
          description: err.message,
        });
      },
    });
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this project?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });
    if (result.isConfirmed) {
      deleteProject.mutate(id, {
        onSuccess: () => {
          toast.success('Project deleted');
          if (activeProjectId === String(id)) {
            setActiveProjectId(null);
          }
          setDetailProject(null);
        },
        onError: (err) => {
          toast.error('Failed to delete project', {
            description: err.message,
          });
        },
      });
    }
  };

  const handleRefreshGit = useCallback(async (project: Project) => {
    const rec = project as unknown as Record<string, unknown>;
    const localPath = getField(rec, 'local_path', 'Local Path');
    if (!localPath) {
      toast.error('No local path configured');
      return;
    }
    setRefreshingGitId(project.Id);
    try {
      const res = await fetch(`/api/git/info?path=${encodeURIComponent(localPath)}`);
      const info = await res.json();
      setGitInfoMap((prev) => ({
        ...prev,
        [project.Id]: {
          branch: info.branch || info.active_branch,
          status: info.status || (info.is_git ? (info.is_dirty ? 'dirty' : 'clean') : 'not_git'),
          repository_url: info.repository_url,
          default_branch: info.default_branch,
          changes_count: info.changes_count,
        },
      }));
      toast.success('Git status refreshed');
    } catch {
      setGitInfoMap((prev) => ({
        ...prev,
        [project.Id]: { status: 'unknown' },
      }));
      toast.error('Failed to refresh git status');
    } finally {
      setRefreshingGitId(null);
    }
  }, []);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setValidationStatus('idle');
    setValidationMsg('');
  };

  const fetchWorkspaceBrowse = async (pathQuery?: string) => {
    setIsLoadingFolders(true);
    try {
      const url = `/api/workspace/browse${pathQuery ? `?path=${encodeURIComponent(pathQuery)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch directory contents');
      }
      const data = await res.json();
      setFolderPath(data.currentPath);
      setParentPath(data.parentPath);
      setDirectories(data.directories || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading directory';
      toast.error(message);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleOpenFolderPicker = () => {
    const startPath = localPathValue || '';
    fetchWorkspaceBrowse(startPath);
    setIsFolderPickerOpen(true);
  };

  const handleNavigateFolder = (folderName: string) => {
    const separator = folderPath.includes('/') ? '/' : '\\';
    const cleanPath = folderPath.endsWith(separator) ? folderPath : folderPath + separator;
    fetchWorkspaceBrowse(cleanPath + folderName);
  };

  const handleGoUp = () => {
    if (parentPath && parentPath !== folderPath) {
      fetchWorkspaceBrowse(parentPath);
    }
  };

  const handleSelectFolder = () => {
    setValue('local_path', folderPath);
    setValidationStatus('idle');
    setValidationMsg('');

    const basename = folderPath.split(/[/\\]/).filter(Boolean).pop();
    if (basename) {
      if (!watch('name')) {
        setValue('name', basename);
        setValue('slug', basename.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      }
    }

    fetch(`/api/git/info?path=${encodeURIComponent(folderPath)}`)
      .then((res) => res.json())
      .then((gitInfo) => {
        if (gitInfo.repository_url) {
          setValue('repository_url', gitInfo.repository_url);
        }
        if (gitInfo.default_branch) {
          setValue('default_branch', gitInfo.default_branch);
        }
      })
      .catch(() => {});

    setIsFolderPickerOpen(false);
  };

  const handleValidatePath = async () => {
    if (!localPathValue) {
      setValidationStatus('invalid');
      setValidationMsg('Path cannot be empty');
      return;
    }
    setValidationStatus('validating');
    try {
      const res = await fetch(`/api/workspace/browse?path=${encodeURIComponent(localPathValue)}`);
      const data = await res.json();
      if (res.ok) {
        setValidationStatus('valid');
        setValidationMsg('Valid folder path');

        const basename = data.currentPath.split(/[/\\]/).filter(Boolean).pop();
        if (basename) {
          if (!watch('name')) {
            setValue('name', basename);
            setValue('slug', basename.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
          }
        }
      } else {
        setValidationStatus('invalid');
        setValidationMsg(data.error || 'Invalid directory');
      }
    } catch {
      setValidationStatus('invalid');
      setValidationMsg('Failed to validate path');
    }
  };

  const renderBreadcrumbs = () => {
    const separator = folderPath.includes('/') ? '/' : '\\';
    const parts = folderPath.split(separator).filter(Boolean);
    const isAbsoluteUnix = folderPath.startsWith('/');

    return (
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground overflow-x-auto pb-2 border-b">
        <Button
          variant="link"
          className="h-auto p-0 text-muted-foreground hover:text-foreground"
          onClick={() => fetchWorkspaceBrowse(isAbsoluteUnix ? '/' : '')}
        >
          Root
        </Button>
        {parts.map((part, index) => {
          const pathSlice = (isAbsoluteUnix ? '/' : '') + parts.slice(0, index + 1).join(separator);
          return (
            <div key={index} className="flex items-center gap-1">
              <ChevronRight className="size-3 flex-shrink-0" />
              <Button
                variant="link"
                className="h-auto p-0 text-muted-foreground hover:text-foreground max-w-[120px] truncate"
                onClick={() => fetchWorkspaceBrowse(pathSlice)}
              >
                {part}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  const handleOpenWorkspace = (project: Project) => {
    setActiveProjectId(String(project.Id));
    router.push('/workspace');
  };

  if (!hasHydrated) return null;

  return (
    <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your workspaces and repositories.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2" />
              New Project
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Add a new project to your workspace.
              </DialogDescription>
            </DialogHeader>
            <form id="create-project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-2 border p-3 rounded-lg bg-muted/20">
                <Label htmlFor="local_path" className="font-semibold text-xs uppercase tracking-wider">Local Workspace Path</Label>
                <div className="flex gap-2">
                  <Input id="local_path" {...register('local_path')} placeholder="C:\projects\my-app" className="flex-1" />
                  <Button type="button" variant="secondary" onClick={handleOpenFolderPicker}>
                    Browse
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <Button type="button" variant="outline" size="sm" onClick={handleValidatePath} className="h-7 text-xs">
                    Validate Path
                  </Button>
                  {validationStatus === 'validating' && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {validationStatus === 'valid' && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <Check className="size-3" /> {validationMsg}
                    </span>
                  )}
                  {validationStatus === 'invalid' && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {validationMsg}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} placeholder="My Awesome Project" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...register('slug')} placeholder="my-awesome-project" />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" {...register('description')} placeholder="Brief description of the project" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repository_url">Repository URL (Optional)</Label>
                <Input id="repository_url" {...register('repository_url')} placeholder="https://github.com/..." />
                {errors.repository_url && <p className="text-sm text-destructive">{errors.repository_url.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_branch">Default Branch (Optional)</Label>
                  <Input id="default_branch" {...register('default_branch')} placeholder="main" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech_stack">Tech Stack (Optional)</Label>
                  <Input id="tech_stack" {...register('tech_stack')} placeholder="React, Node.js" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </form>
            <DialogFooter>
              <Button form="create-project-form" type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Folder Picker dialog */}
      <Dialog open={isFolderPickerOpen} onOpenChange={setIsFolderPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Browse Workspace Folders</DialogTitle>
            <DialogDescription>
              Select the root folder of your project repository.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {renderBreadcrumbs()}

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoUp}
                disabled={!parentPath || parentPath === folderPath}
                className="gap-1"
              >
                <CornerLeftUp className="size-3" /> Go Up
              </Button>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {directories.length} folders
              </span>
            </div>

            <div className="h-64 border rounded-md overflow-y-auto bg-muted/10">
              {isLoadingFolders ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : directories.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No subfolders found.
                </div>
              ) : (
                <div className="divide-y">
                  {directories.map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => handleNavigateFolder(dir)}
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 text-sm transition-colors"
                    >
                      <Folder className="size-4 text-blue-500 fill-blue-500" />
                      <span className="truncate">{dir}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderPickerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSelectFolder}>
              Select This Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48">
              <CardHeader>
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
          <p>Error loading projects: {error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data?.list.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed h-64 bg-muted/20">
          <FolderKanban className="size-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mb-6">
            Get started by creating a new project to organize your tasks and agent workflows.
          </p>
          <Button onClick={handleOpenDialog} variant="outline">
            <Plus className="mr-2" />
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.list.map((project) => {
            const isActive = activeProjectId === String(project.Id);
            const rec = project as unknown as Record<string, unknown>;
            const localPath = getField(rec, 'local_path', 'Local Path');
            const repoUrl = getField(rec, 'repository_url', 'Repository URL');
            const defaultBranch = getField(rec, 'default_branch', 'Default Branch');
            const techStack = getField(rec, 'tech_stack', 'Tech Stack');
            const gitInfo = gitInfoMap[project.Id];

            return (
              <Card
                key={project.Id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/50'
                }`}
                onClick={() => setDetailProject(project)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FolderOpen className="size-4 text-primary" />
                      {project.name}
                      {isActive && <CheckCircle2 className="size-4 text-primary" />}
                    </CardTitle>
                    <Badge variant={project.status === 'active' ? 'default' : project.status === 'archived' ? 'secondary' : 'outline'}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="truncate font-mono text-xs">{project.slug}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] mb-3">
                    {getField(rec, 'description', 'Description') || 'No description provided.'}
                  </p>

                  <div className="flex flex-col gap-2 mt-3">
                    {localPath && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Folder className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground truncate bg-muted/50 px-1.5 py-0.5 rounded font-mono max-w-[200px]">
                          {localPath}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs">
                      <Link2 className="size-3 text-muted-foreground" />
                      {repoUrl ? (
                        <span className="text-foreground truncate max-w-[200px] font-mono">
                          {repoUrl}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">Not connected</span>
                      )}
                    </div>

                    {/* Git info row */}
                    <div className="flex items-center gap-2 text-xs">
                      <GitBranch className="size-3 text-muted-foreground" />
                      <span className="font-mono text-muted-foreground">{gitInfo?.branch || defaultBranch || 'main'}</span>
                      {gitInfo && <GitStatusIndicator status={gitInfo.status || 'unknown'} />}
                      {!gitInfo && localPath && (
                        <span className="text-muted-foreground/50 italic text-[10px]">git not checked</span>
                      )}
                    </div>

                    {/* Tech stack badges */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {techStack && techStack.split(',').map((tech) => (
                        <Badge key={tech.trim()} variant="secondary" className="text-[10px] h-5 px-1.5">
                          {tech.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t pt-4">
                  <div className="flex items-center gap-2">
                    {localPath && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWorkspace(project);
                        }}
                      >
                        Open in Workspace
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshGit(project);
                      }}
                      disabled={refreshingGitId === project.Id || !localPath}
                      title="Refresh Git Status"
                    >
                      <RefreshCw className={`size-3.5 ${refreshingGitId === project.Id ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDate(project.UpdatedAt)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.Id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectDetailSheet
        project={detailProject}
        gitInfo={detailProject ? gitInfoMap[detailProject.Id] || null : null}
        onClose={() => setDetailProject(null)}
        onOpenWorkspace={handleOpenWorkspace}
        onRefreshGit={handleRefreshGit}
        onDelete={handleDelete}
        isRefreshingGit={refreshingGitId === detailProject?.Id}
      />
    </div>
  );
}
