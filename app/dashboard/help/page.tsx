"use client"

import { useState } from "react"
import { useUser } from "@/components/user-provider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown } from "lucide-react"

type Seccion = {
  id: string
  titulo: string
  soloAdmin?: boolean
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

const SECCIONES: Seccion[] = [
  {
    id: "que-es",
    titulo: "Qué es cada módulo",
    cuerpo: (
      <div className="space-y-3">
        <P>La herramienta tiene dos partes y sirven para cosas distintas:</P>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Proyectos</div>
            <p className="mt-1 text-xs text-muted-foreground">
              El trabajo interno del equipo, en un tablero de tareas.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Producción de Agencias</div>
            <p className="mt-1 text-xs text-muted-foreground">
              El trabajo de proveedores externos: qué entregan y cuándo.
            </p>
          </div>
        </div>
        <P>Puedes usar solo uno de los dos si es lo que necesitas.</P>
      </div>
    ),
  },
  {
    id: "proyectos",
    titulo: "Proyectos: crear y trabajar",
    cuerpo: (
      <div className="space-y-3">
        <Pasos
          items={[
            <>Ve a <strong>Proyectos</strong> y pulsa <strong>Nuevo proyecto</strong>. Solo hace falta el nombre.</>,
            <>El proyecto nace con tres columnas listas: <strong>Por hacer</strong>, <strong>En progreso</strong> y <strong>Hecho</strong>.</>,
            <>Dentro de cada columna, pulsa <strong>+ Añadir tarea</strong>.</>,
            <>Para avanzar una tarea, <strong>arrástrala</strong> a otra columna. Se guarda sola.</>,
          ]}
        />
        <Aviso>
          Al crear una tarea, rellena <strong>Vencimiento</strong> y <strong>Asignar a</strong>.
          Sin fecha no aparece en el Calendario; sin responsable no le sale a nadie en su lista.
        </Aviso>
        <P>
          Arriba a la derecha puedes cambiar entre <strong>Tablero</strong> (tarjetas que se
          arrastran) y <strong>Lista</strong> (tabla con buscador, filtros y orden). Usa la Lista
          cuando tengas muchas tareas.
        </P>
      </div>
    ),
  },
  {
    id: "agencias",
    titulo: "Agencias: cómo está organizado",
    cuerpo: (
      <div className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3 text-center text-sm font-medium">
          Agencia → Plan → Entregables
        </div>
        <P>
          La <strong>agencia</strong> es el proveedor. El <strong>plan</strong> es un paquete de
          trabajo de un periodo (por ejemplo &quot;Social media — Mayo&quot;). Los{" "}
          <strong>entregables</strong> son cada pieza concreta.
        </P>
        <Pasos
          items={[
            <>Si no hay nada creado, la pantalla te guía. Empieza por <strong>Crear agencia</strong>.</>,
            <>Vuelve al panel y pulsa <strong>Lanzamiento rápido</strong>: solo pide agencia y plantilla.</>,
            <>Se crean el plan y sus etapas solos. Pulsa la agencia, luego el plan, y verás sus entregables.</>,
          ]}
        />
        <Aviso>
          Existe también <strong>Configuración → Crear plan detallado</strong>, con muchos más
          campos. Úsalo solo si necesitas un plan a medida.
        </Aviso>
      </div>
    ),
  },
  {
    id: "etapa-estado",
    titulo: "Etapa y estado no son lo mismo",
    cuerpo: (
      <div className="space-y-3">
        <P>Esto es lo que más confunde al principio:</P>
        <div className="space-y-2">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Etapa</div>
            <p className="mt-1 text-xs text-muted-foreground">
              La columna del Kanban. La defines tú (Brief, Producción, Revisión…).
              Se cambia <strong>arrastrando</strong> la tarjeta.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Estado</div>
            <p className="mt-1 text-xs text-muted-foreground">
              En qué punto real está la pieza. La lista es fija: Pendiente, Brief enviado,
              En producción, Entregado, En revisión, Cambios solicitados, Aprobado, Publicado,
              Pausado, Cancelado.
            </p>
          </div>
        </div>
        <Aviso>
          Para cambiar el estado rápido, pulsa la <strong>etiqueta de estado</strong> de la tarjeta
          y elige otro. No hace falta abrir el entregable.
        </Aviso>
      </div>
    ),
  },
  {
    id: "entregable",
    titulo: "Trabajar con un entregable",
    cuerpo: (
      <div className="space-y-3">
        <P>
          Pulsa el <strong>lápiz</strong> de la tarjeta. Se abre una ventana donde editas título,
          tipo, canal, estado, prioridad, fecha límite, el <strong>link</strong> de la pieza
          entregada y el <strong>responsable interno</strong>.
        </P>
        <P>
          Abajo del todo están los <strong>comentarios</strong>: ahí se piden cambios y queda
          constancia de lo acordado.
        </P>
      </div>
    ),
  },
  {
    id: "calendario",
    titulo: "Calendario y Equipo",
    cuerpo: (
      <div className="space-y-3">
        <P>
          El <strong>Calendario</strong> muestra todo lo que tiene fecha límite: tareas y
          entregables juntos. Lo que está en rojo va con retraso. El interruptor{" "}
          <strong>Mío / Todo</strong> cambia entre lo tuyo y lo del equipo.
        </P>
        <Aviso>
          Si el calendario se ve vacío es porque las tareas y entregables no tienen fecha límite
          puesta. No es un fallo.
        </Aviso>
        <P>
          <strong>Equipo</strong> muestra cuánto tiene pendiente y vencido cada persona, ordenado
          por quien va más retrasado.
        </P>
      </div>
    ),
  },
  {
    id: "permisos",
    titulo: "Quién puede hacer qué",
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
              <tr><td>Mover entregables de etapa</td><td>Todos</td><td>Todos</td><td>Los suyos</td></tr>
              <tr><td>Editar entregables</td><td>Todos</td><td>Todos</td><td>Los suyos</td></tr>
              <tr><td>Ver otras agencias</td><td>Sí</td><td>Sí</td><td>No</td></tr>
              <tr><td>Gestionar usuarios</td><td>Sí</td><td>No</td><td>No</td></tr>
            </tbody>
          </table>
        </div>
        <P>
          Un usuario de <strong>agencia</strong> solo ve su propia agencia, y en Proyectos solo ve
          aquellos a los que se le haya invitado expresamente.
        </P>
      </div>
    ),
  },
  {
    id: "admin",
    titulo: "Dar de alta a alguien (administradores)",
    soloAdmin: true,
    cuerpo: (
      <div className="space-y-3">
        <Pasos
          items={[
            <>La persona se registra sola en la web con su correo.</>,
            <>Queda en espera. Tú la ves en <strong>Admin → Usuarios</strong>.</>,
            <>Pulsa <strong>Activar</strong>.</>,
            <>Elige si es <strong>Interno</strong> o asígnale una <strong>Agencia</strong>.</>,
          ]}
        />
        <Aviso>
          El paso 4 es el importante: si no lo haces, la persona queda como interna por defecto y
          verá todo el trabajo interno. Para un contacto externo, asígnale siempre su agencia.
        </Aviso>
      </div>
    ),
  },
  {
    id: "problemas",
    titulo: "Problemas frecuentes",
    cuerpo: (
      <div className="space-y-3 text-sm">
        {[
          ["Me registré y no puedo entrar.", "Tu cuenta está pendiente. Un administrador tiene que aprobarla."],
          ["Olvidé mi contraseña.", "Pulsa «¿Olvidaste tu contraseña?» en la pantalla de entrada. El enlace del correo dura 1 hora."],
          ["El calendario está vacío.", "Solo salen las cosas con fecha límite. Ponles fecha."],
          ["Todo está amontonado en «Sin etapa».", "Esos entregables no tienen etapa. Arrástralos, o cámbialos desde la vista Tabla, que es más rápida."],
          ["En el Calendario «Mío» me muestra todo.", "Eres el responsable de casi todo. Reparte los responsables entre el equipo."],
          ["No encuentro a un compañero para invitarlo.", "Tiene que tener cuenta creada y aprobada. Búscalo por su correo completo."],
          ["Cambié algo y no lo veo.", "La app guarda en memoria lo ya cargado para ir rápido. Recarga la página."],
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

export default function HelpPage() {
  const { user } = useUser()
  const isAdmin = user?.role === "admin" && user?.is_active === true
  const [abierta, setAbierta] = useState<string | null>("que-es")
  const [busca, setBusca] = useState("")

  const visibles = SECCIONES.filter((s) => {
    if (s.soloAdmin && !isAdmin) return false
    const t = busca.trim().toLowerCase()
    return !t || s.titulo.toLowerCase().includes(t)
  })

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Guía de uso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cómo funciona la herramienta. Pulsa una sección para abrirla.
        </p>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar en la guía…"
          className="h-9 pl-8"
        />
      </div>

      <div className="space-y-2">
        {visibles.map((s) => {
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
        {visibles.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nada coincide con esa búsqueda.
          </p>
        )}
      </div>
    </div>
  )
}
