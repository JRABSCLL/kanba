# Data layer y rendimiento de navegación

**Última actualización:** 2026-06-24

Documenta cómo cargan datos las pantallas y por qué la navegación se siente
fluida (sin re-loguear ni parpadear en cada entrada).

## Problema que resolvía

Antes, cada página:
1. Arrancaba con `loading = true` → spinner a pantalla completa en **cada** navegación.
2. Re-pedía el perfil del usuario (`profiles.select('*')`) aunque el `UserProvider`
   ya lo tenía en contexto → una ida y vuelta de red extra antes de mostrar nada.
3. No cacheaba nada: volver a una vista ya vista repetía spinner + todas las queries.
4. En el dashboard, las tareas asignadas se cargaban con una cascada **N+1**
   (2 queries por tarea).

## Arquitectura actual

### 1. Caché global con React Query
`components/query-provider.tsx` envuelve la app (en `app/layout.tsx`, dentro de
`ThemeProvider` y por encima de `UserProvider`).

Config por defecto:
- `staleTime: 30s` — al volver a una vista cargada hace <30s, se muestra desde
  caché al instante y **no** revalida.
- `refetchOnWindowFocus: false` — evita parpadeos al cambiar de pestaña.
- `gcTime: 5 min`, `retry: 1`.

### 2. El perfil viene del contexto, no se re-pide
`UserProvider` (`components/user-provider.tsx`) ya carga `role`, `is_active`,
`user_type`, `agency_id`. Las páginas usan `useUser()` en vez de volver a
consultar `profiles`. Se eliminó el `profiles.select('*')` de:
- `app/dashboard/page.tsx`
- `app/dashboard/projects/[id]/page.tsx`
- `app/dashboard/projects/new/page.tsx`

### 3. Dos patrones de carga según la página

**a) Páginas de solo lectura → `useQuery` directo**
`app/dashboard/page.tsx` usa `useQuery(['dashboard', userId, isAdmin], …)`.
Mientras carga la **primera** vez muestra esqueletos (no spinner de pantalla
completa); en revisitas pinta desde caché al instante.

**b) Páginas interactivas (drag) → siembra desde caché + estado local**
`projects/[id]` y el módulo de agencias mantienen su **estado local** (es la
fuente de verdad para el drag y las mutaciones optimistas, que **no se tocaron**).
Sobre eso se añadió:
- Un `useLayoutEffect` que, antes del primer paint, **siembra** el estado desde
  la caché de React Query si la vista ya se visitó (`queryClient.getQueryData`).
  Resultado: revisita instantánea, sin spinner.
- La función de carga (`loadProject` / `loadData`) escribe el bundle en caché al
  terminar (`queryClient.setQueryData`) y revalida en segundo plano.

Claves de caché:
- `['project', <slug>]` → `{ project, columns, members }`
- `['agency-module', <userId>]` → `{ agencies, brands, plans, planItems, deliverables, planStages, stageTemplates }`

> Se eligió este patrón (en vez de mover todo a `useQuery`) para **no reescribir**
> la lógica de drag & drop ni las mutaciones, que ya funcionan bien. React Query
> actúa solo como capa de fetch + caché.

### 4. N+1 del dashboard colapsada
Las tareas asignadas se cargan en **una** query con joins anidados:
`tasks → columns(name, projects(id, name, slug))`. Los embeds to-one de Supabase
se normalizan (pueden venir como objeto o array).

### 5. Privacidad: limpieza de caché al cerrar sesión
`app/dashboard/layout.tsx` llama `queryClient.clear()` en `handleSignOut`, para
que en un navegador compartido el siguiente usuario no vea datos del anterior.

## Qué NO cambió (a propósito)
- La **lógica de drag & drop** (`@hello-pangea/dnd`) y las mutaciones optimistas.
- El **RLS de Supabase**: la seguridad real sigue 100% en las policies del
  servidor; los chequeos de rol en cliente son solo UX. Ver auditoría pendiente.

## Cómo extenderlo
- Para una vista nueva de solo lectura: `useQuery(['clave', …deps], queryFn)`.
- Para una vista interactiva: replicar el patrón siembra (`useLayoutEffect` +
  `getQueryData`) y cachear el bundle al final de la carga (`setQueryData`).
- Tras una mutación que cambie datos de otra vista, invalida su clave con
  `queryClient.invalidateQueries({ queryKey: [...] })`.
