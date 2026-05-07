# OrganizAPP — Módulo de Control de Agencias y Producción

> Documento de producto y guía técnica para que v0 entienda la operación antes de proponer cambios de código o Supabase.
>
> Rama de trabajo esperada: `v0/harambless-x-204bc0ed`. No trabajar sobre `main`.

## 1. Objetivo del módulo

OrganizAPP necesita un módulo interno para controlar el trabajo que realizan agencias, proveedores o colaboradores externos. El objetivo no es subir archivos dentro de la plataforma, sino registrar y dar seguimiento a lo que se está haciendo: artes, videos, copys, parrillas, reportes, campañas, piezas de pauta, contenidos u otros entregables.

El módulo debe responder preguntas operativas como:

- ¿Qué agencia está haciendo qué?
- ¿Cuántos entregables debe producir cada agencia este mes?
- ¿Qué entregables están pendientes, en producción, en revisión, con cambios, aprobados o publicados?
- ¿Qué está atrasado?
- ¿Qué falta para cumplir el plan mensual?
- ¿Qué agencia va al día y cuál está en riesgo?
- ¿Qué entregables necesitan revisión interna?
- ¿Dónde está el link externo de referencia o entrega, si existe?

## 2. Principios del diseño

### No hardcodear agencias ni cantidades

El sistema no debe tener reglas fijas en código como “Agencia A hace 34 videos” o “Agencia B hace 20 artes”. Todo debe ser configurable desde la UI o desde datos en Supabase.

La estructura debe permitir:

- varias agencias;
- distintos tipos de trabajo por agencia;
- cantidades diferentes por periodo;
- planes mixtos;
- cambios mes a mes sin tocar código.

### No convertirlo en gestor de archivos

No es necesario subir archivos dentro de OrganizAPP en la primera versión. Cada entregable puede tener un campo opcional de link externo, por ejemplo:

- Google Drive;
- Figma;
- Canva;
- Frame.io;
- YouTube privado;
- Dropbox;
- CapCut;
- cualquier URL de referencia.

### Kanban sí, pero no únicamente Kanban

El módulo debe tener vista Kanban como forma de operar el flujo, pero también necesita lista/tabla y dashboard.

- Kanban: útil para mover entregables entre estados.
- Tabla/lista: útil para filtrar por agencia, campaña, fecha, estado, responsable y atraso.
- Dashboard: útil para ver cumplimiento, atrasos y avance por agencia.

## 3. Conceptos principales

### Agencia

Representa una agencia, proveedor o colaborador externo.

Ejemplos:

- agencia de diseño;
- editor de videos;
- agencia de social media;
- proveedor de contenidos;
- agencia de performance;
- freelancer.

Campos sugeridos:

- nombre;
- tipo;
- contacto principal;
- email;
- teléfono o WhatsApp;
- estado: activa, pausada, archivada;
- notas internas.

### Marca o cliente

Representa la marca, cliente o unidad de negocio para la cual se produce contenido.

Campos sugeridos:

- nombre;
- descripción;
- estado.

### Plan de producción

Representa un compromiso operativo de una agencia para un periodo.

Ejemplos:

- 34 videos mensuales;
- 20 artes mensuales;
- 4 parrillas semanales;
- 16 copys mensuales;
- 1 reporte mensual;
- plan mixto: parrillas + copys + stories + reportes.

Un plan no debe estar hardcodeado. Debe poder crearse desde datos.

Campos sugeridos:

- agencia;
- marca o cliente;
- nombre del plan;
- periodo: mensual, semanal, por campaña o personalizado;
- fecha de inicio;
- fecha de fin;
- estado: activo, pausado, completado, cancelado;
- responsable interno;
- notas.

### Ítems del plan

Un plan puede tener uno o varios tipos de entregables con cantidades distintas.

Ejemplo 1: plan simple.

```txt
Plan: Videos mensuales
- Video: 34
```

Ejemplo 2: plan mixto.

```txt
Plan: Social media mensual
- Parrilla: 4
- Copy: 16
- Story: 12
- Reporte: 1
```

