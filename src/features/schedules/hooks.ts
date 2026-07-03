import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Schedule, NocoDBListResponse } from '@/types';

export function useSchedules(projectId?: string | null) {
  return useQuery({
    queryKey: ['schedules', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/schedules?project_id=${projectId}` : '/api/schedules';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch schedules');
      return res.json() as Promise<NocoDBListResponse<Schedule>>;
    },
    enabled: !!projectId,
  });
}

export function useSchedule(id: string | null) {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: async () => {
      const res = await fetch(`/api/schedules/${id}`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json() as Promise<Schedule>;
    },
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Schedule>) => {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create schedule');
      return res.json() as Promise<Schedule>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', String(variables.project_id)] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Schedule> & { id: number }) => {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update schedule');
      return res.json() as Promise<Schedule>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', String(variables.id)] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete schedule');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
