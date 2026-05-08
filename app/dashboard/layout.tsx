"use client"
import { useEffect, useState, useRef } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useUser } from "@/components/user-provider"
import { useRouter } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useUser()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const redirectCheckedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // AUTH GATE: si NO estamos cargando y NO hay usuario → login.
  // Usamos useRef para asegurar que solo hacemos este check UNA VEZ por sesión,
  // no en cada render. Esto evita la race condition de hidratación donde `user`
  // está temporalmente undefined antes de que el UserProvider termine.
  useEffect(() => {
    if (!mounted) return
    if (loading) {
      redirectCheckedRef.current = false
      return
    }

    // loading === false y mounted === true → podemos proceder
    // Pero solo hacemos el redirect check UNA VEZ, no en cada render
    if (redirectCheckedRef.current) return

    redirectCheckedRef.current = true

    if (!user) {
      router.replace("/login")
    }
  }, [mounted, loading, user, router])

  // APPROVAL GATE: send inactive users to /pending
  useEffect(() => {
    if (!mounted || loading || !user) return
    if (user.is_active === false) {
      router.replace("/pending")
    }
  }, [mounted, loading, user, router])

  // NOTA: el gate de admin NO vive aquí — lo maneja la propia página
  // app/dashboard/admin/users/page.tsx, que respeta el estado `loading` del
  // UserProvider y evita la race condition donde `user.role` todavía no ha
  // cargado cuando este layout se ejecuta.

  const handleSignOut = () => {
    router.push("/")
    signOut()
  }

  const handleProjectUpdate = (action: "rename" | "delete", projectId?: string) => {
    if ((window as any).handleProjectUpdate) {
      ;(window as any).handleProjectUpdate(action, projectId)
    }
  }

  if (!mounted) return null

  // Mientras el UserProvider carga la sesión inicial.
  // El UserProvider tiene un safety timeout de 10s, así que este spinner
  // NUNCA puede quedarse indefinidamente.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  // No hay usuario y ya terminó de cargar → el useEffect de arriba lo manda a /login.
  // Mientras redirect, mostrar algo mínimo para no pintar UI huérfana.
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  // Usuario inactivo → el useEffect de arriba lo manda a /pending.
  if (user.is_active === false) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar onSignOut={handleSignOut} onProjectUpdate={handleProjectUpdate} />
        <main className="flex-1 p-2 flex justify-center items-start overflow-auto">
          <div className="w-full border border-border shadow-sm dark:shadow:sm rounded-xl h-full px-4 py-4 bg-white dark:bg-[#0A0A0A]">
            <SidebarTrigger />
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
