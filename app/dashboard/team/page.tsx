"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/user-provider"
import { useTeamWorkload } from "@/hooks/use-team-workload"
import type { WorkItem } from "@/hooks/use-my-work"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyState, PageLoader } from "@/components/ui/states"
import { Users, ChevronDown, Square, Circle, ShieldAlert } from "lucide-react"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function ItemRow({ item, onOpen }: { item: WorkItem; onOpen: () => void }) {
  const Icon = item.kind === "task" ? Square : Circle
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
    >
      <Icon className="h-2 w-2 shrink-0 text-muted-foreground" fill="currentColor" strokeWidth={0} />
      <span className={`truncate ${item.overdue ? "text-red-600 dark:text-red-400" : ""}`}>{item.title}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {item.context}{item.due_date ? ` · ${formatDate(item.due_date)}` : ""}
      </span>
    </button>
  )
}

export default function TeamPage() {
  const { user } = useUser()
  const router = useRouter()
  const isManager = user?.role === "admin" || user?.user_type === "internal"
  const { data: rows = [], isLoading } = useTeamWorkload()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (!isManager) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Sin acceso"
        description="Esta vista es solo para administradores y usuarios internos."
        className="my-10"
      />
    )
  }

  const totalPending = rows.reduce((s, r) => s + r.pending, 0)
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0)

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carga por persona — tareas y entregables pendientes.
        </p>
      </header>

      {isLoading && rows.length === 0 ? (
        <PageLoader label="Cargando equipo" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No hay usuarios internos" />
      ) : (
        <>
          {/* Resumen */}
          <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
            <div className="bg-card p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Personas</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{rows.length}</div>
            </div>
            <div className="bg-card p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pendientes</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{totalPending}</div>
            </div>
            <div className="bg-card p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vencidas</div>
              <div className={`mt-1 text-2xl font-semibold tabular-nums ${totalOverdue > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{totalOverdue}</div>
            </div>
          </div>

          {/* Por persona */}
          <div className="space-y-2">
            {rows.map((r) => {
              const open = expanded.has(r.id)
              return (
                <div key={r.id} className="overflow-hidden rounded-lg border bg-card">
                  <button
                    type="button"
                    onClick={() => r.items.length && toggle(r.id)}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40 disabled:cursor-default"
                    disabled={r.items.length === 0}
                  >
                    <Avatar className="h-9 w-9">
                      {r.avatar_url ? <AvatarImage src={r.avatar_url} alt={r.name} /> : null}
                      <AvatarFallback className="text-xs">{r.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{r.name}</span>
                        {r.role === "admin" && <Badge variant="outline" className="shrink-0 text-[10px] font-normal">Admin</Badge>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.overdue > 0 && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">{r.overdue} vencidas</Badge>
                      )}
                      <Badge variant="secondary">{r.pending} pend.</Badge>
                      {r.items.length > 0 && (
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </button>
                  {open && r.items.length > 0 && (
                    <div className="border-t p-2">
                      {r.items.map((it) => (
                        <ItemRow key={it.kind + it.id} item={it} onOpen={() => router.push(it.href)} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
