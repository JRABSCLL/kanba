"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/components/user-provider"
import { Clock, ShieldAlert, LogOut } from "lucide-react"

export default function PendingPage() {
  const { user, signOut, loading } = useUser()
  const router = useRouter()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // If approved (or still loading) bounce them back to the dashboard
  useEffect(() => {
    if (!mounted) return
    if (!loading && user?.status === "approved") {
      router.replace("/dashboard")
    }
    // If no user at all, back to login
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [mounted, user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isRejected = user?.status === "rejected"

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              width={140}
              height={48}
              alt="OrganizAPP by SAIA LABS"
            />
          </div>
          <div className="flex justify-center mb-3">
            {isRejected ? (
              <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-7 w-7 text-destructive" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-7 w-7 text-primary" />
              </div>
            )}
          </div>
          <CardTitle className="text-xl">
            {isRejected ? "Acceso denegado" : "Cuenta pendiente de aprobación"}
          </CardTitle>
          <CardDescription className="mt-2">
            {isRejected
              ? "Tu solicitud de acceso fue rechazada. Si consideras que es un error, contacta con el administrador."
              : "Gracias por registrarte. Un administrador revisará tu cuenta y te dará acceso pronto."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="text-muted-foreground text-xs mb-1">Cuenta</div>
            <div className="font-medium truncate">{user?.email}</div>
          </div>
          <Button variant="outline" className="w-full bg-transparent" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            OrganizAPP &mdash; Sistema de gestión de proyectos by SAIA LABS
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
