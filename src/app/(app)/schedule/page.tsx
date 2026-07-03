'use client';

import { useState, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isSameDay,
} from 'date-fns';
import { useUiStore } from '@/stores/ui.store';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from '@/features/schedules/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CalendarClock,
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  X,
  CalendarDays,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import type { Schedule } from '@/types';

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'blocked', label: 'Blocked' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: { label: 'Planned', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
  done: { label: 'Done', className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  skipped: { label: 'Skipped', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' },
  blocked: { label: 'Blocked', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function ScheduleCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 space-y-2">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

function ScheduleColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-64 xl:w-72">
      <div className="rounded-xl border border-border bg-muted/30 flex flex-col h-full">
        <div className="px-3 py-3 border-b border-border flex items-center gap-2">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-col gap-2 p-3">
          <ScheduleCardSkeleton />
          <ScheduleCardSkeleton />
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({
  item,
  onClick,
}: {
  item: Schedule;
  onClick: (item: Schedule) => void;
}) {
  return (
    <button
      onClick={() => onClick(item)}
      className="w-full text-left rounded-lg border border-border bg-card px-3 py-3 hover:border-primary/40 hover:shadow-sm transition-all group space-y-2"
    >
      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
        {item.title}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={item.status} />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3" />
          {item.scheduled_date
            ? format(parseISO(item.scheduled_date), 'MMM d')
            : <span className="text-muted-foreground/50 italic">Day {item.day_index}</span>}
        </div>
      </div>
      {item.expected_output && (
        <p className="text-xs text-muted-foreground line-clamp-2 italic">{item.expected_output}</p>
      )}
    </button>
  );
}

function ScheduleDetailSheet({
  item,
  onClose,
  onEdit,
  onDeleted,
}: {
  item: Schedule | null;
  onClose: () => void;
  onEdit: (item: Schedule) => void;
  onDeleted: () => void;
}) {
  const deleteSchedule = useDeleteSchedule();

  const handleDelete = async () => {
    if (!item) return;
    const result = await Swal.fire({
      title: 'Delete schedule item?',
      text: `"${item.title}" will be permanently deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    deleteSchedule.mutate(item.Id, {
      onSuccess: () => {
        toast.success('Schedule item deleted');
        onDeleted();
        onClose();
      },
      onError: (err) => {
        toast.error('Failed to delete', { description: err.message });
      },
    });
  };

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="line-clamp-2 pr-4">{item?.title}</SheetTitle>
          <SheetDescription>Schedule item details</SheetDescription>
        </SheetHeader>

        {item && (
          <div className="flex flex-col gap-5 py-6">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={item.status} />
              {item.day_index !== undefined && item.day_index !== null && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border-border">
                  Day {item.day_index}
                </span>
              )}
            </div>

            {item.description && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded border">{item.description}</p>
              </div>
            )}

            {item.expected_output && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected Output</p>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">{item.expected_output}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scheduled Date</p>
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {item.scheduled_date ? format(parseISO(item.scheduled_date), 'PPP') : 'No date set'}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Day Index</p>
                <div className="text-sm text-foreground font-mono">
                  {item.day_index !== undefined ? `Day ${item.day_index}` : '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="gap-2 border-t pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteSchedule.isPending}
          >
            <Trash2 className="size-4 mr-1.5" />
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => item && onEdit(item)}
          >
            <Pencil className="size-4 mr-1.5" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ScheduleFormDialog({
  open,
  onOpenChange,
  projectId,
  editItem,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  editItem?: Schedule | null;
  onSuccess: () => void;
}) {
  const isEditing = !!editItem;
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const [title, setTitle] = useState(editItem?.title ?? '');
  const [description, setDescription] = useState(editItem?.description ?? '');
  const [expectedOutput, setExpectedOutput] = useState(editItem?.expected_output ?? '');
  const [scheduledDate, setScheduledDate] = useState(editItem?.scheduled_date ?? '');
  const [dayIndex, setDayIndex] = useState(String(editItem?.day_index ?? '1'));
  const [status, setStatus] = useState(editItem?.status ?? 'planned');

  const isMutating = createSchedule.isPending || updateSchedule.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Schedule> = {
      title,
      description: description || undefined,
      expected_output: expectedOutput || undefined,
      scheduled_date: scheduledDate || undefined,
      day_index: dayIndex ? Number(dayIndex) : undefined,
      status,
    };

    if (isEditing && editItem) {
      updateSchedule.mutate(
        { id: editItem.Id, ...payload },
        {
          onSuccess: () => {
            toast.success('Schedule item updated');
            onSuccess();
            onOpenChange(false);
          },
          onError: (err) => toast.error('Failed to update', { description: err.message }),
        },
      );
    } else {
      createSchedule.mutate(
        { ...payload, project_id: Number(projectId) },
        {
          onSuccess: () => {
            toast.success('Schedule item created');
            onSuccess();
            onOpenChange(false);
          },
          onError: (err) => toast.error('Failed to create', { description: err.message }),
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Schedule Item' : 'Add Schedule Item'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this schedule item.' : 'Plan a new task execution slot.'}
          </DialogDescription>
        </DialogHeader>
        <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="s-title">Title</Label>
            <Input
              id="s-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-day">Day Index (1 = Mon, 2 = Tue...)</Label>
              <Input
                id="s-day"
                type="number"
                min="1"
                max="7"
                value={dayIndex}
                onChange={(e) => setDayIndex(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-date">Scheduled Date</Label>
              <Input
                id="s-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val) => val && setStatus(val)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea
              id="s-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              className="min-h-20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-output">Expected Output</Label>
            <Textarea
              id="s-output"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="What should be produced..."
              className="min-h-20"
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" disabled={isMutating}>
            {isMutating ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SchedulePage() {
  const hasHydrated = useHasHydrated();
  const { activeProjectId } = useUiStore();
  const { data, isLoading, error, refetch } = useSchedules(activeProjectId);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'timeline' | 'list'>('board');

  const [detailItem, setDetailItem] = useState<Schedule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Schedule | null>(null);

  // Generate 7 days of the week starting Monday
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeekStart, i);
      // Monday = 1, Tuesday = 2... Sunday = 7
      const dayIndex = i + 1;
      const formattedDate = format(date, 'yyyy-MM-dd');
      const label = format(date, 'EEE, MMM dd');
      const name = format(date, 'EEEE');
      return { date, dayIndex, formattedDate, label, name };
    });
  }, [currentWeekStart]);

  // Is current displayed week the actual "today" week?
  const isCurrentWeek = useMemo(() => {
    const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return currentWeekStart.getTime() === todayWeekStart.getTime();
  }, [currentWeekStart]);

  // Date range display text
  const dateRangeText = useMemo(() => {
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
  }, [weekDays]);

  const handlePrevWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const filtered = useMemo(() => {
    const allItems: Schedule[] = data?.list ?? [];
    return allItems.filter((item) => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(item.status)) return false;
      return true;
    });
  }, [data?.list, search, statusFilter]);

  // Group items by weekDays
  const itemsByDay = useMemo(() => {
    const map: Record<number, Schedule[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    
    for (const item of filtered) {
      if (item.scheduled_date) {
        // Find if this scheduled_date fits in our current week Days
        const matchingDay = weekDays.find((d) => d.formattedDate === item.scheduled_date);
        if (matchingDay) {
          map[matchingDay.dayIndex].push(item);
        }
      } else if (item.day_index && item.day_index >= 1 && item.day_index <= 7) {
        // Fallback matching day_index (1 = Monday, 7 = Sunday)
        map[item.day_index].push(item);
      }
    }
    return map;
  }, [filtered, weekDays]);

  const byDate = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    for (const item of filtered) {
      const key = item.scheduled_date || 'No Date';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    const sorted = Object.entries(map).sort(([a], [b]) => {
      if (a === 'No Date') return 1;
      if (b === 'No Date') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [filtered]);

  const hasFilters = search || statusFilter.length > 0;

  const handleOpenForm = (item?: Schedule) => {
    setEditItem(item ?? null);
    if (item) setDetailItem(null);
    setIsFormOpen(true);
  };

  const handleDetailClose = () => setDetailItem(null);
  const handleDeleted = () => refetch();

  if (!hasHydrated) return null;

  if (!activeProjectId) {
    return (
      <div className="flex flex-1 flex-col p-8 max-w-7xl mx-auto w-full">
        <EmptyState
          icon={CalendarClock}
          title="No project selected"
          description="Select a project from the Projects page to view its schedule."
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dateRangeText}
              {isCurrentWeek && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold">This Week</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Week navigation */}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40 gap-0.5">
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1" onClick={handlePrevWeek}>
                <ChevronLeft className="size-3.5" />
                Prev Week
              </Button>
              {!isCurrentWeek && (
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={handleToday}>
                  Today
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1" onClick={handleNextWeek}>
                Next Week
                <ChevronRight className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              <button
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'board' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Board view"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Timeline view"
                onClick={() => setViewMode('timeline')}
              >
                <CalendarDays className="size-4" />
              </button>
              <button
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="List view"
                onClick={() => setViewMode('list')}
              >
                <List className="size-4" />
              </button>
            </div>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 size-4" />
              Add Schedule Item
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search schedule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Filter className="size-3.5" />
                Status
                {statusFilter.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-px">
                    {statusFilter.length}
                  </span>
                )}
                <ChevronDown className="size-3 ml-0.5" />
              </Button>
            } />
            <DropdownMenuContent align="start" className="w-44">
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={statusFilter.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    setStatusFilter((prev) =>
                      checked ? [...prev, opt.value] : prev.filter((s) => s !== opt.value),
                    );
                  }}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={() => {
                setSearch('');
                setStatusFilter([]);
              }}
            >
              <X className="size-3.5" />
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {error && (
          <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20">
            <p className="text-sm text-destructive">Error: {error.message}</p>
          </div>
        )}

        {viewMode === 'board' && (
          <div className="flex flex-1 gap-4 overflow-x-auto p-6 items-start">
            {isLoading ? (
              <>
                {Array.from({ length: 7 }).map((_, i) => (
                  <ScheduleColumnSkeleton key={i} />
                ))}
              </>
            ) : (
              weekDays.map((col) => {
                const items = itemsByDay[col.dayIndex] ?? [];
                // Check if today matches this date
                const isTodayDate = isSameDay(col.date, new Date());
                return (
                  <div key={col.dayIndex} className="flex-shrink-0 w-64 xl:w-72 flex flex-col max-h-full">
                    <div className={`rounded-xl border border-border bg-card flex flex-col ${isTodayDate ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                      <div className="px-3 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            {isTodayDate && <span className="size-1.5 rounded-full bg-primary animate-pulse" />}
                            {col.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{col.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-medium">
                            {items.length}
                          </span>
                          <button
                            onClick={() => {
                              setEditItem({
                                scheduled_date: col.formattedDate,
                                day_index: col.dayIndex,
                                title: '',
                                status: 'planned',
                              } as Schedule);
                              setIsFormOpen(true);
                            }}
                            className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={`Add item to ${col.name}`}
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[150px]">
                        {items.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-muted-foreground/60 select-none border border-dashed rounded-lg bg-muted/5">
                            No schedule items
                            <br />
                            Drop or add tasks here
                          </div>
                        ) : (
                          items.map((item) => (
                            <ScheduleCard
                              key={item.Id}
                              item={item}
                              onClick={setDetailItem}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <ScheduleCardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No schedule items" description="Add items to see them here." />
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Title</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Day</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Expected Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((item) => (
                      <tr
                        key={item.Id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setDetailItem(item)}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{item.title}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">Day {item.day_index ?? '-'}</td>
                        <td className="px-4 py-3">
                          {item.scheduled_date
                            ? <span className="flex items-center gap-1"><CalendarDays className="size-3 text-muted-foreground" />{format(parseISO(item.scheduled_date), 'MMM d, yyyy')}</span>
                            : <span className="text-muted-foreground/50 italic text-xs">No date</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{item.expected_output || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <ScheduleCardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No schedule items" description="Add items to see them here." />
            ) : (
              <div className="space-y-8 max-w-3xl mx-auto">
                {byDate.map(([dateKey, items]) => (
                  <div key={dateKey} className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary shrink-0">
                        <CalendarDays className="size-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {dateKey === 'No Date'
                          ? 'No Date'
                          : format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-mono">{items.length}</span>
                    </div>
                    <div className="ml-4 border-l pl-6 space-y-3">
                      {items.map((item) => (
                        <ScheduleCard key={item.Id} item={item} onClick={setDetailItem} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ScheduleDetailSheet
        item={detailItem}
        onClose={handleDetailClose}
        onEdit={handleOpenForm}
        onDeleted={handleDeleted}
      />

      {isFormOpen && (
        <ScheduleFormDialog
          open={isFormOpen}
          onOpenChange={(v) => {
            setIsFormOpen(v);
            if (!v) setEditItem(null);
          }}
          projectId={activeProjectId}
          editItem={editItem}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );
}
