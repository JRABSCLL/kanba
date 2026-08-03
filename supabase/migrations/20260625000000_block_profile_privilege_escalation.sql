/*
  # Bloquear auto-promoción de privilegios en `profiles`

  ## Problema
  Todas las políticas RLS de UPDATE sobre `profiles` permiten que un usuario
  edite SU PROPIA fila con `WITH CHECK (auth.uid() = id)` — sin restringir qué
  columnas. Como las policies permisivas se combinan con OR, un usuario normal
  puede hacer desde el navegador:

      supabase.from('profiles').update({ role: 'admin' }).eq('id', <su_id>)

  ...y auto-promoverse a admin (o reactivarse, o cambiar user_type/agency_id).
  RLS por sí solo no puede comparar contra el valor anterior de la fila, así que
  se necesita un trigger.

  ## Solución
  Un trigger BEFORE UPDATE que:
   - Permite el update si NO cambió ninguna columna sensible
     (role, is_active, user_type, agency_id) → editar nombre/avatar sigue OK.
   - Si cambió alguna sensible, solo la deja pasar si quien ejecuta es un
     administrador aprobado. Si no, lanza excepción.

  Es idempotente y no depende de otras funciones (el chequeo de admin va inline
  vía SECURITY DEFINER, que bypasea RLS sin recursión — los triggers no se
  disparan en SELECT).
*/

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nada sensible cambió → permitir (editar full_name, avatar_url, etc.)
  IF NEW.role      IS NOT DISTINCT FROM OLD.role
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
     AND NEW.user_type IS NOT DISTINCT FROM OLD.user_type
     AND NEW.agency_id IS NOT DISTINCT FROM OLD.agency_id THEN
    RETURN NEW;
  END IF;

  -- Cambió una columna sensible: solo un admin aprobado puede hacerlo.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No autorizado: solo un administrador puede cambiar role, is_active, user_type o agency_id';
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
