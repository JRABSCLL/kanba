-- OrganizAPP — permisos granulares de usuario
--
-- Estas columnas YA existen en la base de datos de producción (se crearon
-- directamente desde el panel de Supabase). Esta migración las documenta de
-- forma idempotente para que un entorno nuevo (o una recreación de la DB)
-- quede consistente con el código:
--   - components/user-provider.tsx       (lee user_type, agency_id)
--   - app/dashboard/admin/users/page.tsx (asigna user_type / agency_id)
--   - components/agency-production/...    (isInternal / isAgency, filtrado por agencia)

-- user_type: distingue el tipo funcional del usuario aprobado.
--   'internal' → empleado interno (ve todo, gestiona producción)
--   'agency'   → contacto de una agencia externa (solo ve su agencia)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'internal';

-- agency_id: si el usuario es de tipo 'agency', a qué agencia pertenece.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_id uuid;

-- Constraint de valores válidos (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_type_check
      CHECK (user_type IN ('internal', 'agency'));
  END IF;
END $$;

-- FK opcional hacia agencies (idempotente). Se borra el vínculo si la agencia
-- se elimina, dejando al usuario sin agencia asignada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'agencies')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'profiles_agency_id_fkey'
     ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