Campos sugeridos:

- plan;
- tipo de entregable;
- cantidad objetivo;
- canal opcional;
- formato opcional;
- frecuencia opcional;
- notas.

### Entregable

Es la unidad principal de control. Representa algo que la agencia debe producir o ya está produciendo.

Ejemplos:

- Video 01;
- Reel testimonial;
- Arte campaña mayo;
- Carrusel beneficios;
- Copy LinkedIn;
- Parrilla semana 2;
- Reporte mensual;
- Banner para pauta.

Campos sugeridos:

- plan;
- agencia;
- marca;
- campaña opcional;
- título;
- descripción;
- tipo de entregable;
- canal;
- formato;
- estado;
- prioridad;
- fecha límite;
- fecha de entrega;
- fecha de aprobación;
- responsable interno;
- responsable agencia opcional;
- link externo opcional;
- notas.

## 4. Estados sugeridos del flujo

Estados iniciales recomendados:

1. Pendiente
2. Brief enviado
3. En producción
4. Entregado
5. En revisión
6. Cambios solicitados
7. Aprobado
8. Publicado
9. Pausado
10. Cancelado

Estos estados pueden venir por defecto, pero idealmente deben ser configurables en el futuro.

## 5. Ejemplo operativo: 34 videos mensuales

Agencia/proveedor: Juan Editor
Periodo: Mayo 2026
Plan: 34 videos mensuales

El sistema debería permitir crear un plan con un ítem:

```txt
Video: 34
```

Luego debe generar o permitir crear 34 entregables:

```txt
Video 01
Video 02
Video 03
...
Video 34
```

Cada video puede avanzar por estados:

```txt
Pendiente -> En producción -> Entregado -> En revisión -> Cambios solicitados -> Aprobado -> Publicado
```

Dashboard esperado para ese plan:

```txt
Meta mensual: 34 videos
Aprobados: 12
En producción: 8
En revisión: 6
Cambios solicitados: 4
Pendientes: 10
Atrasados: 3
Cumplimiento: 35%
```

El sistema debe poder calcular si la agencia va al día. Ejemplo:

```txt
Hoy es mitad del mes. Debería llevar 17 videos aprobados.
Lleva 12. Está 5 videos por debajo del plan.
```

## 6. Ejemplo operativo: tres agencias con trabajos diferentes

### Agencia 1: videos

```txt
Agencia: Juan Editor
Plan: 34 videos mensuales
Periodo: Mayo 2026
```

Indicadores:

```txt
12/34 aprobados
3 atrasados
Estado: en riesgo
```

### Agencia 2: artes

```txt
Agencia: Diseño ABC
Plan: 20 artes mensuales
Periodo: Mayo 2026
```

Indicadores:

```txt
15/20 aprobados
1 atrasado
Estado: va bien
```

### Agencia 3: social media

```txt
Agencia: Social Media XYZ
Plan mixto:
- Parrillas: 4
- Copys: 16
- Ideas de reels: 8
- Reporte: 1
```

Indicadores:

```txt
Parrillas: 2/4
Copys: 10/16
Ideas de reels: 5/8
Reporte: 0/1
Estado: atención
```

## 7. Vistas sugeridas

### Vista Dashboard

Debe mostrar resumen ejecutivo:

- agencias activas;
- planes activos del mes;
- entregables totales;
- entregables aprobados;
- entregables atrasados;
- entregables en revisión;
- cumplimiento por agencia;
- agencias en riesgo.

### Vista Kanban

Columnas por estado del entregable.

Debe permitir filtrar por:

- agencia;
- marca;
- plan;
- tipo de entregable;
- periodo;
- responsable interno.

### Vista Tabla

Debe permitir control fino.

Columnas sugeridas:

- entregable;
- agencia;
- marca;
- plan;
- tipo;
- estado;
- vencimiento;
- atraso;
- responsable;
- link externo.

### Vista Agencia

Al entrar a una agencia:

