"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Errores dentro del dashboard. Se muestra conservando el menú lateral, así que
 * quien lo vea puede irse a otra sección sin recargar ni perder la sesión.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[OrganizAPP] error en el dashboard:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">ALGO FALLÓ</p>
          <h1 className="text-xl font-semibold tracking-tight">Esta sección no cargó</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            El resto de la aplicación sigue funcionando: puedes cambiar de sección desde el menú.
            Nada de lo que habías guardado se ha perdido.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={reset}>Reintentar</Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Volver al inicio</Link>
          </Button>
        </div>

        {error.digest && (
          <p className="border-t pt-4 font-mono text-[11px] text-muted-foreground">
            Referencia: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
