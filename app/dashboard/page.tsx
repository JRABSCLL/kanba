'use client';





import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageLoader } from '@/components/ui/states';
import { useUser } from '@/components/user-provider';
import { toast } from 'sonner';
import { Plus, FolderOpen, Calendar, Users, Bell, CheckSquare, User, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';

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
  const { user, signOut } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme, setTheme } = useTheme();


  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    checkUser();
  }, [user, router]);

  const checkUser = async () => {
    if (!user) return;
    
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profile);

      // Admins ven TODOS los proyectos de la organización; los miembros solo
      // aquellos donde están en project_members. El `!inner` restringe a los
      // proyectos con membresía, así que para admin usamos un left join.
      const isAdmin = profile?.role === 'admin' && profile?.is_active === true;
      const projectsQuery = isAdmin
        ? supabase.from('projects').select('*, project_members(role)')
        : supabase.from('projects').select('*, project_members!inner(role)');

      const { data: projects } = await projectsQuery.order('created_at', { ascending: false });

      setProjects(projects || []);

      // Get tasks assigned to the user
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          priority,
          due_date,
          column_id
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (tasks) {
        // Get column and project info for each task
        const formattedTasks = await Promise.all(
          tasks.map(async (task: any) => {
            // Get column info
            const { data: column } = await supabase
              .from('columns')
              .select(`
                name,
                project_id
              `)
              .eq('id', task.column_id)
              .single();

            // Get project info
            const { data: project } = await supabase
              .from('projects')
              .select('id, name, slug')
              .eq('id', column?.project_id)
              .single();

            return {
              id: task.id,
              title: task.title,
              priority: task.priority,
              due_date: task.due_date,
              project_name: project?.name || 'Unknown Project',
              project_id: project?.id || '',
              project_slug: project?.slug || '',
              column_name: column?.name || 'Unknown Column',
            };
          })
        );
        setAssignedTasks(formattedTasks);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo cargar el panel');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const canCreateProject = () => {
    // OrganizAPP: sin límites de plan para uso organizacional interno
    return !!profile;
  };

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

  if (loading) {
    return <PageLoader label="Cargando panel" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Cabecera */}
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
          <p className="mt-1 text-sm text-muted-foreground">{profile?.full_name || user?.email}</p>
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
          { label: 'Proyectos', value: projects.length, icon: FolderOpen },
          { label: 'Tareas asignadas', value: assignedTasks.length, icon: CheckSquare },
          { label: 'Creados este mes', value: monthCount, icon: Calendar },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.75} />
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Proyectos */}
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proyectos</h2>

          {projects.length === 0 ? (
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

        {/* Tareas asignadas */}
        <aside>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tareas asignadas</h2>

          {assignedTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Sin tareas asignadas" />
          ) : (
            <div className="space-y-3">
              {assignedTasks.map((task) => (
                <div key={task.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-tight">{task.title}</span>
                    <Badge variant="secondary" className={`shrink-0 text-[11px] ${getPriorityColor(task.priority)}`}>
                      {priorityLabel(task.priority)}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {task.project_name} · {task.column_name}
                  </p>
                  {task.due_date && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Vence el {formatDate(task.due_date)}</p>
                  )}
                  <button
                    onClick={() => router.push(`/dashboard/projects/${task.project_slug}`)}
                    className="mt-2 text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Abrir proyecto
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
