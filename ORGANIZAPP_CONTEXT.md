# OrganizAPP — Contexto del Proyecto

**Última actualización:** 2026-04-16
**Versión actual:** v0.4.6 — Fix de dropdown "Assign To" vacío (race condition en state)

## Cambios v0.4.6 (hotfix)

**Bug:** dentro de un proyecto, al crear/editar una tarea, el dropdown "Assign To" aparecía vacío (solo mostraba "Unassigned") aunque el proyecto tenía miembros registrados en la DB.

**Causa raíz:** race condition de React en `app/dashboard/projects/[id]/page.tsx`. La función `loadProject()` hacía `setProject(project)` e inmediatamente llamaba `await loadProjectMembers()` sin argumentos. Pero `loadProjectMembers` leía `project?.id` del closure — y ese closure aún tenía `project = null` porque React no actualiza el state instantáneamente. Resultado: la query se hacía con `project_id = undefined`, Supabase devolvía `[]`, y el dropdown quedaba vacío.

La pestaña "Team" SÍ cargaba bien porque se montaba después, cuando el state ya estaba sincronizado — por eso parecía un bug aleatorio.

**Solución aplicada:**
- `loadProjectMembers(projectIdArg?: string)` ahora acepta el `project.id` como argumento explícito. `loadProject()` le pasa `project.id` directamente después del fetch, sin depender del state.
- Si no se pasa argumento, cae al state como fallback (útil en recargas post-mount).
- Se agregó guard temprano: si no hay `pid`, retorna sin hacer query y loguea `[v0] loadProjectMembers: no project id available, skipping`.
- Logs `[v0]` informan cuántos miembros cargaron y para qué proyecto.

**Lección aprendida:** nunca leer state recién seteado en el mismo tick de ejecución — siempre pasar el valor como argumento, o usar el valor local antes del `setState`. Es un patrón de bug muy común cuando una función asíncrona sigue inmediatamente a un `setState`.

## Cambios v0.4.5 (hotfix crítico)

**Bug persistente:** incluso tras los fixes v0.4.4, al entrar directamente a la URL de producción o volver después de minutos sin interactuar, la app se quedaba en **loading infinito sin errores en consola**. Ocurría en distintos dispositivos.

**Causa raíz (tres bugs encadenados):**

1. **`UserProvider` usaba `supabase.auth.getUser()`** — este método hace una **llamada HTTP** a Supabase para validar el token. En redes lentas/inestables, el `await` quedaba pendiente indefinidamente **sin lanzar error**. El hang silencioso explicaba la ausencia de errores en consola.
2. **`setLoading(false)` solo se ejecutaba si había un `authUser`** — si la sesión expiraba o `getUser()` colgaba, `loading` quedaba `true` para siempre. El `finally` solo tocaba `initialized`, no `loading`.
3. **El `dashboard/layout.tsx` mostraba spinner eterno cuando `user` era `null`** — no redirigía al login. Si la sesión caía, el usuario veía spinner para siempre sin opción de recuperarse.

**Solución aplicada en `components/user-provider.tsx`:**
- Reemplazado `getUser()` por `getSession()`: lee el token de localStorage instantáneamente, sin red. Elimina el 99% de los hangs.
- `loadProfileForUser` envuelto en `Promise.race` con timeout de **8 segundos** — si el query a `profiles` tarda más, devuelve el user base sin profile y sigue adelante.
- **Safety timeout de 10 segundos** en el `useEffect` principal — si algo falla catastróficamente, `loading` se fuerza a `false` para que el usuario pueda recuperarse o ir al login.
- El bloque `finally` del init ahora **siempre** ejecuta `setLoading(false)`, independiente del resultado.
- `mountedRef` para prevenir `setState` en componentes desmontados.
- Logs `[v0]` estratégicos en cada fase clave (mount, getSession, loadProfile, onAuthStateChange, safety timeout, finally, unmount) para debugging.
- El método público sigue llamándose `refreshProfile()` para no romper otros consumidores.

**Solución aplicada en `app/dashboard/layout.tsx`:**
- Nuevo `useEffect` que detecta **`!loading && !user`** → `router.replace("/login")`. Nunca más hay spinner eterno; si la sesión no existe, el usuario va al login.
- El spinner de carga ahora distingue tres estados: "Cargando sesión...", "Redirigiendo al login...", pending/rejected.
- Logs `[v0]` en cada gate para rastrear qué decisión está tomando el layout.

**Cómo verificar que funciona:**
1. Abrir la consola del navegador y recargar la página — deberías ver: `UserProvider: mount → init → getSession → session is present/null → loadProfileForUser → finally - loading=false`.
2. Si la red está muerta, el safety timeout dispara y `loading=false` fuerza, redirigiendo al login en lugar de colgar.
3. Si la sesión está expirada, `onAuthStateChange` recibe `SIGNED_OUT` y el layout redirige automáticamente.

**Lección aprendida:** siempre usar `getSession()` en el init del auth provider, nunca `getUser()`. Usar `Promise.race` con timeouts para cualquier fetch en el path crítico de carga inicial. Siempre tener un safety timeout como última línea de defensa contra hangs silenciosos. Y siempre redirigir, nunca mostrar spinner eterno, cuando se detecta estado definitivo de "sin sesión".

