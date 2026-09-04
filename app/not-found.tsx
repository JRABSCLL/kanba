import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * 404. Sin este archivo, Next.js enseña su pantalla por defecto: en inglés,
 * en blanco y negro y sin forma de volver.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-5 text-center">
        <p className="font-mono text-xs tracking-widest text-muted-foreground">ERROR 404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Esta página no existe</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Puede que el enlace esté mal escrito, o que lo que buscabas se haya eliminado.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Button asChild size="sm">
            <Link href="/dashboard">Ir al inicio</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/help">Guía de uso</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
