"use client"

import { FormEvent, ReactNode, useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DroppableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit3,
  ExternalLink,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
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
  stage_id: string | null
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

type PlanStage = {
  id: string
  plan_id: string
  name: string
  position: number
  color: string | null
  created_at: string
}

type StageTemplate = {
  id: string
  name: string
  description: string | null
  stages: { name: string; position: number; color: string }[]
  is_system: boolean
  created_by: string | null
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
  const [activeView, setActiveView] = useState<"dashboard" | "agency" | "plan" | "setup">("dashboard")
  
  // Hierarchical selection state
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [planViewMode, setPlanViewMode] = useState<"kanban" | "table">("kanban")
  
  // Create deliverable dialog
  const [createDeliverableOpen, setCreateDeliverableOpen] = useState(false)
  const [createDeliverableStatus, setCreateDeliverableStatus] = useState<string>("pending")
  const [creatingDeliverable, setCreatingDeliverable] = useState(false)

  const [agencies, setAgencies] = useState<Agency[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [planStages, setPlanStages] = useState<PlanStage[]>([])
  const [stageTemplates, setStageTemplates] = useState<StageTemplate[]>([])
  
  // Stage management
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [stagesManagerOpen, setStagesManagerOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PlanStage | null>(null)
  const [stageForm, setStageForm] = useState({ name: "", color: "#94a3b8" })
  const [savingStage, setSavingStage] = useState(false)
  
  // Quick launch
  const [quickLaunchOpen, setQuickLaunchOpen] = useState(false)

  const [agencyForm, setAgencyForm] = useState({ name: "", type: "", contact_name: "", contact_email: "", notes: "" })
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
  
  // Derived data for selected agency/plan
  const selectedAgency = selectedAgencyId ? agencyById.get(selectedAgencyId) : null
  const selectedPlan = selectedPlanId ? planById.get(selectedPlanId) : null
  const agencyPlans = useMemo(() => selectedAgencyId ? plans.filter(p => p.agency_id === selectedAgencyId) : [], [plans, selectedAgencyId])
  const planDeliverables = useMemo(() => selectedPlanId ? deliverables.filter(d => d.plan_id === selectedPlanId) : [], [deliverables, selectedPlanId])
  const agencyDeliverables = useMemo(() => selectedAgencyId ? deliverables.filter(d => d.agency_id === selectedAgencyId) : [], [deliverables, selectedAgencyId])
  const selectedPlanStages = useMemo(() => selectedPlanId ? planStages.filter(s => s.plan_id === selectedPlanId).sort((a, b) => a.position - b.position) : [], [planStages, selectedPlanId])

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
      const [agenciesRes, brandsRes, plansRes, planItemsRes, deliverablesRes, stagesRes, templatesRes] = await Promise.all([
        supabase.from("agencies").select("*").order("created_at", { ascending: false }),
        supabase.from("brands").select("*").order("name", { ascending: true }),
        supabase.from("production_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("production_plan_items").select("*").order("created_at", { ascending: true }),
        supabase.from("production_deliverables").select("*").order("created_at", { ascending: false }),
        supabase.from("production_plan_stages").select("*").order("position", { ascending: true }),
        supabase.from("production_stage_templates").select("*").order("is_system", { ascending: false }),
      ])

      const firstError = [agenciesRes.error, brandsRes.error, plansRes.error, planItemsRes.error, deliverablesRes.error, stagesRes.error, templatesRes.error].find(Boolean)
      if (firstError) throw firstError

      setAgencies((agenciesRes.data || []) as Agency[])
      setBrands((brandsRes.data || []) as Brand[])
      setPlans((plansRes.data || []) as ProductionPlan[])
      setPlanItems((planItemsRes.data || []) as PlanItem[])
      setDeliverables((deliverablesRes.data || []) as Deliverable[])
      setPlanStages((stagesRes.data || []) as PlanStage[])
      setStageTemplates((templatesRes.data || []) as StageTemplate[])
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

      // Create default stages from first template (Producción estándar)
      const defaultTemplate = stageTemplates.find(t => t.is_system) || stageTemplates[0]
      if (defaultTemplate?.stages?.length) {
        const stageRows = defaultTemplate.stages.map((s, i) => ({
          plan_id: plan.id,
          name: s.name,
          position: i,
          color: s.color || null,
        }))
        const { data: createdStages, error: stagesError } = await supabase
          .from("production_plan_stages")
          .insert(stageRows)
          .select()
        if (stagesError) throw stagesError
        
        // Use first stage for new deliverables
        var firstStageId = createdStages?.[0]?.id || null
      } else {
        var firstStageId = null
      }

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
            stage_id: firstStageId,
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

  // Stage management functions
  async function createStage(name: string, color: string) {
    if (!selectedPlanId || !canManageProduction) return
    setSavingStage(true)
    try {
      const currentStages = planStages.filter(s => s.plan_id === selectedPlanId)
      const nextPosition = currentStages.length > 0 ? Math.max(...currentStages.map(s => s.position)) + 1 : 0
      
      const { data, error } = await supabase.from("production_plan_stages").insert({
        plan_id: selectedPlanId,
        name: name.trim(),
        position: nextPosition,
        color: color || null,
      }).select().single()
      
      if (error) throw error
      setPlanStages(prev => [...prev, data as PlanStage])
      setStageDialogOpen(false)
      setStageForm({ name: "", color: "#94a3b8" })
      toast.success("Etapa creada")
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear la etapa")
    } finally {
      setSavingStage(false)
    }
  }

  async function updateStage(stageId: string, name: string, color: string) {
    if (!canManageProduction) return
    setSavingStage(true)
    try {
      const { error } = await supabase.from("production_plan_stages")
        .update({ name: name.trim(), color: color || null })
        .eq("id", stageId)
      
      if (error) throw error
      setPlanStages(prev => prev.map(s => s.id === stageId ? { ...s, name: name.trim(), color } : s))
      setStageDialogOpen(false)
      setEditingStage(null)
      setStageForm({ name: "", color: "#94a3b8" })
      toast.success("Etapa actualizada")
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar la etapa")
    } finally {
      setSavingStage(false)
    }
  }

  async function deleteStage(stageId: string) {
    if (!canManageProduction) return
    if (!confirm("¿Eliminar esta etapa? Los entregables se quedarán sin etapa asignada.")) return
    
    try {
      const { error } = await supabase.from("production_plan_stages").delete().eq("id", stageId)
      if (error) throw error
      setPlanStages(prev => prev.filter(s => s.id !== stageId))
      // Clear stage_id from affected deliverables
      setDeliverables(prev => prev.map(d => d.stage_id === stageId ? { ...d, stage_id: null } : d))
      toast.success("Etapa eliminada")
    } catch (error: any) {
      toast.error(error.message || "No se pudo eliminar la etapa")
    }
  }

  async function moveDeliverableToStage(deliverableId: string, newStageId: string | null) {
    if (!canManageProduction) return
    try {
      const { error } = await supabase.from("production_deliverables")
        .update({ stage_id: newStageId })
        .eq("id", deliverableId)
      
      if (error) throw error
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? { ...d, stage_id: newStageId } : d))
    } catch (error: any) {
      toast.error(error.message || "No se pudo mover el entregable")
    }
  }

  // Drag and drop handler for kanban
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !canManageProduction) return
    
    const deliverableId = result.draggableId
    const newStageId = result.destination.droppableId === "unassigned" ? null : result.destination.droppableId
    
    // Optimistic update
    setDeliverables(prev => prev.map(d => d.id === deliverableId ? { ...d, stage_id: newStageId } : d))
    
    try {
      const { error } = await supabase.from("production_deliverables")
        .update({ stage_id: newStageId })
        .eq("id", deliverableId)
      
      if (error) throw error
    } catch (error: any) {
      // Revert on error
      await loadData()
      toast.error("No se pudo mover el entregable")
    }
  }, [canManageProduction])

  function openCreateStageDialog() {
    setEditingStage(null)
    setStageForm({ name: "", color: "#94a3b8" })
    setStageDialogOpen(true)
  }

  function openEditStageDialog(stage: PlanStage) {
    setEditingStage(stage)
    setStageForm({ name: stage.name, color: stage.color || "#94a3b8" })
    setStageDialogOpen(true)
  }

  // Quick launch - create plan with default stages
  async function quickLaunchPlan(agencyId: string, templateId: string | null) {
    if (!canManageProduction) return
    setCreatingPlan(true)
    try {
      const agency = agencyById.get(agencyId)
      if (!agency) throw new Error("Agencia no encontrada")
      
      const template = templateId ? stageTemplates.find(t => t.id === templateId) : stageTemplates.find(t => t.is_system) || stageTemplates[0]
      
      // Create plan
      const { data: plan, error: planError } = await supabase.from("production_plans").insert({
        agency_id: agencyId,
        name: `Plan ${agency.name} - ${new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}`,
        period_type: "monthly",
        period_start: todayIso(),
        period_end: monthEndIso(),
        status: "active",
        created_by: user?.id || null,
      }).select().single()
      
      if (planError) throw planError
      
      // Create stages from template
      if (template?.stages?.length) {
        const stageRows = template.stages.map((s, i) => ({
          plan_id: plan.id,
          name: s.name,
          position: i,
          color: s.color || null,
        }))
        const { data: createdStages, error: stagesError } = await supabase
          .from("production_plan_stages")
          .insert(stageRows)
          .select()
        if (stagesError) throw stagesError
        setPlanStages(prev => [...prev, ...(createdStages as PlanStage[])])
      }
      
      setPlans(prev => [plan as ProductionPlan, ...prev])
      setQuickLaunchOpen(false)
      goToPlan(plan.id)
      toast.success("Plan creado")
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el plan")
    } finally {
      setCreatingPlan(false)
    }
  }

  // Reorder stages
  async function reorderStages(stageId: string, direction: 'up' | 'down') {
    if (!selectedPlanId || !canManageProduction) return
    
    const currentStages = planStages.filter(s => s.plan_id === selectedPlanId).sort((a, b) => a.position - b.position)
    const index = currentStages.findIndex(s => s.id === stageId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === currentStages.length - 1) return
    
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const currentStage = currentStages[index]
    const swapStage = currentStages[swapIndex]
    
    // Swap positions
    const newPosition = swapStage.position
    const swapPosition = currentStage.position
    
    // Optimistic update
    setPlanStages(prev => prev.map(s => {
      if (s.id === currentStage.id) return { ...s, position: newPosition }
      if (s.id === swapStage.id) return { ...s, position: swapPosition }
      return s
    }))
    
    try {
      await Promise.all([
        supabase.from("production_plan_stages").update({ position: newPosition }).eq("id", currentStage.id),
        supabase.from("production_plan_stages").update({ position: swapPosition }).eq("id", swapStage.id),
      ])
    } catch (error: any) {
      await loadData()
      toast.error("No se pudo reordenar")
    }
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

  async function createDeliverable(title: string, stageId: string | null) {
    if (!selectedPlanId || !selectedAgencyId) return toast.error("Selecciona un plan primero")
    if (!title.trim()) return toast.error("El título es requerido")
    setCreatingDeliverable(true)
    try {
      const plan = planById.get(selectedPlanId)
      const { data, error } = await supabase.from("production_deliverables").insert({
        plan_id: selectedPlanId,
        agency_id: selectedAgencyId,
        brand_id: plan?.brand_id || null,
        title: title.trim(),
        deliverable_type: "Tarea",
        status: "pending",
        stage_id: stageId,
        priority: "medium",
        created_by: user?.id || null,
      }).select().single()
      if (error) throw error
      setDeliverables(prev => [data as Deliverable, ...prev])
      setCreateDeliverableOpen(false)
      toast.success("Entregable creado")
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el entregable")
    } finally {
      setCreatingDeliverable(false)
    }
  }

  if (userLoading || loading) return <LoadingState />
  if (schemaError) return <SchemaMissing message={schemaError} onRetry={loadModule} />

  // Navigation helpers
  const goToAgency = (agencyId: string) => {
    setSelectedAgencyId(agencyId)
    setSelectedPlanId(null)
    setActiveView("agency")
  }
  const goToPlan = async (planId: string) => {
    const plan = planById.get(planId)
    if (plan) {
      setSelectedAgencyId(plan.agency_id)
      setSelectedPlanId(planId)
      setActiveView("plan")
      
      // Auto-create stages if plan doesn't have any
      const existingStages = planStages.filter(s => s.plan_id === planId)
      if (existingStages.length === 0 && canManageProduction) {
        const defaultTemplate = stageTemplates.find(t => t.is_system) || stageTemplates[0]
        if (defaultTemplate?.stages?.length) {
          try {
            const stageRows = defaultTemplate.stages.map((s, i) => ({
              plan_id: planId,
              name: s.name,
              position: i,
              color: s.color || null,
            }))
            const { data: createdStages, error } = await supabase
              .from("production_plan_stages")
              .insert(stageRows)
              .select()
            if (!error && createdStages) {
              setPlanStages(prev => [...prev, ...(createdStages as PlanStage[])])
              toast.success("Etapas creadas automáticamente")
            }
          } catch (e) {
            console.error("Error creating default stages:", e)
          }
        }
      }
    }
  }
  const goBack = () => {
    if (activeView === "plan") {
      setSelectedPlanId(null)
      setActiveView("agency")
    } else if (activeView === "agency") {
      setSelectedAgencyId(null)
      setActiveView("dashboard")
    } else {
      setActiveView("dashboard")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb navigation */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <button onClick={() => { setSelectedAgencyId(null); setSelectedPlanId(null); setActiveView("dashboard") }} className="hover:text-foreground">Agencias</button>
            {selectedAgency && <><span>/</span><button onClick={() => goToAgency(selectedAgency.id)} className="hover:text-foreground">{selectedAgency.name}</button></>}
            {selectedPlan && <><span>/</span><span>{selectedPlan.name}</span></>}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {selectedPlan ? selectedPlan.name : selectedAgency ? selectedAgency.name : "Producción de Agencias"}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {selectedPlan ? `Plan de ${selectedAgency?.name} · ${selectedPlan.period_start} - ${selectedPlan.period_end}` 
              : selectedAgency ? `${selectedAgency.type || "Agencia"} · ${agencyPlans.length} planes · ${agencyDeliverables.length} entregables`
              : "Controla producción por agencia: planes, entregables, estados y cumplimiento."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(selectedAgency || selectedPlan) && <Button variant="outline" size="sm" onClick={goBack}><X className="mr-2 h-4 w-4" />Volver</Button>}
          <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Actualizar</Button>
          {canManageProduction && !selectedPlan && <Button size="sm" onClick={() => setActiveView("setup")}><Plus className="mr-2 h-4 w-4" />Crear plan</Button>}
        </div>
      </div>

      {/* Global stats only on dashboard */}
      {activeView === "dashboard" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <MetricCard label="Agencias" value={agencies.length} icon={<Building2 className="h-4 w-4" />} />
          <MetricCard label="Planes activos" value={stats.activePlans} icon={<Target className="h-4 w-4" />} />
          <MetricCard label="Entregables" value={stats.total} icon={<ClipboardList className="h-4 w-4" />} />
          <MetricCard label="Aprobados" value={stats.approved} icon={<CheckCircle2 className="h-4 w-4" />} />
          <MetricCard label="Atrasados" value={stats.overdue} icon={<AlertCircle className="h-4 w-4" />} danger={stats.overdue > 0} />
          <MetricCard label="Cumplimiento" value={`${stats.completion}%`} icon={<Target className="h-4 w-4" />} />
        </div>
      )}

      {/* Edit panel */}
      {editingDeliverable && deliverableForm && (
        <EditDeliverablePanel
          form={deliverableForm}
          setForm={setDeliverableForm}
          onSubmit={saveDeliverableEdit}
          onCancel={() => { setEditingDeliverable(null); setDeliverableForm(null) }}
          saving={updatingDeliverableId === editingDeliverable.id}
        />
      )}

      {/* View tabs - only on dashboard */}
      {activeView === "dashboard" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="flex gap-2">
            <ViewButton active={true} onClick={() => {}} label="Dashboard" />
            {canManageProduction && <ViewButton active={false} onClick={() => setActiveView("setup")} label="Configuración" />}
          </div>
          {canManageProduction && agencies.length > 0 && (
            <Button size="sm" onClick={() => setQuickLaunchOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Quick Launch
            </Button>
          )}
        </div>
      )}

      {/* Agency view tabs */}
      {activeView === "agency" && (
        <div className="flex flex-wrap gap-2 border-b pb-2">
          <ViewButton active={true} onClick={() => {}} label="Planes" />
        </div>
      )}

      {/* Plan view tabs */}
      {activeView === "plan" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="flex gap-2">
            <ViewButton active={planViewMode === "kanban"} onClick={() => setPlanViewMode("kanban")} label="Kanban" />
            <ViewButton active={planViewMode === "table"} onClick={() => setPlanViewMode("table")} label="Tabla" />
          </div>
          {canManageProduction && (
            <Button variant="outline" size="sm" onClick={() => setStagesManagerOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Configurar etapas
            </Button>
          )}
        </div>
      )}

      {/* Dashboard view - clickable agencies */}
      {activeView === "dashboard" && (
        <DashboardView 
          summaries={agencySummaries} 
          plans={plans} 
          planItems={planItems} 
          deliverables={deliverables} 
          agencyById={agencyById}
          onAgencyClick={goToAgency}
          onPlanClick={goToPlan}
        />
      )}

      {/* Agency view - list of plans */}
      {activeView === "agency" && selectedAgency && (
        <AgencyView
          agency={selectedAgency}
          plans={agencyPlans}
          deliverables={agencyDeliverables}
          planItems={planItems}
          onPlanClick={goToPlan}
        />
      )}

      {/* Plan view - kanban or table */}
      {activeView === "plan" && selectedPlan && (
        <>
          {planViewMode === "kanban" && (
            <PlanKanbanView 
              stages={selectedPlanStages}
              deliverables={planDeliverables}
              onDragEnd={handleDragEnd}
              onEdit={startEditDeliverable} 
              onEditStage={openEditStageDialog}
              onDeleteStage={deleteStage}
              onCreateStage={openCreateStageDialog}
              onCreateDeliverable={(stageId: string | null) => { setCreateDeliverableStatus(stageId || ""); setCreateDeliverableOpen(true) }}
              updatingId={updatingDeliverableId} 
              canManage={canManageProduction}
            />
          )}
          {planViewMode === "table" && (
            <PlanTableView 
              stages={selectedPlanStages}
              deliverables={planDeliverables} 
              brandById={brandById}
              onEdit={startEditDeliverable} 
              updatingId={updatingDeliverableId} 
              canManage={canManageProduction}
            />
          )}
          
          {/* Create deliverable dialog */}
          <CreateDeliverableDialog
            open={createDeliverableOpen}
            onClose={() => setCreateDeliverableOpen(false)}
            onCreate={createDeliverable}
            stageId={createDeliverableStatus}
            stages={selectedPlanStages}
            creating={creatingDeliverable}
          />

          {/* Stage edit dialog */}
          <StageDialog
            open={stageDialogOpen}
            onClose={() => { setStageDialogOpen(false); setEditingStage(null) }}
            stage={editingStage}
            form={stageForm}
            setForm={setStageForm}
            onSave={() => editingStage ? updateStage(editingStage.id, stageForm.name, stageForm.color) : createStage(stageForm.name, stageForm.color)}
            saving={savingStage}
          />

          {/* Stages manager dialog */}
          <StagesManagerDialog
            open={stagesManagerOpen}
            onClose={() => setStagesManagerOpen(false)}
            stages={selectedPlanStages}
            templates={stageTemplates}
            onCreateStage={openCreateStageDialog}
            onEditStage={openEditStageDialog}
            onDeleteStage={deleteStage}
            onReorderStage={reorderStages}
            onApplyTemplate={async (templateId) => {
              if (!selectedPlanId) return
              const template = stageTemplates.find(t => t.id === templateId)
              if (!template?.stages?.length) return
              if (!confirm("Esto reemplazará todas las etapas actuales. ¿Continuar?")) return
              try {
                // Delete existing stages
                await supabase.from("production_plan_stages").delete().eq("plan_id", selectedPlanId)
                // Create new from template
                const stageRows = template.stages.map((s, i) => ({
                  plan_id: selectedPlanId,
                  name: s.name,
                  position: i,
                  color: s.color || null,
                }))
                const { data, error } = await supabase.from("production_plan_stages").insert(stageRows).select()
                if (error) throw error
                setPlanStages(prev => [...prev.filter(s => s.plan_id !== selectedPlanId), ...(data as PlanStage[])])
                // Clear stage_id from deliverables in this plan
                setDeliverables(prev => prev.map(d => d.plan_id === selectedPlanId ? { ...d, stage_id: null } : d))
                toast.success("Plantilla aplicada")
              } catch (e: any) {
                toast.error(e.message || "Error al aplicar plantilla")
              }
            }}
          />
        </>
      )}

      {/* Setup view */}
      {activeView === "setup" && (
        canManageProduction ? (
          <SetupView
            agencies={agencies}
            brands={brands}
            agencyForm={agencyForm}
            setAgencyForm={setAgencyForm}
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

      {/* Quick launch dialog */}
      <QuickLaunchDialog
        open={quickLaunchOpen}
        onClose={() => setQuickLaunchOpen(false)}
        agencies={agencies}
        templates={stageTemplates}
        onLaunch={quickLaunchPlan}
        launching={creatingPlan}
      />
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

function DashboardView({ summaries, plans, planItems, deliverables, agencyById, onAgencyClick, onPlanClick }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Agencias activas</CardTitle>
          <CardDescription>Haz clic en una agencia para ver sus planes y entregas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {summaries.length === 0 ? <Empty message="Crea una agencia para empezar." /> : summaries.map((summary: any) => (
            <button
              key={summary.agency.id}
              onClick={() => onAgencyClick(summary.agency.id)}
              className="w-full text-left rounded-xl border p-4 transition-colors hover:bg-muted/50 hover:border-primary/30"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{summary.agency.name}</div>
                  <div className="text-xs text-muted-foreground">{summary.agency.type || "Agencia / proveedor"}</div>
                </div>
                <Badge className={summary.overdue > 0 ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "bg-muted text-muted-foreground"}>{summary.state}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 text-center text-sm">
                <MiniStat label="Total" value={summary.total} />
                <MiniStat label="Aprobados" value={summary.approved} />
                <MiniStat label="Revisión" value={summary.inReview} />
                <MiniStat label="Atrasados" value={summary.overdue} />
                <MiniStat label="Cumpl." value={`${summary.completion}%`} />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Planes recientes</CardTitle>
          <CardDescription>Haz clic en un plan para ver su kanban.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.length === 0 ? <Empty message="Aún no hay planes de producción." /> : plans.slice(0, 8).map((plan: ProductionPlan) => {
            const items = planItems.filter((item: PlanItem) => item.plan_id === plan.id)
            const planDelivs = deliverables.filter((deliverable: Deliverable) => deliverable.plan_id === plan.id)
            const approved = planDelivs.filter((item: Deliverable) => item.status === "approved" || item.status === "published").length
            return (
              <button
                key={plan.id}
                onClick={() => onPlanClick(plan.id)}
                className="w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/50 hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium leading-tight">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">{agencyById.get(plan.agency_id)?.name || "Agencia"} · {plan.period_start}–{plan.period_end}</div>
                  </div>
                  <Badge variant="outline">{approved}/{planDelivs.length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {items.map((item: PlanItem) => <Badge key={item.id} variant="secondary" className="text-xs">{item.deliverable_type}: {item.target_quantity}</Badge>)}
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// Agency detail view - shows plans for selected agency
function AgencyView({ agency, plans, deliverables, planItems, onPlanClick }: any) {
  const stats = {
    total: deliverables.length,
    approved: deliverables.filter((d: Deliverable) => d.status === "approved" || d.status === "published").length,
    inReview: deliverables.filter((d: Deliverable) => d.status === "in_review" || d.status === "changes_requested").length,
    overdue: deliverables.filter(isOverdue).length,
  }
  
  return (
    <div className="space-y-6">
      {/* Agency stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Planes" value={plans.length} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Entregables" value={stats.total} icon={<ClipboardList className="h-4 w-4" />} />
        <MetricCard label="Aprobados" value={stats.approved} icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard label="Atrasados" value={stats.overdue} icon={<AlertCircle className="h-4 w-4" />} danger={stats.overdue > 0} />
      </div>

      {/* Plans list */}
      <Card>
        <CardHeader>
          <CardTitle>Planes de {agency.name}</CardTitle>
          <CardDescription>Haz clic en un plan para ver su kanban y entregas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.length === 0 ? (
            <Empty message="Esta agencia no tiene planes de producción." />
          ) : (
            plans.map((plan: ProductionPlan) => {
              const items = planItems.filter((item: PlanItem) => item.plan_id === plan.id)
              const planDelivs = deliverables.filter((d: Deliverable) => d.plan_id === plan.id)
              const approved = planDelivs.filter((d: Deliverable) => d.status === "approved" || d.status === "published").length
              const overdue = planDelivs.filter(isOverdue).length
              
              return (
                <button
                  key={plan.id}
                  onClick={() => onPlanClick(plan.id)}
                  className="w-full text-left rounded-xl border p-4 transition-colors hover:bg-muted/50 hover:border-primary/30"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.period_start} - {plan.period_end} · {plan.period_type}</div>
                    </div>
                    <div className="flex gap-2">
                      {overdue > 0 && <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">{overdue} atrasados</Badge>}
                      <Badge variant="outline">{approved}/{planDelivs.length} aprobados</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {items.map((item: PlanItem) => <Badge key={item.id} variant="secondary" className="text-xs">{item.deliverable_type}: {item.target_quantity}</Badge>)}
                  </div>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Plan Kanban view with drag & drop - uses configurable stages
interface PlanKanbanViewProps {
  stages: PlanStage[]
  deliverables: Deliverable[]
  onDragEnd: (result: DropResult) => void
  onEdit: (deliverable: Deliverable) => void
  onEditStage: (stage: PlanStage) => void
  onDeleteStage: (stageId: string) => void
  onCreateStage: () => void
  onCreateDeliverable: (stageId: string | null) => void
  updatingId: string | null
  canManage: boolean
}

function PlanKanbanView({ stages, deliverables, onDragEnd, onEdit, onEditStage, onDeleteStage, onCreateStage, onCreateDeliverable, updatingId, canManage }: PlanKanbanViewProps) {
  // Group deliverables by stage_id
  const deliverablesByStage = useMemo(() => {
    const map = new Map<string | null, Deliverable[]>()
    map.set(null, []) // Unassigned
    stages.forEach(s => map.set(s.id, []))
    deliverables.forEach(d => {
      const key = d.stage_id
      const arr = map.get(key) || map.get(null)!
      arr.push(d)
    })
    return map
  }, [deliverables, stages])

  const unassignedItems = deliverablesByStage.get(null) || []
  const hasUnassigned = unassignedItems.length > 0

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {/* Show unassigned column FIRST if there are items without stage */}
        {hasUnassigned && (
          <Droppable droppableId="unassigned">
            {(provided: DroppableProvided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex-shrink-0 w-64 md:w-72">
                <Card className="min-h-[280px] bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardHeader className="py-3 px-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Sin etapa
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/40">{unassignedItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pb-3">
                    {unassignedItems.map((deliverable, index) => (
                      <Draggable key={deliverable.id} draggableId={deliverable.id} index={index} isDragDisabled={!canManage}>
                        {(dragProvided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`rounded-lg border bg-card p-2 shadow-sm cursor-grab text-sm ${snapshot.isDragging ? 'ring-2 ring-primary' : ''}`}
                          >
                            <DeliverableCardContent deliverable={deliverable} onEdit={onEdit} updating={updatingId === deliverable.id} canManage={canManage} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              </div>
            )}
          </Droppable>
        )}

        {stages.map((stage) => {
          const items = deliverablesByStage.get(stage.id) || []
          return (
            <Droppable key={stage.id} droppableId={stage.id}>
              {(provided: DroppableProvided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex-shrink-0 w-64 md:w-72">
                  <Card className="min-h-[280px] bg-muted/20">
                    <CardHeader className="py-3 px-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {stage.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />}
                          <span className="truncate max-w-[120px]">{stage.name}</span>
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreHorizontal className="h-3 w-3" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onCreateDeliverable(stage.id)}><Plus className="h-4 w-4 mr-2" />Agregar entrega</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEditStage(stage)}><Edit3 className="h-4 w-4 mr-2" />Editar etapa</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDeleteStage(stage.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Eliminar etapa</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 px-3 pb-3">
                      {items.map((deliverable, index) => (
                        <Draggable key={deliverable.id} draggableId={deliverable.id} index={index} isDragDisabled={!canManage}>
                          {(dragProvided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`rounded-lg border bg-card p-2 shadow-sm cursor-grab text-sm transition-shadow ${snapshot.isDragging ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
                            >
                              <DeliverableCardContent deliverable={deliverable} onEdit={onEdit} updating={updatingId === deliverable.id} canManage={canManage} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                          Arrastra entregas aquí
                        </div>
                      )}
                      {canManage && (
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground text-xs h-8" size="sm" onClick={() => onCreateDeliverable(stage.id)}>
                          <Plus className="h-3 w-3 mr-1" />Agregar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </Droppable>
          )
        })}

        {/* Add stage button */}
        {canManage && (
          <div className="flex-shrink-0 w-64 md:w-72">
            <Button variant="outline" className="w-full h-[280px] border-dashed text-xs" onClick={onCreateStage}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar etapa
            </Button>
          </div>
        )}
      </div>
    </DragDropContext>
  )
}

// Deliverable card content (reusable)
function DeliverableCardContent({ deliverable, onEdit, updating, canManage }: { deliverable: Deliverable; onEdit: (d: Deliverable) => void; updating: boolean; canManage: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-tight text-sm">{deliverable.title}</div>
          {deliverable.description && <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{deliverable.description}</div>}
        </div>
        {canManage && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onEdit(deliverable) }}>
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-xs">{deliverable.deliverable_type}</Badge>
        {deliverable.channel && <Badge variant="outline" className="text-xs">{deliverable.channel}</Badge>}
        {isOverdue(deliverable) && <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 text-xs">Atrasado</Badge>}
      </div>
      {deliverable.due_date && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" /> {deliverable.due_date}
        </div>
      )}
    </>
  )
}

// Plan table view
function PlanTableView({ stages, deliverables, brandById, onEdit, updatingId, canManage }: { stages: PlanStage[]; deliverables: Deliverable[]; brandById: any; onEdit: (d: Deliverable) => void; updatingId: string | null; canManage: boolean }) {
  const stageById = useMemo(() => new Map(stages.map(s => [s.id, s])), [stages])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entregas del plan</CardTitle>
        <CardDescription>Vista de tabla con todos los entregables de este plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Entregable</th>
                <th className="py-3 pr-4">Tipo</th>
                <th className="py-3 pr-4">Canal</th>
                <th className="py-3 pr-4">Etapa</th>
                <th className="py-3 pr-4">Prioridad</th>
                <th className="py-3 pr-4">Vence</th>
                <th className="py-3 pr-4">Link</th>
                <th className="py-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d: Deliverable) => {
                const stage = d.stage_id ? stageById.get(d.stage_id) : null
                return (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{d.title}</div>
                      {d.notes && <div className="text-xs text-muted-foreground line-clamp-1">{d.notes}</div>}
                    </td>
                    <td className="py-3 pr-4">{d.deliverable_type}</td>
                    <td className="py-3 pr-4">{d.channel || "—"}</td>
                    <td className="py-3 pr-4">
                      {stage ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          {stage.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />}
                          {stage.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Sin etapa</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 capitalize">{d.priority}</td>
                    <td className="py-3 pr-4">
                      <span className={isOverdue(d) ? "font-medium text-red-600" : ""}>{d.due_date || "—"}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {d.external_url ? (
                        <a href={d.external_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {canManage && (
                        <Button size="sm" variant="outline" onClick={() => onEdit(d)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {deliverables.length === 0 && <Empty message="No hay entregas en este plan." />}
        </div>
      </CardContent>
    </Card>
  )
}

// Create deliverable dialog
function CreateDeliverableDialog({ open, onClose, onCreate, stageId, stages, creating }: { 
  open: boolean
  onClose: () => void
  onCreate: (title: string, stageId: string | null) => void
  stageId: string
  stages: PlanStage[]
  creating: boolean 
}) {
  const [title, setTitle] = useState("")
  const [selectedStageId, setSelectedStageId] = useState(stageId)
  
  // Update selected stage when stageId prop changes
  useEffect(() => { setSelectedStageId(stageId) }, [stageId])
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onCreate(title, selectedStageId || null)
    setTitle("")
  }
  
  const stageName = stages.find(s => s.id === selectedStageId)?.name || "Sin etapa"
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear entregable</DialogTitle>
          <DialogDescription>Se creará en la etapa: {stageName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Título">
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Nombre del entregable" 
              required 
              autoFocus
            />
          </Field>
          <Field label="Etapa">
            <select 
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
            >
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={creating || !title.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Stage edit/create dialog
function StageDialog({ open, onClose, stage, form, setForm, onSave, saving }: {
  open: boolean
  onClose: () => void
  stage: PlanStage | null
  form: { name: string; color: string }
  setForm: (form: { name: string; color: string }) => void
  onSave: () => void
  saving: boolean
}) {
  const colors = ["#94a3b8", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4"]
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stage ? "Editar etapa" : "Nueva etapa"}</DialogTitle>
          <DialogDescription>{stage ? "Modifica el nombre y color de la etapa." : "Agrega una nueva etapa al kanban."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Nombre">
            <Input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              placeholder="Nombre de la etapa" 
              autoFocus
            />
          </Field>
          <Field label="Color">
            <div className="flex gap-2 flex-wrap">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {stage ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Stages manager dialog - full control over stages
function StagesManagerDialog({ open, onClose, stages, templates, onCreateStage, onEditStage, onDeleteStage, onReorderStage, onApplyTemplate }: {
  open: boolean
  onClose: () => void
  stages: PlanStage[]
  templates: StageTemplate[]
  onCreateStage: () => void
  onEditStage: (stage: PlanStage) => void
  onDeleteStage: (stageId: string) => void
  onReorderStage: (stageId: string, direction: 'up' | 'down') => void
  onApplyTemplate: (templateId: string) => void
}) {
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar etapas</DialogTitle>
          <DialogDescription>Administra las columnas del kanban para este plan.</DialogDescription>
        </DialogHeader>
        
        {/* Templates */}
        <div className="space-y-3">
          <Label>Aplicar plantilla</Label>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <Button key={t.id} variant="outline" size="sm" onClick={() => onApplyTemplate(t.id)}>
                {t.name}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Current stages */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label>Etapas actuales ({sortedStages.length})</Label>
            <Button size="sm" variant="outline" onClick={onCreateStage}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva
            </Button>
          </div>
          
          {sortedStages.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
              No hay etapas. Aplica una plantilla o crea una nueva.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {sortedStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
                  {stage.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />}
                  <span className="flex-1 text-sm font-medium truncate">{stage.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onReorderStage(stage.id, 'up')} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onReorderStage(stage.id, 'down')} disabled={index === sortedStages.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEditStage(stage)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDeleteStage(stage.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Quick launch dialog - create plan fast
function QuickLaunchDialog({ open, onClose, agencies, templates, onLaunch, launching }: {
  open: boolean
  onClose: () => void
  agencies: Agency[]
  templates: StageTemplate[]
  onLaunch: (agencyId: string, templateId: string | null) => void
  launching: boolean
}) {
  const [selectedAgency, setSelectedAgency] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Launch</DialogTitle>
          <DialogDescription>Crea un plan rápido con etapas predeterminadas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Agencia">
            <select 
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
            >
              <option value="">Seleccionar agencia...</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Plantilla de etapas">
            <select 
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Estándar (por defecto)</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} - {t.stages.length} etapas</option>)}
            </select>
          </Field>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onLaunch(selectedAgency, selectedTemplate || null)} disabled={!selectedAgency || launching}>
              {launching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SetupView(props: any) {
  const { 
    agencies, brands, 
    agencyForm, setAgencyForm, 
    brandForm, setBrandForm, 
    planForm, setPlanForm, draftItems, setDraftItems, 
    createAgency, createBrand, createPlan, 
    creatingAgency, creatingBrand, creatingPlan, 
    userSearchTerm, setUserSearchTerm, userSearchResults, searchingUsers, selectedResponsible, setSelectedResponsible 
  } = props
  const updateDraft = (id: string, changes: Partial<PlanItemDraft>) => setDraftItems((prev: PlanItemDraft[]) => prev.map((item) => item.local_id === id ? { ...item, ...changes } : item))
  const removeDraft = (id: string) => setDraftItems((prev: PlanItemDraft[]) => prev.length === 1 ? prev : prev.filter((item) => item.local_id !== id))

  return <div className="grid gap-6 xl:grid-cols-[0.7fr_0.7fr_1.6fr]">
    <Card><CardHeader><CardTitle>Nueva agencia</CardTitle><CardDescription>Agrega proveedores o agencias externas.</CardDescription></CardHeader><CardContent><form onSubmit={createAgency} className="space-y-3"><Field label="Nombre"><Input value={agencyForm.name} onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })} placeholder="Agencia / proveedor" required /></Field><Field label="Tipo"><Input value={agencyForm.type} onChange={(e) => setAgencyForm({ ...agencyForm, type: e.target.value })} placeholder="Video, diseño, social media..." /></Field><Field label="Contacto"><Input value={agencyForm.contact_name} onChange={(e) => setAgencyForm({ ...agencyForm, contact_name: e.target.value })} placeholder="Nombre de contacto" /></Field><Field label="Email"><Input type="email" value={agencyForm.contact_email} onChange={(e) => setAgencyForm({ ...agencyForm, contact_email: e.target.value })} placeholder="contacto@agencia.com" /></Field><Field label="Notas"><Textarea value={agencyForm.notes} onChange={(e) => setAgencyForm({ ...agencyForm, notes: e.target.value })} placeholder="Notas internas" /></Field><Button type="submit" className="w-full" disabled={creatingAgency}>{creatingAgency && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear agencia</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Nueva marca</CardTitle><CardDescription>Opcional, para organizar por cliente o marca.</CardDescription></CardHeader><CardContent><form onSubmit={createBrand} className="space-y-3"><Field label="Nombre"><Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="SAIA LABS / Cliente" required /></Field><Field label="Descripción"><Textarea value={brandForm.description} onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })} placeholder="Notas de la marca" /></Field><Button type="submit" className="w-full" disabled={creatingBrand}>{creatingBrand && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear marca</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Crear plan flexible</CardTitle><CardDescription>Un plan puede tener cantidades, piezas específicas o una mezcla de ambas.</CardDescription></CardHeader><CardContent><form onSubmit={createPlan} className="space-y-5"><div className="grid gap-3 md:grid-cols-2"><Field label="Nombre del plan" className="md:col-span-2"><Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Social media mensual - Mayo" required /></Field><Field label="Agencia"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.agency_id} onChange={(e) => setPlanForm({ ...planForm, agency_id: e.target.value })} required><option value="">Seleccionar</option>{agencies.map((agency: Agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></Field><Field label="Marca"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.brand_id} onChange={(e) => setPlanForm({ ...planForm, brand_id: e.target.value })}><option value="">Sin marca</option>{brands.map((brand: Brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field><Field label="Responsable interno" className="md:col-span-2"><UserSearchField searchTerm={userSearchTerm} setSearchTerm={setUserSearchTerm} searchResults={userSearchResults} searching={searchingUsers} selectedUser={selectedResponsible} onSelectUser={setSelectedResponsible} onClearUser={() => setSelectedResponsible(null)} placeholder="Buscar usuario por email o nombre..." /></Field><Field label="Tipo de periodo"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.period_type} onChange={(e) => setPlanForm({ ...planForm, period_type: e.target.value })}><option value="monthly">Mensual</option><option value="weekly">Semanal</option><option value="campaign">Campaña</option><option value="custom">Personalizado</option></select></Field><Field label="Fechas"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planForm.date_strategy} onChange={(e) => setPlanForm({ ...planForm, date_strategy: e.target.value })}><option value="distributed">Distribuir automáticamente</option><option value="same_end">Misma fecha final para todos</option><option value="none">Sin fechas por ahora</option></select></Field><Field label="Inicio"><Input type="date" value={planForm.period_start} onChange={(e) => setPlanForm({ ...planForm, period_start: e.target.value })} required /></Field><Field label="Fin"><Input type="date" value={planForm.period_end} onChange={(e) => setPlanForm({ ...planForm, period_end: e.target.value })} required /></Field><Field label="Notas" className="md:col-span-2"><Textarea value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Brief o notas internas del plan" /></Field></div><div className="space-y-3"><div className="flex items-center justify-between"><div><Label>Ítems del plan</Label><p className="text-xs text-muted-foreground">Agrega 30 videos, piezas específicas o un plan mixto.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setDraftItems([...draftItems, newPlanItemDraft()])}><Plus className="mr-2 h-3 w-3" />Agregar ítem</Button></div>{draftItems.map((item: PlanItemDraft, index: number) => <div key={item.local_id} className="rounded-xl border p-3"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">Ítem {index + 1}</span><Button type="button" size="sm" variant="ghost" onClick={() => removeDraft(item.local_id)} disabled={draftItems.length === 1}><Trash2 className="h-3 w-3" /></Button></div><div className="grid gap-3 md:grid-cols-3"><Field label="Tipo"><Input list="deliverable-types" value={item.deliverable_type} onChange={(e) => updateDraft(item.local_id, { deliverable_type: e.target.value })} required /><datalist id="deliverable-types">{DEFAULT_TYPES.map((type) => <option key={type} value={type} />)}</datalist></Field><Field label="Cantidad"><Input type="number" min="1" max="250" value={item.target_quantity} onChange={(e) => updateDraft(item.local_id, { target_quantity: e.target.value })} required /></Field><Field label="Nombres"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={item.naming_mode} onChange={(e) => updateDraft(item.local_id, { naming_mode: e.target.value as PlanItemDraft["naming_mode"] })}><option value="numbered">Nombre base + número</option><option value="same">Mismo nombre para todos</option></select></Field><Field label="Nombre base"><Input value={item.title_base} onChange={(e) => updateDraft(item.local_id, { title_base: e.target.value })} placeholder="Video, Copy LinkedIn, Reporte mensual..." /></Field><Field label="Canal"><Input value={item.channel} onChange={(e) => updateDraft(item.local_id, { channel: e.target.value })} placeholder="Instagram, TikTok, LinkedIn" /></Field><Field label="Formato"><Input value={item.format} onChange={(e) => updateDraft(item.local_id, { format: e.target.value })} placeholder="1080x1920, texto, PDF/link" /></Field><Field label="Notas" className="md:col-span-3"><Textarea value={item.notes} onChange={(e) => updateDraft(item.local_id, { notes: e.target.value })} placeholder="Notas para este tipo de entregable" /></Field></div></div>)}</div><Button type="submit" className="w-full" disabled={creatingPlan || agencies.length === 0}>{creatingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear plan y generar entregables</Button>{agencies.length === 0 && <p className="text-xs text-muted-foreground">Primero crea al menos una agencia.</p>}</form></CardContent></Card>
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
