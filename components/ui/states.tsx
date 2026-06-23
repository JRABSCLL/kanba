import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Cargador de página: una línea, sin spinners gigantes ni texto motivacional.
export function PageLoader({ label = "Cargando", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-[60vh] w-full items-center justify-center", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        <span>{label}</span>
      </div>
    </div>
  )
}

// Estado vacío: un icono discreto, una afirmación factual y, como mucho, una acción.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="mb-3 h-5 w-5 text-muted-foreground" strokeWidth={1.5} /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
