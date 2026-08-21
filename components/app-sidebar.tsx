"use client"

import * as React from "react"
import {
  FolderIcon,
  SettingsIcon,
  PlusCircleIcon,
  LogOutIcon,
  ChevronDownIcon,
  FolderOpenIcon,
  Bookmark,
  ShieldCheck,
  Sun,
  Moon,
  Building2,
  CalendarDays,
  Users,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Notifications } from "@/components/notifications"
import { useTheme } from "next-themes"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { Home } from "lucide-react"
import { useUser } from '@/components/user-provider'

interface Project {
  id: string;
  name: string;
  slug: string;
  user_id: string;
}

interface AppSidebarProps {
  onSignOut: () => void;
  onProjectUpdate?: (action: 'rename' | 'delete', projectId?: string) => void;
}

const menuItems = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Proyectos", url: "/dashboard/projects", icon: FolderIcon },
  { title: "Producción de Agencias", url: "/dashboard/agency-production-v2", icon: Building2 },
  { title: "Calendario", url: "/dashboard/calendar", icon: CalendarDays },
  { title: "Equipo", url: "/dashboard/team", icon: Users, managerOnly: true },
  { title: "Guardados", url: "/dashboard/bookmarks", icon: Bookmark },
  { title: "Ajustes", url: "/dashboard/settings", icon: SettingsIcon },
]

export function AppSidebar({ onSignOut, onProjectUpdate }: AppSidebarProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const isAdmin = user?.role === 'admin' && user?.is_active === true;
  const isManager = (user?.role === 'admin' || user?.user_type === 'internal') && user?.is_active === true;

  const userData = {
    name: user?.full_name || user?.email || 'User',
    email: user?.email || '',
    avatar: user?.avatar_url || '',
  };

  React.useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  React.useEffect(() => {
    if (onProjectUpdate) {
      const handleProjectUpdate = (action: 'create' | 'rename' | 'delete', projectId?: string) => {
        if (action === 'delete') {
          setProjects(prev => prev.filter(p => p.id !== projectId));
        } else if (action === 'rename' || action === 'create') {
          loadProjects();
        }
      };
      (window as any).handleProjectUpdate = handleProjectUpdate;
    }
  }, [onProjectUpdate]);

  React.useEffect(() => {
    return () => {
      if ((window as any).handleProjectUpdate) {
        delete (window as any).handleProjectUpdate;
      }
    };
  }, []);

  const loadProjects = async () => {
    if (!user) return;
    setLoadingProjects(true);
    try {
      // Mismo criterio que el dashboard: admin ve todos los proyectos, el resto
      // solo aquellos donde es miembro (project_members). Antes solo mostraba
      // los proyectos en propiedad, así que un colaborador no veía sus proyectos
      // compartidos en el sidebar.
      const isAdminUser = user.role === 'admin' && user.is_active === true;
      const projectsQuery = isAdminUser
        ? supabase.from('projects').select('id, name, slug, user_id')
        : supabase.from('projects').select('id, name, slug, user_id, project_members!inner(role)');

      const { data: projects, error } = await projectsQuery
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setProjects(projects || []);
    } catch (error) {
      console.log('[v0] Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleQuickCreate = () => {
    router.push('/dashboard/projects/new');
  };

  const handleSignOut = async () => {
    try {
      await onSignOut();
      toast.success('Sesión cerrada');
    } catch (error) {
      toast.error('No se pudo cerrar sesión');
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-x-2">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
              width={130}
              height={44}
              alt="OrganizAPP by SAIA LABS"
              priority
            />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex flex-row items-center justify-between py-2 gap-x-2">
            <Button
              size="xs"
              variant="secondary"
              className="flex w-full gap-2 justify-start bg-muted-foreground text-secondary hover:bg-primary/80"
              onClick={handleQuickCreate}
            >
              <PlusCircleIcon className="h-4 w-4" />
              <span className="text-xs">Nuevo proyecto</span>
            </Button>
            {user?.id && <Notifications userId={user.id} />}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if ((item as any).managerOnly && !isManager) {
                  return null;
                }

                if (item.url === "/dashboard/projects") {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/dashboard/projects"}
                      >
                        <Link href="/dashboard/projects">
                          <FolderIcon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>

                      <SidebarMenuSub>
                        {loadingProjects ? (
                          <>
                            <SidebarMenuSkeleton className="h-6" />
                            <SidebarMenuSkeleton className="h-6" />
                          </>
                        ) : (
                          projects.map((project) => (
                            <SidebarMenuSubItem key={project.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === `/dashboard/projects/${project.slug}`}
                              >
                                <Link href={`/dashboard/projects/${project.slug}`} title={project.name}>
                                  <FolderOpenIcon className="w-4 h-4" />
                                  <span className="truncate">{project.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))
                        )}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  );
                }

                if (item.disabled) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton disabled>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.url === '/dashboard' ? pathname === item.url : pathname?.startsWith(item.url) || false}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith("/dashboard/admin") || false}
                  >
                    <Link href="/dashboard/admin/users">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center gap-3 px-2 py-6">
              <Avatar className="h-9 w-9">
                {userData.avatar ? (
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                ) : (
                  <AvatarFallback>{userData.name?.[0]?.toUpperCase() || userData.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-medium truncate text-sm">{userData.name}</span>
                <span className="text-xs text-muted-foreground truncate">{userData.email}</span>
              </div>
              <ChevronDownIcon className="ml-auto h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-9 w-9">
                {userData.avatar ? (
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                ) : (
                  <AvatarFallback>{userData.name?.[0]?.toUpperCase() || userData.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-medium truncate text-sm">{userData.name}</span>
                <span className="text-xs text-muted-foreground truncate">{userData.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'sepia' : 'light')}>
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : theme === 'sepia' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              Cambiar tema
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOutIcon className="h-4 w-4 mr-2" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
