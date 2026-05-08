"use client"

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
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
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  ExternalLink,
  Filter,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Target,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"

type Agency = {
  id: string
  name: string
  type: string | null
  status: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  created_at: string
}

type AgencyMember = {
  id: string
  agency_id: string
  name: string
  email: string
  phone: string | null
  role: string | null
  position: string | null
  is_active: boolean
  created_at: string
}

type Brand = {
  id: string
  name: string
  description: string | null
  status: string
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

type PlanItemDraft = {
  local_id: string
  deliverable_type: string
  target_quantity: string
  title_base: string
  naming_mode: "numbered" | "same"
  channel: string
  format: string
  notes: string
}

type DeliverableForm = {
  title: string
  description: string
  deliverable_type: string
  channel: string
  format: string
  status: string
  priority: string
  due_date: string
  external_url: string
  notes: string
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

const DEFAULT_TYPES = ["Video", "Arte", "Copy", "Parrilla", "Story", "Reel", "Reporte", "Banner", "Guion", "Idea"]

const todayIso = () => new Date().toISOString().slice(0, 10)
const monthEndIso = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

const newPlanItemDraft = (): PlanItemDraft => ({
  local_id: crypto.randomUUID(),
  deliverable_type: "Video",
  target_quantity: "1",
  title_base: "",
  naming_mode: "numbered",
  channel: "",
  format: "",
  notes: "",
})

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

function isOverdue(deliverable: Deliverable) {
  if (!deliverable.due_date) return false
  if (["approved", "published", "cancelled"].includes(deliverable.status)) return false
  return deliverable.due_date < todayIso()
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function distributedDueDate(index: number, total: number, start: string, end: string, strategy: string) {
  if (strategy === "none") return null
  if (strategy === "same_end") return end || null
  if (!start || !end) return null

  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const diffDays = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000))
  if (total <= 1 || diffDays === 0) return toIsoDate(endDate)

  const offset = Math.round((index / Math.max(1, total - 1)) * diffDays)
  return toIsoDate(addDays(startDate, offset))
}

function buildTitle(item: PlanItemDraft, index: number) {
  const base = item.title_base.trim() || item.deliverable_type.trim() || "Entregable"
  if (item.naming_mode === "same") return base
  return `${base} ${String(index + 1).padStart(2, "0")}`
}

export function AgencyProductionModule() {
  const { user, loading: userLoading } = useUser()
  const canManageProduction = user?.role === "admin" && user?.is_active === true

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"dashboard" | "kanban" | "table" | "setup">("dashboard")

  const [agencies, setAgencies] = useState<Agency[]>([])
  const [agencyMembers, setAgencyMembers] = useState<AgencyMember[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])

  const [agencyFilter, setAgencyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [overdueFilter, setOverdueFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [agencyForm, setAgencyForm] = useState({ name: "", type: "", contact_name: "", contact_email: "", notes: "" })
  const [agencyMemberForm, setAgencyMemberForm] = useState({ agency_id: "", name: "", email: "", phone: "", role: "", position: "" })
  const [editingAgencyMember, setEditingAgencyMember] = useState<AgencyMember | null>(null)
  const [creatingAgencyMember, setCreatingAgencyMember] = useState(false)
  const [selectedAgencyForMembers, setSelectedAgencyForMembers] = useState<string | null>(null)
  const [brandForm, setBrandForm] = useState({ name: "", description: "" })
  const [planForm, setPlanForm] = useState({
    name: "",
    agency_id: "",
    brand_id: "",
    period_type: "monthly",
    period_start: todayIso(),
    period_end: monthEndIso(),
    date_strategy: "distributed",
    notes: "",
  })
  const [draftItems, setDraftItems] = useState<PlanItemDraft[]>([newPlanItemDraft()])
  const [creatingAgency, setCreatingAgency] = useState(false)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [updatingDeliverableId, setUpdatingDeliverableId] = useState<string | null>(null)
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null)
  const [deliverableForm, setDeliverableForm] = useState<DeliverableForm | null>(null)

  // User search state for assigning responsibles
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; email: string; full_name: string | null }[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedResponsible, setSelectedResponsible] = useState<{ id: string; email: string; full_name: string | null } | null>(null)
  const [usersCache, setUsersCache] = useState<Map<string, { id: string; email: string; full_name: string | null }>>(new Map())

  const agencyById = useMemo(() => new Map(agencies.map((agency) => [agency.id, agency])), [agencies])
  const brandById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands])
  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans])
  const availableTypes = useMemo(() => Array.from(new Set([...DEFAULT_TYPES, ...deliverables.map((item) => item.deliverable_type)].filter(Boolean))), [deliverables])

  const filteredDeliverables = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deliverables.filter((deliverable) => {
      if (agencyFilter !== "all" && deliverable.agency_id !== agencyFilter) return false
      if (statusFilter !== "all" && deliverable.status !== statusFilter) return false
      if (typeFilter !== "all" && deliverable.deliverable_type !== typeFilter) return false
      if (overdueFilter === "overdue" && !isOverdue(deliverable)) return false
      if (overdueFilter === "not_overdue" && isOverdue(deliverable)) return false
      if (!q) return true
      const agencyName = agencyById.get(deliverable.agency_id)?.name || ""
      const planName = planById.get(deliverable.plan_id)?.name || ""
      return [deliverable.title, deliverable.description, deliverable.deliverable_type, agencyName, planName, deliverable.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [agencyFilter, statusFilter, typeFilter, overdueFilter, search, deliverables, agencyById, planById])

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
      const inReview = items.filter((item) => item.status === "in_review" || item.status === "changes_requested").length
      const overdue = items.filter(isOverdue).length
      const completion = items.length ? Math.round((approved / items.length) * 100) : 0
      const state = overdue > 0 ? "En riesgo" : completion >= 70 ? "Va bien" : items.length ? "Atención" : "Sin producción"
      return { agency, total: items.length, approved, inReview, overdue, completion, state }
    })
  }, [agencies, deliverables])

  useEffect(() => {
    if (!userLoading && user) loadModule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, user?.id])

  // Search users for assigning responsibles - uses existing RPC function
  async function searchUsers(term: string) {
    if (!term.trim() || term.length < 2) {
      setUserSearchResults([])
      return
    }
    setSearchingUsers(true)
    try {
      const { data: users, error } = await supabase.rpc("search_users_for_collaboration", { search_term: term.trim() })
      if (error) throw error
      setUserSearchResults(users || [])
      // Cache users for display
      const newCache = new Map(usersCache)
      ;(users || []).forEach((u: { id: string; email: string; full_name: string | null }) => newCache.set(u.id, u))
      setUsersCache(newCache)
    } catch (error: any) {
      console.error("Error searching users:", error)
      setUserSearchResults([])
    } finally {
      setSearchingUsers(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchTerm.length >= 2) searchUsers(userSearchTerm)
      else setUserSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearchTerm])

  async function loadModule() {
    setSchemaError(null)
    setLoading(true)
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    setRefreshing(true)
    try {
      const [agenciesRes, agencyMembersRes, brandsRes, plansRes, planItemsRes, deliverablesRes] = await Promise.all([
        supabase.from("agencies").select("*").order("created_at", { ascending: false }),
        supabase.from("agency_members").select("*").order("name", { ascending: true }),
        supabase.from("brands").select("*").order("name", { ascending: true }),
        supabase.from("production_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("production_plan_items").select("*").order("created_at", { ascending: true }),
        supabase.from("production_deliverables").select("*").order("created_at", { ascending: false }),
      ])

      const firstError = [agenciesRes.error, agencyMembersRes.error, brandsRes.error, plansRes.error, planItemsRes.error, deliverablesRes.error].find(Boolean)
      if (firstError) throw firstError

      setAgencies((agenciesRes.data || []) as Agency[])
      setAgencyMembers((agencyMembersRes.data || []) as AgencyMember[])
      setBrands((brandsRes.data || []) as Brand[])
      setPlans((plansRes.data || []) as ProductionPlan[])
      setPlanItems((planItemsRes.data || []) as PlanItem[])
      setDeliverables((deliverablesRes.data || []) as Deliverable[])
    } catch (error: any) {
      setSchemaError(error?.message || "No se pudo cargar el módulo de agencias")
    } finally {
      setRefreshing(false)
    }
  }

  async function createAgency(event: FormEvent) {
    event.preventDefault()
    if (!canManageProduction) return toast.error("Solo admins pueden crear agencias")
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

  // Agency Members CRUD
  async function createAgencyMember(event: FormEvent) {
    event.preventDefault()
    if (!canManageProduction) return toast.error("Solo admins pueden agregar miembros")
    if (!agencyMemberForm.agency_id || !agencyMemberForm.name.trim() || !agencyMemberForm.email.trim()) {
      return toast.error("Nombre y email son requeridos")
    }
    setCreatingAgencyMember(true)
    try {
      const { error } = await supabase.from("agency_members").insert({
        agency_id: agencyMemberForm.agency_id,
        name: agencyMemberForm.name.trim(),
        email: agencyMemberForm.email.trim().toLowerCase(),
        phone: agencyMemberForm.phone.trim() || null,
        role: agencyMemberForm.role.trim() || null,
        position: agencyMemberForm.position.trim() || null,
      })
      if (error) throw error
      toast.success("Miembro agregado")
      setAgencyMemberForm({ agency_id: agencyMemberForm.agency_id, name: "", email: "", phone: "", role: "", position: "" })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "No se pudo agregar el miembro")
    } finally {
      setCreatingAgencyMember(false)
    }
  }

  async function updateAgencyMember(member: AgencyMember) {
    if (!canManageProduction) return toast.error("Solo admins pueden editar miembros")
    try {
      const { error } = await supabase.from("agency_members").update({
        name: member.name,
        email: member.email.toLowerCase(),
        phone: member.phone,
        role: member.role,
        position: member.position,
        is_active: member.is_active,
      }).eq("id", member.id)
      if (error) throw error
      toast.success("Miembro actualizado")
      setEditingAgencyMember(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar el miembro")
    }
  }

  async function deleteAgencyMember(memberId: string) {
    if (!canManageProduction) return toast.error("Solo admins pueden eliminar miembros")
    if (!confirm("Eliminar este miembro de la agencia?")) return
    try {
      const { error } = await supabase.from("agency_members").delete().eq("id", memberId)
      if (error) throw error
      toast.success("Miembro eliminado")
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "No se pudo eliminar el miembro")
    }
  }

  // Get members for a specific agency
  const getMembersForAgency = (agencyId: string) => agencyMembers.filter(m => m.agency_id === agencyId && m.is_active)

  async function createBrand(event: FormEvent) {
    event.preventDefault()
    if (!canManageProduction) return toast.error("Solo admins pueden crear marcas")
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

  async function createPlan(event: FormEvent) {
    event.preventDefault()
    if (!canManageProduction) return toast.error("Solo admins pueden crear planes")
    if (!planForm.name.trim() || !planForm.agency_id) return toast.error("El plan necesita nombre y agencia")

    const normalizedItems = draftItems.map((item) => ({ ...item, quantity: Number.parseInt(item.target_quantity, 10) }))
    if (normalizedItems.length === 0 || normalizedItems.some((item) => !item.deliverable_type.trim() || !Number.isFinite(item.quantity) || item.quantity < 1 || item.quantity > 250)) {
      return toast.error("Cada ítem necesita tipo y cantidad entre 1 y 250")
    }

    const totalDeliverables = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)
    if (totalDeliverables > 500) return toast.error("Máximo 500 entregables por plan")

    setCreatingPlan(true)
    try {
      const { data: plan, error: planError } = await supabase
        .from("production_plans")
        .insert({
          agency_id: planForm.agency_id,
          brand_id: planForm.brand_id || null,
          name: planForm.name.trim(),
          period_type: planForm.period_type,
          period_start: planForm.period_start,
          period_end: planForm.period_end,
          status: "active",
          responsible_internal_id: selectedResponsible?.id || user?.id || null,
          notes: planForm.notes.trim() || null,
          created_by: user?.id || null,
        })
        .select()
        .single()
      if (planError) throw planError

      const rows: any[] = []
      let globalIndex = 0

      for (const draft of normalizedItems) {
        const { data: item, error: itemError } = await supabase
          .from("production_plan_items")
          .insert({
            plan_id: plan.id,
            deliverable_type: draft.deliverable_type.trim(),
            target_quantity: draft.quantity,
            channel: draft.channel.trim() || null,
            format: draft.format.trim() || null,
            notes: draft.notes.trim() || null,
          })
          .select()
          .single()
        if (itemError) throw itemError

        for (let i = 0; i < draft.quantity; i += 1) {
          rows.push({
            plan_id: plan.id,
            plan_item_id: item.id,
            agency_id: planForm.agency_id,
            brand_id: planForm.brand_id || null,
            title: buildTitle(draft, i),
            description: null,
            deliverable_type: draft.deliverable_type.trim(),
            channel: draft.channel.trim() || null,
            format: draft.format.trim() || null,
            status: "pending",
            priority: "medium",
            due_date: distributedDueDate(globalIndex, totalDeliverables, planForm.period_start, planForm.period_end, planForm.date_strategy),
            responsible_internal_id: selectedResponsible?.id || user?.id || null,
            position: globalIndex,
            notes: draft.notes.trim() || null,
            created_by: user?.id || null,
          })
          globalIndex += 1
        }
      }

      const { error: deliverablesError } = await supabase.from("production_deliverables").insert(rows)
      if (deliverablesError) throw deliverablesError

      toast.success(`Plan creado con ${rows.length} entregables`)
      resetPlanForm()
      setActiveView("dashboard")
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el plan")
    } finally {
      setCreatingPlan(false)
    }
  }

  function resetPlanForm() {
    setPlanForm({
      name: "",
      agency_id: "",
      brand_id: "",
      period_type: "monthly",
      period_start: todayIso(),
      period_end: monthEndIso(),
      date_strategy: "distributed",
      notes: "",
    })
    setDraftItems([newPlanItemDraft()])
    setSelectedResponsible(null)
    setUserSearchTerm("")
    setUserSearchResults([])
  }

  function startEditDeliverable(deliverable: Deliverable) {
    if (!canManageProduction) return toast.error("Solo admins pueden editar entregables")
    setEditingDeliverable(deliverable)
    setDeliverableForm({
      title: deliverable.title || "",
      description: deliverable.description || "",
      deliverable_type: deliverable.deliverable_type || "",
      channel: deliverable.channel || "",
      format: deliverable.format || "",
      status: deliverable.status || "pending",
      priority: deliverable.priority || "medium",
      due_date: deliverable.due_date || "",
      external_url: deliverable.external_url || "",
      notes: deliverable.notes || "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function saveDeliverableEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingDeliverable || !deliverableForm) return
    setUpdatingDeliverableId(editingDeliverable.id)
    const now = new Date().toISOString()
    const timestampFields: Record<string, string | null> = {}
    if (deliverableForm.status === "delivered" && !editingDeliverable.delivered_at) timestampFields.delivered_at = now
    if (deliverableForm.status === "approved" && !editingDeliverable.approved_at) timestampFields.approved_at = now
    if (deliverableForm.status === "published" && !editingDeliverable.published_at) timestampFields.published_at = now

    try {
      const payload = {
        title: deliverableForm.title.trim(),
        description: deliverableForm.description.trim() || null,
        deliverable_type: deliverableForm.deliverable_type.trim(),
        channel: deliverableForm.channel.trim() || null,
        format: deliverableForm.format.trim() || null,
        status: deliverableForm.status,
        priority: deliverableForm.priority,
        due_date: deliverableForm.due_date || null,
        external_url: deliverableForm.external_url.trim() || null,
        notes: deliverableForm.notes.trim() || null,
        updated_at: now,
        ...timestampFields,
      }
      const { error } = await supabase.from("production_deliverables").update(payload).eq("id", editingDeliverable.id)
      if (error) throw error
      setDeliverables((prev) => prev.map((item) => (item.id === editingDeliverable.id ? { ...item, ...payload } : item)))
      setEditingDeliverable(null)
      setDeliverableForm(null)
      toast.success("Entregable actualizado")
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar el entregable")
    } finally {
      setUpdatingDeliverableId(null)
    }
  }

  async function updateDeliverableStatus(deliverable: Deliverable, nextStatus: string) {
    if (!canManageProduction) return toast.error("Solo admins pueden cambiar estados")
    setUpdatingDeliverableId(deliverable.id)
    const now = new Date().toISOString()
    const timestampFields: Record<string, string | null> = {}
    if (nextStatus === "delivered" && !deliverable.delivered_at) timestampFields.delivered_at = now
    if (nextStatus === "approved" && !deliverable.approved_at) timestampFields.approved_at = now
    if (nextStatus === "published" && !deliverable.published_at) timestampFields.published_at = now
    try {
      const { error } = await supabase.from("production_deliverables").update({ status: nextStatus, updated_at: now, ...timestampFields }).eq("id", deliverable.id)
      if (error) throw error
      setDeliverables((prev) => prev.map((item) => (item.id === deliverable.id ? { ...item, status: nextStatus, ...timestampFields } : item)))
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar el entregable")
    } finally {
      setUpdatingDeliverableId(null)
    }
  }

  if (userLoading || loading) return <LoadingState />
  if (schemaError) return <SchemaMissing message={schemaError} onRetry={loadModule} />

  return (
    <div className="space-y-6">
      <PageHeader refreshing={refreshing} onRefresh={loadData} canManage={canManageProduction} onCreate={() => setActiveView("setup")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <MetricCard label="Planes activos" value={stats.activePlans} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Entregables" value={stats.total} icon={<ClipboardList className="h-4 w-4" />} />
        <MetricCard label="Aprobados" value={stats.approved} icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard label="En revisión" value={stats.inReview} icon={<LayoutGrid className="h-4 w-4" />} />
        <MetricCard label="Atrasados" value={stats.overdue} icon={<AlertCircle className="h-4 w-4" />} danger={stats.overdue > 0} />
        <MetricCard label="Cumplimiento" value={`${stats.completion}%`} icon={<Target className="h-4 w-4" />} />
      </div>

      {editingDeliverable && deliverableForm && (
        <EditDeliverablePanel
          form={deliverableForm}
          setForm={setDeliverableForm}
          onSubmit={saveDeliverableEdit}
          onCancel={() => { setEditingDeliverable(null); setDeliverableForm(null) }}
          saving={updatingDeliverableId === editingDeliverable.id}
        />
      )}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        <ViewButton active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} label="Dashboard" />
        <ViewButton active={activeView === "kanban"} onClick={() => setActiveView("kanban")} label="Kanban" />
        <ViewButton active={activeView === "table"} onClick={() => setActiveView("table")} label="Tabla" />
        {canManageProduction && <ViewButton active={activeView === "setup"} onClick={() => setActiveView("setup")} label="Configuración" />}
      </div>

      {activeView !== "setup" && (
        <Filters
          agencies={agencies}
          availableTypes={availableTypes}
          agencyFilter={agencyFilter}
          setAgencyFilter={setAgencyFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          overdueFilter={overdueFilter}
          setOverdueFilter={setOverdueFilter}
          search={search}
          setSearch={setSearch}
        />
      )}

      {activeView === "dashboard" && <DashboardView summaries={agencySummaries} plans={plans} planItems={planItems} deliverables={deliverables} agencyById={agencyById} />}
      {activeView === "kanban" && <KanbanView deliverables={filteredDeliverables} agencyById={agencyById} planById={planById} onStatusChange={updateDeliverableStatus} onEdit={startEditDeliverable} updatingId={updatingDeliverableId} canManage={canManageProduction} />}
      {activeView === "table" && <TableView deliverables={filteredDeliverables} agencyById={agencyById} brandById={brandById} planById={planById} onStatusChange={updateDeliverableStatus} onEdit={startEditDeliverable} updatingId={updatingDeliverableId} canManage={canManageProduction} />}
      {activeView === "setup" && (
        canManageProduction ? (
          <SetupView
            agencies={agencies}
            agencyMembers={agencyMembers}
            brands={brands}
            agencyForm={agencyForm}
            setAgencyForm={setAgencyForm}
            agencyMemberForm={agencyMemberForm}
            setAgencyMemberForm={setAgencyMemberForm}
            editingAgencyMember={editingAgencyMember}
            setEditingAgencyMember={setEditingAgencyMember}
            createAgencyMember={createAgencyMember}
            updateAgencyMember={updateAgencyMember}
            deleteAgencyMember={deleteAgencyMember}
            creatingAgencyMember={creatingAgencyMember}
            selectedAgencyForMembers={selectedAgencyForMembers}
            setSelectedAgencyForMembers={setSelectedAgencyForMembers}
            getMembersForAgency={getMembersForAgency}
            brandForm={brandForm}
            setBrandForm={setBrandForm}
            planForm={planForm}
            setPlanForm={setPlanForm}
            draftItems={draftItems}
            setDraftItems={setDraftItems}
            createAgency={createAgency}
            createBrand={createBrand}
            createPlan={createPlan}
            creatingAgency={creatingAgency}
            creatingBrand={creatingBrand}
            creatingPlan={creatingPlan}
            userSearchTerm={userSearchTerm}
            setUserSearchTerm={setUserSearchTerm}
            userSearchResults={userSearchResults}
            searchingUsers={searchingUsers}
            selectedResponsible={selectedResponsible}
            setSelectedResponsible={setSelectedResponsible}
          />
        ) : <PermissionCard />
      )}
    </div>
  )
}

function PageHeader({ refreshing, onRefresh, canManage, onCreate }: { refreshing: boolean; onRefresh: () => void; canManage: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" /> Creative Ops / Agency Operations</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Producción de Agencias</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">Controla producción flexible por agencia: planes, entregables, fechas, links externos, estados y cumplimiento.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Actualizar</Button>
        {canManage && <Button size="sm" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Crear plan</Button>}
      </div>
    </div>
  )
}

function LoadingState() {
  return <div className="flex h-full w-full items-center justify-center py-24"><div className="flex flex-col items-center gap-3"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground">Cargando producción de agencias...</p></div></div>
}

function MetricCard({ label, value, icon, danger = false }: { label: string; value: string | number; icon: ReactNode; danger?: boolean }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-lg p-2 ${danger ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-muted text-muted-foreground"}`}>{icon}</div><div><div className="text-xl font-semibold leading-none">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div></CardContent></Card>
}

function ViewButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick}>{label}</Button>
}

function Filters(props: any) {
  const { agencies, availableTypes, agencyFilter, setAgencyFilter, statusFilter, setStatusFilter, typeFilter, setTypeFilter, overdueFilter, setOverdueFilter, search, setSearch } = props
  return (
    <Card><CardContent className="grid gap-3 p-4 md:grid-cols-5">
      <div className="space-y-2 md:col-span-2"><Label className="flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-3 w-3" /> Buscar</Label><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar entregable, plan, agencia o nota..." /></div>
      <SelectField label="Agencia" value={agencyFilter} onChange={setAgencyFilter} options={[{ value: "all", label: "Todas" }, ...agencies.map((agency: Agency) => ({ value: agency.id, label: agency.name }))]} />
      <SelectField label="Estado" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "Todos" }, ...FLOW_STATUSES.map((status) => ({ value: status.value, label: status.label }))]} />
      <SelectField label="Tipo" value={typeFilter} onChange={setTypeFilter} options={[{ value: "all", label: "Todos" }, ...availableTypes.map((type: string) => ({ value: type, label: type }))]} />
      <SelectField label="Atraso" value={overdueFilter} onChange={setOverdueFilter} options={[{ value: "all", label: "Todos" }, { value: "overdue", label: "Solo atrasados" }, { value: "not_overdue", label: "Sin atraso" }]} />
    </CardContent></Card>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <div className="space-y-2"><Label className="text-xs text-muted-foreground">{label}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
}