## Cambios v0.4.4 (hotfix)

**Bug descubierto:** si dejabas la app abierta sin interactuar durante ~10 minutos y luego hacías click en cualquier módulo (proyectos, kanban, etc.), la pantalla se quedaba en blanco con loading infinito. No aparecía error en consola.

**Causa raíz:** el componente `components/notifications.tsx` mantenía abierto un WebSocket de Supabase Realtime para escuchar cambios en la tabla `notifications`. Cuando la tab quedaba idle, los navegadores modernos (Chrome/Edge/Firefox) **suspenden WebSockets en background** para ahorrar recursos. Al regresar, el WebSocket quedaba "zombie" — aparentemente vivo en el estado de React pero en realidad desconectado. Cualquier query posterior competía con el intento de reconexión automática del cliente de Supabase, y el cliente se quedaba bloqueado esperando un ACK que nunca llegaba. Resultado: loading infinito en toda la app.

**Solución aplicada:**
- Canal único por usuario: `notifications:${userId}` en lugar del canal compartido `notifications`, que causaba colisiones entre usuarios.
- Se agrega manejo de 3 eventos del navegador:
  - `visibilitychange` → al volver la tab, se destruye el canal viejo y se crea uno nuevo + refresh de datos.
  - `online` → al recuperar conectividad, igual (destruir + recrear + refresh).
  - `focus` → refresca datos cuando se vuelve al window (no recrea canal, menos agresivo).
- El canal se guarda en un `useRef` para poder recrearlo sin disparar re-renders y limpiarlo correctamente en unmount.
- Todos los `console.log` relevantes usan el prefijo `[v0]` para que aparezcan en los logs del preview y faciliten debugging futuro.

**Lección aprendida:** WebSockets + tabs idle es una combinación peligrosa. Siempre que se use Supabase Realtime se debe implementar `visibilitychange` para detectar cuando la tab vuelve del fondo y recrear el canal. Sin eso, cualquier app con Realtime se rompe silenciosamente en sesiones largas.

## Cambios v0.4.3 (hotfix)

**Bug descubierto:** al abrir la pestaña "Team" dentro de un proyecto, la consola del navegador mostraba `PGRST205: Could not find the table 'public.project_members_with_profiles'`. Además, al buscar un email en el invitador, siempre devolvía el mensaje "No Kanba account" aunque el email sí existiera en la DB.

**Causa raíz:** el componente `components/team-management.tsx` depende de tres objetos SQL que existían en `supabase/migrations/20250101000000_emergency_fix_profiles_security.sql` pero **nunca se aplicaron** a la DB de este proyecto:
1. Vista `project_members_with_profiles` (usada para listar miembros con sus datos)
2. Función RPC `search_users_for_collaboration(search_term)` (usada para buscar e invitar)
3. Función RPC `get_profiles_count` (debug)

Como las funciones RPC no existían, el cliente de Supabase devolvía `undefined` y el código interpretaba eso como "el usuario no existe".

**Solución aplicada:**
- Se creó la vista `project_members_with_profiles` como JOIN entre `project_members` y `profiles`. Hereda automáticamente el RLS de las tablas base.
- Se recrearon ambas funciones RPC con `SECURITY DEFINER` y `search_path = public`. Ambas ahora filtran `status = 'approved'` — coherente con el sistema de aprobación de v0.3: **usuarios pendientes/rechazados no pueden ser invitados a proyectos**.
- `search_users_for_collaboration` requiere mínimo 2 caracteres, busca por email exacto o parcial y por nombre, ordena por relevancia (match exacto primero) y limita a 10 resultados.
- Se actualizaron los 4 textos en `team-management.tsx` que mencionaban "Kanba account" / "Kanba users" → ahora todos dicen "OrganizAPP" y aclaran que el usuario debe estar **aprobado** para ser invitado.

**Lección aprendida:** cuando una migración original incluye vistas o RPCs, verificar en Supabase que se hayan aplicado antes de depurar la UI. El error no era del código sino de la DB.

## Cambios v0.4.2 (hotfix)

**Bug descubierto:** al hacer click en el link "Admin" del sidebar, a veces redirigía de vuelta al dashboard — especialmente justo después de login o al recargar la página estando en `/dashboard/admin/users`. Era una **race condition**: el `app/dashboard/layout.tsx` tenía un `useEffect` que chequeaba `user.role !== "admin"` antes de que el `UserProvider` terminara de fetchear el profile desde Supabase. En ese instante `user.role` era `undefined`, el gate del layout evaluaba "no es admin" y redirigía.

**Solución aplicada:** se eliminó el gate de admin del `dashboard/layout.tsx` (también se removió el import/uso de `usePathname` que quedó sin uso). El único gate queda en `app/dashboard/admin/users/page.tsx`, que respeta correctamente el estado `loading` del `UserProvider` — muestra un spinner hasta que `user.role` esté definido, y solo entonces evalúa si redirigir. El layout sigue protegiendo usuarios no autenticados (→ login) y pending/rejected (→ `/pending`).

**Lección aprendida:** los guards que dependen de datos asíncronos (como campos del profile cargados después del auth) deben vivir en componentes que tengan acceso al estado `loading` del contexto y esperen a que los datos estén disponibles. Nunca ponerlos en layouts que se renderizan antes de que el fetch termine.

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
