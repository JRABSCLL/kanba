# OrganizAPP — Contexto del Proyecto

**Última actualización:** 2026-04-16
**Versión actual:** v0.2 — Branding + Redirect + DB schema aplicado

---

## ¿Qué es este proyecto?

**OrganizAPP by SAIA LABS** — sistema interno de gestión de proyectos tipo Kanban para uso organizacional (no SaaS público).

Basado en un fork de **Kanba** (open source), adaptado para uso privado de SAIA LABS. Se mantiene el código original intacto lo máximo posible para poder hacer merge de updates upstream.

### Repositorio
- **GitHub:** `JRABSCLL/kanba`
- **Vercel Project ID:** `prj_vm7KZRF36YTWpbYPzxXpSGoIJs0o`
- **Supabase Project ID:** `lyemnfjzqxypqvvibvtm`

---

## Stack técnico

| Componente | Tecnología |
|---|---|
| Framework | Next.js 13.5.1 (App Router) |
| UI | React + Tailwind + shadcn/ui |
| Auth + DB | Supabase (auth.users + profiles) |
| Pagos (original) | Stripe — **deshabilitado para uso interno** |
| Deploy | Vercel (plan Hobby gratis) |
| Logos | `/public/logo-light.png`, `/public/logo-dark.png` |

---

## Estado de la Base de Datos

### Tablas aplicadas (12)
- `profiles` — usuarios (`id`, `email`, `full_name`, `subscription_status`, etc.)
- `projects` — proyectos kanban
- `columns` — columnas del board
- `tasks` — tareas
- `project_members` — miembros por proyecto (roles: owner/admin/member)
- `task_comments` — comentarios
- `activity_logs` — auditoría
- `notifications` — notificaciones internas
- `bookmarks` — favoritos
- `stripe_customers`, `stripe_subscriptions`, `stripe_orders` — legacy (no usados en uso interno)

### Configuración
- RLS habilitado en todas las tablas
- Policies configuradas por tabla
- Trigger `on_auth_user_created` crea el profile automáticamente al registrarse
- Materialized view `user_accessible_projects` con refresh automático
- Variables de entorno configuradas en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Cambios realizados hasta ahora

### v0.1 — Schema inicial
- Aplicada migración completa de Kanba al proyecto de Supabase vacío
- Creado profile manual para usuario existente `juan_rabascall@hotmail.com` (se había registrado antes del trigger)

### v0.2 — Branding + Redirect
- **Branding:**
  - Título y metadata → "OrganizAPP - Sistema de Gestión de Proyectos by SAIA LABS"
  - Todos los textos `Kanba` → `OrganizAPP`
  - Badge "Beta" eliminado de sidebar y navbar
  - Logos SAIA reemplazados en `/public/logo-light.png` y `/public/logo-dark.png`
  - Logo redimensionado en sidebar (130x44) y navbar (120x40) para logo rectangular
- **SEO:**
  - `robots: noindex, nofollow` configurado en metadata + tags `<meta>`
  - Keywords y OG tags actualizados
- **Routing:**
  - `app/page.tsx` original archivado en `app/_landing/page.tsx`
  - Nueva `app/page.tsx` = Server Component que hace `redirect("/login")`
  - `middleware.ts` eliminado (causaba `MIDDLEWARE_INVOCATION_FAILED` en Edge Runtime)
  - El redirect al dashboard de usuarios autenticados lo maneja `app/login/page.tsx` internamente

---

## Arquitectura actual del flujo

```
Usuario visita "/"
       ↓
app/page.tsx (Server Component) → redirect("/login")
       ↓
app/login/page.tsx
       ↓ ¿ya hay sesión?
       ├─ Sí → redirect("/dashboard")
       └─ No → muestra formulario
              ↓
         Supabase Auth
              ↓
         Profile existe → /dashboard
```

---

## Pendiente por implementar

### Fase 3 — Sistema de aprobación de usuarios
El signup está **abierto al mundo** actualmente. Pendiente:

1. DB: agregar campos `status` (pending/approved/rejected) y `role` (member/admin) a `profiles`
2. Trigger `handle_new_user` actualizado: nuevos usuarios nacen `pending` + `subscription_status=pro` + `role=member`
3. Env var `ADMIN_USER_ID` con el UUID del superadmin inamovible
4. Guard en `dashboard/layout.tsx` que redirige pending → `/pending`
5. Página `/pending` con mensaje "Tu cuenta está pendiente de aprobación"
6. Panel `/dashboard/admin/users` (solo visible para admins): lista, aprobar, rechazar, promover
7. APIs de admin: `/api/admin/approve`, `/api/admin/reject`, `/api/admin/promote`
8. Actualizar usuario actual de Juan a `approved + admin + pro`

### Fase 4 — Desactivar Pro/Billing (uso interno)
- Ocultar link de Billing del sidebar
- Ocultar opción de "Manage Subscription" en settings
- `canCreateProject()` en `dashboard/page.tsx` y `dashboard/projects/new/page.tsx` → siempre `true`
- Remover banners de "Upgrade to Pro"
- Default de `subscription_status` en trigger → `'pro'`

### Fase 5 — Mejoras de seguridad (opcional)
- Rate limiting en login/signup
- Validación de email obligatoria antes de crear profile
- Password mínimo 8 caracteres + complejidad
- MFA opcional
- Restricción SSRF en `/api/fetch-meta` (bookmarks)

---

## Decisiones de arquitectura importantes

1. **No tocar código core del Kanban** — para poder mergear updates upstream de Kanba
2. **Capas encima, no modificación** — nuevos archivos en lugar de modificar existentes donde sea posible
3. **Configuración en env vars** — `ADMIN_USER_ID` como env var, no hardcoded
4. **Supabase directo como backup** — si el panel de admin falla, siempre se puede gestionar usuarios desde dashboard de Supabase
5. **Sin middleware Edge** — causa problemas con Supabase, usamos Server Components para lógica de auth
6. **noindex obligatorio** — herramienta interna, no debe aparecer en Google

---

## Usuario actual

- **Email:** `juan_rabascall@hotmail.com`
- **UUID:** (ver en `auth.users` de Supabase)
- **Estado actual:** `free` (aún no actualizado a `pro`)
- **Rol:** aún no existe campo `role` — pendiente Fase 3

---

## Cómo continuar una sesión futura

1. Leer este archivo (`ORGANIZAPP_CONTEXT.md`)
2. Verificar estado de la DB: `SELECT * FROM profiles` via Supabase tools
3. Continuar desde la fase pendiente más cercana
4. Al terminar cambios, actualizar este archivo con el nuevo estado
