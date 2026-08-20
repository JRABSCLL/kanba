/*
  # Notificaciones para entregables de agencia

  Avisa al responsable interno de un entregable cuando:
   - se le asigna como responsable, o
   - cambia el estado del entregable.
  No se auto-notifica (si quien hace el cambio es el propio responsable).

  ## Seguridad de diseño (importante)
  1. `notifications.type` tiene un CHECK cerrado. Antes de crear el trigger se
     AMPLÍA para admitir los tipos nuevos; si no, cada INSERT fallaría y haría
     ROLLBACK de la operación sobre el entregable.
  2. El INSERT de la notificación va dentro de un bloque con EXCEPTION: un fallo
     al notificar NUNCA debe impedir guardar el entregable. Notificar es
     secundario; el dato del usuario es lo primero.
*/

-- 1) Ampliar el CHECK de notifications.type (aditivo, no destructivo)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'task_assigned',
    'task_updated',
    'project_invited',
    'comment_added',
    'deliverable_assigned',
    'deliverable_status'
  ));

-- 2) Función del trigger
CREATE OR REPLACE FUNCTION public.create_deliverable_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  agency_name  text;
  status_label text;
  actor        uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  IF NEW.responsible_internal_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nunca dejar que un fallo al notificar rompa la operación del entregable.
  BEGIN
    SELECT a.name INTO agency_name
      FROM public.agencies AS a
     WHERE a.id = NEW.agency_id;

    -- Asignación como responsable (alta o cambio)
    IF (TG_OP = 'INSERT')
       OR (TG_OP = 'UPDATE' AND OLD.responsible_internal_id IS DISTINCT FROM NEW.responsible_internal_id) THEN
      IF NEW.responsible_internal_id <> actor THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          NEW.responsible_internal_id,
          'deliverable_assigned',
          'Nuevo entregable asignado',
          format('Eres responsable de "%s"%s',
                 NEW.title,
                 CASE WHEN agency_name IS NOT NULL THEN ' · ' || agency_name ELSE '' END),
          jsonb_build_object('deliverable_id', NEW.id, 'agency_id', NEW.agency_id)
        );
      END IF;
    END IF;

    -- Cambio de estado
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
      IF NEW.responsible_internal_id <> actor THEN
        status_label := CASE NEW.status
          WHEN 'pending'           THEN 'Pendiente'
          WHEN 'brief_sent'        THEN 'Brief enviado'
          WHEN 'in_production'     THEN 'En producción'
          WHEN 'delivered'         THEN 'Entregado'
          WHEN 'in_review'         THEN 'En revisión'
          WHEN 'changes_requested' THEN 'Cambios solicitados'
          WHEN 'approved'          THEN 'Aprobado'
          WHEN 'published'         THEN 'Publicado'
          WHEN 'paused'            THEN 'Pausado'
          WHEN 'cancelled'         THEN 'Cancelado'
          ELSE NEW.status
        END;

        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          NEW.responsible_internal_id,
          'deliverable_status',
          'Entregable actualizado',
          format('"%s" pasó a: %s', NEW.title, status_label),
          jsonb_build_object('deliverable_id', NEW.id, 'agency_id', NEW.agency_id, 'status', NEW.status)
        );
      END IF;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Se ignora a propósito: la notificación es secundaria.
    NULL;
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_deliverable_notification() FROM PUBLIC;

-- 3) Trigger único y canónico
DROP TRIGGER IF EXISTS deliverable_notification_trigger ON public.production_deliverables;
CREATE TRIGGER deliverable_notification_trigger
  AFTER INSERT OR UPDATE ON public.production_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.create_deliverable_notification();
