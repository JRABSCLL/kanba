"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Frontera de error de la aplicación.
 *
 * Sin este archivo, cualquier excepción enseña la pantalla en crudo de Next.js
 * ("Application error: a client-side exception has occurred"), que la gente lee
 * como una caída del servidor y no dice qué hacer.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Hasta que haya monitorización, la consola es el único rastro.
    console.error("[OrganizAPP] error no controlado:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">ALGO FALLÓ</p>
          <h1 className="text-2xl font-semibold tracking-tight">No se pudo cargar esta pantalla</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            No has perdido nada: lo que estaba guardado sigue guardado. Vuelve a intentarlo y,
            si se repite, recarga la página.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={reset}>Reintentar</Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Ir al inicio</Link>
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
