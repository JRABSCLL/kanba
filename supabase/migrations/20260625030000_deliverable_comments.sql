/*
  # Comentarios en entregables de agencia

  Tabla para discutir cada entregable (pedir cambios, aprobar, etc.), como las
  tareas de proyecto ya tienen `task_comments`.

  RLS:
   - Leer/crear: admins e internos (ven todo) y el usuario de la agencia dueña
     del entregable (solo lo suyo).
   - Editar/borrar: solo el autor del comentario.

  IMPORTANTE: aplicar esta migración en Supabase.
*/

CREATE TABLE IF NOT EXISTS public.deliverable_comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES public.production_deliverables(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  content        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliverable_comments_deliverable ON public.deliverable_comments(deliverable_id);

ALTER TABLE public.deliverable_comments ENABLE ROW LEVEL SECURITY;

-- Condición reutilizada: interno/admin, o usuario de la agencia dueña del entregable.
-- (Se escribe inline en cada policy.)

DROP POLICY IF EXISTS "deliverable_comments_select" ON public.deliverable_comments;
CREATE POLICY "deliverable_comments_select"
  ON public.deliverable_comments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_active
              AND (p.role = 'admin' OR p.user_type = 'internal'))
    OR EXISTS (SELECT 1 FROM public.production_deliverables d
               JOIN public.profiles p ON p.agency_id = d.agency_id
               WHERE d.id = deliverable_comments.deliverable_id
                 AND p.id = auth.uid() AND p.user_type = 'agency')
  );

DROP POLICY IF EXISTS "deliverable_comments_insert" ON public.deliverable_comments;
CREATE POLICY "deliverable_comments_insert"
  ON public.deliverable_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.is_active
                AND (p.role = 'admin' OR p.user_type = 'internal'))
      OR EXISTS (SELECT 1 FROM public.production_deliverables d
                 JOIN public.profiles p ON p.agency_id = d.agency_id
                 WHERE d.id = deliverable_comments.deliverable_id
                   AND p.id = auth.uid() AND p.user_type = 'agency')
    )
  );

DROP POLICY IF EXISTS "deliverable_comments_update_own" ON public.deliverable_comments;
CREATE POLICY "deliverable_comments_update_own"
  ON public.deliverable_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "deliverable_comments_delete_own" ON public.deliverable_comments;
CREATE POLICY "deliverable_comments_delete_own"
  ON public.deliverable_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());
