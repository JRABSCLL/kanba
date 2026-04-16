"use client"
import { useEffect, useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useUser } from "@/components/user-provider"
import { useRouter } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, signOut } = useUser()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Approval guard: send pending / rejected users to /pending
  useEffect(() => {
    if (!mounted || !user) return
    if (user.status && user.status !== "approved") {
      router.replace("/pending")
    }
  }, [mounted, user, router])

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Still loading the profile data - show spinner rather than flashing content
  if (user.status && user.status !== "approved") {
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
