'use client'
import {useEffect,useState} from 'react'
import {db,qualifies,useProductionData} from '@/lib/production-workflow'
import {QuickField} from './quick-edit'
import {VersionHistory} from './version-history'
export function DeliverableDetail({id,statuses,onChange}:{id:string;statuses:readonly {value:string;label:string}[];onChange:()=>void}){
 useProductionData()
 const [,refresh]=useState(0)
 useEffect(()=>{const update=()=>refresh(n=>n+1);window.addEventListener('production-deliverable-change',update);return()=>window.removeEventListener('production-deliverable-change',update)},[])
 const row=db().production_deliverables.find(d=>d.id===id)
 if(!row)return null
 const hasGoal=db().production_plan_items.some(i=>i.id===row.plan_item_id&&i.plan_id===row.plan_id&&i.target_quantity>0)
 const fields=[['Etapa','stage_id',[{value:'',label:'Sin etapa'},...db().production_plan_stages.filter(s=>s.plan_id===row.plan_id).map(s=>({value:s.id,label:s.name}))]],['Responsable','responsible_internal_id',[{value:'',label:'Sin asignar'},...db().profiles.filter(p=>p.is_active&&(p.role==='admin'||p.user_type==='internal')).map(p=>({value:p.id,label:p.full_name}))]],['Fecha límite','due_date'],['Prioridad','priority',[{value:'low',label:'Baja'},{value:'medium',label:'Media'},{value:'high',label:'Alta'}]],['Tipo','deliverable_type'],['Canal','channel'],['Formato','format']] as const
 return <div className="space-y-4"><div className="pr-6 text-xl font-semibold leading-snug"><QuickField id={id} field="title" value={row.title} label="Título"/></div><div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">{fields.map(([label,field,options])=><div key={field} className="min-w-0 space-y-1.5"><p className="text-xs text-muted-foreground">{label}</p><div className="text-sm"><QuickField id={id} field={field} value={row[field]} label={label} type={field==='due_date'?'date':'text'} options={options?[...options]:undefined}/></div></div>)}</div><div className="space-y-2 border-t pt-4"><p className="text-xs text-muted-foreground">Descripción</p><QuickField id={id} field="description" value={row.description} label="Descripción" type="multiline"/></div><div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>Cumplimiento · {{approved:'Aprobación',delivered:'Entrega',published:'Publicación'}[db().production_plans.find(p=>p.id===row.plan_id)?.criterion as 'approved']||'Aprobación'}</span><span>{!hasGoal?'Sin meta':qualifies(row,db().production_plans.find(p=>p.id===row.plan_id)?.criterion||'approved')?'Cumplido':'Pendiente'}</span></div><VersionHistory id={id} onChange={()=>{refresh(n=>n+1);onChange()}}/><details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Notas{row.notes?' · 1':''}</summary><div className="mt-2"><QuickField id={id} field="notes" value={row.notes} label="Notas" type="multiline"/></div></details></div>
}