function DashboardView({ summaries, plans, planItems, deliverables, agencyById }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card><CardHeader><CardTitle>Agencias activas</CardTitle><CardDescription>Cumplimiento y riesgo por agencia.</CardDescription></CardHeader><CardContent className="space-y-3">
        {summaries.length === 0 ? <Empty message="Crea una agencia para empezar." /> : summaries.map((summary: any) => <div key={summary.agency.id} className="rounded-xl border p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><div className="font-medium">{summary.agency.name}</div><div className="text-xs text-muted-foreground">{summary.agency.type || "Agencia / proveedor"}</div></div><Badge className={summary.overdue > 0 ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "bg-muted text-muted-foreground"}>{summary.state}</Badge></div><div className="mt-4 grid grid-cols-5 gap-2 text-center text-sm"><MiniStat label="Total" value={summary.total} /><MiniStat label="Aprobados" value={summary.approved} /><MiniStat label="Revisión" value={summary.inReview} /><MiniStat label="Atrasados" value={summary.overdue} /><MiniStat label="Cumpl." value={`${summary.completion}%`} /></div></div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Planes recientes</CardTitle><CardDescription>Compromisos de producción por periodo.</CardDescription></CardHeader><CardContent className="space-y-3">
        {plans.length === 0 ? <Empty message="Aún no hay planes de producción." /> : plans.slice(0, 8).map((plan: ProductionPlan) => {
          const items = planItems.filter((item: PlanItem) => item.plan_id === plan.id)
          const planDeliverables = deliverables.filter((deliverable: Deliverable) => deliverable.plan_id === plan.id)
          const approved = planDeliverables.filter((item: Deliverable) => item.status === "approved" || item.status === "published").length
          return <div key={plan.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div><div className="font-medium leading-tight">{plan.name}</div><div className="text-xs text-muted-foreground">{agencyById.get(plan.agency_id)?.name || "Agencia"} · {plan.period_start}–{plan.period_end}</div></div><Badge variant="outline">{approved}/{planDeliverables.length}</Badge></div><div className="mt-2 flex flex-wrap gap-1">{items.map((item: PlanItem) => <Badge key={item.id} variant="secondary" className="text-xs">{item.deliverable_type}: {item.target_quantity}</Badge>)}</div></div>
        })}
      </CardContent></Card>
    </div>
  )
}

function KanbanView({ deliverables, agencyById, planById, onStatusChange, onEdit, updatingId, canManage }: any) {
  return <div className="grid gap-4 xl:grid-cols-5">{FLOW_STATUSES.filter((status) => !["paused", "cancelled"].includes(status.value)).map((status) => { const items = deliverables.filter((deliverable: Deliverable) => deliverable.status === status.value); return <Card key={status.value} className="min-h-[280px]"><CardHeader className="pb-3"><CardTitle className="flex items-center justify-between text-sm">{status.label}<Badge variant="outline">{items.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-3">{items.map((deliverable: Deliverable) => <DeliverableCard key={deliverable.id} deliverable={deliverable} agencyName={agencyById.get(deliverable.agency_id)?.name} planName={planById.get(deliverable.plan_id)?.name} onStatusChange={onStatusChange} onEdit={onEdit} updating={updatingId === deliverable.id} canManage={canManage} />)}</CardContent></Card> })}</div>
}

function DeliverableCard({ deliverable, agencyName, planName, onStatusChange, onEdit, updating, canManage }: any) {
  return <div className="rounded-xl border bg-card p-3 shadow-sm"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="font-medium leading-tight">{deliverable.title}</div><div className="mt-1 text-xs text-muted-foreground">{agencyName || "Agencia"} · {planName || "Plan"}</div></div>{isOverdue(deliverable) && <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">Atrasado</Badge>}</div><div className="mt-3 flex flex-wrap gap-1"><Badge variant="secondary" className="text-xs">{deliverable.deliverable_type}</Badge>{deliverable.channel && <Badge variant="outline" className="text-xs">{deliverable.channel}</Badge>}<Badge className={`text-xs ${statusTone(deliverable.status)}`}>{statusLabel(deliverable.status)}</Badge></div>{deliverable.due_date && <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" /> Vence {deliverable.due_date}</div>}{deliverable.external_url && <a href={deliverable.external_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">Ver link externo <ExternalLink className="h-3 w-3" /></a>}{canManage && <div className="mt-3 flex gap-2"><select className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs" value={deliverable.status} disabled={updating} onChange={(event) => onStatusChange(deliverable, event.target.value)}>{FLOW_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><Button type="button" size="sm" variant="outline" onClick={() => onEdit(deliverable)}><Edit3 className="h-3 w-3" /></Button></div>}</div>
}

function TableView({ deliverables, agencyById, brandById, planById, onStatusChange, onEdit, updatingId, canManage }: any) {
  return <Card><CardHeader><CardTitle>Tabla de entregables</CardTitle><CardDescription>Control operativo por agencia, plan, fecha, link y estado.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="py-3 pr-4">Entregable</th><th className="py-3 pr-4">Agencia</th><th className="py-3 pr-4">Marca</th><th className="py-3 pr-4">Plan</th><th className="py-3 pr-4">Tipo</th><th className="py-3 pr-4">Prioridad</th><th className="py-3 pr-4">Estado</th><th className="py-3 pr-4">Vence</th><th className="py-3 pr-4">Link</th><th className="py-3 pr-4">Acciones</th></tr></thead><tbody>{deliverables.map((deliverable: Deliverable) => <tr key={deliverable.id} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{deliverable.title}<div className="text-xs text-muted-foreground line-clamp-1">{deliverable.notes || deliverable.description}</div></td><td className="py-3 pr-4">{agencyById.get(deliverable.agency_id)?.name || "—"}</td><td className="py-3 pr-4">{deliverable.brand_id ? brandById.get(deliverable.brand_id)?.name || "—" : "—"}</td><td className="py-3 pr-4">{planById.get(deliverable.plan_id)?.name || "—"}</td><td className="py-3 pr-4">{deliverable.deliverable_type}</td><td className="py-3 pr-4 capitalize">{deliverable.priority}</td><td className="py-3 pr-4">{canManage ? <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={deliverable.status} disabled={updatingId === deliverable.id} onChange={(event) => onStatusChange(deliverable, event.target.value)}>{FLOW_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select> : <Badge className={statusTone(deliverable.status)}>{statusLabel(deliverable.status)}</Badge>}</td><td className="py-3 pr-4"><span className={isOverdue(deliverable) ? "font-medium text-red-600" : ""}>{deliverable.due_date || "—"}</span></td><td className="py-3 pr-4">{deliverable.external_url ? <a href={deliverable.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Abrir <ExternalLink className="h-3 w-3" /></a> : "—"}</td><td className="py-3 pr-4">{canManage ? <Button size="sm" variant="outline" onClick={() => onEdit(deliverable)}><Edit3 className="mr-2 h-3 w-3" />Editar</Button> : "—"}</td></tr>)}</tbody></table></div>{deliverables.length === 0 && <Empty message="No hay entregables con los filtros actuales." />}</CardContent></Card>
}

function SetupView(props: any) {
  const { 
    agencies, agencyMembers, brands, 
    agencyForm, setAgencyForm, 
    agencyMemberForm, setAgencyMemberForm, editingAgencyMember, setEditingAgencyMember,
    createAgencyMember, updateAgencyMember, deleteAgencyMember, creatingAgencyMember,
    selectedAgencyForMembers, setSelectedAgencyForMembers, getMembersForAgency,
    brandForm, setBrandForm, 
    planForm, setPlanForm, draftItems, setDraftItems, 
    createAgency, createBrand, createPlan, 
    creatingAgency, creatingBrand, creatingPlan, 
    userSearchTerm, setUserSearchTerm, userSearchResults, searchingUsers, selectedResponsible, setSelectedResponsible 
  } = props
  const updateDraft = (id: string, changes: Partial<PlanItemDraft>) => setDraftItems((prev: PlanItemDraft[]) => prev.map((item) => item.local_id === id ? { ...item, ...changes } : item))
  const removeDraft = (id: string) => setDraftItems((prev: PlanItemDraft[]) => prev.length === 1 ? prev : prev.filter((item) => item.local_id !== id))
  
  const selectedAgencyMembers = selectedAgencyForMembers ? getMembersForAgency(selectedAgencyForMembers) : []
  const selectedAgencyName = agencies.find((a: Agency) => a.id === selectedAgencyForMembers)?.name || ""

  return <div className="space-y-6">
    {/* Agency Members Section */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Miembros de agencias</CardTitle>
        <CardDescription>Gestiona los contactos de cada agencia. Cada agencia puede tener múltiples miembros (director, account manager, diseñador, etc).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Select agency */}
          <div className="space-y-2">
            <Label>Seleccionar agencia</Label>
            <select 
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" 
              value={selectedAgencyForMembers || ""} 
              onChange={(e) => {
                setSelectedAgencyForMembers(e.target.value || null)
                setAgencyMemberForm({ ...agencyMemberForm, agency_id: e.target.value })
              }}
            >
              <option value="">Seleccionar agencia...</option>
              {agencies.map((agency: Agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} ({(agencyMembers as AgencyMember[]).filter((m: AgencyMember) => m.agency_id === agency.id).length} miembros)
                </option>
              ))}
            </select>
          </div>

          {/* Add member form */}
          {selectedAgencyForMembers && (
            <form onSubmit={createAgencyMember} className="space-y-2">
              <Label>Agregar miembro a {selectedAgencyName}</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Nombre" 
                  value={agencyMemberForm.name} 
                  onChange={(e) => setAgencyMemberForm({ ...agencyMemberForm, name: e.target.value })} 
                  required 
                />
                <Input 
                  type="email" 
                  placeholder="Email" 
                  value={agencyMemberForm.email} 
                  onChange={(e) => setAgencyMemberForm({ ...agencyMemberForm, email: e.target.value })} 
                  required 
                />
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Teléfono" 
                  value={agencyMemberForm.phone} 
                  onChange={(e) => setAgencyMemberForm({ ...agencyMemberForm, phone: e.target.value })} 
                />
                <Input 
                  placeholder="Rol (director, account...)" 
                  value={agencyMemberForm.role} 
                  onChange={(e) => setAgencyMemberForm({ ...agencyMemberForm, role: e.target.value })} 
                />
                <Button type="submit" disabled={creatingAgencyMember}>
                  {creatingAgencyMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Members list */}
        {selectedAgencyForMembers && (
          <div className="mt-4">
            {selectedAgencyMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Esta agencia no tiene miembros. Agrega el primer contacto arriba.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedAgencyMembers.map((member: AgencyMember) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    {editingAgencyMember?.id === member.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input 
                          value={editingAgencyMember.name} 
                          onChange={(e) => setEditingAgencyMember({ ...editingAgencyMember, name: e.target.value })}
                          className="h-8"
                        />
                        <Input 
                          value={editingAgencyMember.email} 
                          onChange={(e) => setEditingAgencyMember({ ...editingAgencyMember, email: e.target.value })}
                          className="h-8"
                        />
                        <Input 
                          value={editingAgencyMember.phone || ""} 
                          onChange={(e) => setEditingAgencyMember({ ...editingAgencyMember, phone: e.target.value })}
                          placeholder="Teléfono"
                          className="h-8"
                        />
                        <Input 
                          value={editingAgencyMember.role || ""} 
                          onChange={(e) => setEditingAgencyMember({ ...editingAgencyMember, role: e.target.value })}
                          placeholder="Rol"
                          className="h-8"
                        />
                        <Button size="sm" onClick={() => updateAgencyMember(editingAgencyMember)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingAgencyMember(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">{member.email} {member.role && `· ${member.role}`}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingAgencyMember(member)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteAgencyMember(member.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Original grid for agencies, brands, plans */}
    <div className="grid gap-6 xl:grid-cols-[0.7fr_0.7fr_1.6fr]">
    <Card><CardHeader><CardTitle>Nueva agencia</CardTitle><CardDescription>Agrega proveedores o agencias externas.</CardDescription></CardHeader><CardContent><form onSubmit={createAgency} className="space-y-3"><Field label="Nombre"><Input value={agencyForm.name} onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })} placeholder="Agencia / proveedor" required /></Field><Field label="Tipo"><Input value={agencyForm.type} onChange={(e) => setAgencyForm({ ...agencyForm, type: e.target.value })} placeholder="Video, diseño, social media..." /></Field><Field label="Contacto"><Input value={agencyForm.contact_name} onChange={(e) => setAgencyForm({ ...agencyForm, contact_name: e.target.value })} placeholder="Nombre de contacto" /></Field><Field label="Email"><Input type="email" value={agencyForm.contact_email} onChange={(e) => setAgencyForm({ ...agencyForm, contact_email: e.target.value })} placeholder="contacto@agencia.com" /></Field><Field label="Notas"><Textarea value={agencyForm.notes} onChange={(e) => setAgencyForm({ ...agencyForm, notes: e.target.value })} placeholder="Notas internas" /></Field><Button type="submit" className="w-full" disabled={creatingAgency}>{creatingAgency && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear agencia</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Nueva marca</CardTitle><CardDescription>Opcional, para organizar por cliente o marca.</CardDescription></CardHeader><CardContent><form onSubmit={createBrand} className="space-y-3"><Field label="Nombre"><Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="SAIA LABS / Cliente" required /></Field><Field label="Descripción"><Textarea value={brandForm.description} onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })} placeholder="Notas de la marca" /></Field><Button type="submit" className="w-full" disabled={creatingBrand}>{creatingBrand && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear marca</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Crear plan flexible</CardTitle><CardDescription>Un plan puede tener cantidades, piezas específicas o una mezcla de ambas.</CardDescription></CardHeader><CardContent><form onSubmit={createPlan} className="space-y-5"><div className="grid gap-3 md:grid-cols-2"><Field label="Nombre del plan" className="md:col-span-2"><Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Social media mensual - Mayo" required /></Field><Field label="Agencia"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.agency_id} onChange={(e) => setPlanForm({ ...planForm, agency_id: e.target.value })} required><option value="">Seleccionar</option>{agencies.map((agency: Agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></Field><Field label="Marca"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.brand_id} onChange={(e) => setPlanForm({ ...planForm, brand_id: e.target.value })}><option value="">Sin marca</option>{brands.map((brand: Brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field><Field label="Responsable interno" className="md:col-span-2"><UserSearchField searchTerm={userSearchTerm} setSearchTerm={setUserSearchTerm} searchResults={userSearchResults} searching={searchingUsers} selectedUser={selectedResponsible} onSelectUser={setSelectedResponsible} onClearUser={() => setSelectedResponsible(null)} placeholder="Buscar usuario por email o nombre..." /></Field><Field label="Tipo de periodo"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.period_type} onChange={(e) => setPlanForm({ ...planForm, period_type: e.target.value })}><option value="monthly">Mensual</option><option value="weekly">Semanal</option><option value="campaign">Campaña</option><option value="custom">Personalizado</option></select></Field><Field label="Fechas"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.date_strategy} onChange={(e) => setPlanForm({ ...planForm, date_strategy: e.target.value })}><option value="distributed">Distribuir automáticamente</option><option value="same_end">Misma fecha final para todos</option><option value="none">Sin fechas por ahora</option></select></Field><Field label="Inicio"><Input type="date" value={planForm.period_start} onChange={(e) => setPlanForm({ ...planForm, period_start: e.target.value })} required /></Field><Field label="Fin"><Input type="date" value={planForm.period_end} onChange={(e) => setPlanForm({ ...planForm, period_end: e.target.value })} required /></Field><Field label="Notas" className="md:col-span-2"><Textarea value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Brief o notas internas del plan" /></Field></div><div className="space-y-3"><div className="flex items-center justify-between"><div><Label>Ítems del plan</Label><p className="text-xs text-muted-foreground">Agrega 30 videos, piezas específicas o un plan mixto.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setDraftItems([...draftItems, newPlanItemDraft()])}><Plus className="mr-2 h-3 w-3" />Agregar ítem</Button></div>{draftItems.map((item: PlanItemDraft, index: number) => <div key={item.local_id} className="rounded-xl border p-3"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">Ítem {index + 1}</span><Button type="button" size="sm" variant="ghost" onClick={() => removeDraft(item.local_id)} disabled={draftItems.length === 1}><Trash2 className="h-3 w-3" /></Button></div><div className="grid gap-3 md:grid-cols-3"><Field label="Tipo"><Input list="deliverable-types" value={item.deliverable_type} onChange={(e) => updateDraft(item.local_id, { deliverable_type: e.target.value })} required /><datalist id="deliverable-types">{DEFAULT_TYPES.map((type) => <option key={type} value={type} />)}</datalist></Field><Field label="Cantidad"><Input type="number" min="1" max="250" value={item.target_quantity} onChange={(e) => updateDraft(item.local_id, { target_quantity: e.target.value })} required /></Field><Field label="Nombres"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={item.naming_mode} onChange={(e) => updateDraft(item.local_id, { naming_mode: e.target.value as PlanItemDraft["naming_mode"] })}><option value="numbered">Nombre base + número</option><option value="same">Mismo nombre para todos</option></select></Field><Field label="Nombre base"><Input value={item.title_base} onChange={(e) => updateDraft(item.local_id, { title_base: e.target.value })} placeholder="Video, Copy LinkedIn, Reporte mensual..." /></Field><Field label="Canal"><Input value={item.channel} onChange={(e) => updateDraft(item.local_id, { channel: e.target.value })} placeholder="Instagram, TikTok, LinkedIn" /></Field><Field label="Formato"><Input value={item.format} onChange={(e) => updateDraft(item.local_id, { format: e.target.value })} placeholder="1080x1920, texto, PDF/link" /></Field><Field label="Notas" className="md:col-span-3"><Textarea value={item.notes} onChange={(e) => updateDraft(item.local_id, { notes: e.target.value })} placeholder="Notas para este tipo de entregable" /></Field></div></div>)}</div><Button type="submit" className="w-full" disabled={creatingPlan || agencies.length === 0}>{creatingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear plan y generar entregables</Button>{agencies.length === 0 && <p className="text-xs text-muted-foreground">Primero crea al menos una agencia.</p>}</form></CardContent></Card>
    </div>
  </div>
}

function EditDeliverablePanel({ form, setForm, onSubmit, onCancel, saving }: { form: DeliverableForm; setForm: (form: DeliverableForm) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void; saving: boolean }) {
  return <Card className="border-primary/30"><CardHeader><div className="flex items-start justify-between gap-2"><div><CardTitle>Editar entregable</CardTitle><CardDescription>Actualiza nombre, fecha, link externo, notas y estado.</CardDescription></div><Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button></div></CardHeader><CardContent><form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3"><Field label="Título" className="md:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field><Field label="Tipo"><Input value={form.deliverable_type} onChange={(e) => setForm({ ...form, deliverable_type: e.target.value })} required /></Field><Field label="Estado"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{FLOW_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></Field><Field label="Prioridad"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></Field><Field label="Fecha límite"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field><Field label="Canal"><Input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} /></Field><Field label="Formato"><Input value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} /></Field><Field label="Link externo"><Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://..." /></Field><Field label="Descripción" className="md:col-span-3"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Notas" className="md:col-span-3"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field><div className="flex gap-2 md:col-span-3"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar</Button><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button></div></form></CardContent></Card>
}

function PermissionCard() {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Permisos insuficientes</CardTitle><CardDescription>Solo administradores aprobados pueden crear o editar configuración de producción.</CardDescription></CardHeader></Card>
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-muted/40 p-2"><div className="font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{message}</div>
}

function UserSearchField({
  searchTerm,
  setSearchTerm,
  searchResults,
  searching,
  selectedUser,
  onSelectUser,
  onClearUser,
  placeholder = "Buscar por email o nombre...",
}: {
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchResults: { id: string; email: string; full_name: string | null }[]
  searching: boolean
  selectedUser: { id: string; email: string; full_name: string | null } | null
  onSelectUser: (user: { id: string; email: string; full_name: string | null }) => void
  onClearUser: () => void
  placeholder?: string
}) {
  if (selectedUser) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedUser.full_name || selectedUser.email}</span>
          {selectedUser.full_name && <span className="text-xs text-muted-foreground">({selectedUser.email})</span>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClearUser}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {searchResults.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {searchResults.map((user) => (
            <button
              key={user.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onSelectUser(user)
                setSearchTerm("")
              }}
            >
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span>{user.full_name || user.email}</span>
              {user.full_name && <span className="text-xs text-muted-foreground">({user.email})</span>}
            </button>
          ))}
        </div>
      )}
      {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
          No se encontraron usuarios
        </div>
      )}
    </div>
  )
}

function SchemaMissing({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="space-y-6"><Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/10"><CardHeader><CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200"><AlertCircle className="h-5 w-5" /> El módulo está listo, pero falta preparar Supabase</CardTitle><CardDescription className="text-amber-800/80 dark:text-amber-200/80">La UI ya está creada. v0 debe crear o adaptar las tablas de producción en Supabase.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><div className="rounded-md bg-background/70 p-3 text-muted-foreground">Error actual: {message}</div><div className="flex flex-wrap gap-2"><Button onClick={onRetry} variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button><Button asChild><Link href="/dashboard">Volver al dashboard</Link></Button></div></CardContent></Card><Card><CardHeader><CardTitle>Tablas esperadas</CardTitle><CardDescription>Guía: `docs/agency-production-module.md` y `docs/supabase-agency-production-schema.sql`.</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">{`agencies
brands
production_plans
production_plan_items
production_deliverables`}</pre></CardContent></Card></div>
}
