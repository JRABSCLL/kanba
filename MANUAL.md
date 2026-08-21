# Manual de OrganizAPP

Guía de uso. Está escrita para que cualquiera pueda usar la herramienta sin
que nadie se lo explique.

---

## Qué es

OrganizAPP tiene **dos módulos** y sirven para cosas distintas:

| Módulo | Para qué |
|---|---|
| **Proyectos** | El trabajo interno del equipo. Tareas en un tablero. |
| **Producción de Agencias** | El trabajo que hacen proveedores externos. Controlar qué entregan y cuándo. |

Puedes usar solo uno de los dos si es lo que necesitas.

---

## Entrar por primera vez

1. Abre la web de OrganizAPP.
2. Pulsa **Crear cuenta**. Pon tu nombre, tu correo y una contraseña.
3. Verás una pantalla que dice **"Cuenta pendiente de aprobación"**. Esto es
   normal: un administrador tiene que darte acceso.
4. Cuando te aprueben, entra con tu correo y contraseña.

> Si llevas rato esperando, pídele al administrador que te active. Él lo hace
> en un clic. No es un fallo de la aplicación.

### El menú de la izquierda

- **Inicio** — resumen: tus proyectos y tus tareas asignadas.
- **Proyectos** — todos tus proyectos.
- **Producción de Agencias** — el módulo de proveedores externos.
- **Calendario** — todo lo que vence, mes a mes.
- **Equipo** — cuánto trabajo tiene cada persona (solo administradores e internos).
- **Guardados** — enlaces que guardas.
- **Ajustes** — tu nombre y el tema.
- **Admin** — gestión de usuarios (solo administradores).

Arriba a la derecha hay un icono para cambiar el aspecto: **claro**, **oscuro**
o **sepia**.

---

## Módulo 1 — Proyectos

### Crear un proyecto

1. **Proyectos** → botón **Nuevo proyecto**.
2. Escribe el nombre. La descripción es opcional.
3. Pulsa **Crear proyecto**.

El proyecto nace con tres columnas ya hechas: **Por hacer**, **En progreso** y
**Hecho**. Puedes renombrarlas o añadir más.

### Añadir tareas

Dentro del proyecto, en la pestaña **Tablero**, cada columna tiene abajo
**+ Añadir tarea**. Al crearla puedes rellenar:

- **Título** (obligatorio).
- **Descripción**.
- **Prioridad**: Alta, Media o Baja.
- **Vencimiento**: la fecha límite. *Ponla siempre que puedas: es lo que hace
  que la tarea aparezca en el Calendario y avise cuando se retrasa.*
- **Asignar a**: quién la hace. *Sin esto, la tarea no le sale a nadie en su
  lista ni en la vista de Equipo.*

### Mover una tarea

**Arrástrala** de una columna a otra con el ratón. Se guarda sola.

Para marcarla como terminada, pulsa el **cuadrito** que hay a la izquierda del
título. Se tacha.

### Las dos vistas

Arriba a la derecha del tablero puedes cambiar entre:

- **Tablero** — las tarjetas en columnas, con arrastrar y soltar.
- **Lista** — una tabla. Aquí puedes **buscar**, **filtrar** (por estado,
  prioridad o persona), **ordenar** pulsando en las cabeceras, y **cambiar el
  estado de una tarea desde el desplegable** sin abrirla.

Usa la Lista cuando tengas muchas tareas y necesites encontrar algo.

### Las otras pestañas del proyecto

- **Equipo** — añade compañeros al proyecto. Búscalos por correo o nombre.
  La persona ya tiene que tener cuenta aprobada en OrganizAPP.
- **Actividad** — historial de lo que ha pasado en el proyecto.

### Otras acciones

El botón **···** arriba a la derecha permite **Renombrar**, **Compartir**
(genera un enlace de solo lectura) y **Eliminar** el proyecto.

---

## Módulo 2 — Producción de Agencias

Sirve para controlar a proveedores externos: qué te tienen que entregar, en qué
estado va cada pieza y si van con retraso.

### Cómo está organizado

```
Agencia  →  Plan  →  Entregables
```

- **Agencia**: el proveedor (la productora, el estudio de diseño...).
- **Plan**: un paquete de trabajo, normalmente de un periodo. Por ejemplo
  "Social media — Mayo".
- **Entregables**: cada pieza concreta. Por ejemplo "Reel 1", "Reel 2"...

### Empezar (la forma rápida)

1. **Producción de Agencias**.
2. Si no tienes nada creado, la pantalla te guía con dos pasos. Pulsa
   **Crear agencia** y rellena el nombre.
3. Vuelve al panel y pulsa **Lanzamiento rápido**.
4. Elige la **agencia** y una **plantilla de etapas**. Nada más.

Se crean solos el plan y sus etapas. Es el camino recomendado.

> También existe **Configuración → Crear plan detallado**, con muchos más
> campos (cantidades, canales, formatos, nombres automáticos). Úsalo solo si
> necesitas un plan a medida.

### Moverte por el módulo

En el panel ves todas tus agencias con su estado: **Va bien**, **Atención**,
**En riesgo** (hay retrasos) o **Sin producción**.

