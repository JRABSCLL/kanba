"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Send, Trash2, Loader2, MessageSquare } from "lucide-react"

interface DeliverableComment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null
}

function timeAgo(dateString: string) {
  const diffH = (Date.now() - new Date(dateString).getTime()) / 3.6e6
  if (diffH < 1) {
    const m = Math.floor(diffH * 60)
    return m <= 1 ? "Ahora" : `hace ${m} min`
  }
  if (diffH < 24) return `hace ${Math.floor(diffH)} h`
  return new Date(dateString).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

export function DeliverableComments({ deliverableId, currentUserId }: { deliverableId: string; currentUserId: string }) {
  const [comments, setComments] = useState<DeliverableComment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId])

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from("deliverable_comments")
        .select("*, profiles:user_id (id, email, full_name, avatar_url)")
        .eq("deliverable_id", deliverableId)
        .order("created_at", { ascending: true })
      if (error) throw error
      setComments((data || []) as any)
    } catch (e: any) {
      console.error("Error cargando comentarios:", e)
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from("deliverable_comments").insert({
        deliverable_id: deliverableId,
        user_id: currentUserId,
        content: text.trim(),
      })
      if (error) throw error
      setText("")
      await load()
    } catch (e: any) {
      toast.error(e.message || "No se pudo agregar el comentario")
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este comentario?")) return
    try {
      const { error } = await supabase.from("deliverable_comments").delete().eq("id", id)
      if (error) throw error
      await load()
    } catch (e: any) {
      toast.error(e.message || "No se pudo eliminar")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comentarios{comments.length ? ` (${comments.length})` : ""}
      </div>

      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un comentario…"
          rows={2}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={submitting || !text.trim()}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Comentar
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : comments.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">Aún no hay comentarios.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                {c.profiles?.avatar_url ? <AvatarImage src={c.profiles.avatar_url} alt="" /> : null}
                <AvatarFallback className="text-[10px]">
                  {(c.profiles?.full_name || c.profiles?.email || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{c.profiles?.full_name || c.profiles?.email || "Usuario"}</span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  {c.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Eliminar comentario"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="mt-1 rounded-lg bg-muted/50 p-2 text-sm">
                  <p className="whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
