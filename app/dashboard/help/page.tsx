"use client"

import { useState } from "react"
import { useUser } from "@/components/user-provider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown } from "lucide-react"

/**
 * Guía de uso.
 *
 * Está ordenada por lo que la persona quiere hacer, no por cómo está construida
 * la herramienta: primero el día a día (que es a lo que se entra 99 veces de
 * cada 100), después cada módulo, y la administración al final y aparte, porque
 * solo la necesitan una o dos personas.
 */

type Seccion = {
  id: string
  grupo: string
  titulo: string
  soloAdmin?: boolean
  /** Palabras que no salen en el título pero por las que alguien buscaría. */
  busca?: string
  cuerpo: React.ReactNode
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
}
function Pasos({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
            {i + 1}
          </span>
          <span className="leading-relaxed text-muted-foreground">{t}</span>
        </li>
      ))}
    </ol>
  )
}
function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-2 border-foreground/30 bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  )
}
function Dos({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>
}
function Ficha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium">{titulo}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

const G_EMPEZAR = "Para empezar"
const G_DIA = "Tu día a día"
const G_PROYECTOS = "Proyectos"
const G_AGENCIAS = "Producción de Agencias"
const G_ADMIN = "Administración"
const G_AYUDA = "Si algo no cuadra"

const SECCIONES: Seccion[] = [
  // ── Para empezar ──────────────────────────────────────────────────────────
  {
    id: "que-es",
    grupo: G_EMPEZAR,
    titulo: "¿Qué es esto y para qué sirve?",
    busca: "modulos proyectos agencias diferencia",
    cuerpo: (
      <div className="space-y-3">
        <P>Hay dos partes y sirven para cosas distintas:</P>
        <Dos>
          <Ficha titulo="Proyectos">
            El trabajo de tu equipo. Tareas en un tablero que vas moviendo según avanzan.
          </Ficha>
          <Ficha titulo="Producción de Agencias">
            El trabajo que hace gente de fuera. Qué te tienen que entregar, cuándo, y si van
            en plazo.
          </Ficha>
        </Dos>
        <P>
          No tienes que usar las dos. Si solo trabajas con tu equipo, ignora la de agencias, y
          al revés.
        </P>
      </div>
    ),
  },
  {
    id: "primer-dia",
    grupo: G_EMPEZAR,
    titulo: "Tu primer día: qué es cada cosa de la pantalla",
    busca: "menu lateral navegacion donde esta tema oscuro claro",
    cuerpo: (
      <div className="space-y-3">
        <P>Todo se mueve desde el menú de la izquierda:</P>
        <div className="space-y-1.5 text-sm">
          {[
            ["Inicio", "Resumen: tus proyectos y lo que tienes asignado."],
            ["Proyectos", "Tus tableros de tareas."],
            ["Producción de Agencias", "Los proveedores externos y lo que entregan."],
            ["Calendario", "Todo lo que vence, mes a mes."],
            ["Equipo", "Cuánto trabajo tiene cada persona."],
            ["Guardados", "Enlaces que te guardas para tenerlos a mano."],
            ["Ajustes", "Tu nombre y el aspecto de la aplicación."],
            ["Guía de uso", "Esto que estás leyendo."],
          ].map(([a, b]) => (
            <div key={a} className="flex gap-3 rounded-md border px-3 py-2">
              <span className="w-44 shrink-0 font-medium">{a}</span>
              <span className="text-muted-foreground">{b}</span>
            </div>
          ))}
        </div>
        <P>
          Arriba a la derecha, en tu nombre, tienes <strong>Cambiar tema</strong>: claro, oscuro
          o sepia. Y <strong>Cerrar sesión</strong>.
        </P>
      </div>
    ),
  },

  // ── Tu día a día ──────────────────────────────────────────────────────────
  {
    id: "mi-trabajo",
    grupo: G_DIA,
    titulo: "¿Qué tengo que hacer hoy?",
    busca: "mis tareas asignado pendiente rojo retraso vencido",
    cuerpo: (
      <div className="space-y-3">
        <P>
          Dos sitios contestan a eso, y conviene saber cuál mirar:
        </P>
        <Dos>
          <Ficha titulo="Inicio">
            Lo que tienes asignado ahora mismo, sin fechas de por medio. Es lo primero que ves
            al entrar.
          </Ficha>
          <Ficha titulo="Calendario">
            Lo mismo pero repartido por días, para ver qué se te viene encima esta semana.
          </Ficha>
        </Dos>
        <P>
          En los dos, lo que sale <strong className="text-red-600 dark:text-red-400">en rojo</strong>{" "}
          ya pasó de fecha. Lo que vence hoy no se pinta de rojo: todavía estás a tiempo.
        </P>
        <Aviso>
          Si no te aparece nada, no es que no tengas trabajo: es que nadie te lo ha{" "}
          <strong>asignado</strong>, o las tareas <strong>no tienen fecha</strong>. Esas dos
          casillas son las que hacen que la herramienta sirva de algo.
        </Aviso>
      </div>
    ),
  },
  {
    id: "avanzar",
    grupo: G_DIA,
    titulo: "Marcar que algo avanzó",
    busca: "arrastrar mover completar hecho terminado estado",
    cuerpo: (
      <div className="space-y-3">
        <P>Depende de dónde esté:</P>
        <Dos>
          <Ficha titulo="Una tarea de proyecto">
            Arrástrala a la siguiente columna. Para darla por terminada, pulsa el cuadrito a la
            izquierda del título: se tacha.
          </Ficha>
          <Ficha titulo="Un entregable de agencia">
            Arrástralo a la siguiente etapa. Para cambiar en qué punto está, pulsa su etiqueta de
            estado y elige otro.
          </Ficha>
        </Dos>
        <P>Todo se guarda solo. No hay ningún botón de guardar en ninguna parte.</P>
      </div>
    ),
  },
  {
    id: "calendario",
    grupo: G_DIA,
    titulo: "Leer el Calendario",
    busca: "fechas vencimiento mes mio todo movil",
    cuerpo: (
      <div className="space-y-3">
        <P>Enseña todo lo que tiene fecha límite, del equipo y de las agencias, junto.</P>
        <div className="space-y-1.5 text-sm">
          {[
            ["Cuadrado", "Tarea de un proyecto."],
            ["Círculo", "Entregable de una agencia."],
            ["En rojo", "Se pasó de fecha."],
            ["Mío / Todo", "Por defecto ves solo lo tuyo. Cambia a Todo para ver al resto."],
          ].map(([a, b]) => (
            <div key={a} className="flex gap-3 rounded-md border px-3 py-2">
              <span className="w-28 shrink-0 font-medium">{a}</span>
              <span className="text-muted-foreground">{b}</span>
            </div>
          ))}
        </div>
        <P>
          En el móvil funciona como el calendario del teléfono: arriba el mes, tocas un día y
          abajo salen sus cosas.
        </P>
        <Aviso>
          Si lo ves vacío es porque nada tiene fecha límite puesta. No es un fallo de la
          aplicación.
        </Aviso>
      </div>
    ),
  },

  // ── Proyectos ─────────────────────────────────────────────────────────────
  {
    id: "proyectos-crear",
    grupo: G_PROYECTOS,
    titulo: "Crear un proyecto y sus tareas",
    busca: "nuevo proyecto columna tarea prioridad asignar",
    cuerpo: (
      <div className="space-y-3">
        <Pasos
          items={[
            <>Ve a <strong>Proyectos</strong> y pulsa <strong>Nuevo proyecto</strong>. Solo hace falta el nombre.</>,
            <>Nace con tres columnas listas: <strong>Por hacer</strong>, <strong>En progreso</strong> y <strong>Hecho</strong>. Puedes renombrarlas o añadir más.</>,
            <>Dentro de cada columna, <strong>+ Añadir tarea</strong>.</>,
          ]}
        />
        <P>Al crear la tarea puedes poner título, descripción, prioridad, vencimiento y responsable.</P>
        <Aviso>
          De todos esos campos, los dos que de verdad importan son{" "}
          <strong>Vencimiento</strong> y <strong>Asignar a</strong>. Sin fecha, la tarea no
          aparece en el Calendario. Sin responsable, no le sale a nadie en su lista.
        </Aviso>
      </div>
    ),
  },
  {
    id: "proyectos-vistas",
    grupo: G_PROYECTOS,
    titulo: "Tablero o Lista: cuál te conviene",
    busca: "vista kanban tabla buscar filtrar ordenar",
    cuerpo: (
      <div className="space-y-3">
        <P>Arriba a la derecha del proyecto cambias entre las dos. Enseñan lo mismo:</P>
        <Dos>
          <Ficha titulo="Tablero">
            Tarjetas en columnas. Se arrastran. Es para ver de un vistazo cómo va el trabajo.
          </Ficha>
          <Ficha titulo="Lista">
            Una tabla con buscador, filtros por estado, prioridad y persona, y orden pulsando las
            cabeceras. Es para encontrar algo concreto.
          </Ficha>
        </Dos>
        <P>
          En la Lista puedes cambiar el estado de una tarea desde su desplegable, sin abrirla.
          Cuando tengas muchas, es mucho más rápida.
        </P>
      </div>
    ),
  },
  {
    id: "proyectos-gente",
    grupo: G_PROYECTOS,
    titulo: "Trabajar con más gente en un proyecto",
    busca: "invitar miembro compartir enlace actividad renombrar eliminar",
    cuerpo: (
      <div className="space-y-3">
        <P>
          Dentro del proyecto, la pestaña <strong>Equipo</strong> añade compañeros: búscalos por
          correo o nombre. La pestaña <strong>Actividad</strong> guarda el historial de lo que ha
          pasado.
        </P>
        <P>
          El botón <strong>···</strong> de arriba a la derecha permite renombrar el proyecto,{" "}
          <strong>compartirlo</strong> con un enlace de solo lectura, o eliminarlo.
        </P>
        <Aviso>
          Para poder invitar a alguien, esa persona ya tiene que tener cuenta creada y aprobada.
          Si no la encuentras, es que todavía no la tiene.
        </Aviso>
      </div>
    ),
  },

  // ── Agencias ──────────────────────────────────────────────────────────────
  {
    id: "agencias",
    grupo: G_AGENCIAS,
    titulo: "Cómo está organizado",
    busca: "agencia plan entregable estructura empezar lanzamiento rapido",
    cuerpo: (
      <div className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3 text-center text-sm font-medium">
          Agencia → Plan → Entregables
        </div>
        <P>
          La <strong>agencia</strong> es el proveedor. El <strong>plan</strong> es un paquete de
          trabajo de un periodo (por ejemplo &quot;Social media — Mayo&quot;). Los{" "}
          <strong>entregables</strong> son cada pieza concreta: Reel 1, Reel 2…
        </P>
        <P>
          En el panel ves tus agencias con su estado: <strong>Va bien</strong>,{" "}
          <strong>Atención</strong>, <strong>En riesgo</strong> (hay retrasos) o{" "}
          <strong>Sin producción</strong>. Pulsa una agencia para ver sus planes, y un plan para
          ver sus entregables. Las migas de arriba te devuelven atrás.
        </P>
        <P>
          Un plan también tiene dos vistas: <strong>Kanban</strong> (columnas por etapa, se
          arrastra) y <strong>Tabla</strong> (buscador, filtros y desplegables para cambiar etapa
          y estado sin abrir nada).
        </P>
      </div>
    ),
  },
  {
    id: "etapa-estado",
    grupo: G_AGENCIAS,
    titulo: "Etapa y estado no son lo mismo",
    busca: "columna kanban pendiente aprobado publicado confusion",
    cuerpo: (
      <div className="space-y-3">
        <P>Esto es lo que más confunde al principio:</P>
        <Dos>
          <Ficha titulo="Etapa">
            La columna del Kanban. La defines tú (Brief, Producción, Revisión…). Se cambia{" "}
            arrastrando la tarjeta.
          </Ficha>
          <Ficha titulo="Estado">
            En qué punto real está la pieza. La lista es fija: Pendiente, Brief enviado, En
            producción, Entregado, En revisión, Cambios solicitados, Aprobado, Publicado, Pausado,
            Cancelado.
          </Ficha>
        </Dos>
        <Aviso>
          Para cambiar el estado rápido, pulsa la <strong>etiqueta de estado</strong> de la
          tarjeta y elige otro. No hace falta abrir el entregable.
        </Aviso>
      </div>
    ),
  },
  {
    id: "entregable",
    grupo: G_AGENCIAS,
    titulo: "Abrir y editar un entregable",
    busca: "lapiz editar link comentarios responsable fecha",
    cuerpo: (
      <div className="space-y-3">
        <P>
          Pulsa el <strong>lápiz</strong> de la tarjeta. Se abre una ventana donde editas título,
          tipo, canal, formato, estado, prioridad, fecha límite, el <strong>link</strong> de la
          pieza entregada (Drive, YouTube…) y el <strong>responsable interno</strong> que la
          supervisa.
        </P>
        <P>
          Abajo del todo están los <strong>comentarios</strong>: ahí se piden cambios y queda
          constancia de lo acordado con la agencia.
        </P>
      </div>
    ),
  },

  // ── Administración ────────────────────────────────────────────────────────
  {
    id: "admin-agencias",
    grupo: G_ADMIN,
    titulo: "Crear una agencia y su primer plan",
    soloAdmin: true,
    busca: "crear agencia plan detallado configuracion plantilla etapas",
    cuerpo: (
      <div className="space-y-3">
        <Pasos
          items={[
            <>En <strong>Producción de Agencias</strong>, si no hay nada creado la propia pantalla te guía. Empieza por <strong>Crear agencia</strong>: solo el nombre.</>,
            <>Vuelve al panel y pulsa <strong>Lanzamiento rápido</strong>. Pide agencia y plantilla de etapas, nada más.</>,
            <>El plan y sus etapas se crean solos. Ya puedes añadirle entregables.</>,
          ]}
        />
        <P>
          Existe también <strong>Configuración → Crear plan detallado</strong>: en vez de un plan
          vacío, le describes cuántas piezas quieres de cada tipo (30 videos, 4 reportes) y te
          genera todas las tarjetas de golpe, con nombres numerados y fechas repartidas.
        </P>
        <Aviso>
          El plan detallado solo genera al crear. Si más adelante quieres otras 30 piezas,
          tendrás que añadirlas una a una o crear otro plan. Y si te equivocas, dentro del plan
          tienes <strong>Eliminar plan</strong>, que te dice cuántos entregables se lleva por
          delante antes de confirmar.
        </Aviso>
      </div>
    ),
  },
  {
    id: "admin-alta",
    grupo: G_ADMIN,
    titulo: "Dar de alta a alguien",
    soloAdmin: true,
    busca: "usuario registro aprobar activar cuenta pendiente",
    cuerpo: (
      <div className="space-y-3">
        <P>
          <strong>Tú no creas cuentas.</strong> Cada persona se crea la suya y tú decides si entra
          y qué tipo de usuario es. Da igual que sea de tu equipo o de una agencia: el registro es
          el mismo para todos.
        </P>
        <Pasos
          items={[
            <>Le pasas la dirección de OrganizAPP. La persona pulsa <strong>Crear cuenta</strong> y pone su nombre, correo y contraseña.</>,
            <>Queda en espera, sin poder ver nada. Tú la encuentras en <strong>Admin → Usuarios → Inactivos</strong>.</>,
            <>Pulsas <strong>Activar</strong>. Se abre una ventana que te pide elegir el tipo antes de dejarla entrar.</>,
            <><strong>Interno</strong> si es de tu equipo. <strong>De agencia</strong> si es un contacto externo — entonces eliges también cuál.</>,
          ]}
        />
        <Aviso>
          Si vas a dar de alta a alguien de una agencia, <strong>crea antes la agencia</strong>.
          Si no existe, no la podrás elegir en la ventana.
        </Aviso>
        <P>
          Nadie recibe correo en ningún momento: ni a ti te avisa cuando alguien se registra, ni a
          la persona cuando la apruebas. Entra a mirar de vez en cuando y avísale tú.
        </P>
        <P>
          ¿Te has equivocado? En la pestaña <strong>Activos</strong>, el desplegable de cada fila
          cambia el tipo cuando quieras.
        </P>
      </div>
    ),
  },
  {
    id: "admin-tipos",
    grupo: G_ADMIN,
    titulo: "Interno y de agencia: en qué se diferencian",
    soloAdmin: true,
    busca: "permisos tipo usuario aislamiento rls externo",
    cuerpo: (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5 font-medium">Ve…</th>
                <th className="p-2.5 font-medium">Interno</th>
                <th className="p-2.5 font-medium">De agencia</th>
              </tr>
            </thead>
            <tbody className="[&_td]:p-2.5 [&_tr]:border-b [&_tr:last-child]:border-0">
              <tr><td>Las agencias</td><td>Todas</td><td>Solo la suya</td></tr>
              <tr><td>Planes y entregables</td><td>Todos</td><td>Solo los de su agencia</td></tr>
              <tr><td>Crear agencias, planes y etapas</td><td>Sí</td><td>No</td></tr>
              <tr><td>Proyectos</td><td>Los suyos</td><td>Solo si le invitas</td></tr>
              <tr><td>Módulo Equipo</td><td>Sí</td><td>No</td></tr>
            </tbody>
          </table>
        </div>
        <P>
          Aparte del tipo está el <strong>rol de admin</strong>, que es independiente: se da con
          el botón <em>Hacer admin</em> y añade la gestión de usuarios.
        </P>
        <Aviso>
          Esta separación no es solo visual: está aplicada en la base de datos. Un usuario de
          agencia no puede llegar a los datos de otra agencia ni forzando la dirección web.
        </Aviso>
      </div>
    ),
  },

  // ── Si algo no cuadra ─────────────────────────────────────────────────────
  {
    id: "permisos",
    grupo: G_AYUDA,
    titulo: "Quién puede hacer qué",
    busca: "permisos admin interno agencia tabla",
    cuerpo: (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5 font-medium">Puede…</th>
                <th className="p-2.5 font-medium">Admin</th>
                <th className="p-2.5 font-medium">Interno</th>
                <th className="p-2.5 font-medium">Agencia</th>
              </tr>
            </thead>
            <tbody className="[&_td]:p-2.5 [&_tr]:border-b [&_tr:last-child]:border-0">
              <tr><td>Crear agencias, marcas y planes</td><td>Sí</td><td>Sí</td><td>No</td></tr>
              <tr><td>Configurar etapas</td><td>Sí</td><td>Sí</td><td>No</td></tr>
              <tr><td>Eliminar un plan</td><td>Sí</td><td>Sí</td><td>No</td></tr>
              <tr><td>Mover entregables de etapa</td><td>Todos</td><td>Todos</td><td>Los suyos</td></tr>
              <tr><td>Editar entregables</td><td>Todos</td><td>Todos</td><td>Los suyos</td></tr>
              <tr><td>Ver otras agencias</td><td>Sí</td><td>Sí</td><td>No</td></tr>
              <tr><td>Gestionar usuarios</td><td>Sí</td><td>No</td><td>No</td></tr>
            </tbody>
          </table>
        </div>
        <P>
          Un usuario de <strong>agencia</strong> solo ve su propia agencia, y en Proyectos solo
          aquellos a los que se le haya invitado expresamente.
        </P>
      </div>
    ),
  },
  {
    id: "problemas",
    grupo: G_AYUDA,
    titulo: "Problemas frecuentes",
    busca: "no puedo entrar contraseña vacio sin etapa error",
    cuerpo: (
      <div className="space-y-2 text-sm">
        {[
          ["Me registré y no puedo entrar.", "Tu cuenta está pendiente. Un administrador tiene que aprobarla, y no le llega ningún aviso: escríbele."],
          ["Olvidé mi contraseña.", "Pulsa «¿Olvidaste tu contraseña?» en la pantalla de entrada. El enlace del correo dura 1 hora y solo sirve una vez."],
          ["El calendario está vacío.", "Solo salen las cosas con fecha límite. Ponles fecha."],
          ["No me aparece nada asignado.", "Nadie te lo ha asignado todavía. Pídele a quien lleve el proyecto que te ponga como responsable."],
          ["Todo está amontonado en «Sin etapa».", "Esos entregables no tienen etapa. Arrástralos, o cámbialos desde la vista Tabla, que es más rápida."],
          ["En el Calendario «Mío» me muestra todo.", "Eres el responsable de casi todo. Reparte los responsables entre el equipo."],
          ["No encuentro a un compañero para invitarlo.", "Tiene que tener cuenta creada y aprobada. Búscalo por su correo completo."],
          ["Un contacto de agencia está viendo otras agencias.", "Está activado como Interno. Cámbialo en Admin → Usuarios → Activos, con el desplegable de su fila."],
          ["Al activar a alguien no me sale su agencia.", "Esa agencia todavía no existe. Créala primero en Producción de Agencias."],
          ["Cambié algo y no lo veo.", "La aplicación guarda en memoria lo ya cargado para ir rápido. Recarga la página."],
        ].map(([q, a]) => (
          <div key={q} className="rounded-lg border p-3">
            <div className="font-medium">{q}</div>
            <p className="mt-1 text-muted-foreground">{a}</p>
          </div>
        ))}
      </div>
    ),
  },
]

const ORDEN_GRUPOS = [G_EMPEZAR, G_DIA, G_PROYECTOS, G_AGENCIAS, G_ADMIN, G_AYUDA]

export default function HelpPage() {
  const { user } = useUser()
  const isAdmin = user?.role === "admin" && user?.is_active === true
  const [abierta, setAbierta] = useState<string | null>("que-es")
  const [busca, setBusca] = useState("")

  const termino = busca.trim().toLowerCase()
  const visibles = SECCIONES.filter((s) => {
    if (s.soloAdmin && !isAdmin) return false
    if (!termino) return true
    return (
      s.titulo.toLowerCase().includes(termino) ||
      s.grupo.toLowerCase().includes(termino) ||
      (s.busca || "").includes(termino)
    )
  })

  const grupos = ORDEN_GRUPOS.map((nombre) => ({
    nombre,
    secciones: visibles.filter((s) => s.grupo === nombre),
  })).filter((g) => g.secciones.length > 0)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Guía de uso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cómo se usa la herramienta. Pulsa una sección para abrirla.
        </p>
      </header>

      <div className="relative mb-5">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar en la guía…"
          className="h-9 pl-8"
        />
      </div>

      <div className="space-y-6">
        {grupos.map((grupo) => (
          <section key={grupo.nombre}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {grupo.nombre}
            </h2>
            <div className="space-y-2">
              {grupo.secciones.map((s) => {
                const open = abierta === s.id
                return (
                  <div key={s.id} className="overflow-hidden rounded-lg border bg-card">
                    <button
                      type="button"
                      onClick={() => setAbierta(open ? null : s.id)}
                      className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40"
                    >
                      <span className="flex-1 font-medium">{s.titulo}</span>
                      {s.soloAdmin && (
                        <Badge variant="outline" className="text-[10px] font-normal">Admin</Badge>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && <div className="border-t p-4">{s.cuerpo}</div>}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {grupos.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nada coincide con esa búsqueda.
          </p>
        )}
      </div>
    </div>
  )
}
