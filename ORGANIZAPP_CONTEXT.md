# OrganizAPP — Contexto del Proyecto

**Última actualización:** 2026-04-16
**Versión actual:** v0.4.1 — Fix de recursión infinita en RLS

## Cambios v0.4.1 (hotfix)

**Bug descubierto:** las policies `profiles_admin_select` y `profiles_admin_update` de v0.3 causaban **recursión infinita** — su condición `EXISTS (SELECT FROM profiles WHERE role='admin')` consultaba la misma tabla que intentaban proteger, y Postgres no podía resolverla. Resultado: cualquier `SELECT FROM profiles` fallaba con `42P17: infinite recursion detected in policy for relation "profiles"`, rompiendo el `UserProvider`, la carga de proyectos, y el link de Admin en el sidebar (nunca se renderizaba porque `user.role` nunca cargaba).

**Solución aplicada:**
- Se creó la función `public.is_approved_admin(uid uuid)` con `SECURITY DEFINER` y `search_path = public`. Esta función se ejecuta con privilegios del owner y bypasea RLS al consultar internamente `profiles` — rompe la recursión.
- Las policies `profiles_admin_select` y `profiles_admin_update` se recrearon usando `is_approved_admin(auth.uid())` en lugar del `EXISTS` recursivo.
- Grant de `EXECUTE` otorgado a `authenticated`.

**Lección aprendida:** cualquier policy sobre una tabla que necesite consultar esa misma tabla debe ir a través de una función `SECURITY DEFINER`. Es el patrón estándar de Supabase.

## Cambios v0.4

- **Dashboard (`app/dashboard/page.tsx`):** quitado el badge "Pro/Free", el botón "Upgrade to Pro" del header, la tarjeta de Subscription en las stats (ahora son 3 columnas en vez de 4), el warning "You've reached the free plan limit", y el Quick Action "Manage Subscription". El import `Crown` fue removido.
- **Nuevo proyecto (`app/dashboard/projects/new/page.tsx`):** quitado el Card de warning "free plan limit" y el toast de error que mencionaba "Upgrade to Pro".
- **Navbar (`components/navbar.tsx`):** quitado el item "Billing" del user dropdown.
- **`/dashboard/billing`** y **`/dashboard/billing/success`:** convertidos a simples `redirect("/dashboard")` usando Server Components — así los links legados no rompen.
- **`canCreateProject()`** en ambas páginas retorna siempre `true` mientras exista `profile` — sin restricciones de plan.
- La landing original archivada (`app/_landing/`) todavía tiene textos de pricing pero no es accesible (se conserva solo para referencia).

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

### Tablas (12)
- `profiles` — usuarios (`id`, `email`, `full_name`, `avatar_url`, `subscription_status`, **`status`**, **`role`**)
- `projects`, `columns`, `tasks`, `project_members`, `task_comments`
- `activity_logs`, `notifications`, `bookmarks`
- `stripe_customers`, `stripe_subscriptions`, `stripe_orders` — legacy, no usados

### Campos nuevos en `profiles` (v0.3)
| Campo | Tipo | Valores | Default |
|---|---|---|---|
| `status` | text | `pending` / `approved` / `rejected` | `pending` |
| `role` | text | `member` / `admin` | `member` |

Índices: `idx_profiles_status`, `idx_profiles_role`

### Trigger `handle_new_user` (actualizado v0.3)
Nuevos usuarios nacen con:
- `status = 'pending'` (requieren aprobación)
- `role = 'member'`
- `subscription_status = 'pro'` (sin límites de plan)

### Policies RLS nuevas (v0.3)
- `profiles_admin_select` — admins aprobados pueden leer todos los profiles
- `profiles_admin_update` — admins aprobados pueden actualizar cualquier profile

### Configuración
- RLS habilitado en todas las tablas
- Materialized view `user_accessible_projects` con refresh automático
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Cambios realizados

### v0.1 — Schema inicial
- Migración completa de Kanba aplicada
- Profile manual para usuario existente (se registró antes del trigger)

### v0.2 — Branding + Redirect
- Branding completo → "OrganizAPP by SAIA LABS"
- Logos SAIA en `/public/logo-light.png` y `/public/logo-dark.png`
- `noindex, nofollow` en metadata + tags
- `app/page.tsx` = redirect server-side a `/login`
- Landing original archivada en `app/_landing/page.tsx`
- `middleware.ts` eliminado (causaba crash en Edge Runtime)

