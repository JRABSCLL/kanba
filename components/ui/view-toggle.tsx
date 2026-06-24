"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ViewOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

// Control segmentado monocromo, reutilizable para alternar vistas (Tablero/Lista,
// Kanban/Tabla...). Un único patrón visual para todos los módulos.
export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: ViewOption<T>[]
  className?: string
}) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border bg-muted/40 p-0.5", className)}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.icon ? <opt.icon className="h-3.5 w-3.5" strokeWidth={1.75} /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
