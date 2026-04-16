"use client"
import { useEffect, useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useUser } from "@/components/user-provider"
import { useRouter, usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, signOut } = useUser()
  const router = useRouter()
  const pathname = usePathname()
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

  // Admin route guard: only role === 'admin' can access /dashboard/admin/*
  useEffect(() => {
    if (!mounted || !user) return
    if (pathname?.startsWith("/dashboard/admin") && user.role !== "admin") {
      router.replace("/dashboard")
    }
  }, [mounted, user, pathname, router])

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
