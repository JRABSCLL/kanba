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
  is_active: boolean
  role: "member" | "admin"
  user_type: "internal" | "agency"
  agency_id: string | null
  created_at: string
}

interface Agency {
  id: string
  name: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [fetching, setFetching] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const isAdmin = user?.role === "admin" && user?.is_active === true

  const fetchData = useCallback(async () => {
    setFetching(true)
    const [profilesRes, agenciesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, is_active, role, user_type, agency_id, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("agencies")
        .select("id, name")
        .order("name", { ascending: true })
    ])

    if (profilesRes.error) {
      toast.error("No se pudieron cargar los usuarios")
    } else {
      setProfiles((profilesRes.data as AdminProfile[]) || [])
    }
    
    if (!agenciesRes.error) {
      setAgencies((agenciesRes.data as Agency[]) || [])
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
    fetchData()
  }, [loading, user, isAdmin, router, fetchData])

  const updateProfile = async (
    id: string,
    changes: Partial<Pick<AdminProfile, "is_active" | "role" | "user_type" | "agency_id">>,
    successMessage: string,
  ) => {
    setActing(id)
    const { error } = await supabase.from("profiles").update(changes).eq("id", id)

    if (error) {
      toast.error("No se pudo actualizar el usuario")
    } else {
      toast.success(successMessage)
      await fetchData()
    }
    setActing(null)
  }

  const activate = (p: AdminProfile) =>
    updateProfile(p.id, { is_active: true }, `${p.email} ha sido activado`)
  const deactivate = (p: AdminProfile) =>
    updateProfile(p.id, { is_active: false }, `${p.email} ha sido desactivado`)
  const promote = (p: AdminProfile) =>
    updateProfile(p.id, { role: "admin" }, `${p.email} ahora es admin`)
  const demote = (p: AdminProfile) =>
    updateProfile(p.id, { role: "member" }, `${p.email} ya no es admin`)
  const assignToAgency = (p: AdminProfile, agencyId: string | null) => {
    if (agencyId) {
      const agency = agencies.find(a => a.id === agencyId)
      updateProfile(p.id, { user_type: "agency", agency_id: agencyId }, `${p.email} asignado a ${agency?.name}`)
    } else {
      updateProfile(p.id, { user_type: "internal", agency_id: null }, `${p.email} es ahora usuario interno`)
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) return null

  const inactive = profiles.filter((p) => p.is_active === false)
  const active = profiles.filter((p) => p.is_active === true)
  const admins = profiles.filter((p) => p.role === "admin" && p.is_active === true)
  const agencyUsers = profiles.filter((p) => p.user_type === "agency" && p.is_active === true)
  const internalUsers = profiles.filter((p) => p.user_type === "internal" && p.is_active === true)

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de usuarios</h1>
        <p className="text-muted-foreground">
          Aprueba, rechaza o gestiona los usuarios de OrganizAPP.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="Activos" value={active.length} tone="ok" />
        <StatCard icon={<UserX className="w-4 h-4" />} label="Inactivos" value={inactive.length} tone="danger" />
        <StatCard icon={<Shield className="w-4 h-4" />} label="Admins" value={admins.length} tone="info" />
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="Internos" value={internalUsers.length} tone="ok" />
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="De Agencia" value={agencyUsers.length} tone="warn" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Filtra por estado y gestiona permisos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4 flex flex-wrap h-auto">
              <TabsTrigger value="active">Activos ({active.length})</TabsTrigger>
              <TabsTrigger value="inactive">Inactivos ({inactive.length})</TabsTrigger>
              <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
              <TabsTrigger value="agency">De Agencia ({agencyUsers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3">
              {active.length === 0 ? (
                <EmptyState message="No hay usuarios activos." />
              ) : (
                active.map((p) => (
                  <UserRow key={p.id} p={p} acting={acting === p.id} agencies={agencies} agencyName={agencies.find(a => a.id === p.agency_id)?.name}>
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
                        <select 
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={p.agency_id || ""}
                          onChange={(e) => assignToAgency(p, e.target.value || null)}
                          disabled={acting === p.id}
                        >
                          <option value="">Interno</option>
                          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <Button size="sm" variant="outline" onClick={() => deactivate(p)} disabled={acting === p.id}>
                          <UserX className="w-4 h-4 mr-1" />
                          Desactivar
                        </Button>
                      </>
                    )}
                  </UserRow>
                ))
              )}
            </TabsContent>

            <TabsContent value="inactive" className="space-y-3">
              {inactive.length === 0 ? (
                <EmptyState message="No hay usuarios inactivos." />
              ) : (
                inactive.map((p) => (
                  <UserRow key={p.id} p={p} acting={acting === p.id} agencies={agencies} agencyName={agencies.find(a => a.id === p.agency_id)?.name}>
                    <Button size="sm" onClick={() => activate(p)} disabled={acting === p.id}>
                      <Check className="w-4 h-4 mr-1" />
                      Activar
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
                  <UserRow key={p.id} p={p} acting={acting === p.id} agencies={agencies} agencyName={agencies.find(a => a.id === p.agency_id)?.name}>
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

            <TabsContent value="agency" className="space-y-3">
              {agencyUsers.length === 0 ? (
                <EmptyState message="No hay usuarios de agencia." />
              ) : (
                agencyUsers.map((p) => (
                  <UserRow key={p.id} p={p} acting={acting === p.id} agencies={agencies} agencyName={agencies.find(a => a.id === p.agency_id)?.name}>
                    <select 
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={p.agency_id || ""}
                      onChange={(e) => assignToAgency(p, e.target.value || null)}
                      disabled={acting === p.id}
                    >
                      <option value="">Interno</option>
                      {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => deactivate(p)} disabled={acting === p.id}>
                      <UserX className="w-4 h-4 mr-1" />
                      Desactivar
                    </Button>
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
  agencyName,
}: {
  p: AdminProfile
  acting: boolean
  children: React.ReactNode
  agencies: Agency[]
  agencyName?: string
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
            {p.user_type === "agency" && agencyName && (
              <Badge variant="secondary" className="text-xs">
                {agencyName}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
          <div className="text-xs text-muted-foreground">
            {p.user_type === "internal" ? "Interno" : "Agencia"} · Registrado el {new Date(p.created_at).toLocaleDateString("es-ES")}
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
