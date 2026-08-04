/*
  # Notificaciones para entregables de agencia

  Igual que en tareas, avisa al responsable interno de un entregable cuando:
   - se le asigna como responsable (responsible_internal_id cambia hacia él), o
   - cambia el estado del entregable.
  No se auto-notifica (si el que hace el cambio es el propio responsable).

  IMPORTANTE: aplicar esta migración en Supabase para que surta efecto.
*/

CREATE OR REPLACE FUNCTION create_deliverable_notification()
RETURNS trigger AS $$
DECLARE
  agency_name text;
  status_label text;
BEGIN
  IF NEW.responsible_internal_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO agency_name FROM agencies WHERE id = NEW.agency_id;

  -- Asignación como responsable (nuevo o cambiado)
  IF (TG_OP = 'INSERT')
     OR (TG_OP = 'UPDATE' AND OLD.responsible_internal_id IS DISTINCT FROM NEW.responsible_internal_id) THEN
    IF NEW.responsible_internal_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000') THEN
      INSERT INTO notifications (user_id, type, title, message, data)
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
    IF NEW.responsible_internal_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000') THEN
      status_label := CASE NEW.status
        WHEN 'pending' THEN 'Pendiente'
        WHEN 'brief_sent' THEN 'Brief enviado'
        WHEN 'in_production' THEN 'En producción'
        WHEN 'delivered' THEN 'Entregado'
        WHEN 'in_review' THEN 'En revisión'
        WHEN 'changes_requested' THEN 'Cambios solicitados'
        WHEN 'approved' THEN 'Aprobado'
        WHEN 'published' THEN 'Publicado'
        WHEN 'paused' THEN 'Pausado'
        WHEN 'cancelled' THEN 'Cancelado'
        ELSE NEW.status
      END;
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        NEW.responsible_internal_id,
        'deliverable_status',
        'Entregable actualizado',
        format('"%s" pasó a: %s', NEW.title, status_label),
        jsonb_build_object('deliverable_id', NEW.id, 'agency_id', NEW.agency_id, 'status', NEW.status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deliverable_notification_trigger ON production_deliverables;
CREATE TRIGGER deliverable_notification_trigger
  AFTER INSERT OR UPDATE ON production_deliverables
  FOR EACH ROW EXECUTE FUNCTION create_deliverable_notification();
