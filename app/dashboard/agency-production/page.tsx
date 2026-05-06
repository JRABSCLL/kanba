"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Filter,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Target,
} from "lucide-react"

type Agency = {
  id: string
  name: string
  type: string | null
  status: "active" | "paused" | "archived" | string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  created_at: string
}

type Brand = {
  id: string
  name: string
  description: string | null
  status: "active" | "archived" | string
}

type ProductionPlan = {
  id: string
  agency_id: string
  brand_id: string | null
  name: string
  period_type: string
  period_start: string
  period_end: string
  status: string
  responsible_internal_id: string | null
  notes: string | null
  created_at: string
}

type PlanItem = {
  id: string
  plan_id: string
  deliverable_type: string
  target_quantity: number
  channel: string | null
  format: string | null
  notes: string | null
}

type Deliverable = {
  id: string
  plan_id: string
  plan_item_id: string | null
  agency_id: string
  brand_id: string | null
  title: string
  description: string | null
  deliverable_type: string
  channel: string | null
  format: string | null
  status: string
  priority: string
  due_date: string | null
  delivered_at: string | null
  approved_at: string | null
  published_at: string | null
  responsible_internal_id: string | null
  external_url: string | null
  notes: string | null
  position: number | null
  created_at: string
}

const FLOW_STATUSES = [
  { value: "pending", label: "Pendiente" },
  { value: "brief_sent", label: "Brief enviado" },
  { value: "in_production", label: "En producción" },
  { value: "delivered", label: "Entregado" },
  { value: "in_review", label: "En revisión" },
  { value: "changes_requested", label: "Cambios solicitados" },
  { value: "approved", label: "Aprobado" },
  { value: "published", label: "Publicado" },
  { value: "paused", label: "Pausado" },
  { value: "cancelled", label: "Cancelado" },
] as const

const DEFAULT_TYPES = ["Video", "Arte", "Copy", "Parrilla", "Story", "Reel", "Reporte", "Banner"]

const statusLabel = (status: string) => FLOW_STATUSES.find((item) => item.value === status)?.label || status

