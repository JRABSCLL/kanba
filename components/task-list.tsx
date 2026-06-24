'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  Check,
  ArrowUpDown,
  Search,
  ListChecks,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/states';
import type { Task, Column, ProjectMember } from '@/lib/types';

type SortKey = 'title' | 'status' | 'priority' | 'due_date';
type SortDir = 'asc' | 'desc';

const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };

function priorityLabel(priority: string) {
  switch (priority) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Baja';
    default: return priority;
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

interface TaskListProps {
  columns: Column[];
  projectMembers: ProjectMember[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewComments: (task: Task) => void;
  onToggleDone: (taskId: string, isDone: boolean) => void;
  onMoveTask: (taskId: string, columnId: string) => void;
  readOnly?: boolean;
}

type Row = Task & { columnId: string; columnName: string };

export function TaskList({
  columns,
  projectMembers,
  onEditTask,
  onDeleteTask,
  onViewComments,
  onToggleDone,
  onMoveTask,
  readOnly = false,
}: TaskListProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>('all');
  const [hideDone, setHideDone] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>('status');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');

  const rows = React.useMemo<Row[]>(
    () =>
      columns.flatMap((column) =>
        (column.tasks || []).map((task) => ({
          ...task,
          columnId: column.id,
          columnName: column.name,
        })),
      ),
    [columns],
  );

  const assigneeName = React.useCallback(
    (userId: string | null | undefined) => {
      if (!userId) return 'Sin asignar';
      const member = projectMembers.find((m) => m.user_id === userId);
      return member?.profiles?.full_name || member?.profiles?.email || 'Sin asignar';
    },
    [projectMembers],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (q && !`${row.title} ${row.description ?? ''}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && row.columnId !== statusFilter) return false;
      if (priorityFilter !== 'all' && row.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned' ? row.assigned_to : row.assigned_to !== assigneeFilter) return false;
      }
      if (hideDone && row.is_done) return false;
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'status': {
          const ca = columns.findIndex((c) => c.id === a.columnId);
          const cb = columns.findIndex((c) => c.id === b.columnId);
          return (ca - cb || a.position - b.position) * dir;
        }
        case 'priority':
          return ((PRIORITY_WEIGHT[a.priority] ?? 0) - (PRIORITY_WEIGHT[b.priority] ?? 0)) * dir;
        case 'due_date': {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return (da - db) * dir;
        }
        default:
          return 0;
      }
    });
  }, [rows, search, statusFilter, priorityFilter, assigneeFilter, hideDone, sortKey, sortDir, columns]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ label, sortKeyName, className }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <th className={className}>
      <button
        type="button"
        onClick={() => toggleSort(sortKeyName)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyName ? 'text-foreground' : 'opacity-40'}`} />
      </button>
    </th>
  );

  const members = projectMembers.filter((m) => m.user_id);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarea…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda prioridad</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Asignado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unassigned">Sin asignar</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profiles?.full_name || m.profiles?.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={hideDone ? 'default' : 'outline'}
          size="sm"
          className="h-9"
          onClick={() => setHideDone((v) => !v)}
        >
          <ListChecks className="mr-1.5 h-4 w-4" />
          Ocultar hechas
        </Button>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No hay tareas"
          description={rows.length === 0 ? 'Este proyecto aún no tiene tareas.' : 'Ninguna tarea coincide con los filtros.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-8 py-2.5 pl-3" />
                <SortHeader label="Tarea" sortKeyName="title" className="py-2.5 pr-4 font-medium" />
                <SortHeader label="Estado" sortKeyName="status" className="py-2.5 pr-4 font-medium" />
                <SortHeader label="Prioridad" sortKeyName="priority" className="py-2.5 pr-4 font-medium" />
                <th className="py-2.5 pr-4 font-medium">Asignado</th>
                <SortHeader label="Vence" sortKeyName="due_date" className="py-2.5 pr-4 font-medium" />
                <th className="w-10 py-2.5 pr-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2.5 pl-3 align-top">
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onToggleDone(row.id, !row.is_done)}
                        className="mt-0.5"
                        aria-label={row.is_done ? 'Marcar como pendiente' : 'Marcar como hecha'}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                            row.is_done
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30 hover:border-primary'
                          }`}
                        >
                          {row.is_done && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 align-top">
                    <button
                      type="button"
                      onClick={() => onViewComments(row)}
                      className={`text-left font-medium leading-tight ${row.is_done ? 'text-muted-foreground line-through' : ''}`}
                    >
                      {row.title}
                    </button>
                    {row.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.description}</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 align-top">
                    {readOnly ? (
                      <Badge variant="secondary" className="text-xs font-normal">{row.columnName}</Badge>
                    ) : (
                      <Select value={row.columnId} onValueChange={(value) => value !== row.columnId && onMoveTask(row.id, value)}>
                        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 align-top">
                    <Badge variant="secondary" className={`text-xs ${priorityColor(row.priority)}`}>
                      {priorityLabel(row.priority)}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 align-top text-muted-foreground">{assigneeName(row.assigned_to)}</td>
                  <td className="py-2.5 pr-4 align-top text-muted-foreground tabular-nums">
                    {row.due_date ? formatDate(row.due_date) : '—'}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    {!readOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditTask(row)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onViewComments(row)}><MessageSquare className="mr-2 h-4 w-4" />Comentarios</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteTask(row.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