- resumen de la agencia;
- planes activos;
- entregables activos;
- entregables atrasados;
- métricas del periodo;
- historial.

### Vista Plan

Al entrar a un plan:

- objetivo del plan;
- avance por tipo de entregable;
- Kanban del plan;
- tabla del plan;
- atrasos;
- próximos vencimientos.

## 8. Modelo Supabase sugerido

Antes de crear o modificar tablas, v0 debe inspeccionar la base real. El proyecto ya parece tener campos, vistas y RPCs que no están totalmente reflejados en `prisma/schema.prisma`. No asumir que Prisma es la fuente de verdad.

### Tablas sugeridas

```sql
agencies
agency_members
brands
production_plans
production_plan_items
production_deliverables
production_activity_logs -- opcional si no se reutiliza activity_logs
```

### agencies

Campos sugeridos:

```sql
id uuid primary key default gen_random_uuid()
name text not null
type text null
status text not null default 'active' -- active, paused, archived
contact_name text null
contact_email text null
contact_phone text null
notes text null
created_by uuid null
created_at timestamptz default now()
updated_at timestamptz default now()
```

### agency_members

Vincula usuarios aprobados de OrganizAPP con una agencia, si se necesita.

```sql
id uuid primary key default gen_random_uuid()
agency_id uuid references agencies(id) on delete cascade
profile_id uuid references profiles(id) on delete cascade
role text not null default 'member' -- owner, manager, member
created_at timestamptz default now()
unique (agency_id, profile_id)
```

### brands

```sql
id uuid primary key default gen_random_uuid()
name text not null
description text null
status text not null default 'active'
created_by uuid null
created_at timestamptz default now()
updated_at timestamptz default now()
```

### production_plans

```sql
id uuid primary key default gen_random_uuid()
agency_id uuid references agencies(id) on delete cascade
brand_id uuid references brands(id) on delete set null
name text not null
period_type text not null default 'monthly' -- monthly, weekly, campaign, custom
period_start date not null
period_end date not null
status text not null default 'active' -- active, paused, completed, cancelled
responsible_internal_id uuid references profiles(id) on delete set null
notes text null
created_by uuid references profiles(id) on delete set null
created_at timestamptz default now()
updated_at timestamptz default now()
```

### production_plan_items

```sql
id uuid primary key default gen_random_uuid()
plan_id uuid references production_plans(id) on delete cascade
deliverable_type text not null -- video, arte, copy, parrilla, reporte, etc.
target_quantity integer not null default 1
channel text null
format text null
notes text null
created_at timestamptz default now()
```

### production_deliverables

```sql
id uuid primary key default gen_random_uuid()
plan_id uuid references production_plans(id) on delete cascade
plan_item_id uuid references production_plan_items(id) on delete set null
agency_id uuid references agencies(id) on delete cascade
brand_id uuid references brands(id) on delete set null
title text not null
description text null
deliverable_type text not null
channel text null
format text null
status text not null default 'pending'
priority text not null default 'medium'
due_date date null
delivered_at timestamptz null
approved_at timestamptz null
published_at timestamptz null
responsible_internal_id uuid references profiles(id) on delete set null
responsible_agency_member_id uuid references profiles(id) on delete set null
external_url text null
notes text null
position integer default 0
created_by uuid references profiles(id) on delete set null
created_at timestamptz default now()
updated_at timestamptz default now()
```

## 9. RLS y permisos esperados

v0 debe revisar primero las policies actuales antes de crear nuevas.

Reglas operativas sugeridas:

### Global admin

Usuarios con `profiles.role = 'admin'` y `profiles.status = 'approved'` pueden:

- gestionar agencias;
- gestionar marcas;
- gestionar planes;
- ver todo;
- aprobar/rechazar usuarios en el módulo admin existente;
- corregir estados y responsables.

### Usuario aprobado normal

Usuarios con `profiles.status = 'approved'` pueden:

- ver agencias/planes/entregables donde participan o que fueron asignados internamente;
- actualizar entregables donde sean responsables internos o miembros autorizados;
- comentar o registrar notas si se implementa.