- Pulsa una **agencia** → ves sus planes.
- Pulsa un **plan** → ves sus entregables.
- Arriba tienes las migas de pan (`Agencias / Nombre / Plan`) para volver.

### Las dos vistas de un plan

- **Kanban** — los entregables en columnas por **etapa**. Los mueves
  arrastrando.
- **Tabla** — todos en una lista, con **buscar**, **filtros** (etapa, estado,
  prioridad), **ordenar**, y desplegables para cambiar **etapa** y **estado**
  sin abrir nada.

### Etapa y estado: no son lo mismo

Esto confunde al principio:

- **Etapa** = la columna del Kanban. La configuras tú (Brief, Producción,
  Revisión...). Se cambia **arrastrando** la tarjeta.
- **Estado** = en qué punto real está la pieza. La lista es fija: Pendiente,
  Brief enviado, En producción, Entregado, En revisión, Cambios solicitados,
  Aprobado, Publicado, Pausado, Cancelado.

Para cambiar el **estado** rápido: pulsa la **etiqueta de estado** de la
tarjeta y elige otro. No hace falta abrir el entregable.

### Trabajar con un entregable

Pulsa el **lápiz** de la tarjeta. Se abre una ventana donde puedes editar:

- Título, tipo, canal, formato.
- **Estado** y **prioridad**.
- **Fecha límite** — igual que en tareas: sin fecha no aparece en el Calendario.
- **Link externo** — la URL de la pieza entregada (Drive, YouTube...).
- **Responsable interno** — la persona de tu equipo que supervisa esa pieza.
- **Comentarios** — abajo. Para pedir cambios o dejar constancia de algo.

Los administradores también pueden **Eliminar** el entregable desde ahí.

### Configurar etapas

Dentro de un plan, botón **Configurar etapas**. Puedes crear, renombrar,
cambiar el color y borrar etapas. Si borras una, sus entregables quedan en
"Sin etapa" (no se pierden).

---

## Calendario

Muestra todo lo que tiene **fecha límite**: tareas y entregables juntos.

- **Cuadrado** = tarea de un proyecto. **Círculo** = entregable de una agencia.
- Lo que está **en rojo** va con retraso.
- **Mío / Todo**: por defecto ves solo lo tuyo. Cambia a "Todo" para ver lo del
  resto del equipo.
- En el móvil funciona como el calendario del teléfono: arriba el mes, tocas un
  día y abajo salen sus cosas.

> Si el calendario se ve vacío, es porque las tareas y entregables **no tienen
> fecha límite puesta**. No es un fallo.

---

## Equipo

Solo la ven administradores y usuarios internos.

Muestra a cada persona con cuánto tiene **pendiente** y cuánto lleva
**vencido** (en rojo), sumando tareas y entregables. Están ordenadas por quien
va más retrasado. Pulsa a alguien para ver exactamente qué tiene.

---

## Notificaciones

La **campana** del menú avisa cuando:

- Te asignan una tarea.
- Te invitan a un proyecto.
- Te ponen como responsable de un entregable.
- Cambia el estado de un entregable del que eres responsable.

Puedes marcarlas como leídas una a una o todas de golpe.

---

## Para el administrador

### Aprobar usuarios

**Admin** → **Usuarios**. Ahí ves a quien está esperando entrar y lo activas.
Mientras no lo hagas, esa persona no puede usar la aplicación.

### Tipos de usuario

- **Admin** — puede todo: crear agencias, planes, aprobar usuarios.
- **Interno** — trabaja en proyectos y supervisa entregables.
- **Agencia** — es un contacto externo. **Solo ve los datos de su propia
  agencia**, nada del resto.

Asigna el tipo desde la misma pantalla de Usuarios.

### Consejo para que la herramienta sirva

Tres costumbres marcan la diferencia:

1. **Pon fecha límite** a tareas y entregables. Sin fecha, nada aparece en el
   Calendario ni cuenta como retrasado.
2. **Asigna responsable.** Si todo te lo asignas a ti, la vista de Equipo no
   dice nada útil y el filtro "Mío" te muestra absolutamente todo.
3. **Mueve las tarjetas** cuando cambie la realidad. La herramienta solo vale
   lo que valen los datos que tiene dentro.

---

## Problemas frecuentes

**"Me registré y no puedo entrar."**
Tu cuenta está pendiente. Un administrador tiene que aprobarla en Admin →
Usuarios.

**"El calendario está vacío."**
Solo salen las cosas con fecha límite. Ponles fecha.

**"En el Kanban de agencias todo está amontonado en 'Sin etapa'."**
Esos entregables no tienen etapa asignada. Arrástralos a la etapa que toque, o
cámbiala desde la vista Tabla, que es más rápido para muchos a la vez.

**"En el Calendario 'Mío' me muestra todo."**
Es porque eres el responsable de casi todo. Reparte los responsables entre el
equipo.

**"No encuentro a un compañero para invitarlo al proyecto."**
Tiene que tener cuenta creada y aprobada. Búscalo por su correo completo.

**"Cambié algo y no lo veo."**
La aplicación guarda en memoria lo que ya cargaste para ir más rápido. Recarga
la página (F5).
