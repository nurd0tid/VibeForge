'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Plug, Zap, Trash2, Check, ChevronsUpDown, Key, Server, RefreshCw, Pencil, Loader2 } from 'lucide-react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import type { Provider, NocoDBListResponse } from '@/types';
import { PROVIDER_PRESETS, getPresetById } from '@/lib/provider-presets';
import { getField, getFieldBool } from '@/lib/nocodb-fields';

const providerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  presetId: z.string().min(1, 'Provider preset is required'),
  base_url: z.string().optional(),
  default_model: z.string().optional(),
  is_active: z.boolean().default(true),
  supports_reasoning: z.boolean().default(false),
  supports_tools: z.boolean().default(false),
  context_window: z.coerce.number().optional(),
  max_output_tokens: z.coerce.number().optional(),
  apiKeyMode: z.enum(['env', 'direct-local', 'temporary', 'none']),
  apiKeyEnvName: z.string().optional(),
  directApiKey: z.string().optional(),
});

type ProviderFormValues = z.infer<typeof providerSchema>;

function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json() as Promise<NocoDBListResponse<Provider>>;
    },
  });
}

function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProviderFormValues & { type: string }) => {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create provider');
      return res.json() as Promise<Provider>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete provider');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

function useUpdateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProviderFormValues & { type: string } }) => {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update provider');
      return res.json() as Promise<Provider>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export default function ProvidersPage() {
  const { data, isLoading, error, refetch } = useProviders();
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editProviderId, setEditProviderId] = useState<number | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isInlineTestingId, setIsInlineTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<ProviderFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(providerSchema as any) as any,
    defaultValues: {
      name: '',
      presetId: 'openai',
      base_url: 'https://api.openai.com/v1',
      default_model: 'gpt-4o',
      is_active: true,
      supports_reasoning: true,
      supports_tools: true,
      context_window: 128000,
      max_output_tokens: -1,
      apiKeyMode: 'direct-local',
      apiKeyEnvName: 'OPENAI_API_KEY',
      directApiKey: '',
    },
  });

  const selectedPresetId = watch('presetId');
  const selectedMode = watch('apiKeyMode');
  const currentPreset = useMemo(() => getPresetById(selectedPresetId), [selectedPresetId]);
  
  const handlePresetSelect = (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;
    
    setValue('presetId', presetId);
    setValue('base_url', preset.baseUrl || '');
    
    if (!watch('name') || PROVIDER_PRESETS.some(p => p.name === watch('name'))) {
      setValue('name', preset.name);
    }
    
    setValue('apiKeyMode', preset.apiKeyMode === 'none' ? 'none' : 'direct-local');
    setValue('apiKeyEnvName', preset.apiKeyEnvDefault);
    setValue('supports_reasoning', preset.supportsReasoning);
    setValue('supports_tools', preset.supportsTools);
    
    setFetchedModels(preset.models || []);
    if (preset.models && preset.models.length > 0) {
      setValue('default_model', preset.models[0]);
    } else {
      setValue('default_model', '');
    }
    setPresetOpen(false);
  };

  const handleTestConnection = async () => {
    if (!currentPreset) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: currentPreset.type,
          baseUrl: watch('base_url'),
          apiKeyMode: watch('apiKeyMode'),
          apiKeyEnvName: watch('apiKeyEnvName'),
          directApiKey: watch('directApiKey'),
        }),
      });
      const data = await res.json();
      const displayName = watch('name') || currentPreset?.name || 'Provider';
      if (data.success) {
        setTestResult({ success: true, message: 'Connection successful' });
        toast.success(`${displayName}: Connection successful`);
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
        toast.error(`${displayName}: Connection failed`, { description: data.error });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Test failed' });
      toast.error(`${watch('name') || currentPreset?.name || 'Provider'}: Test failed`, { description: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchModels = async () => {
    if (!currentPreset || !currentPreset.supportsModelFetch) return;
    setIsFetchingModels(true);
    try {
      const res = await fetch('/api/providers/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: currentPreset.type,
          baseUrl: watch('base_url'),
          apiKeyMode: watch('apiKeyMode'),
          apiKeyEnvName: watch('apiKeyEnvName'),
          directApiKey: watch('directApiKey'),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      if (data.models && data.models.length > 0) {
        const modelNames = data.models.map((m: any) => m.id);
        setFetchedModels(modelNames);
        toast.success(`Fetched ${modelNames.length} models`);
        if (!watch('default_model') || !modelNames.includes(watch('default_model'))) {
          setValue('default_model', modelNames[0]);
        }
      } else {
        toast.info('No models found');
      }
    } catch (err: any) {
      toast.error('Failed to fetch models', { description: err.message });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const onSubmit = (values: ProviderFormValues) => {
    if (!currentPreset) return;
    const payload = {
      ...values,
      type: currentPreset.type,
    };
    
    if (editProviderId) {
      updateProvider.mutate(
        { id: editProviderId, data: payload },
        {
          onSuccess: () => {
            toast.success('Provider updated successfully');
            setIsDialogOpen(false);
            setEditProviderId(null);
            reset();
          },
          onError: (err) => {
            toast.error('Failed to update provider', { description: err.message });
          },
        }
      );
    } else {
      createProvider.mutate(payload, {
        onSuccess: () => {
          toast.success('Provider added successfully');
          setIsDialogOpen(false);
          reset();
        },
        onError: (err) => {
          toast.error('Failed to add provider', { description: err.message });
        },
      });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this provider?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });
    if (result.isConfirmed) {
      deleteProvider.mutate(id, {
        onSuccess: () => toast.success('Provider deleted'),
        onError: (err) => toast.error('Failed to delete provider', { description: err.message }),
      });
    }
  };

  const handleOpenDialog = () => {
    reset();
    setEditProviderId(null);
    setTestResult(null);
    handlePresetSelect('openai');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = async (provider: Provider) => {
    const rec = provider as unknown as Record<string, unknown>;
    setEditProviderId(provider.Id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/providers/${provider.Id}`);
      if (!res.ok) throw new Error('Failed to fetch provider details');
      const detail = await res.json();
      const localConfig = detail.localConfig || {};

      const presetId = localConfig.presetId || provider.type || 'custom-openai';
      const preset = getPresetById(presetId);
      if (preset) {
        setFetchedModels(preset.models || []);
      }

      setValue('presetId', presetId);
      setValue('name', getField(rec, 'name', 'Name') || provider.name || '');
      setValue('base_url', getField(rec, 'base_url', 'Base URL') || '');
      setValue('default_model', getField(rec, 'default_model', 'Default Model') || '');
      setValue('is_active', getFieldBool(rec, 'is_active', 'Is Active'));
      setValue('supports_reasoning', getFieldBool(rec, 'supports_reasoning', 'Supports Reasoning'));
      setValue('supports_tools', getFieldBool(rec, 'supports_tools', 'Supports Tools'));
      setValue('apiKeyMode', localConfig.apiKeyMode || 'env');
      setValue('apiKeyEnvName', localConfig.apiKeyEnvName || '');
      setValue('directApiKey', localConfig.directApiKey || '');

      setIsDialogOpen(true);
    } catch (err: any) {
      toast.error('Failed to load provider', { description: err.message });
    }
  };

  const handleInlineTest = async (provider: Provider) => {
    setIsInlineTestingId(provider.Id);
    try {
      const res = await fetch(`/api/providers/${provider.Id}`);
      if (!res.ok) throw new Error('Failed to fetch provider details');
      const detail = await res.json();
      const localConfig = detail.localConfig || {};
      const rec = provider as unknown as Record<string, unknown>;

      const testRes = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: provider.type,
          baseUrl: getField(rec, 'base_url', 'Base URL'),
          apiKeyMode: localConfig.apiKeyMode || 'env',
          apiKeyEnvName: localConfig.apiKeyEnvName,
          directApiKey: localConfig.directApiKey,
        }),
      });
      const data = await testRes.json();
      const displayName = getField(rec, 'name', 'Name') || provider.name || provider.Id || 'Provider';
      if (data.success) {
        toast.success(`${displayName}: Connection successful`);
      } else {
        toast.error(`${displayName}: Connection failed`, { description: data.error });
      }
    } catch (err: any) {
      const rec = provider as unknown as Record<string, unknown>;
      const displayName = getField(rec, 'name', 'Name') || provider.name || provider.Id || 'Provider';
      toast.error(`${displayName}: Test failed`, { description: err.message });
    } finally {
      setIsInlineTestingId(null);
    }
  };

  if (isLoading) return <LoadingState />;

  if (error) {
    return (
      <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full">
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  const providers = data?.list || [];

  return (
    <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full gap-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Providers</h1>
          <p className="text-muted-foreground mt-1">Connect and manage your AI provider endpoints.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditProviderId(null); reset(); } }}>
          <DialogTrigger render={<Button onClick={handleOpenDialog}><Plus className="mr-2 size-4" />Add Provider</Button>} />
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b shrink-0">
              <DialogTitle>{editProviderId ? 'Edit AI Provider' : 'Add AI Provider'}</DialogTitle>
              <DialogDescription>{editProviderId ? 'Update this AI provider configuration.' : 'Connect a new AI provider to use in agents and workspace.'}</DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              <form id="provider-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 pb-4">
                
                {/* Basic Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight">1. Basic Info</h3>
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Provider Preset</Label>
                      <Popover open={presetOpen} onOpenChange={setPresetOpen}>
                        <PopoverTrigger render={<Button variant="outline" role="combobox" aria-expanded={presetOpen} className="w-full justify-between">{currentPreset ? currentPreset.name : "Select provider..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>} />
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search providers..." />
                            <CommandList>
                              <CommandEmpty>No provider found.</CommandEmpty>
                              <CommandGroup heading="Cloud">
                                {PROVIDER_PRESETS.filter(p => p.category === 'cloud').map(preset => (
                                  <CommandItem key={preset.id} value={preset.name} onSelect={() => handlePresetSelect(preset.id)}>
                                    <Check className={`mr-2 h-4 w-4 ${selectedPresetId === preset.id ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col">
                                      <span>{preset.name}</span>
                                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandGroup heading="Local / Self-hosted">
                                {PROVIDER_PRESETS.filter(p => p.category === 'local').map(preset => (
                                  <CommandItem key={preset.id} value={preset.name} onSelect={() => handlePresetSelect(preset.id)}>
                                    <Check className={`mr-2 h-4 w-4 ${selectedPresetId === preset.id ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col">
                                      <span>{preset.name}</span>
                                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandGroup heading="Other">
                                {PROVIDER_PRESETS.filter(p => p.category === 'meta' || p.category === 'custom').map(preset => (
                                  <CommandItem key={preset.id} value={preset.name} onSelect={() => handlePresetSelect(preset.id)}>
                                    <Check className={`mr-2 h-4 w-4 ${selectedPresetId === preset.id ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col">
                                      <span>{preset.name}</span>
                                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provider-name">Display Name</Label>
                      <Input id="provider-name" {...register('name')} placeholder={currentPreset?.name} />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Connection Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight">2. Connection</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={handleTestConnection} disabled={isTesting}>
                      {isTesting ? <RefreshCw className="mr-2 size-3 animate-spin" /> : <Zap className="mr-2 size-3" />}
                      Test Connection
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 p-4 border rounded-lg bg-card/50">
                    <div className="space-y-2">
                      <Label htmlFor="provider-base-url" className="flex items-center gap-2">
                        <Server className="size-3" /> Base URL
                      </Label>
                      <Input id="provider-base-url" {...register('base_url')} placeholder="https://api.example.com/v1" />
                    </div>

                    <div className="space-y-2">
                      <Label>API Key Mode</Label>
                      <Controller
                        control={control}
                        name="apiKeyMode"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="env">Environment Variable</SelectItem>
                              <SelectItem value="direct-local">Direct (Local Config)</SelectItem>
                              <SelectItem value="none">No API Key (Local/Proxy)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {selectedMode === 'env' && (
                      <div className="space-y-2">
                        <Label htmlFor="provider-env-name">Environment Variable Name</Label>
                        <Input id="provider-env-name" {...register('apiKeyEnvName')} placeholder="e.g. OPENAI_API_KEY" />
                        <p className="text-xs text-muted-foreground">The key will be read securely from your .env file.</p>
                      </div>
                    )}

                    {selectedMode === 'direct-local' && (
                      <div className="space-y-2">
                        <Label htmlFor="provider-direct-key" className="flex items-center gap-2">
                          <Key className="size-3" /> Direct API Key
                        </Label>
                        <div className="relative">
                          <Input 
                            id="provider-direct-key" 
                            type={showKey ? 'text' : 'password'} 
                            {...register('directApiKey')} 
                            placeholder="sk-..." 
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-1 top-1 h-7 px-2"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? 'Hide' : 'Show'}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Stored locally in .vibeforge/providers.local.json. Not synced to cloud.</p>
                      </div>
                    )}

                    {testResult && (
                      <div className={`flex items-center gap-2 p-3 rounded-md border text-sm ${
                        testResult.success
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <Badge variant={testResult.success ? 'default' : 'destructive'} className={testResult.success ? 'bg-green-600' : ''}>
                          {testResult.success ? 'Connected' : 'Failed'}
                        </Badge>
                        <span className={testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                          {testResult.message}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Models Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight">3. Models</h3>
                    {currentPreset?.supportsModelFetch && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleFetchModels} disabled={isFetchingModels}>
                        <RefreshCw className={`mr-2 size-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                        Fetch Models
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider-model">Default Model</Label>
                    {fetchedModels.length > 0 ? (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Controller
                            control={control}
                            name="default_model"
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a model..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-56 overflow-y-auto">
                                  {fetchedModels.map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <Input 
                          className="flex-1"
                          placeholder="Or type custom model..."
                          {...register('default_model')}
                        />
                      </div>
                    ) : (
                      <Input id="provider-model" {...register('default_model')} placeholder="e.g. gpt-4o, claude-3-opus" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="provider-ctx">Context Window</Label>
                      <Input id="provider-ctx" type="number" {...register('context_window')} placeholder="128000" />
                      <p className="text-xs text-muted-foreground">Max input tokens</p>
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor="provider-max-out">Max Output Tokens</Label>
                       <Input id="provider-max-out" type="number" {...register('max_output_tokens')} placeholder="4096" />
                       <p className="text-xs text-muted-foreground">Max generation length (-1 is unlimited)</p>
                     </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight">4. Capabilities</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 border rounded-lg p-3">
                      <Controller
                        control={control}
                        name="supports_reasoning"
                        render={({ field }) => (
                          <Switch id="cap-reasoning" checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="cap-reasoning" className="text-sm font-medium leading-none">Reasoning Models</label>
                        <p className="text-xs text-muted-foreground">Supports o1, deepseek-reasoner, etc.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3">
                      <Controller
                        control={control}
                        name="supports_tools"
                        render={({ field }) => (
                          <Switch id="cap-tools" checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="cap-tools" className="text-sm font-medium leading-none">Tool Calling</label>
                        <p className="text-xs text-muted-foreground">Supports function/tool calling.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Label htmlFor="provider-active" className="text-base font-medium">Provider Status (Active)</Label>
                  <Controller
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <Switch
                        id="provider-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

              </form>
            </div>
            <DialogFooter className="p-6 pt-4 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditProviderId(null); reset(); }}>Cancel</Button>
              <Button form="provider-form" type="submit" disabled={createProvider.isPending || updateProvider.isPending}>
                {createProvider.isPending || updateProvider.isPending ? 'Saving...' : editProviderId ? 'Update Provider' : 'Save Provider'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {providers.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">No providers configured. Choose one to get started:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {PROVIDER_PRESETS.slice(0, 8).map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  handlePresetSelect(t.id);
                  setIsDialogOpen(true);
                }}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                  <CardDescription className="text-xs truncate">{t.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <EmptyState
            icon={Plug}
            title="No providers configured"
            description="Click a provider above or use Add Provider to connect."
          />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Default Model</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => {
                const rec = provider as unknown as Record<string, unknown>;
                const baseUrl = getField(rec, 'base_url', 'Base URL');
                const defaultModel = getField(rec, 'default_model', 'Default Model');
                const isActive = getFieldBool(rec, 'is_active', 'Is Active');
                const supportsTools = getFieldBool(rec, 'supports_tools', 'Supports Tools');
                const supportsReasoning = getFieldBool(rec, 'supports_reasoning', 'Supports Reasoning');
                
                return (
                  <TableRow key={provider.Id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{baseUrl || 'Default'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{provider.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{defaultModel || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {supportsTools && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Tools</Badge>}
                        {supportsReasoning && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Reasoning</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleInlineTest(provider)}
                          disabled={isInlineTestingId === provider.Id}
                          title="Test Connection"
                        >
                          {isInlineTestingId === provider.Id ? (
                            <Loader2 className="size-4 animate-spin text-primary" />
                          ) : (
                            <Zap className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(provider)}
                          title="Edit Provider"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(provider.Id)}
                          title="Delete Provider"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
