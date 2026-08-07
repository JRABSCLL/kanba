/*
  # Corregir funciones y triggers de notificaciones

  La migración `notifications_es` aplicada manualmente instaló una versión que
  usaba `project_invitation`, pero el constraint de `notifications.type` acepta
  `project_invited`. También creó triggers con nombres nuevos sin eliminar los
  originales, provocando ejecuciones duplicadas.

  Esta migración:
  - restaura las funciones compatibles con el esquema real;
  - evita notificar al propietario cuando se agrega como miembro al crear el proyecto;
  - elimina ambos juegos de triggers y deja uno canónico por evento.
*/

CREATE OR REPLACE FUNCTION public.create_task_assignment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  task_title text;
  project_name text;
  assigner_name text;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL)
     OR (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    task_title := NEW.title;

    SELECT p.name
      INTO project_name
      FROM public.projects AS p
      JOIN public.columns AS c ON c.project_id = p.id
     WHERE c.id = NEW.column_id;

    SELECT COALESCE(p.full_name, p.email)
      INTO assigner_name
      FROM public.profiles AS p
     WHERE p.id = auth.uid();

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.assigned_to,
      'task_assigned',
      'Nueva tarea asignada',
      format(
        '%s te asignó la tarea "%s" en el proyecto "%s"',
        COALESCE(assigner_name, 'Alguien'),
        task_title,
        COALESCE(project_name, 'un proyecto')
      ),
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', task_title,
        'project_name', project_name,
        'assigned_by', auth.uid(),
        'assigned_by_name', assigner_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_invitation_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  project_name text;
  inviter_name text;
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.invited_by IS NOT NULL
     AND NEW.user_id <> NEW.invited_by THEN
    SELECT p.name
      INTO project_name
      FROM public.projects AS p
     WHERE p.id = NEW.project_id;

    SELECT COALESCE(p.full_name, p.email)
      INTO inviter_name
      FROM public.profiles AS p
     WHERE p.id = NEW.invited_by;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'project_invited',
      'Invitación a proyecto',
      format(
        '%s te invitó a colaborar en el proyecto "%s"',
        COALESCE(inviter_name, 'Alguien'),
        COALESCE(project_name, 'un proyecto')
      ),
      jsonb_build_object(
        'project_id', NEW.project_id,
        'project_name', project_name,
        'invited_by', NEW.invited_by,
        'invited_by_name', inviter_name,
        'role', NEW.role
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_task_assignment_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_project_invitation_notification() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_task_assignment_notification ON public.tasks;
DROP TRIGGER IF EXISTS task_assignment_notification_trigger ON public.tasks;
CREATE TRIGGER task_assignment_notification_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_task_assignment_notification();

DROP TRIGGER IF EXISTS trigger_project_invitation_notification ON public.project_members;
DROP TRIGGER IF EXISTS project_invitation_notification_trigger ON public.project_members;
CREATE TRIGGER project_invitation_notification_trigger
  AFTER INSERT ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.create_project_invitation_notification();