### v0.3 — Aprobación + Admin Panel + Pro por defecto (actual)
- **DB:**
  - Campos `status` y `role` agregados a `profiles`
  - Trigger `handle_new_user` actualizado: `pending + member + pro`
  - Usuarios existentes backfilled a `approved`
  - Primer usuario promovido automáticamente a `admin`
  - Policies RLS para admin SELECT/UPDATE
- **UserProvider:**
  - Reescrito para cargar `status`, `role`, `subscription_status` desde `profiles`
  - Expone todos los campos dentro de `user` (no hay objeto `profile` separado)
  - Función `refreshProfile()` para recargar datos sin reload
- **Dashboard layout:**
  - Guard que redirige users con `status !== 'approved'` a `/pending`
  - Guard que bloquea `/dashboard/admin/*` a non-admins
- **Página `/pending`:**
  - UI clara con estado pending vs rejected
  - Botón de cerrar sesión
- **Panel `/dashboard/admin/users`:**
  - 4 tabs: Pendientes, Aprobados, Rechazados, Admins
  - Stats cards con contadores
  - Acciones: aprobar, rechazar, reactivar, revocar, promover a admin, degradar
  - Protección: self-demote deshabilitado
- **Sidebar:**
  - Link "Admin" visible solo para `user.role === 'admin'`
  - Link "Billing" removido
  - Gate de Pro en Bookmarks removido (todos tienen acceso)
  - Opción "Billing" del dropdown removida
  - Items del menú traducidos al español
- **Gates de Pro:**
  - `canCreateProject()` en `dashboard/page.tsx` y `dashboard/projects/new/page.tsx` → siempre `true`
  - Banners de "Upgrade to Pro" desaparecen automáticamente

---

## Flujo actual

```
Usuario visita "/"
       ↓
app/page.tsx → redirect("/login")
       ↓
Login / Signup
       ↓ (signup) → trigger crea profile status=pending, role=member, subscription_status=pro
       ↓
Profile cargado en UserProvider
       ↓
┌─ user.status === "approved" ─→ /dashboard (normal)
│       ↓
│   ¿user.role === "admin"? → link "Admin" en sidebar visible
│       ↓
│   Puede acceder a /dashboard/admin/users
│
└─ user.status !== "approved" ─→ /pending
        ↓
    Admin desde panel lo aprueba
        ↓
    Usuario refresh → ahora accede al dashboard
```

---

## Pendiente por implementar

### Opcionales / futuro
- **Notificación por email** cuando un admin aprueba a un usuario (Supabase Auth email templates o Resend)
- **Invitación por email directo** (en lugar de signup + aprobar, enviar magic link con pre-aprobación)
- **Auditoría de acciones de admin** (quién aprobó a quién, cuándo)
- **Rate limiting** en login/signup
- **MFA** opcional
- **Restricción SSRF** en `/api/fetch-meta`

### Limpieza pendiente (baja prioridad)
- Página `/dashboard/billing` sigue existiendo (sin link visible), se puede borrar
- Tablas `stripe_*` sin uso — se pueden mantener o borrar
- Textos en inglés restantes en componentes internos

---

## Decisiones de arquitectura

1. **No tocar código core del Kanban** — para mergear updates upstream de Kanba
2. **Capas encima** — nuevos archivos en lugar de modificar existentes cuando sea posible
3. **Profile expandido en `user`** — el UserProvider flattea los campos (`user.role`, `user.status`, `user.subscription_status`)
4. **Supabase como backup** — si el panel falla, gestión manual desde dashboard de Supabase
5. **Sin middleware Edge** — lógica de auth en Server Components o guards client-side
6. **noindex obligatorio** — herramienta interna, no debe aparecer en Google
7. **Default `subscription_status = 'pro'`** — eliminado el concepto de planes para uso interno

---

## Usuario actual (admin)

- **Email:** `juan_rabascall@hotmail.com`
- **Estado:** `approved + admin + pro`
- **Acceso:** dashboard completo + panel de admin

---

## Cómo continuar una sesión futura

1. Leer este archivo (`ORGANIZAPP_CONTEXT.md`)
2. Verificar estado de la DB con `SELECT * FROM profiles` via Supabase tools
3. Si hay usuarios pendientes pueden aprobarse desde el panel o directo en la DB
4. Continuar desde la fase pendiente más cercana (ver sección "Pendiente")
5. Al terminar cambios, actualizar este archivo con el nuevo estado
