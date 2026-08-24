/*
  # Arreglar los permisos (RLS) del módulo de Producción de Agencias

  ## Los tres problemas que resuelve

  1. **No se puede crear agencias ni marcas.** `agencies` y `brands` tienen RLS
     activo pero SOLO una política de SELECT. Sin política de INSERT, Postgres
     rechaza cualquier alta con:
       "new row violates row-level security policy for table agencies"
     La única agencia existente se creó desde el panel de Supabase (service
     role), que se salta el RLS.

  2. **Los usuarios internos no pueden crear planes.** La política de
     `production_plans` es:
       is_approved_admin(uid) OR (is_approved_user(uid) AND agency_id = get_user_agency_id(uid))
     Un interno no tiene agencia (`agency_id` NULL), así que la comparación da
     NULL y nunca pasa. Solo el admin podía crear planes, lo que contradice el
     modelo de permisos de la interfaz (admin + interno operan producción).

  3. **El aislamiento entre agencias no funciona.** Conviven políticas nuevas
     que filtran por agencia con políticas viejas del tipo
     "approved users can read X" que dan acceso a todo sin filtrar. Como las
     políticas permisivas se combinan con OR, las viejas anulan a las nuevas:
     un usuario de agencia podría leer los datos de las demás agencias.

  ## Modelo que queda (igual que la interfaz)
  | | Admin | Interno | Agencia |
  |---|---|---|---|
  | Crear/editar agencias y marcas | Sí | Sí | No |
  | Crear/editar planes y etapas   | Sí | Sí | No |
  | Crear/editar entregables       | Todos | Todos | Solo los de su agencia |
  | Borrar entregables             | Sí | Sí | No |
  | Leer                           | Todo | Todo | Solo lo de su agencia |

  ## Seguridad del cambio
  Los puntos 1 y 2 solo AÑADEN permisos a quien hoy no los tiene. El punto 3 es
  el único que quita algo, y quita el "ver datos de otras agencias", que hoy no
  debería tener nadie. Un admin no pierde acceso a nada en ningún caso.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Ayudante: ¿es admin o interno? (el equipo que opera la producción)
--    SECURITY DEFINER para poder leer profiles sin chocar con su propio RLS.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_internal_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND (role = 'admin' OR user_type = 'internal')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_internal_or_admin() TO authenticated;

-- get_user_agency_id existía sin search_path fijo; se endurece sin cambiar su
-- comportamiento (devuelve NULL si el usuario no tiene agencia).
CREATE OR REPLACE FUNCTION public.get_user_agency_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.profiles WHERE id = user_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AGENCIES — faltaban por completo las políticas de escritura
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approved users can read agencies" ON public.agencies;
DROP POLICY IF EXISTS "agencies_select" ON public.agencies;
DROP POLICY IF EXISTS "agencies_write" ON public.agencies;

-- Leer: el equipo ve todas; un usuario de agencia solo la suya.
CREATE POLICY "agencies_select" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    public.is_internal_or_admin()
    OR id = public.get_user_agency_id(auth.uid())
  );

-- Crear / editar / borrar: solo el equipo interno.
CREATE POLICY "agencies_write" ON public.agencies
  FOR ALL TO authenticated
  USING (public.is_internal_or_admin())
  WITH CHECK (public.is_internal_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BRANDS — mismo problema. Las marcas son del cliente, no de una agencia,
--    así que cualquier usuario activo puede leerlas (las necesita para ver sus
--    entregables); escribirlas queda para el equipo interno.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approved users can read brands" ON public.brands;
DROP POLICY IF EXISTS "brands_select" ON public.brands;
DROP POLICY IF EXISTS "brands_write" ON public.brands;

CREATE POLICY "brands_select" ON public.brands
  FOR SELECT TO authenticated
  USING (public.is_approved_user(auth.uid()));

CREATE POLICY "brands_write" ON public.brands
  FOR ALL TO authenticated
  USING (public.is_internal_or_admin())
  WITH CHECK (public.is_internal_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PRODUCTION_PLANS — el interno no podía crear planes
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approved users can read production plans" ON public.production_plans;
DROP POLICY IF EXISTS "Users can view production plans" ON public.production_plans;
DROP POLICY IF EXISTS "Users can manage production plans" ON public.production_plans;
DROP POLICY IF EXISTS "production_plans_select" ON public.production_plans;
DROP POLICY IF EXISTS "production_plans_write" ON public.production_plans;

CREATE POLICY "production_plans_select" ON public.production_plans
  FOR SELECT TO authenticated
  USING (
    public.is_internal_or_admin()
    OR agency_id = public.get_user_agency_id(auth.uid())
  );

-- El plan es el encargo: lo define el cliente, no el proveedor.
CREATE POLICY "production_plans_write" ON public.production_plans
  FOR ALL TO authenticated
  USING (public.is_internal_or_admin())
  WITH CHECK (public.is_internal_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PRODUCTION_DELIVERABLES — alinear con el modelo de la interfaz
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approved users can read production deliverables" ON public.production_deliverables;
DROP POLICY IF EXISTS "Users can view deliverables" ON public.production_deliverables;
DROP POLICY IF EXISTS "Users can create deliverables" ON public.production_deliverables;
DROP POLICY IF EXISTS "Users can update deliverables" ON public.production_deliverables;
DROP POLICY IF EXISTS "Admins can delete deliverables" ON public.production_deliverables;
DROP POLICY IF EXISTS "deliverables_select" ON public.production_deliverables;
DROP POLICY IF EXISTS "deliverables_insert" ON public.production_deliverables;
DROP POLICY IF EXISTS "deliverables_update" ON public.production_deliverables;
DROP POLICY IF EXISTS "deliverables_delete" ON public.production_deliverables;

CREATE POLICY "deliverables_select" ON public.production_deliverables
  FOR SELECT TO authenticated
  USING (
    public.is_internal_or_admin()
    OR agency_id = public.get_user_agency_id(auth.uid())
  );

-- La agencia puede crear entregables, pero solo dentro de su propia agencia.
CREATE POLICY "deliverables_insert" ON public.production_deliverables
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_internal_or_admin()
    OR agency_id = public.get_user_agency_id(auth.uid())
  );

-- La agencia reporta el avance de SUS entregables (estado, link, fecha).
CREATE POLICY "deliverables_update" ON public.production_deliverables
  FOR UPDATE TO authenticated
  USING (
    public.is_internal_or_admin()
    OR agency_id = public.get_user_agency_id(auth.uid())
  )
  WITH CHECK (
    public.is_internal_or_admin()
    OR agency_id = public.get_user_agency_id(auth.uid())
  );

-- Borrar es destructivo: solo el equipo interno.
CREATE POLICY "deliverables_delete" ON public.production_deliverables
  FOR DELETE TO authenticated
  USING (public.is_internal_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PRODUCTION_PLAN_ITEMS — quitar la lectura sin filtro y usar el ayudante
--    (las políticas antiguas comparaban user_type con 'admin', que NO es un
--     valor válido de user_type: los valores son 'internal' y 'agency'; el rol
--     admin vive en la columna `role`. Funcionaba de casualidad.)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approved users can read production plan items" ON public.production_plan_items;
DROP POLICY IF EXISTS "Admins and internal users can create plan items" ON public.production_plan_items;
DROP POLICY IF EXISTS "Admins and internal users can update plan items" ON public.production_plan_items;
DROP POLICY IF EXISTS "Admins and internal users can delete plan items" ON public.production_plan_items;
DROP POLICY IF EXISTS "plan_items_select" ON public.production_plan_items;
DROP POLICY IF EXISTS "plan_items_write" ON public.production_plan_items;

CREATE POLICY "plan_items_select" ON public.production_plan_items
  FOR SELECT TO authenticated
  USING (
    public.is_internal_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.production_plans p
      WHERE p.id = production_plan_items.plan_id
        AND p.agency_id = public.get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "plan_items_write" ON public.production_plan_items
  FOR ALL TO authenticated
  USING (public.is_internal_or_admin())
  WITH CHECK (public.is_internal_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PRODUCTION_PLAN_STAGES — sus políticas ya permiten a los internos, pero
--    usan la comparación errónea con user_type = 'admin'. Se normalizan.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Plan stages editable by admins" ON public.production_plan_stages;
DROP POLICY IF EXISTS "Plan stages readable by plan members" ON public.production_plan_stages;
DROP POLICY IF EXISTS "plan_stages_select" ON public.production_plan_stages;
DROP POLICY IF EXISTS "plan_stages_write" ON public.production_plan_stages;

CREATE POLICY "plan_stages_select" ON public.production_plan_stages
  FOR SELECT TO authenticated
  USING (
    public.is_internal_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.production_plans p
      WHERE p.id = production_plan_stages.plan_id
        AND p.agency_id = public.get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "plan_stages_write" ON public.production_plan_stages
  FOR ALL TO authenticated
  USING (public.is_internal_or_admin())
  WITH CHECK (public.is_internal_or_admin());
