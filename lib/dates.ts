/**
 * Fechas de calendario (día, sin hora).
 *
 * Todo lo que en esta aplicación es una fecha —vencimientos, periodos de un
 * plan— es un día del calendario, no un instante. La base de datos las guarda
 * como texto `YYYY-MM-DD`.
 *
 * El error fácil, y que estaba por todo el código, es pasar por `Date` sin
 * pensar en la zona horaria:
 *
 *   new Date().toISOString().slice(0, 10)
 *     → convierte a UTC. En Ecuador (UTC-5), a partir de las 19:00 devuelve
 *       el día siguiente, así que lo que vencía hoy pasaba a "vencido" cada
 *       tarde.
 *
 *   new Date("2026-08-25")
 *     → el estándar lo interpreta como medianoche UTC, que en Ecuador son las
 *       19:00 del día 24. Comparado con la medianoche local de hoy salía
 *       "anterior", así que TODO lo que vencía hoy se pintaba de rojo.
 *
 * La regla de este módulo: las fechas de calendario se comparan como texto
 * (`"2026-08-25" < "2026-08-26"` es correcto y no depende de nada) y solo se
 * convierten a `Date` con la hora local explícita.
 */

/** Fecha local de un `Date`, como `YYYY-MM-DD`. Nunca pasa por UTC. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Hoy, en la zona horaria de quien usa la aplicación. */
export function todayIso(): string {
  return toIsoDate(new Date())
}

/** Último día del mes en curso. */
export function monthEndIso(): string {
  const now = new Date()
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
}

/**
 * `YYYY-MM-DD` → `Date` a medianoche **local**.
 * Devuelve null si la cadena no es una fecha válida.
 */
export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/** Suma días a una fecha sin tocar la hora local. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/**
 * ¿Esta fecha límite ya pasó?
 *
 * Vencer **hoy** no es ir con retraso: solo cuenta a partir de mañana.
 */
export function isPastDue(dueIso: string | null | undefined): boolean {
  if (!dueIso) return false
  return dueIso.slice(0, 10) < todayIso()
}

/** Días de calendario entre dos fechas ISO. Negativo si `to` es anterior. */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const from = parseIsoDate(fromIso)
  const to = parseIsoDate(toIso)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}