### Usuario pendiente o rechazado

No debe poder acceder al módulo ni leer información de agencias.

### Externo/agencia

Si se decide invitar usuarios externos como miembros de agencia, su acceso debe limitarse a sus propios planes/entregables.

## 10. Reglas importantes para v0 con conexión directa a Supabase

Antes de modificar Supabase, v0 debe:

1. Inspeccionar tablas reales en `public`.
2. Inspeccionar columnas reales.
3. Inspeccionar vistas existentes.
4. Inspeccionar RPCs existentes.
5. Inspeccionar RLS policies existentes.
6. Confirmar si `profiles.status` y `profiles.role` ya existen.
7. Confirmar si hay triggers de creación de perfil.
8. Confirmar si hay `activity_logs` y `notifications` reutilizables.
9. No usar `prisma db push` sin revisar, porque Prisma parece no reflejar toda la DB real.
10. No eliminar tablas, columnas, RPCs, vistas ni policies existentes.

Queries de auditoría recomendadas:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

```sql
select table_name
from information_schema.views
where table_schema = 'public'
order by table_name;
```

```sql
select routine_name, routine_type
from information_schema.routines
where specific_schema = 'public'
order by routine_name;
```

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

## 11. Qué NO debe hacer v0 sin confirmación

- No trabajar sobre `main`.
- No borrar datos.
- No cambiar policies existentes sin documentarlas.
- No asumir que Prisma es la fuente de verdad.
- No hardcodear agencias, cantidades, estados o tipos.
- No convertir el módulo en subida de archivos.
- No mezclar entregables de agencia con tareas genéricas si eso complica la operación.
- No permitir que usuarios pendientes o rechazados accedan al módulo.

## 12. MVP recomendado

Primera versión del módulo:

1. Agencias: crear, editar, pausar/archivar.
2. Marcas: crear, editar, archivar.
3. Planes de producción: crear plan por agencia, marca y periodo.
4. Ítems del plan: definir tipos y cantidades.
5. Generar entregables desde los ítems del plan.
6. Kanban de entregables por estado.
7. Tabla de entregables con filtros.
8. Dashboard de cumplimiento por agencia y plan.
9. Link externo opcional por entregable.
10. Permisos por usuario aprobado/admin.

## 13. Integración con OrganizAPP actual

El módulo debe respetar lo que ya existe:

- `UserProvider` y usuario actual;
- `profiles.status` y `profiles.role` si existen;
- gating de `/dashboard/layout.tsx` hacia `/pending`;
- panel admin en `/dashboard/admin/users`;
- `AppSidebar` para navegación;
- diseño visual con shadcn/ui, Tailwind y dark mode;
- actividad y notificaciones si se decide reutilizarlas.

Se sugiere agregar en el sidebar:

```txt
Agencias
Producción
```

O un solo item:

```txt
Producción de Agencias
```

## 14. Métricas mínimas

Por plan:

- cantidad objetivo;
- entregables creados;
- aprobados;
- publicados;
- atrasados;
- en revisión;
- porcentaje de cumplimiento;
- estado calculado: va bien, atención, en riesgo.

Por agencia:

- planes activos;
- entregables activos;
- aprobados del periodo;
- atrasados del periodo;
- cumplimiento promedio;
- próximos vencimientos.

## 15. Resultado esperado

El resultado final debe permitir controlar agencias con trabajos diferentes sin tocar código:

```txt
Juan Editor -> 34 videos mensuales
Diseño ABC -> 20 artes mensuales
Social Media XYZ -> 4 parrillas + 16 copys + 8 ideas + 1 reporte
```

Y OrganizAPP debe mostrar:

- qué está haciendo cada agencia;
- cuánto debe entregar;
- cuánto ha entregado/aprobado;
- qué falta;
- qué está atrasado;
- qué está en revisión;
- qué links externos existen;
- quién es responsable internamente.

Este módulo es una capa de Creative Operations / Agency Operations sobre OrganizAPP, no un simple gestor de archivos ni un Kanban genérico.
