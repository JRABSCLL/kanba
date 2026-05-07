"use client"

import * as React from "react"
import {
  FolderIcon,
  BarChartIcon,
  SettingsIcon,
  PlusCircleIcon,
  LogOutIcon,
  ChevronDownIcon,
  FolderOpenIcon,
  NotepadTextIcon,
  PlugZap,
  List,
  Brain,
  Calendar,
  Bookmark,
  ShieldCheck,
  Sun,
  Moon,
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
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Projects", url: "/dashboard/projects", icon: FolderIcon },
  { title: "Bookmarks", url: "/dashboard/bookmarks", icon: Bookmark },
  { title: "Notes (próximamente)", url: "/dashboard/notes", icon: NotepadTextIcon, disabled: true },
  { title: "Analytics (próximamente)", url: "/dashboard/analytics", icon: BarChartIcon, disabled: true },
  { title: "Integrations (próximamente)", url: "/dashboard/integrations", icon: PlugZap, disabled: true },
  { title: "Lists (próximamente)", url: "/dashboard/listd", icon: List, disabled: true },
  { title: "AI Planner (próximamente)", url: "/dashboard/integrations2", icon: Brain, disabled: true },
  { title: "Meetings (próximamente)", url: "/dashboard/integrations3", icon: Calendar, disabled: true },
  { title: "Settings", url: "/dashboard/settings", icon: SettingsIcon },
]

export function AppSidebar({ onSignOut, onProjectUpdate }: AppSidebarProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const isAdmin = user?.role === 'admin' && user?.status === 'approved';

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
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, slug, user_id')
        .eq('user_id', user.id)
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
                if (item.title === "Projects") {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={pathname?.startsWith("/dashboard/projects") || false}
                      >
                        <FolderIcon className="h-4 w-4" />
                        <span>{item.title}</span>
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
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
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
