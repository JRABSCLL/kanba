# OrganizAPP — Quick Start Guide

## Para Admins

### 1. Gestionar Usuarios

Accede a `/dashboard/admin/users`

**Usuarios Activos:**
- Click "Desactivar" para bloquear a un usuario
- Click "Hacer admin" para promocionar
- Click "Quitar admin" para demover

**Usuarios Inactivos:**
- Click "Activar" para darle acceso

### 2. Crear un Proyecto

1. Ve a `/dashboard`
2. Click "Nuevo Proyecto"
3. Ingresa nombre y descripción
4. Click "Crear"
5. El proyecto se crea con TÚ como owner
6. Opcionalmente agrega colaboradores haciendo click en el proyecto

### 3. Gestionar Agencias

Ve a `/dashboard/agency-production`

**Crear agencia:**
1. Click "Nueva Agencia"
2. Ingresa datos (nombre, contacto, tipo)
3. Click "Guardar"

**Crear plan de producción:**
1. Click en una agencia
2. Click "Nuevo Plan"
3. Selecciona supervisor interno (busca por email/nombre)
4. Ingresa detalles del plan
5. Click "Crear"

**Trackear entregas:**
- Ver estado de cada entrega
- Cambiar estado: pending → brief_sent → in_production → delivered → in_review → changes_requested → approved → published
- Asignar brand a entrega
- Ver responsable interno

---

## Para Members

### 1. Ver mis Proyectos

Ve a `/dashboard` — Solo ves proyectos donde eres colaborador.

### 2. Trabajar en un Proyecto

1. Click en proyecto
2. Ver colaboradores
3. Contribuir según el flujo del proyecto

### 3. Agencias (Read-only)

Ve a `/dashboard/agency-production` pero NO puedes editar — solo ver estado.

---

## Flujo típico de trabajo

### Proyecto interno
```
Admin crea proyecto 
  → Agrega colaboradores (members)
  → Members ven el proyecto en su dashboard
  → Members colaboran
```

### Trabajo de agencia
```
Admin crea agencia (datos de contacto)
  → Admin crea plan de producción
  → Admin asigna supervisor interno (member o admin)
  → Admin crea deliverables (estados)
  → Supervisor trackea avance
  → Admin/supervisor actualizan estado según delivery
```

---

## Tablas principales

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Usuarios (email, nombre, rol) |
| `projects` | Proyectos internos |
| `project_members` | Quién trabaja en qué proyecto |
| `agencies` | Proveedores externos |
| `production_plans` | Planes de entrega por agencia |
| `production_deliverables` | Items individuales con estado |

---

## Permisos

| Acción | Admin | Member |
|--------|-------|--------|
| Ver todos los usuarios | ✅ | ❌ |
| Activar/desactivar usuarios | ✅ | ❌ |
| Crear proyecto | ✅ | ❌ |
| Ver mis proyectos | ✅ | ✅ |
| Ver todos los proyectos | ✅ | ❌ |
| Crear agencia | ✅ | ❌ |
| Ver agencias | ✅ | ✅ |
| Editar agencias | ✅ | ❌ |
| Trackear entregas | ✅ | ✅ |
| Cambiar estado entregas | ✅ | ❌ |

---

## Troubleshooting

**"No puedo ver el proyecto de otro user"**
- RLS de `project_members` lo bloquea
- Solo admins ven todos los proyectos
- Pídele al admin que te agregue como colaborador

**"No puedo cambiar el estado de la entrega"**
- Solo admins pueden (miembros tienen read-only)

**"No puedo crear agencias"**
- Solo admins
- Contact admin para agregar

---

Para más detalles, ver [ORGANIZAPP_CONTEXT.md](ORGANIZAPP_CONTEXT.md).
