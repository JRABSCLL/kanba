/*
  # Traducir al español los textos de notificaciones

  Los triggers de `20250621181905_winter_wildflower.sql` insertan notificaciones
  con textos en inglés ("New Task Assignment", "%s assigned you to task...").
  Aquí se recrean ambas funciones con el mismo comportamiento pero en español.
  Los triggers ya apuntan a estas funciones por nombre, así que basta con
  CREATE OR REPLACE FUNCTION (idempotente).

  IMPORTANTE: aplicar esta migración en Supabase para que surta efecto.
*/

-- Notificación al asignar una tarea
CREATE OR REPLACE FUNCTION create_task_assignment_notification()
RETURNS trigger AS $$
DECLARE
  task_title text;
  project_name text;
  assigner_name text;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL)
     OR (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN

    task_title := NEW.title;

    SELECT p.name INTO project_name
    FROM projects p
    JOIN columns c ON c.project_id = p.id
    WHERE c.id = NEW.column_id;

    SELECT COALESCE(full_name, email) INTO assigner_name
    FROM profiles
    WHERE id = auth.uid();

    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.assigned_to,
      'task_assigned',
      'Nueva tarea asignada',
      format('%s te asignó la tarea "%s" en el proyecto "%s"',
             COALESCE(assigner_name, 'Alguien'),
             task_title,
             COALESCE(project_name, 'un proyecto')),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notificación al invitar a un proyecto
CREATE OR REPLACE FUNCTION create_project_invitation_notification()
RETURNS trigger AS $$
DECLARE
  project_name text;
  inviter_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN

    SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;
    SELECT COALESCE(full_name, email) INTO inviter_name FROM profiles WHERE id = NEW.invited_by;

    IF NEW.user_id != NEW.invited_by THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        NEW.user_id,
        'project_invited',
        'Invitación a proyecto',
        format('%s te invitó a colaborar en el proyecto "%s"',
               COALESCE(inviter_name, 'Alguien'),
               COALESCE(project_name, 'un proyecto')),
        jsonb_build_object(
          'project_id', NEW.project_id,
          'project_name', project_name,
          'invited_by', NEW.invited_by,
          'invited_by_name', inviter_name,
          'role', NEW.role
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
