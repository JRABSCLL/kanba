"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Square, Circle, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ViewToggle } from "@/components/ui/view-toggle"
import { EmptyState, PageLoader } from "@/components/ui/states"
import { useMyWork, type WorkScope, type WorkItem } from "@/hooks/use-my-work"

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function Chip({ item, onClick }: { item: WorkItem; onClick: () => void }) {
  const Icon = item.kind === "task" ? Square : Circle
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${item.title} · ${item.context}`}
      className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted ${item.overdue ? "text-red-600 dark:text-red-400" : ""} ${item.done ? "text-muted-foreground line-through" : ""}`}
    >
      <Icon className="h-2 w-2 shrink-0" fill="currentColor" strokeWidth={0} />
      <span className="truncate">{item.title}</span>
    </button>
  )
}

export default function CalendarPage() {
  const router = useRouter()
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [scope, setScope] = useState<WorkScope>("mine")
  const { data: items = [], isLoading } = useMyWork(scope)

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd])

  const byDay = useMemo(() => {
    const map = new Map<string, WorkItem[]>()
    for (const it of items) {
      if (!it.due_date) continue
      const key = it.due_date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    }
    return map
  }, [items])

  const go = (item: WorkItem) => router.push(item.href)

  // Días del mes con ítems (para la agenda móvil).
  const monthDaysWithItems = days.filter((d) => isSameMonth(d, cursor) && (byDay.get(format(d, "yyyy-MM-dd"))?.length ?? 0) > 0)

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Cabecera */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight capitalize">{format(cursor, "LLLL yyyy", { locale: es })}</h1>
          <div className="ml-2 flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor((c) => subMonths(c, 1))} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(new Date())}>Hoy</Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1"><Square className="h-2 w-2" fill="currentColor" strokeWidth={0} /> Tarea</span>
            <span className="flex items-center gap-1"><Circle className="h-2 w-2" fill="currentColor" strokeWidth={0} /> Entregable</span>
          </div>
          <ViewToggle
            value={scope}
            onChange={setScope}
            options={[
              { value: "mine", label: "Mío" },
              { value: "all", label: "Todo" },
            ]}
          />
        </div>
      </header>

      {isLoading && items.length === 0 ? (
        <PageLoader label="Cargando calendario" />
      ) : (
        <>
          {/* Rejilla mensual (desktop) */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2">{w}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const dayItems = byDay.get(key) || []
                const inMonth = isSameMonth(day, cursor)
                const today = isToday(day)
                const shown = dayItems.slice(0, 3)
                const extra = dayItems.length - shown.length
                return (
                  <div key={key} className={`min-h-[100px] border-b border-r p-1 last:border-r-0 ${inMonth ? "" : "bg-muted/20 text-muted-foreground"}`}>
                    <div className="mb-1">
                      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${today ? "bg-primary font-medium text-primary-foreground" : ""}`}>
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {shown.map((it) => <Chip key={it.kind + it.id} item={it} onClick={() => go(it)} />)}
                      {extra > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="px-1 text-[11px] text-muted-foreground hover:text-foreground">+{extra} más</button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-64 p-2">
                            <div className="mb-1 px-1 text-xs font-medium capitalize">{format(day, "EEEE d 'de' LLLL", { locale: es })}</div>
                            <div className="space-y-0.5">
                              {dayItems.map((it) => <Chip key={it.kind + it.id} item={it} onClick={() => go(it)} />)}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agenda (móvil) */}
          <div className="space-y-4 md:hidden">
            {monthDaysWithItems.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nada este mes" description="No hay tareas ni entregables con fecha en este mes." />
            ) : (
              monthDaysWithItems.map((day) => {
                const dayItems = byDay.get(format(day, "yyyy-MM-dd")) || []
                return (
                  <div key={format(day, "yyyy-MM-dd")}>
                    <div className={`mb-1 text-sm font-medium capitalize ${isToday(day) ? "text-primary" : ""}`}>{format(day, "EEEE d", { locale: es })}</div>
                    <div className="space-y-1 rounded-lg border p-2">
                      {dayItems.map((it) => <Chip key={it.kind + it.id} item={it} onClick={() => go(it)} />)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
