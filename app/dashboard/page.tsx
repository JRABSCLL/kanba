'use client';





import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageLoader } from '@/components/ui/states';
import { ViewToggle } from '@/components/ui/view-toggle';
import { useUser } from '@/components/user-provider';
import { useMyWork, type WorkScope, type WorkItem } from '@/hooks/use-my-work';
import { Plus, FolderOpen, Calendar, CheckSquare, ListChecks, AlertTriangle, Square, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
  user_id: string;
  // For shared projects
  project_members?: {
    role: string;
  }[];
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: 'free' | 'pro' | null;
}

interface TaskAssignment {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  project_name: string;
  project_id: string;
  project_slug: string;
  column_name: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  // El rol ya viene del contexto (UserProvider); no re-pedimos el perfil.
  const isAdmin = user?.role === 'admin' && user?.is_active === true;

  // Carga cacheada (stale-while-revalidate). Al volver al panel se muestra al
  // instante desde caché y revalida en segundo plano.
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-projects', user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      // Admins ven TODOS los proyectos; los miembros solo donde son project_members.
      const projectsQuery = isAdmin
        ? supabase.from('projects').select('*, project_members(role)')
        : supabase.from('projects').select('*, project_members!inner(role)');
      const { data: projects } = await projectsQuery.order('created_at', { ascending: false });
      return { projects: (projects || []) as Project[] };
    },
  });

  const projects = data?.projects ?? [];
  const showSkeleton = isLoading && !data;

  // "Mi trabajo": tareas + entregables, según el alcance (mío / todo).
  const [scope, setScope] = useState<WorkScope>('mine');
  const { data: work = [], isLoading: workLoading } = useMyWork(scope);
  const workSkeleton = workLoading && work.length === 0;
  const pending = useMemo(() => work.filter((w) => !w.done), [work]);
  const overdueCount = pending.filter((w) => w.overdue).length;

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const weekKey = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const GROUPS = [
    { key: 'vencidas', label: 'Vencidas' },
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'adelante', label: 'Más adelante' },
    { key: 'nofecha', label: 'Sin fecha' },
  ] as const;
  const bucketOf = (w: WorkItem) => {
    if (!w.due_date) return 'nofecha';
    const d = w.due_date.slice(0, 10);
    if (d < todayKey) return 'vencidas';
    if (d === todayKey) return 'hoy';
    if (d <= weekKey) return 'semana';
    return 'adelante';
  };
  const grouped = useMemo(() => {
    const sorted = [...pending].sort((a, b) => ((a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1));
    return GROUPS.map((g) => ({ ...g, items: sorted.filter((w) => bucketOf(w) === g.key) })).filter((g) => g.items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, todayKey, weekKey]);

  const canCreateProject = () => !!user;

  const getProjectRole = (project: Project) => {
    if (project.user_id === user?.id) return 'owner';
    return project.project_members?.[0]?.role || 'member';
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Admin';
      case 'viewer': return 'Lector';
      case 'member': return 'Miembro';
      default: return role;
    }
  };

  const priorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  const monthCount = projects.filter(
    (p) => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  ).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Cabecera */}
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.full_name || user?.email}</p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/dashboard/projects/new')}
          disabled={!canCreateProject()}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo proyecto
        </Button>
      </header>

      {/* Métricas */}
      <div className="mb-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        {[
          { label: 'Proyectos', value: projects.length, icon: FolderOpen, loading: showSkeleton, danger: false },
          { label: 'Pendientes', value: pending.length, icon: ListChecks, loading: workSkeleton, danger: false },
          { label: 'Vencidas', value: overdueCount, icon: AlertTriangle, loading: workSkeleton, danger: overdueCount > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.danger ? 'text-red-500/70' : 'text-muted-foreground/50'}`} strokeWidth={1.75} />
            </div>
            <div className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${kpi.danger ? 'text-red-600 dark:text-red-400' : ''}`}>{kpi.loading ? <span className="text-muted-foreground/40">—</span> : kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Proyectos */}
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proyectos</h2>

          {showSkeleton ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-lg border bg-muted/40" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No hay proyectos"
              description="Crea un proyecto para empezar a organizar tareas."
              action={
                <Button size="sm" onClick={() => router.push('/dashboard/projects/new')}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nuevo proyecto
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map((project) => {
                const role = getProjectRole(project);
                const isOwner = project.user_id === user?.id;

                return (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/dashboard/projects/${project.slug}`)}
                    className="flex flex-col rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/25"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-tight">{project.name}</span>
                      <Badge variant="outline" className="shrink-0 text-[11px] font-normal">{roleLabel(role)}</Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {project.description || 'Sin descripción'}
                    </p>
                    <span className="mt-3 text-xs text-muted-foreground">
                      {isOwner ? 'Creado' : 'Añadido'} el {formatDate(project.created_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Mi trabajo */}
        <aside>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mi trabajo</h2>
            <ViewToggle
              value={scope}
              onChange={setScope}
              options={[{ value: 'mine', label: 'Mío' }, { value: 'all', label: 'Todo' }]}
            />
          </div>

          {workSkeleton ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[60px] animate-pulse rounded-lg border bg-muted/40" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Nada pendiente" />
          ) : (
            <div className="space-y-5">
              {grouped.map((g) => (
                <div key={g.key}>
                  <h3 className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${g.key === 'vencidas' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                    {g.label} <span className="opacity-60">· {g.items.length}</span>
                  </h3>
                  <div className="space-y-1.5">
                    {g.items.map((w) => {
                      const Icon = w.kind === 'task' ? Square : Circle;
                      return (
                        <button
                          key={w.kind + w.id}
                          onClick={() => router.push(w.href)}
                          className="flex w-full items-start gap-2 rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-foreground/25"
                        >
                          <Icon className="mt-1 h-2.5 w-2.5 shrink-0 text-muted-foreground" fill="currentColor" strokeWidth={0} />
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-medium ${w.overdue ? 'text-red-600 dark:text-red-400' : ''}`}>{w.title}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {w.context}{w.due_date ? ` · ${formatDate(w.due_date)}` : ''}
                            </div>
                          </div>
                          <Badge variant="secondary" className={`shrink-0 text-[11px] ${getPriorityColor(w.priority)}`}>{priorityLabel(w.priority)}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
