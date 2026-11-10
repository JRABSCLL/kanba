'use client'
import {useState} from 'react'
import {metric,setGoal,hasHistoricalApproval,hasApproval,workflowMode} from '@/lib/production-workflow'
import {Card,CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Badge} from '@/components/ui/badge'
import {useUser} from '@/components/user-provider'
import {toast} from 'sonner'
export function CommitmentSummary({plan,items,rows,onChange}:{plan:any;items:any[];rows:any[];onChange:()=>void}){
 const {user}=useUser();const canManage=workflowMode()==='versions'&&!!user?.is_active&&(user.role==='admin'||user.user_type==='internal')
 const [edit,setEdit]=useState(false),[quantity,setQuantity]=useState('3'),[criterion,setCriterion]=useState('approved')
 const planRows=rows.filter(r=>r.plan_id===plan.id),historical=planRows.filter(hasHistoricalApproval).length,unassigned=planRows.filter(r=>!r.plan_item_id&&hasApproval(r)).length
 const m=metric([plan],rows,items),groups=items.filter(x=>x.plan_id===plan.id)
 return <Card><CardContent className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Compromiso del plan</p><p className="text-xs text-muted-foreground">{m.target?`Criterio: ${plan.criterion==='published'?'publicación':plan.criterion==='delivered'?'entrega':'aprobación'} · ${plan.period_start} — ${plan.period_end}`:'Sin meta definida'}</p></div>{m.target?<Badge variant="outline">{m.done} / {m.target} · {m.percent}% cumplido</Badge>:canManage?<Button size="sm" variant="outline" onClick={()=>setEdit(!edit)}>Definir compromiso</Button>:<Badge variant="outline">Sin meta</Badge>}</div>{(historical>0||unassigned>0)&&<p className="mt-3 text-xs text-muted-foreground">{historical>0?`${historical} aprobación(es) histórica(s)`:''}{unassigned>0?` · ${unassigned} aprobación(es) sin meta asociada`:''}</p>}{m.target>0&&<div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{width:`${m.percent}%`}}/></div>}{groups.length>1&&<div className="flex flex-wrap gap-2 mt-3">{groups.map(g=><Badge key={g.id} variant="secondary">{g.deliverable_type}: {metric([plan],rows,[g]).done}/{g.target_quantity}</Badge>)}</div>}{edit&&<form className="grid gap-3 mt-4 sm:grid-cols-3 items-end" onSubmit={async e=>{e.preventDefault();try{await setGoal(plan.id,Number(quantity),criterion);setEdit(false);onChange()}catch(error){toast.error(error instanceof Error?error.message:'No se pudo guardar')}}}><div><Label htmlFor="goal">Cantidad comprometida</Label><Input id="goal" type="number" min="1" max="500" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></div><div><Label htmlFor="criterion">Criterio</Label><select id="criterion" value={criterion} onChange={e=>setCriterion(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="delivered">Entrega</option><option value="approved">Aprobación</option><option value="published">Publicación</option></select></div><Button type="submit">Guardar compromiso</Button></form>}</CardContent></Card>
}
