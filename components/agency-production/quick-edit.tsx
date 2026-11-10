'use client'
import {useState,useRef} from 'react'
import {Edit3,ExternalLink} from 'lucide-react'
import {toast} from 'sonner'
import {requestStageMove} from './workflow-controls'
import {VersionHistory} from './version-history'
import {Textarea} from '@/components/ui/textarea'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover'
import {supabase} from '@/lib/supabase'
import {currentVersions,editPrimaryLink,useProductionData,db,workflowMode} from '@/lib/production-workflow'
async function persist(id:string,field:string,value:string){
 if(field==='stage_id'){requestStageMove(id,value||null);return}
 if(['title','deliverable_type'].includes(field)&&!value.trim())throw new Error('Este campo es obligatorio')
 if(field==='external_url'&&value){try{if(!['http:','https:'].includes(new URL(value).protocol))throw 0}catch{throw new Error('Introduce un enlace http o https válido')}}
 if(field==='external_url'){await editPrimaryLink(id,value.trim());return}
 const row=db().production_deliverables.find(d=>d.id===id)
 const {error}=await supabase.from('production_deliverables').update({[field]:value.trim()||null}).eq('id',id).eq('revision',row?.revision).select('id').single()
 if(error)throw error
 window.dispatchEvent(new Event('production-deliverable-change'))
}
export function QuickField({id,field,value,label,type='text',options,disabled=false}:{id:string;field:string;value?:string|null;label:string;type?:string;options?:{value:string;label:string}[];disabled?:boolean}){
 useProductionData(); disabled=disabled||workflowMode()==='read_only'
 const cancel=useRef(false),saving=useRef(false)
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false)
 async function commit(next=draft){if(cancel.current||saving.current)return;if(field==='stage_id'){requestStageMove(id,next||null);setEditing(false);return}if(next===(value||'')){setEditing(false);return} saving.current=true;setBusy(true);try{await persist(id,field,next);setEditing(false);toast.success('Guardado')}catch(e){toast.error(e instanceof Error?e.message:'No se pudo guardar')}finally{saving.current=false;setBusy(false)}}
 if(options)return <select aria-label={label} value={value||''} disabled={disabled||busy} onChange={e=>commit(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
 if(editing&&type==='multiline')return <Textarea autoFocus aria-label={label} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={()=>commit()} onKeyDown={e=>{if(e.key==='Escape'){cancel.current=true;setEditing(false)};if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();commit()}}}/>
 if(editing)return <Input aria-label={label} autoFocus type={type} value={draft} disabled={busy} className="h-8 min-w-[120px] text-xs" onChange={e=>setDraft(e.target.value)} onBlur={()=>commit()} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit()}if(e.key==='Escape'){e.preventDefault();cancel.current=true;setEditing(false)}}}/>
 return <button type="button" disabled={disabled} aria-label={`Editar ${label}`} className="rounded px-1 -mx-1 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={()=>{cancel.current=false;setDraft(value||'');setEditing(true)}}>{value||'—'}</button>
}
export function QuickLink({id,url,onHistory,disabled=false}:{id:string;url?:string|null;onHistory:()=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false)
 useProductionData()
 disabled=disabled||workflowMode()==='read_only'
 const versions=currentVersions(id),latest=versions[versions.length-1]
 return <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs" onClick={e=>e.stopPropagation()}>
 {url&&<a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><ExternalLink className="h-3 w-3"/>Abrir</a>}
 {url&&<Popover><PopoverTrigger asChild><button type="button" title="Ver historial" aria-label={`Ver historial · V${latest?.number||1}`} className="rounded bg-muted px-1 text-[10px] leading-4 hover:bg-muted/70">V{latest?.number||1}</button></PopoverTrigger><PopoverContent align="end" className="w-80 max-h-[65vh] overflow-y-auto whitespace-normal" onClick={e=>e.stopPropagation()}><VersionHistory id={id} historyOnly onChange={()=>window.dispatchEvent(new Event('production-deliverable-change'))}/></PopoverContent></Popover>}
 {!disabled&&<Popover open={open} onOpenChange={v=>{setOpen(v);if(v)setDraft(url||'')}}><PopoverTrigger asChild><button type="button" aria-label={url?'Editar enlace':'Agregar enlace'} title={url?'Editar enlace':'Agregar enlace'} className="inline-flex items-center rounded p-0.5 hover:bg-muted">{url?<Edit3 className="h-3 w-3"/>:'+ Enlace'}</button></PopoverTrigger><PopoverContent className="w-80" onClick={e=>e.stopPropagation()}><>{(latest?.submitted_at||latest?.approved_at)&&<p className="mb-2 text-xs text-muted-foreground">Al cambiar el enlace, esta versión vuelve a borrador.</p>}<form className="flex gap-2" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await persist(id,'external_url',draft);setOpen(false);toast.success('Enlace guardado')}catch(err){toast.error(err instanceof Error?err.message:'No se pudo guardar')}finally{setBusy(false)}}}><Input aria-label="URL" placeholder="https://…" autoFocus value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy}/><Button type="submit" size="sm" disabled={busy}>Guardar</Button></form></></PopoverContent></Popover>}
 </span>
}
