"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

// User + Profile context
interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  // From profiles table
  is_active?: boolean
  role?: "member" | "admin"
  user_type?: "internal" | "agency"
  agency_id?: string | null
}

interface UserContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

/** Lo que sabemos por el token, sin consultar la tabla profiles. */
function baseUser(authUser: any): User {
  return {
    id: authUser.id,
    email: authUser.email || "",
    full_name: authUser.user_metadata?.full_name,
    avatar_url: authUser.user_metadata?.avatar_url,
  }
}

/**
 * Lee la fila de `profiles` (rol, tipo, agencia).
 *
 * Devuelve `null` si no se pudo leer —red caída, tiempo agotado, error—, y esa
 * distinción es la parte importante: antes devolvía un usuario "base" sin rol,
 * que el proveedor guardaba tal cual. Resultado: cualquier fallo pasajero
 * convertía a un admin en usuario común hasta recargar la página. No leer el
 * perfil no es lo mismo que leerlo y que no tenga permisos.
 */
async function fetchProfile(authUser: any, timeoutMs = 8000): Promise<User | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))

  const query = (async (): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, is_active, role, user_type, agency_id")
        .eq("id", authUser.id)
        .maybeSingle()

      if (error || !data) return null

      const base = baseUser(authUser)
      return {
        ...base,
        full_name: data.full_name || base.full_name,
        avatar_url: data.avatar_url || base.avatar_url,
        is_active: data.is_active as boolean,
        role: data.role as User["role"],
        user_type: (data.user_type as User["user_type"]) ?? undefined,
        agency_id: (data.agency_id as string | null) ?? null,
      }
    } catch {
      return null
    }
  })()

  return Promise.race([query, timeout])
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  // Espejo del estado para poder consultarlo dentro de los callbacks de auth
  // sin volver a suscribirse en cada cambio.
  const userRef = useRef<User | null>(null)

  const applyUser = (next: User | null) => {
    if (!mountedRef.current) return
    userRef.current = next
    setUser(next)
  }

  /**
   * Guarda el perfil recién leído, pero **nunca degrada** uno que ya teníamos.
   * Si la lectura falló y ya sabíamos que esta persona es admin, se queda como
   * admin: perder la conexión un momento no es perder el cargo.
   */
  const applyProfile = (authUser: any, profile: User | null) => {
    if (profile) return applyUser(profile)

    const current = userRef.current
    if (current && current.id === authUser.id && current.role !== undefined) return

    applyUser(baseUser(authUser))
  }

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    applyProfile(session.user, await fetchProfile(session.user))
  }

  useEffect(() => {
    mountedRef.current = true

    // Red de seguridad: `loading` termina como máximo en 10 s pase lo que pase.
    const safety = setTimeout(() => {
      if (mountedRef.current) setLoading(false)
    }, 10000)

    const init = async () => {
      try {
        // getSession() lee el token de localStorage (rápido). getUser() haría
        // una petición HTTP que puede colgarse en redes malas.
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          applyProfile(session.user, await fetchProfile(session.user))
        } else {
          applyUser(null)
        }
      } catch {
        applyUser(null)
      } finally {
        if (mountedRef.current) setLoading(false)
        clearTimeout(safety)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return

      if (event === "SIGNED_OUT" || !session?.user) {
        applyUser(null)
        setLoading(false)
        return
      }

      // Qué eventos obligan a releer el perfil:
      //   TOKEN_REFRESHED  no. Es el token, no la persona. Es el que llegaba
      //                    sin avisar tras unos minutos de inactividad.
      //   SIGNED_IN        solo si de verdad cambió de usuario; supabase-js lo
      //                    dispara también al volver a enfocar la pestaña.
      //   INITIAL_SESSION  no. De eso ya se ocupa init().
      const authUser = session.user
      const cambioDePersona = userRef.current?.id !== authUser.id
      const hayQueReleer =
        event === "USER_UPDATED" || (event === "SIGNED_IN" && cambioDePersona)

      // OJO: aquí NO se toca `loading`. Al montar, supabase-js dispara
      // INITIAL_SESSION antes de que init() haya terminado de leer el perfil.
      // Si en ese momento pusiéramos loading=false, el layout vería
      // `loading === false` y `user === null` a la vez y mandaría a /login;
      // /login ve que sí hay sesión y devuelve a /dashboard → bucle, y como no
      // hay página de error, Next.js muestra su pantalla de fallo en crudo.
      // Solo le pasaba a quien volvía con la pestaña ya cerrada, que es cuando
      // el proveedor se monta de cero.
      if (!hayQueReleer) return

      // IMPORTANTE: este callback se ejecuta con el candado de auth tomado.
      // Llamar a supabase.from(...) aquí dentro se queda esperando ese mismo
      // candado y se cuelga hasta agotar el tiempo. El setTimeout devuelve el
      // control primero y suelta el candado.
      setTimeout(async () => {
        if (!mountedRef.current) return
        applyProfile(authUser, await fetchProfile(authUser))
        if (mountedRef.current) setLoading(false)
      }, 0)
    })

    return () => {
      mountedRef.current = false
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      applyUser(null)
    } catch {
      // Aunque falle el cierre remoto, en esta pestaña ya no hay sesión.
      applyUser(null)
    }
  }

  return (
    <UserContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}
