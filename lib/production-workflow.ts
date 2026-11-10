'use client'

import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

export type Row = Record<string, any>
export type Version = { id: string; number: number; title: string; links: string[]; note: string; status: string; created_at: string; created_by?: string; is_legacy?: boolean; legacy_snapshot?: Record<string, unknown>; approval_origin?: 'historical'|'verified'; events: { at: string; text: string; actor_id?: string; details?: {before_links?: string[]} }[]; submitted_at?: string; approved_at?: string; approval_revoked_at?: string; published_at?: string; publication_url?: string }
type Store = Record<string, Row[]>
const empty: Store = {production_plans: [], production_deliverables: [], production_plan_items: [], production_plan_stages: [], production_stage_templates: [], production_workflow_settings: [], profiles: [], agencies: [], brands: []}
let snapshot = empty
let owner: string | null = null
let generation = 0
const listeners = new Set<() => void>()
function notify() { listeners.forEach(listener => listener()) }
export function db(): Store { return typeof window === 'undefined' ? empty : snapshot }
export function useProductionData() { return useSyncExternalStore(listener => { listeners.add(listener); return () => {listeners.delete(listener)} }, db, () => empty) }
export function clearProductionData() { generation++; snapshot = empty; owner = null; notify() }
supabase.auth.onAuthStateChange((_event, session) => { if (owner && owner !== session?.user.id) clearProductionData() })

export async function refreshProductionData(userId?: string): Promise<Store> {
 const id = userId || (await supabase.auth.getUser()).data.user?.id
 if (!id) { clearProductionData(); throw new Error('Inicia sesión para continuar') }
 if (owner !== id) { clearProductionData(); owner = id }
 const ticket = ++generation
 const tables = Object.keys(empty)
 const results = await Promise.all(tables.map(table => table === 'profiles'
  ? supabase.from(table).select('id,full_name,role,user_type,is_active,agency_id').eq('is_active',true)
  : supabase.from(table).select(table === 'production_deliverables' ? '*,versions:production_versions(*,events:production_version_events(*))' : '*')))
 const failure = results.find(result => result.error)?.error
 if (failure) throw new Error(failure.message)
 if (ticket !== generation || owner !== id) return snapshot
 const next: Store = {}
 tables.forEach((table, i) => {next[table] = results[i].data || []})
 for (const row of next.production_deliverables) {
  row.versions = (row.versions || []).sort((a: Version, b: Version) => a.number - b.number)
  const latest = row.versions.at(-1)
  row.status = latest?.status === 'draft' ? (latest.is_legacy && row.revision === 0 ? row.status : 'pending') : latest?.status || row.status
  row.versions.forEach((v: Version) => v.events.sort((a,b) => a.at.localeCompare(b.at)))
 }
 next.production_plan_stages.sort((a,b) => a.position-b.position)
 next.production_stage_templates.sort((a,b) => Number(b.is_system)-Number(a.is_system))
 snapshot = next; notify(); return next
}
export async function command(action: string, id: string, payload: Row = {}) {
 const { data, error } = await supabase.rpc('production_command', {p_command: action, p_id: id, p_payload: payload})
 if (error) {
  if (error.code === 'PT409') await refreshProductionData().catch(() => {})
  throw new Error(error.message)
 }
 await refreshProductionData()
 window.dispatchEvent(new Event('production-deliverable-change'))
 return data?.message || 'Guardado'
}
export const REVIEW_ACTIONS = [{value:'in_review',label:'Al enviar a revisión'},{value:'changes_requested',label:'Al solicitar ajustes'},{value:'approved',label:'Al aprobar'},{value:'published',label:'Al publicar'}] as const
export function currentVersions(id: string): Version[] { return db().production_deliverables.find(d => d.id === id)?.versions || [] }
export function hasApproval(row: Row) { return (row.versions || []).some((v: Version) => v.approved_at && !v.approval_revoked_at) }
export function hasHistoricalApproval(row: Row) { return (row.versions || []).some((v: Version) => v.approval_origin === 'historical' && v.approved_at && !v.approval_revoked_at) }
export function workflowMode() { return db().production_workflow_settings[0]?.mode || 'read_only' }
export function qualifies(row: Row, criterion = 'approved') { const vv: Version[] = row.versions || []; return criterion === 'delivered' ? vv.some(v => v.submitted_at) : criterion === 'published' ? vv.some(v => v.published_at && (v.publication_url || v.is_legacy)) : hasApproval(row) }
export function metric(plans: Row[], rows: Row[], items: Row[]) {
 let target = 0, done = 0
 for (const p of plans) for (const group of items.filter(i => i.plan_id === p.id)) {
  target += group.target_quantity
  done += Math.min(group.target_quantity, rows.filter(r => r.plan_id === p.id && r.plan_item_id === group.id && qualifies(r,p.criterion)).length)
 }
 return {target,done,percent:target ? Math.round(done/target*100) : null}
}
function rowFor(id: string) {const row = db().production_deliverables.find(d => d.id === id); if (!row) throw new Error('Entrega no disponible. Actualiza el plan.'); return row}
export async function addVersion(id: string, title: string, links: string[], note: string) {return command('add_version',id,{links,note,revision:rowFor(id).revision})}
export async function updateVersion(id: string, versionId: string, patch: Partial<Version>) {return command('edit_links',id,{version_id:versionId,links:patch.links,revision:rowFor(id).revision})}
export async function editPrimaryLink(id: string, url: string) {const version=currentVersions(id).at(-1);return command('edit_links',id,{version_id:version?.id||null,links:[url,...(version?.links.slice(1)||[])],revision:rowFor(id).revision})}
export async function versionAction(id: string, versionId: string, action: string, publicationUrl?: string) {return command('review',id,{version_id:versionId,action,publication_url:publicationUrl,revision:rowFor(id).revision})}
export async function saveRules(kind:'plan'|'template',id:string,rules:Row) {return command(kind==='plan'?'plan_rules':'template_rules',id,{rules})}
export async function bindTemplate(planId:string,templateId:string,_stages:Row[]) {return command('bind_template',planId,{template_id:templateId})}
export async function setGoal(planId:string,quantity:number,criterion:string) {return command('goal',planId,{quantity,criterion})}
export type StageMove = {id:string;stageId:string|null;versionId:string|null;revision:number;actions:string[];unchanged:boolean}
export function prepareStageMove(id:string,stageId:string|null):StageMove {
 const row=rowFor(id),version:Version|undefined=row.versions?.at(-1),plan=db().production_plans.find(p=>p.id===row.plan_id)
 if (!plan || (stageId && !db().production_plan_stages.some(s=>s.id===stageId&&s.plan_id===plan.id))) throw new Error('La etapa ya no está disponible en este plan')
 const actions=(workflowMode()==='compatibility'?[]:REVIEW_ACTIONS).filter(a=>stageId&&plan.rules?.[a.value]===stageId).map(a=>a.value).filter(action=>{
  if(!version)return false
  if(action==='in_review')return version.status!=='in_review'&&!(version.approved_at&&!version.approval_revoked_at)
  if(action==='approved')return !!version.submitted_at&&!(version.approved_at&&!version.approval_revoked_at)
  return !!version.submitted_at
 })
 return {id,stageId,versionId:version?.id||null,revision:row.revision,actions,unchanged:row.stage_id===stageId}
}
export async function completeStageMove(move:StageMove,action?:string) {return command('move',move.id,{stage_id:move.stageId,version_id:move.versionId,revision:move.revision,action})}
