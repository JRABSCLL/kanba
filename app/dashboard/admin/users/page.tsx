"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/user-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Loader2, Check, X, Shield, ShieldOff, UserCheck, UserX, Clock } from "lucide-react"

interface AdminProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  status: "pending" | "approved" | "rejected"
  role: "member" | "admin"
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [fetching, setFetching] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const isAdmin = user?.role === "admin" && user?.status === "approved"

  const fetchProfiles = useCallback(async () => {
    setFetching(true)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, status, role, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("No se pudieron cargar los usuarios")
      console.log("[v0] Admin fetch error:", error.message)
    } else {
      setProfiles((data as AdminProfile[]) || [])
    }
    setFetching(false)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!isAdmin) {
      router.replace("/dashboard")
      return
    }
    fetchProfiles()
  }, [loading, user, isAdmin, router, fetchProfiles])

  const updateProfile = async (
    id: string,
    changes: Partial<Pick<AdminProfile, "status" | "role">>,
    successMessage: string,
  ) => {
    setActing(id)
    const { error } = await supabase.from("profiles").update(changes).eq("id", id)

    if (error) {
      toast.error("No se pudo actualizar el usuario")
      console.log("[v0] Admin update error:", error.message)
    } else {
      toast.success(successMessage)
      await fetchProfiles()
    }
    setActing(null)
  }

  const approve = (p: AdminProfile) =>
    updateProfile(p.id, { status: "approved" }, `${p.email} ha sido aprobado`)
  const reject = (p: AdminProfile) =>
    updateProfile(p.id, { status: "rejected" }, `${p.email} ha sido rechazado`)
  const reapprove = (p: AdminProfile) =>
    updateProfile(p.id, { status: "approved" }, `${p.email} ha sido reactivado`)
  const revoke = (p: AdminProfile) =>
    updateProfile(p.id, { status: "rejected" }, `Acceso revocado a ${p.email}`)
  const promote = (p: AdminProfile) =>
    updateProfile(p.id, { role: "admin" }, `${p.email} ahora es admin`)
  const demote = (p: AdminProfile) =>
    updateProfile(p.id, { role: "member" }, `${p.email} ya no es admin`)

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) return null

  const pending = profiles.filter((p) => p.status === "pending")
  const approved = profiles.filter((p) => p.status === "approved")
  const rejected = profiles.filter((p) => p.status === "rejected")
  const admins = profiles.filter((p) => p.role === "admin" && p.status === "approved")

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de usuarios</h1>
        <p className="text-muted-foreground">
          Aprueba, rechaza o gestiona los usuarios de OrganizAPP.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Clock className="w-4 h-4" />} label="Pendientes" value={pending.length} tone="warn" />
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="Aprobados" value={approved.length} tone="ok" />
        <StatCard icon={<UserX className="w-4 h-4" />} label="Rechazados" value={rejected.length} tone="danger" />
        <StatCard icon={<Shield className="w-4 h-4" />} label="Admins" value={admins.length} tone="info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Filtra por estado y gestiona permisos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4 flex flex-wrap h-auto">
              <TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger>
              <TabsTrigger value="approved">Aprobados ({approved.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rechazados ({rejected.length})</TabsTrigger>
              <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {pending.length === 0 ? (
                <EmptyState message="No hay usuarios pendientes de aprobación." />
              ) : (
                pending.map((p) => (
                  <UserRow key={p.id} p={p} acting={acting === p.id}>
                    <Button size="sm" onClick={() => approve(p)} disabled={acting === p.id}>
                      <Check className="w-4 h-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(p)} disabled={acting === p.id}>
                      <X className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </UserRow>
                ))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-3">
              {approved.length === 0 ? (
                <EmptyState message="No hay usuarios aprobados." />
              ) : (
                approved.map((p) => (
                  <UserRow key={p.id} p={p} acting={acting === p.id}>
                    {p.id === user?.id ? (
                      <Badge variant="secondary">Tú</Badge>
                    ) : (
                      <>
                        {p.role === "admin" ? (
                          <Button size="sm" variant="outline" onClick={() => demote(p)} disabled={acting === p.id}>
                            <ShieldOff className="w-4 h-4 mr-1" />
                            Quitar admin
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => promote(p)} disabled={acting === p.id}>
                            <Shield className="w-4 h-4 mr-1" />
                            Hacer admin
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => revoke(p)} disabled={acting === p.id}>
                          <UserX className="w-4 h-4 mr-1" />
                          Revocar
                        </Button>
                      </>
                    )}
                  </UserRow>
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-3">
              {rejected.length === 0 ? (
                <EmptyState message="No hay usuarios rechazados." />
              ) : (
                rejected.map((p) => (
                  <UserRow key={p.id} p={p} acting={acting === p.id}>
                    <Button size="sm" variant="outline" onClick={() => reapprove(p)} disabled={acting === p.id}>
                      <Check className="w-4 h-4 mr-1" />
                      Reactivar
                    </Button>
                  </UserRow>
                ))
              )}
            </TabsContent>

            <TabsContent value="admins" className="space-y-3">
              {admins.length === 0 ? (
                <EmptyState message="No hay admins." />
              ) : (
                admins.map((p) => (
                  <UserRow key={p.id} p={p} acting={acting === p.id}>
                    {p.id === user?.id ? (
                      <Badge variant="secondary">Tú</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => demote(p)} disabled={acting === p.id}>
                        <ShieldOff className="w-4 h-4 mr-1" />
                        Quitar admin
                      </Button>
                    )}
                  </UserRow>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: "ok" | "warn" | "danger" | "info"
}) {
  const toneClass = {
    ok: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
    warn: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
    danger: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
    info: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  }[tone]

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${toneClass}`}>{icon}</div>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function UserRow({
  p,
  acting,
  children,
}: {
  p: AdminProfile
  acting: boolean
  children: React.ReactNode
}) {
  const initials = (p.full_name || p.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("")

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10">
          {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.email} />}
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-2 truncate">
            {p.full_name || p.email.split("@")[0]}
            {p.role === "admin" && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
          <div className="text-xs text-muted-foreground">
            Registrado el {new Date(p.created_at).toLocaleDateString("es-ES")}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {acting ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : children}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{message}</div>
}
