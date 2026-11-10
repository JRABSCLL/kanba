'use client'
import {useState,useEffect,useRef} from 'react'
import {db,REVIEW_ACTIONS,saveRules,currentVersions,prepareStageMove,completeStageMove,StageMove} from '@/lib/production-workflow'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover'
import {VersionHistory} from './version-history'
import {toast} from 'sonner'
import {useUser} from '@/components/user-provider'
import {useProductionData} from '@/lib/production-workflow'
export const reviewLabels:Record<string,string>={pending:'Sin entrega',draft:'Borrador',delivered:'Entregado',in_review:'En revisión',changes_requested:'Cambios solicitados',approved:'Aprobado',published:'Publicado'}
export function ReviewControl({id}:{id:string}){useProductionData();const latest=currentVersions(id).at(-1);return <Popover><PopoverTrigger asChild><button type="button" onClick={e=>e.stopPropagation()} className="rounded-full bg-muted px-2 py-0.5 text-xs whitespace-nowrap" aria-label="Revisar entrega">{reviewLabels[latest?.status||'pending']||'Sin entrega'}</button></PopoverTrigger><PopoverContent className="w-96 max-w-[90vw] max-h-[70vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><VersionHistory id={id} onChange={()=>window.dispatchEvent(new Event('production-deliverable-change'))}/></PopoverContent></Popover>}
function RulesEditor({kind,id,onChange}:{kind:'plan'|'template';id:string;onChange:()=>void}){
 const row=db()[kind==='plan'?'production_plans':'production_stage_templates'].find(r=>r.id===id)!
 const [rules,setRules]=useState({...row.rules})
 const stages=kind==='plan'?db().production_plan_stages.filter(s=>s.plan_id===id).map(s=>({id:s.id,name:s.name})):row.stages.map((s:any,i:number)=>({id:s.key||row.id+'-'+(i+1),name:s.name}))
 return <form className="space-y-3" onSubmit={async e=>{e.preventDefault();try{await saveRules(kind,id,rules);onChange();toast.success('Reglas guardadas')}catch(e){toast.error((e as Error).message)}}}>{REVIEW_ACTIONS.map(a=><label key={a.value} className="flex items-center justify-between gap-3 text-sm"><span>{a.label}</span><select aria-label={a.label} className="h-9 max-w-[55%] rounded-md border bg-background px-2 text-sm" value={stages.some((s:any)=>s.id===rules[a.value])?rules[a.value]||'':''} onChange={e=>setRules({...rules,[a.value]:e.target.value||null})}><option value="">No mover</option>{stages.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>)}<Button size="sm" type="submit">Guardar reglas</Button></form>
}
export function WorkflowSettings({planId,onChange}:{planId?:string;onChange:()=>void}){
 useProductionData()
 const [template,setTemplate]=useState(db().production_stage_templates[0]?.id||'')
 return <div className="space-y-4 border-t pt-4">{planId&&<><h3 className="text-sm font-semibold">Movimientos automáticos de este plan</h3><RulesEditor key={planId} kind="plan" id={planId} onChange={onChange}/></>}<details><summary className="cursor-pointer text-sm font-medium">Reglas de las plantillas</summary><div className="space-y-3 pt-3"><select aria-label="Plantilla de reglas" className="h-9 w-full rounded-md border bg-background px-2" value={template} onChange={e=>setTemplate(e.target.value)}>{db().production_stage_templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><p className="text-xs text-muted-foreground">Se aplican a los nuevos planes. Los planes existentes conservan sus reglas.</p>{template&&<RulesEditor key={template} kind="template" id={template} onChange={onChange}/>}</div></details></div>
}
export function requestStageMove(id:string,stageId:string|null){window.dispatchEvent(new CustomEvent('production-stage-move',{detail:{id,stageId}}))}
export function MoveDecision({onChange}:{onChange:()=>void}){
 const {user}=useUser()
 const canReview=!!user?.is_active&&(user.role==='admin'||user.user_type==='internal')
 const reviewer=useRef(canReview);reviewer.current=canReview
 const busy=useRef(false)
 const [pending,setPending]=useState<StageMove|null>(null)
 const latestOnChange=useRef(onChange)
 useEffect(()=>{latestOnChange.current=onChange},[onChange])
 const changed=()=>{latestOnChange.current();window.dispatchEvent(new Event('production-deliverable-change'))}
 useEffect(()=>{
  const handler=async(event:Event)=>{
   if(busy.current)return;busy.current=true
   try{
    const detail=(event as CustomEvent).detail
    if(!detail||typeof detail.id!=='string'||!(detail.stageId===null||typeof detail.stageId==='string'))throw new Error('No se pudo identificar el movimiento.')
    const move=prepareStageMove(detail.id,detail.stageId)
    move.actions=move.actions.filter(a=>reviewer.current||!['approved','changes_requested','reopen'].includes(a))
    if(move.unchanged)return
    if(move.actions.length)setPending(move)
    else{await completeStageMove(move);changed();toast.success('Tarjeta movida')}
   }catch(error){toast.error(error instanceof Error?error.message:'No se pudo mover la tarjeta')}finally{busy.current=false}
  }
  window.addEventListener('production-stage-move',handler)
  return()=>window.removeEventListener('production-stage-move',handler)
 },[])
 const confirm=async(action?:string)=>{
  if(!pending||busy.current)return
  busy.current=true
  try{const message=await completeStageMove(pending,action);setPending(null);changed();toast.success(message)}
  catch(error){setPending(null);changed();toast.error(error instanceof Error?error.message:'No se pudo mover la tarjeta')}finally{busy.current=false}
 }
 const latest=pending?currentVersions(pending.id).at(-1):null
 const name=pending?db().production_plan_stages.find(s=>s.id===pending.stageId)?.name:''
 const actionLabels:Record<string,string>={in_review:'Enviar a revisión y mover',changes_requested:'Solicitar ajustes y mover',approved:`Aprobar V${latest?.number} y mover`}
 return <Dialog open={!!pending} onOpenChange={open=>{if(!open)setPending(null)}}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Mover a {name}</DialogTitle><DialogDescription>Elige si también quieres actualizar la revisión de la entrega.</DialogDescription></DialogHeader><div className="flex flex-col gap-2">{pending?.actions.filter(a=>a!=='published').map(action=><Button key={action} onClick={()=>confirm(action)}>{actionLabels[action]}</Button>)}{pending?.actions.includes('published')&&<p className="text-xs text-muted-foreground">La publicación se registra desde la entrega con su enlace.</p>}<Button variant="outline" onClick={()=>confirm()}>Solo mover</Button><Button variant="ghost" onClick={()=>setPending(null)}>Cancelar</Button></div></DialogContent></Dialog>
}
