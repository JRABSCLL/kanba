"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/states"
import { Plus, FolderOpen, Search } from "lucide-react"

interface Project {
  id: string
  name: string
  description: string | null
  slug: string
  created_at: string
  user_id: string
  project_members?: { role: string }[]
}

const roleLabel = (role: string) =>
  ({ owner: "Propietario", admin: "Admin", viewer: "Lector", member: "Miembro" } as Record<string, string>)[role] || role

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })

export default function ProjectsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [search, setSearch] = useState("")

  const isAdmin = user?.role === "admin" && user?.is_active === true

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["all-projects", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const q = isAdmin
        ? supabase.from("projects").select("*, project_members(role)")
        : supabase.from("projects").select("*, project_members!inner(role)")
      const { data } = await q.order("created_at", { ascending: false })
      return (data || []) as Project[]
    },
  })

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return projects
    return projects.filter((p) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(t))
  }, [projects, search])

  const roleOf = (p: Project) =>
    p.user_id === user?.id ? "owner" : p.project_members?.[0]?.role || "member"

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Cargando…" : `${projects.length} ${projects.length === 1 ? "proyecto" : "proyectos"}`}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/dashboard/projects/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo proyecto
        </Button>
      </header>

      {projects.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto…"
            className="h-9 pl-8"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-lg border bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={projects.length === 0 ? "Todavía no hay proyectos" : "Ningún proyecto coincide"}
          description={
            projects.length === 0
              ? "Crea el primero. Vendrá con las columnas Por hacer, En progreso y Hecho ya listas."
              : "Prueba con otra búsqueda."
          }
          action={
            projects.length === 0 ? (
              <Button size="sm" onClick={() => router.push("/dashboard/projects/new")}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nuevo proyecto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/dashboard/projects/${p.slug}`)}
              className="flex flex-col rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/25"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium leading-tight">{p.name}</span>
                <Badge variant="outline" className="shrink-0 text-[11px] font-normal">
                  {roleLabel(roleOf(p))}
                </Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                {p.description || "Sin descripción"}
              </p>
              <span className="mt-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
