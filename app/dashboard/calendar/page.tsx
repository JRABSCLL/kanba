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
  isSameDay,
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
      className={`flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left text-xs hover:bg-muted ${item.overdue ? "text-red-600 dark:text-red-400" : ""} ${item.done ? "text-muted-foreground line-through" : ""}`}
    >
      <Icon className="h-2 w-2 shrink-0" fill="currentColor" strokeWidth={0} />
      <span className="truncate">{item.title}</span>
      <span className="ml-auto shrink-0 truncate text-[10px] text-muted-foreground">{item.context}</span>
    </button>
  )
}

export default function CalendarPage() {
  const router = useRouter()
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
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

  const itemsOf = (day: Date) => byDay.get(format(day, "yyyy-MM-dd")) || []
  const go = (item: WorkItem) => router.push(item.href)

  const prevMonth = () => { const m = subMonths(cursor, 1); setCursor(m); setSelectedDay(startOfMonth(m)) }
  const nextMonth = () => { const m = addMonths(cursor, 1); setCursor(m); setSelectedDay(startOfMonth(m)) }
  const today = () => { const t = new Date(); setCursor(t); setSelectedDay(t) }

  const selectedItems = itemsOf(selectedDay)

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Cabecera */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight capitalize">{format(cursor, "LLLL yyyy", { locale: es })}</h1>
          <div className="ml-2 flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-8" onClick={today}>Hoy</Button>
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
            options={[{ value: "mine", label: "Mío" }, { value: "all", label: "Todo" }]}
          />
        </div>
      </header>

      {isLoading && items.length === 0 ? (
        <PageLoader label="Cargando calendario" />
      ) : (
        <>
          {/* ---------- PC: rejilla mensual completa ---------- */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2">{w}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const dayItems = byDay.get(key) || []
                const inMonth = isSameMonth(day, cursor)
                const shown = dayItems.slice(0, 3)
                const extra = dayItems.length - shown.length
                return (
                  <div key={key} className={`min-h-[104px] border-b border-r p-1 last:border-r-0 ${inMonth ? "" : "bg-muted/20 text-muted-foreground"}`}>
                    <div className="mb-1">
                      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${isToday(day) ? "bg-primary font-medium text-primary-foreground" : ""}`}>{format(day, "d")}</span>
                    </div>
                    <div className="space-y-0.5">
                      {shown.map((it) => <Chip key={it.kind + it.id} item={it} onClick={() => go(it)} />)}
                      {extra > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="px-1 text-[11px] text-muted-foreground hover:text-foreground">+{extra} más</button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72 p-2">
                            <div className="mb-1 px-1 text-xs font-medium capitalize">{format(day, "EEEE d 'de' LLLL", { locale: es })}</div>
                            <div className="space-y-0.5">{dayItems.map((it) => <Chip key={it.kind + it.id} item={it} onClick={() => go(it)} />)}</div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ---------- Móvil: mini-rejilla + lista del día (estilo iPhone) ---------- */}
          <div className="md:hidden">
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-[11px] font-medium text-muted-foreground">
                {WEEKDAYS.map((w) => <div key={w} className="py-1.5">{w[0]}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const dayItems = itemsOf(day)
                  const inMonth = isSameMonth(day, cursor)
                  const selected = isSameDay(day, selectedDay)
                  const hasOverdue = dayItems.some((it) => it.overdue)
                  return (
                    <button
                      key={format(day, "yyyy-MM-dd")}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex h-11 flex-col items-center justify-center text-sm ${!inMonth ? "text-muted-foreground/40" : ""} ${selected ? "bg-primary text-primary-foreground" : isToday(day) ? "font-semibold text-primary" : ""}`}
                    >
                      {format(day, "d")}
                      {dayItems.length > 0 && (
                        <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${selected ? "bg-primary-foreground" : hasOverdue ? "bg-red-500" : "bg-foreground/50"}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lista del día seleccionado */}
            <div className="mt-4">
              <div className={`mb-2 text-sm font-medium capitalize ${isToday(selectedDay) ? "text-primary" : ""}`}>
                {format(selectedDay, "EEEE d 'de' LLLL", { locale: es })}
              </div>
              {selectedItems.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Nada este día" />
              ) : (
                <div className="space-y-1 rounded-lg border p-2">
                  {selectedItems.map((it) => <Chip key={it.kind + it.id} item={it} onClick={() => go(it)} />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