const statusTone = (status: string) => {
  switch (status) {
    case "approved":
    case "published":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
    case "changes_requested":
    case "in_review":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
    case "in_production":
    case "delivered":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const monthEndIso = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

function isOverdue(deliverable: Deliverable) {
  if (!deliverable.due_date) return false
  if (["approved", "published", "cancelled"].includes(deliverable.status)) return false
  return deliverable.due_date < todayIso()
}

export default function AgencyProductionPage() {
  const { user, loading: userLoading } = useUser()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"dashboard" | "kanban" | "table" | "setup">("dashboard")

  const [agencies, setAgencies] = useState<Agency[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])

  const [agencyFilter, setAgencyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [agencyForm, setAgencyForm] = useState({ name: "", type: "", contact_name: "", contact_email: "", notes: "" })
  const [brandForm, setBrandForm] = useState({ name: "", description: "" })
  const [planForm, setPlanForm] = useState({
    name: "",
    agency_id: "",
    brand_id: "",
    period_start: todayIso(),
    period_end: monthEndIso(),
    deliverable_type: "Video",
    target_quantity: "10",
    channel: "",
    format: "",
    notes: "",
  })
  const [creatingAgency, setCreatingAgency] = useState(false)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [updatingDeliverableId, setUpdatingDeliverableId] = useState<string | null>(null)

  const agencyById = useMemo(() => new Map(agencies.map((agency) => [agency.id, agency])), [agencies])
  const brandById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands])
  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans])

  const filteredDeliverables = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deliverables.filter((deliverable) => {
      if (agencyFilter !== "all" && deliverable.agency_id !== agencyFilter) return false
      if (statusFilter !== "all" && deliverable.status !== statusFilter) return false
      if (!q) return true
      const agencyName = agencyById.get(deliverable.agency_id)?.name || ""
      const planName = planById.get(deliverable.plan_id)?.name || ""
      return [deliverable.title, deliverable.description, deliverable.deliverable_type, agencyName, planName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [agencyFilter, statusFilter, search, deliverables, agencyById, planById])

  const stats = useMemo(() => {
    const total = deliverables.length
    const approved = deliverables.filter((item) => item.status === "approved" || item.status === "published").length
    const inReview = deliverables.filter((item) => item.status === "in_review" || item.status === "changes_requested").length
    const overdue = deliverables.filter(isOverdue).length
    const activePlans = plans.filter((plan) => plan.status === "active").length
    const completion = total ? Math.round((approved / total) * 100) : 0
    return { total, approved, inReview, overdue, activePlans, completion }
  }, [deliverables, plans])

  const agencySummaries = useMemo(() => {
    return agencies.map((agency) => {
      const items = deliverables.filter((deliverable) => deliverable.agency_id === agency.id)
      const approved = items.filter((item) => item.status === "approved" || item.status === "published").length
      const overdue = items.filter(isOverdue).length
      const completion = items.length ? Math.round((approved / items.length) * 100) : 0
      const state = overdue > 0 ? "En riesgo" : completion >= 70 ? "Va bien" : items.length ? "Atención" : "Sin producción"
      return { agency, total: items.length, approved, overdue, completion, state }
    })
  }, [agencies, deliverables])

  useEffect(() => {
    if (!userLoading && user) {
      loadModule()
    }
    if (!userLoading && !user) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, user?.id])

  async function loadModule() {
    setSchemaError(null)
    setLoading(true)
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    setRefreshing(true)
    try {
      const [agenciesRes, brandsRes, plansRes, planItemsRes, deliverablesRes] = await Promise.all([
        supabase.from("agencies").select("*").order("created_at", { ascending: false }),
        supabase.from("brands").select("*").order("name", { ascending: true }),
        supabase.from("production_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("production_plan_items").select("*").order("created_at", { ascending: true }),
        supabase.from("production_deliverables").select("*").order("created_at", { ascending: false }),
      ])

      const firstError = [agenciesRes.error, brandsRes.error, plansRes.error, planItemsRes.error, deliverablesRes.error].find(Boolean)
      if (firstError) throw firstError

      setAgencies((agenciesRes.data || []) as Agency[])
      setBrands((brandsRes.data || []) as Brand[])
      setPlans((plansRes.data || []) as ProductionPlan[])
      setPlanItems((planItemsRes.data || []) as PlanItem[])
      setDeliverables((deliverablesRes.data || []) as Deliverable[])
    } catch (error: any) {
      const message = error?.message || "No se pudo cargar el módulo de agencias"
      setSchemaError(message)
      console.log("[agency-production] load error:", error)
    } finally {
      setRefreshing(false)
    }
  }

  async function createAgency(event: React.FormEvent) {
    event.preventDefault()
    if (!agencyForm.name.trim()) return
    setCreatingAgency(true)
    try {
      const { error } = await supabase.from("agencies").insert({
        name: agencyForm.name.trim(),
        type: agencyForm.type.trim() || null,
        contact_name: agencyForm.contact_name.trim() || null,
        contact_email: agencyForm.contact_email.trim() || null,
        notes: agencyForm.notes.trim() || null,
        created_by: user?.id || null,
      })
      if (error) throw error
      toast.success("Agencia creada")
      setAgencyForm({ name: "", type: "", contact_name: "", contact_email: "", notes: "" })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear la agencia")
    } finally {
      setCreatingAgency(false)
    }
  }

  async function createBrand(event: React.FormEvent) {
    event.preventDefault()
    if (!brandForm.name.trim()) return
    setCreatingBrand(true)
    try {
      const { error } = await supabase.from("brands").insert({
        name: brandForm.name.trim(),
        description: brandForm.description.trim() || null,
        created_by: user?.id || null,
      })
      if (error) throw error
      toast.success("Marca creada")
      setBrandForm({ name: "", description: "" })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear la marca")
    } finally {
      setCreatingBrand(false)
    }
  }

  async function createPlan(event: React.FormEvent) {
    event.preventDefault()
    if (!planForm.name.trim() || !planForm.agency_id) {
      toast.error("El plan necesita nombre y agencia")
      return
    }

    const quantity = Number.parseInt(planForm.target_quantity, 10)
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 250) {
      toast.error("La cantidad debe estar entre 1 y 250")
      return
    }

    setCreatingPlan(true)
    try {
      const { data: plan, error: planError } = await supabase
        .from("production_plans")
        .insert({
          agency_id: planForm.agency_id,
          brand_id: planForm.brand_id || null,
          name: planForm.name.trim(),
          period_type: "monthly",
          period_start: planForm.period_start,
          period_end: planForm.period_end,
          status: "active",
          responsible_internal_id: user?.id || null,
          notes: planForm.notes.trim() || null,
          created_by: user?.id || null,
        })
        .select()
        .single()

      if (planError) throw planError

      const { data: item, error: itemError } = await supabase
        .from("production_plan_items")
        .insert({
          plan_id: plan.id,
          deliverable_type: planForm.deliverable_type.trim(),
          target_quantity: quantity,
          channel: planForm.channel.trim() || null,
          format: planForm.format.trim() || null,
          notes: planForm.notes.trim() || null,
        })
        .select()
        .single()

      if (itemError) throw itemError

      const deliverableRows = Array.from({ length: quantity }, (_, index) => ({
        plan_id: plan.id,
        plan_item_id: item.id,
        agency_id: planForm.agency_id,
        brand_id: planForm.brand_id || null,
        title: `${planForm.deliverable_type.trim()} ${String(index + 1).padStart(2, "0")}`,
        description: null,
        deliverable_type: planForm.deliverable_type.trim(),
        channel: planForm.channel.trim() || null,
        format: planForm.format.trim() || null,
        status: "pending",
        priority: "medium",
        due_date: null,
        responsible_internal_id: user?.id || null,
        position: index,
        created_by: user?.id || null,
      }))

      const { error: deliverablesError } = await supabase.from("production_deliverables").insert(deliverableRows)
      if (deliverablesError) throw deliverablesError

      toast.success(`Plan creado con ${quantity} entregables`)
      setPlanForm({
        name: "",
        agency_id: "",
        brand_id: "",
        period_start: todayIso(),
        period_end: monthEndIso(),
        deliverable_type: "Video",
        target_quantity: "10",
        channel: "",
        format: "",
        notes: "",
      })
      setActiveView("dashboard")
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el plan")
    } finally {
      setCreatingPlan(false)
    }
  }

  async function updateDeliverableStatus(deliverable: Deliverable, nextStatus: string) {
    setUpdatingDeliverableId(deliverable.id)
    const timestampFields: Record<string, string | null> = {}
    const now = new Date().toISOString()
    if (nextStatus === "delivered" && !deliverable.delivered_at) timestampFields.delivered_at = now
    if (nextStatus === "approved" && !deliverable.approved_at) timestampFields.approved_at = now
    if (nextStatus === "published" && !deliverable.published_at) timestampFields.published_at = now

    try {
      const { error } = await supabase
        .from("production_deliverables")
        .update({ status: nextStatus, updated_at: now, ...timestampFields })
        .eq("id", deliverable.id)

      if (error) throw error
      setDeliverables((prev) =>
        prev.map((item) => (item.id === deliverable.id ? { ...item, status: nextStatus, ...timestampFields } : item)),
      )
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar el entregable")
    } finally {
      setUpdatingDeliverableId(null)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando producción de agencias...</p>
        </div>
      </div>
    )
  }

  if (schemaError) {
    return <SchemaMissing message={schemaError} onRetry={loadModule} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Creative Ops / Agency Operations
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Producción de Agencias</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Controla lo que cada agencia está haciendo, sus planes por periodo, entregables, atrasos y cumplimiento sin subir archivos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setActiveView("setup")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Planes activos" value={stats.activePlans} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Entregables" value={stats.total} icon={<ClipboardList className="h-4 w-4" />} />
        <MetricCard label="Aprobados" value={stats.approved} icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard label="En revisión" value={stats.inReview} icon={<LayoutGrid className="h-4 w-4" />} />
        <MetricCard label="Atrasados" value={stats.overdue} icon={<AlertCircle className="h-4 w-4" />} danger={stats.overdue > 0} />
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        <ViewButton active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} label="Dashboard" />
        <ViewButton active={activeView === "kanban"} onClick={() => setActiveView("kanban")} label="Kanban" />
        <ViewButton active={activeView === "table"} onClick={() => setActiveView("table")} label="Tabla" />
        <ViewButton active={activeView === "setup"} onClick={() => setActiveView("setup")} label="Configuración" />
      </div>

      {activeView !== "setup" && (
        <Filters
          agencies={agencies}
          agencyFilter={agencyFilter}
          setAgencyFilter={setAgencyFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          search={search}
          setSearch={setSearch}
        />
      )}

      {activeView === "dashboard" && (
        <DashboardView summaries={agencySummaries} plans={plans} planItems={planItems} deliverables={deliverables} agencyById={agencyById} />
      )}

      {activeView === "kanban" && (
        <KanbanView deliverables={filteredDeliverables} agencyById={agencyById} planById={planById} onStatusChange={updateDeliverableStatus} updatingId={updatingDeliverableId} />
      )}

      {activeView === "table" && (
        <TableView deliverables={filteredDeliverables} agencyById={agencyById} brandById={brandById} planById={planById} onStatusChange={updateDeliverableStatus} updatingId={updatingDeliverableId} />
      )}

      {activeView === "setup" && (
        <SetupView
          agencies={agencies}
          brands={brands}
          agencyForm={agencyForm}
          setAgencyForm={setAgencyForm}
          brandForm={brandForm}
          setBrandForm={setBrandForm}
          planForm={planForm}
          setPlanForm={setPlanForm}
          createAgency={createAgency}
          createBrand={createBrand}
          createPlan={createPlan}
          creatingAgency={creatingAgency}
          creatingBrand={creatingBrand}
          creatingPlan={creatingPlan}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, icon, danger = false }: { label: string; value: number; icon: React.ReactNode; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${danger ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div>
          <div className="text-xl font-semibold leading-none">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ViewButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick}>
      {label}
    </Button>
  )
}

function Filters({ agencies, agencyFilter, setAgencyFilter, statusFilter, setStatusFilter, search, setSearch }: any) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-3 w-3" /> Buscar</Label>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar entregable, plan o agencia..." />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Agencia</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={agencyFilter} onChange={(event) => setAgencyFilter(event.target.value)}>
            <option value="all">Todas</option>
            {agencies.map((agency: Agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todos</option>
            {FLOW_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardView({ summaries, plans, planItems, deliverables, agencyById }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Agencias activas</CardTitle>
          <CardDescription>Cumplimiento y riesgo por agencia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {summaries.length === 0 ? <Empty message="Crea una agencia para empezar." /> : summaries.map((summary: any) => (
            <div key={summary.agency.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{summary.agency.name}</div>
                  <div className="text-xs text-muted-foreground">{summary.agency.type || "Agencia / proveedor"}</div>
                </div>
                <Badge className={summary.overdue > 0 ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "bg-muted text-muted-foreground"}>{summary.state}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                <MiniStat label="Total" value={summary.total} />
                <MiniStat label="Aprobados" value={summary.approved} />
                <MiniStat label="Atrasados" value={summary.overdue} />
                <MiniStat label="Cumpl." value={`${summary.completion}%`} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planes recientes</CardTitle>
          <CardDescription>Compromisos de producción por periodo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.length === 0 ? <Empty message="Aún no hay planes de producción." /> : plans.slice(0, 8).map((plan: ProductionPlan) => {
            const items = planItems.filter((item: PlanItem) => item.plan_id === plan.id)
            const planDeliverables = deliverables.filter((deliverable: Deliverable) => deliverable.plan_id === plan.id)
            const approved = planDeliverables.filter((item: Deliverable) => item.status === "approved" || item.status === "published").length
            const total = planDeliverables.length
            return (
              <div key={plan.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium leading-tight">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">{agencyById.get(plan.agency_id)?.name || "Agencia"}</div>
                  </div>
                  <Badge variant="outline">{approved}/{total}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {items.map((item: PlanItem) => <Badge key={item.id} variant="secondary" className="text-xs">{item.deliverable_type}: {item.target_quantity}</Badge>)}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function KanbanView({ deliverables, agencyById, planById, onStatusChange, updatingId }: any) {
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {FLOW_STATUSES.filter((status) => !["paused", "cancelled"].includes(status.value)).map((status) => {
        const items = deliverables.filter((deliverable: Deliverable) => deliverable.status === status.value)
        return (
          <Card key={status.value} className="min-h-[280px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                {status.label}
                <Badge variant="outline">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((deliverable: Deliverable) => (
                <DeliverableCard key={deliverable.id} deliverable={deliverable} agencyName={agencyById.get(deliverable.agency_id)?.name} planName={planById.get(deliverable.plan_id)?.name} onStatusChange={onStatusChange} updating={updatingId === deliverable.id} />
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function DeliverableCard({ deliverable, agencyName, planName, onStatusChange, updating }: any) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium leading-tight">{deliverable.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{agencyName || "Agencia"} · {planName || "Plan"}</div>
        </div>
        {isOverdue(deliverable) && <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">Atrasado</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-xs">{deliverable.deliverable_type}</Badge>
        {deliverable.channel && <Badge variant="outline" className="text-xs">{deliverable.channel}</Badge>}
      </div>
      {deliverable.due_date && <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" /> Vence {deliverable.due_date}</div>}
      {deliverable.external_url && (
        <a href={deliverable.external_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Ver link externo <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <select className="mt-3 h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={deliverable.status} disabled={updating} onChange={(event) => onStatusChange(deliverable, event.target.value)}>
        {FLOW_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
    </div>
  )
}

function TableView({ deliverables, agencyById, brandById, planById, onStatusChange, updatingId }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabla de entregables</CardTitle>
        <CardDescription>Control operativo por agencia, plan, fecha y estado.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Entregable</th>
                <th className="py-3 pr-4">Agencia</th>
                <th className="py-3 pr-4">Marca</th>
                <th className="py-3 pr-4">Plan</th>
                <th className="py-3 pr-4">Tipo</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4">Vence</th>
                <th className="py-3 pr-4">Link</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((deliverable: Deliverable) => (
                <tr key={deliverable.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{deliverable.title}</td>
                  <td className="py-3 pr-4">{agencyById.get(deliverable.agency_id)?.name || "—"}</td>
                  <td className="py-3 pr-4">{deliverable.brand_id ? brandById.get(deliverable.brand_id)?.name || "—" : "—"}</td>
                  <td className="py-3 pr-4">{planById.get(deliverable.plan_id)?.name || "—"}</td>
                  <td className="py-3 pr-4">{deliverable.deliverable_type}</td>
                  <td className="py-3 pr-4">
                    <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={deliverable.status} disabled={updatingId === deliverable.id} onChange={(event) => onStatusChange(deliverable, event.target.value)}>
                      {FLOW_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={isOverdue(deliverable) ? "font-medium text-red-600" : ""}>{deliverable.due_date || "—"}</span>
                  </td>
                  <td className="py-3 pr-4">
                    {deliverable.external_url ? <a href={deliverable.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Abrir <ExternalLink className="h-3 w-3" /></a> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {deliverables.length === 0 && <Empty message="No hay entregables con los filtros actuales." />}
      </CardContent>
    </Card>
  )
}

function SetupView(props: any) {
  const { agencies, brands, agencyForm, setAgencyForm, brandForm, setBrandForm, planForm, setPlanForm, createAgency, createBrand, createPlan, creatingAgency, creatingBrand, creatingPlan } = props
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nueva agencia</CardTitle>
          <CardDescription>Agrega proveedores o agencias externas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createAgency} className="space-y-3">
            <Field label="Nombre"><Input value={agencyForm.name} onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })} placeholder="Agencia / proveedor" required /></Field>
            <Field label="Tipo"><Input value={agencyForm.type} onChange={(e) => setAgencyForm({ ...agencyForm, type: e.target.value })} placeholder="Video, diseño, social media..." /></Field>
            <Field label="Contacto"><Input value={agencyForm.contact_name} onChange={(e) => setAgencyForm({ ...agencyForm, contact_name: e.target.value })} placeholder="Nombre de contacto" /></Field>
            <Field label="Email"><Input type="email" value={agencyForm.contact_email} onChange={(e) => setAgencyForm({ ...agencyForm, contact_email: e.target.value })} placeholder="contacto@agencia.com" /></Field>
            <Field label="Notas"><Textarea value={agencyForm.notes} onChange={(e) => setAgencyForm({ ...agencyForm, notes: e.target.value })} placeholder="Notas internas" /></Field>
            <Button type="submit" className="w-full" disabled={creatingAgency}>{creatingAgency && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear agencia</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nueva marca</CardTitle>
          <CardDescription>Opcional, para organizar producción por cliente o marca.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createBrand} className="space-y-3">
            <Field label="Nombre"><Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="SAIA LABS / Cliente" required /></Field>
            <Field label="Descripción"><Textarea value={brandForm.description} onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })} placeholder="Notas de la marca" /></Field>
            <Button type="submit" className="w-full" disabled={creatingBrand}>{creatingBrand && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear marca</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crear plan de producción</CardTitle>
          <CardDescription>Define una meta configurable y genera entregables automáticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createPlan} className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre del plan" className="md:col-span-2"><Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="34 videos mensuales - Mayo" required /></Field>
            <Field label="Agencia"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.agency_id} onChange={(e) => setPlanForm({ ...planForm, agency_id: e.target.value })} required><option value="">Seleccionar</option>{agencies.map((agency: Agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></Field>
            <Field label="Marca"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.brand_id} onChange={(e) => setPlanForm({ ...planForm, brand_id: e.target.value })}><option value="">Sin marca</option>{brands.map((brand: Brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field>
            <Field label="Inicio"><Input type="date" value={planForm.period_start} onChange={(e) => setPlanForm({ ...planForm, period_start: e.target.value })} required /></Field>
            <Field label="Fin"><Input type="date" value={planForm.period_end} onChange={(e) => setPlanForm({ ...planForm, period_end: e.target.value })} required /></Field>
            <Field label="Tipo de entregable"><Input list="deliverable-types" value={planForm.deliverable_type} onChange={(e) => setPlanForm({ ...planForm, deliverable_type: e.target.value })} required /><datalist id="deliverable-types">{DEFAULT_TYPES.map((type) => <option key={type} value={type} />)}</datalist></Field>
            <Field label="Cantidad"><Input type="number" min="1" max="250" value={planForm.target_quantity} onChange={(e) => setPlanForm({ ...planForm, target_quantity: e.target.value })} required /></Field>
            <Field label="Canal"><Input value={planForm.channel} onChange={(e) => setPlanForm({ ...planForm, channel: e.target.value })} placeholder="Instagram, TikTok..." /></Field>
            <Field label="Formato"><Input value={planForm.format} onChange={(e) => setPlanForm({ ...planForm, format: e.target.value })} placeholder="1080x1920, copy, etc." /></Field>
            <Field label="Notas" className="md:col-span-2"><Textarea value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Brief o notas internas del plan" /></Field>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full" disabled={creatingPlan || agencies.length === 0}>{creatingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear plan y generar entregables</Button>
              {agencies.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Primero crea al menos una agencia.</p>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-muted/40 p-2"><div className="font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{message}</div>
}

function SchemaMissing({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-5 w-5" />
            El módulo está listo, pero falta preparar Supabase
          </CardTitle>
          <CardDescription className="text-amber-800/80 dark:text-amber-200/80">
            La UI ya está creada. Para usarla, v0 debe crear o adaptar las tablas de producción en Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-md bg-background/70 p-3 text-muted-foreground">
            Error actual: {message}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onRetry} variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button>
            <Button asChild><Link href="/dashboard">Volver al dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tablas esperadas</CardTitle>
          <CardDescription>La guía completa está en `docs/agency-production-module.md` y el SQL sugerido en `docs/supabase-agency-production-schema.sql`.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">{`agencies
brands
production_plans
production_plan_items
production_deliverables`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
