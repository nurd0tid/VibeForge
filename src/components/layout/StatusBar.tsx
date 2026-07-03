'use client';

import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui.store';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { useProject } from '@/features/projects/hooks';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Database, Cpu } from 'lucide-react';
import type { Provider, NocoDBListResponse } from '@/types';

function getField(obj: Record<string, unknown>, snake: string, title: string): string {
  return (obj?.[snake] || obj?.[title] || '') as string;
}

export function StatusBar() {
  const hasHydrated = useHasHydrated();
  const { activeProjectId } = useUiStore();
  const { data: project } = useProject(activeProjectId);

  const { data: providersData } = useQuery<NocoDBListResponse<Provider>>({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
  });

  const activeProvider = providersData?.list?.find(
    (p) => {
      const rec = p as unknown as Record<string, unknown>;
      return rec['is_active'] || rec['Is Active'];
    }
  );

  const providerName = activeProvider ? getField(activeProvider as any, 'name', 'Name') : '';
  const providerModel = activeProvider ? getField(activeProvider as any, 'default_model', 'Default Model') : '';
  const providerLabel = activeProvider
    ? `${providerName || 'Provider'} - ${providerModel || 'unknown'}`
    : 'No AI Provider';

  if (!hasHydrated) return null;

  return (
    <div className="flex items-center justify-between px-4 py-1 text-xs border-t bg-muted/40 text-muted-foreground select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors">
          <GitBranch className="size-3" />
          <span>{project ? getField(project as any, 'default_branch', 'Default Branch') || 'main' : 'No project'}</span>
        </div>
        
        {project && (
          <div className="flex items-center gap-1">
            <span className="opacity-50">|</span>
            <span className="ml-1 text-foreground/80 font-medium">{project.name}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors">
          <Cpu className="size-3" />
          <span>{providerLabel}</span>
        </div>
        
        <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors">
          <Database className="size-3" />
          <div className="flex items-center gap-1">
            <span>NocoDB</span>
            <Badge variant="outline" className="h-4 text-[10px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/20 rounded-sm">
              Sync
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}