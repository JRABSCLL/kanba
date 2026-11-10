'use client'

import {useEffect,useState} from 'react'
import {useUser} from '@/components/user-provider'
import {supabase} from '@/lib/supabase'
import {refreshProductionData,useProductionData,workflowMode} from '@/lib/production-workflow'
import {AgencyProductionModule} from './agency-production-module'
import {DeliverableDetail} from './deliverable-detail'
import {QuickField,QuickLink} from './quick-edit'
import {CommitmentSummary} from './commitment-summary'
import {MoveDecision} from './workflow-controls'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'

// Recovery uses the same secured commands; no legacy direct status/URL writes.
export function ProductionEntry(){
 const {user}=useUser(),data=useProductionData()
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[planId,setPlanId]=useState(''),[detail,setDetail]=useState<string|null>(null)
 useEffect(()=>{
  if(!user?.is_active)return
  let cancelled=false
  async function load(){try{await refreshProductionData(user!.id);if(!cancelled){setReady(true);setError('')}}catch(e){if(!cancelled)setError((e as Error).message)}}
  void load()
  const timer=setInterval(async()=>{const r=await supabase.from('production_workflow_settings').select('mode').single();if(!cancelled&&!r.error&&r.data.mode!==workflowMode())void load()},5000)
  const changed=()=>{if(workflowMode()!=='versions')void load()};window.addEventListener('production-deliverable-change',changed)
  return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('production-deliverable-change',changed)}
 },[user?.id,user?.is_active])
 if(error)return <p role="alert" className="p-6 text-sm">No se pudo cargar producción: {error}</p>
 if(!ready)return <p className="p-6 text-sm text-muted-foreground">Cargando producción…</p>
 const mode=workflowMode()
 if(mode==='versions')return <AgencyProductionModule/>
 const plan=data.production_plans.find(p=>p.id===planId)||data.production_plans[0]
 const rows=data.production_deliverables.filter(d=>d.plan_id===plan?.id),readOnly=mode==='read_only'
 return <div className="space-y-4 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Producción de agencias</h1><p className="text-sm text-muted-foreground">{readOnly?'Solo lectura durante la recuperación.':'Vista de recuperación · las etapas se mueven manualmente.'}</p></div><Button variant="outline" onClick={()=>void refreshProductionData()}>Actualizar</Button></div>
 <MoveDecision onChange={()=>void refreshProductionData()}/>
 <select aria-label="Plan" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={plan?.id||''} onChange={e=>setPlanId(e.target.value)}>{data.production_plans.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>
 {plan&&<CommitmentSummary plan={plan} items={data.production_plan_items} rows={rows} onChange={()=>void refreshProductionData()}/>}
 <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/40 text-left"><tr>{['Entrega','Etapa','Enlace',''].map((h,i)=><th key={i} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3"><QuickField id={r.id} field="title" label="Título" value={r.title} disabled={readOnly}/></td><td className="p-3"><QuickField id={r.id} field="stage_id" label="Etapa" value={r.stage_id} disabled={readOnly} options={[{value:'',label:'Sin etapa'},...data.production_plan_stages.filter(s=>s.plan_id===plan?.id).map(s=>({value:s.id,label:s.name}))]}/></td><td className="p-3"><QuickLink id={r.id} url={r.external_url} disabled={readOnly} onHistory={()=>setDetail(r.id)}/></td><td className="p-3"><Button size="sm" variant="ghost" onClick={()=>setDetail(r.id)}>Ver detalle</Button></td></tr>)}</tbody></table></div>
 <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader className="sr-only"><DialogTitle>Detalle del entregable</DialogTitle><DialogDescription>Información e historial conservados</DialogDescription></DialogHeader>{detail&&<DeliverableDetail id={detail} statuses={[]} onChange={()=>void refreshProductionData()}/>}</DialogContent></Dialog></div>
}
