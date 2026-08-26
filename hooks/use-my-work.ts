"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { isPastDue } from "@/lib/dates"
import { useUser } from "@/components/user-provider"

export type WorkScope = "mine" | "all"

// Forma común para tareas (proyectos) y entregables (agencias).
export type WorkItem = {
  id: string
  kind: "task" | "deliverable"
  title: string
  due_date: string | null
  done: boolean
  overdue: boolean
  priority: string
  status?: string
  context: string // nombre de proyecto o agencia
  href: string // a dónde lleva al hacer clic
}

const DELIVERABLE_DONE = new Set(["approved", "published"])

function pick<T>(rel: any): T | null {
  // Los embeds to-one de Supabase pueden venir como objeto o array; normalizamos.
  if (Array.isArray(rel)) return (rel[0] ?? null) as T | null
  return (rel ?? null) as T | null
}

// Tareas asignadas a mí + entregables de los que soy responsable (scope 'mine'),
// o todo lo visible (scope 'all', limitado por RLS). Cacheado con React Query.
export function useMyWork(scope: WorkScope) {
  const { user } = useUser()

  return useQuery({
    queryKey: ["my-work", user?.id, scope],
    enabled: !!user,
    queryFn: async (): Promise<WorkItem[]> => {

      // --- Tareas de proyecto ---
      let tasksQuery = supabase
        .from("tasks")
        .select("id, title, due_date, is_done, priority, columns(projects(name, slug))")
      if (scope === "mine") tasksQuery = tasksQuery.eq("assigned_to", user!.id)
      const { data: tasks } = await tasksQuery

      const taskItems: WorkItem[] = (tasks || []).map((t: any) => {
        const column = pick<any>(t.columns)
        const project = pick<any>(column?.projects)
        const done = !!t.is_done
        const overdue = isPastDue(t.due_date) && !done
        return {
          id: t.id,
          kind: "task",
          title: t.title,
          due_date: t.due_date,
          done,
          overdue,
          priority: t.priority,
          context: project?.name || "Proyecto",
          href: project?.slug ? `/dashboard/projects/${project.slug}` : "/dashboard",
        }
      })

      // --- Entregables de agencia ---
      let delivQuery = supabase
        .from("production_deliverables")
        .select("id, title, due_date, status, priority, agencies(name)")
      if (scope === "mine") delivQuery = delivQuery.eq("responsible_internal_id", user!.id)
      const { data: deliverables } = await delivQuery

      const delivItems: WorkItem[] = (deliverables || []).map((d: any) => {
        const agency = pick<any>(d.agencies)
        const done = DELIVERABLE_DONE.has(d.status)
        const overdue = isPastDue(d.due_date) && !done && d.status !== "cancelled"
        return {
          id: d.id,
          kind: "deliverable",
          title: d.title,
          due_date: d.due_date,
          done,
          overdue,
          priority: d.priority,
          status: d.status,
          context: agency?.name || "Agencia",
          href: "/dashboard/agency-production-v2",
        }
      })

      return [...taskItems, ...delivItems]
    },
  })
}
