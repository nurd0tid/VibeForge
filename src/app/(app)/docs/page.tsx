'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen,
  Layers,
  Ruler,
  Palette,
  Database,
  Workflow,
  CheckSquare,
  Zap,
  LayoutTemplate,
  FileCode,
  ArrowLeft,
  Bot,
  Settings,
  Rocket,
  ScrollText,
  Brain
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const docCategories = [
  { id: 'overview', title: 'Overview', description: 'Vision, roadmap, and product requirements.', icon: BookOpen },
  { id: 'agent', title: 'Agent Guide', description: 'How VibeForge works, agent workflow, memory bank, skills, and MCP setup.', icon: Brain },
  { id: 'architecture', title: 'Architecture', description: 'System design, tech stack, and structure.', icon: Layers },
  { id: 'skills', title: 'Skills', description: 'Specialized agent skill instructions and triggers.', icon: Zap },
  { id: 'ai', title: 'AI & MCP', description: 'AI provider rules, project context, and MCP integration.', icon: Bot },
  { id: 'workflow', title: 'Workflow', description: 'Development lifecycle and AI operating loops.', icon: Workflow },
  { id: 'standards', title: 'Standards', description: 'Coding conventions, DoR, and DoD.', icon: Ruler },
  { id: 'database', title: 'Database', description: 'NocoDB schema and setup guide.', icon: Database },
  { id: 'ui-ux', title: 'UI/UX', description: 'Design guidelines and component patterns.', icon: Palette },
  { id: 'checklists', title: 'Checklists', description: 'Process checklists for agents and devs.', icon: CheckSquare },
  { id: 'templates', title: 'Templates', description: 'Templates for tasks, plans, logs, and ADRs.', icon: LayoutTemplate },
  { id: 'adr', title: 'ADR', description: 'Architecture Decision Records.', icon: FileCode },
  { id: 'prompts', title: 'Prompts', description: 'System prompts for session context.', icon: ScrollText },
  { id: 'setup', title: 'Setup', description: 'Installation, package setup, and project initialization.', icon: Settings },
  { id: 'deployment', title: 'Deployment', description: 'Docker, Traefik, and production deployment.', icon: Rocket },
  { id: 'logging', title: 'Logging', description: 'Logging policy and best practices.', icon: ScrollText },
];

export default function DocsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<{name: string; path: string; content: string} | null>(null);

  const { data: filesData, isLoading } = useQuery<{ files: Array<{ name: string; path: string; content: string }> }>({
    queryKey: ['docs', activeCategory],
    queryFn: async () => {
      if (!activeCategory) return { files: [] };
      const res = await fetch(`/api/docs?category=${activeCategory}`);
      if (!res.ok) throw new Error('Failed to fetch docs');
      return res.json();
    },
    enabled: !!activeCategory,
  });

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end p-8 pb-4 shrink-0 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            {activeCategory && (
              <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => {
                setActiveCategory(null);
                setActiveFile(null);
              }}>
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
          </div>
          <p className="text-muted-foreground mt-1">Browse project documentation and references.</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {!activeCategory ? (
          <ScrollArea className="h-full p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
              {docCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card 
                    key={category.id} 
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{category.title}</CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full">
            {/* Sidebar with files */}
            <div className="w-64 border-r border-border flex flex-col bg-muted/20 shrink-0">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">{docCategories.find(c => c.id === activeCategory)?.title}</h3>
              </div>
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-4"><LoadingState /></div>
                ) : filesData?.files?.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No documents found.</div>
                ) : (
                  <div className="flex flex-col p-2 gap-1">
                    {filesData?.files?.map((file) => (
                      <button
                        key={file.path}
                        className={`text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          activeFile?.path === file.path 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'hover:bg-muted text-foreground'
                        }`}
                        onClick={() => setActiveFile(file)}
                      >
                        <span className="capitalize">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
              {activeFile ? (
                <>
                  <div className="px-6 py-4 border-b border-border bg-card shrink-0">
                    <h2 className="text-lg font-semibold capitalize">{activeFile.name}</h2>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{activeFile.path}</p>
                  </div>
                  <ScrollArea className="flex-1 bg-muted/30">
                    <div className="p-8 max-w-4xl mx-auto">
                      <div className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 p-8 rounded-lg shadow-sm border">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeFile.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="h-full flex items-center justify-center p-8">
                  <EmptyState
                    icon={BookOpen}
                    title="Select a document"
                    description="Choose a file from the left sidebar to view its content."
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}