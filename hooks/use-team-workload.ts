"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { isPastDue } from "@/lib/dates"
import { useUser } from "@/components/user-provider"
import type { WorkItem } from "@/hooks/use-my-work"

export type TeamMemberWorkload = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string
  items: WorkItem[]
  pending: number
  overdue: number
}

const DELIVERABLE_DONE = new Set(["approved", "published"])

function pick(rel: any) {
  return Array.isArray(rel) ? rel[0] ?? null : rel ?? null
}

// Carga de trabajo POR PERSONA (vista de mando): tareas asignadas + entregables
// de los que cada quien es responsable. Solo tiene sentido para admin/interno,
// que por RLS ven el trabajo del equipo.
export function useTeamWorkload() {
  const { user } = useUser()

  return useQuery({
    queryKey: ["team-workload", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TeamMemberWorkload[]> => {

      // Personas: usuarios internos/admin activos (los que ejecutan trabajo interno).
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role, user_type")
        .eq("is_active", true)
      const people = (profiles || []).filter((p: any) => p.role === "admin" || p.user_type === "internal")

      // Tareas asignadas (a cualquiera).
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, due_date, is_done, priority, assigned_to, columns(projects(name, slug))")
        .not("assigned_to", "is", null)

      // Entregables con responsable.
      const { data: deliverables } = await supabase
        .from("production_deliverables")
        .select("id, title, due_date, status, priority, responsible_internal_id, agencies(name)")
        .not("responsible_internal_id", "is", null)

      // Agrupar por persona.
      const byUser = new Map<string, WorkItem[]>()
      const push = (uid: string, item: WorkItem) => {
        if (!byUser.has(uid)) byUser.set(uid, [])
        byUser.get(uid)!.push(item)
      }

      for (const t of (tasks || []) as any[]) {
        const done = !!t.is_done
        if (done) continue
        const project = pick(pick(t.columns)?.projects)
        const overdue = isPastDue(t.due_date) && !done
        push(t.assigned_to, {
          id: t.id, kind: "task", title: t.title, due_date: t.due_date,
          done, overdue, priority: t.priority,
          context: project?.name || "Proyecto",
          href: project?.slug ? `/dashboard/projects/${project.slug}` : "/dashboard",
        })
      }

      for (const d of (deliverables || []) as any[]) {
        const done = DELIVERABLE_DONE.has(d.status)
        if (done || d.status === "cancelled") continue
        const overdue = isPastDue(d.due_date) && !done
        push(d.responsible_internal_id, {
          id: d.id, kind: "deliverable", title: d.title, due_date: d.due_date,
          done, overdue, priority: d.priority, status: d.status,
          context: pick(d.agencies)?.name || "Agencia",
          href: "/dashboard/agency-production-v2",
        })
      }

      const rows: TeamMemberWorkload[] = people.map((p: any) => {
        const items = (byUser.get(p.id) || []).sort((a, b) =>
          (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1,
        )
        return {
          id: p.id,
          name: p.full_name || p.email,
          email: p.email,
          avatar_url: p.avatar_url,
          role: p.role,
          items,
          pending: items.length,
          overdue: items.filter((i) => i.overdue).length,
        }
      })

      // Orden: más atrasados primero, luego más carga, luego nombre.
      return rows.sort((a, b) => b.overdue - a.overdue || b.pending - a.pending || a.name.localeCompare(b.name))
    },
  })
}
