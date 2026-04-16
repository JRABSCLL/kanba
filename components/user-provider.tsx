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
  status?: "pending" | "approved" | "rejected"
  role?: "member" | "admin"
  subscription_status?: "free" | "pro"
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

// Load the full profile for a given auth user with a hard timeout so a hung
// network never keeps the UI in "loading forever".
async function loadProfileForUser(authUser: any, timeoutMs = 8000): Promise<User> {
  const base: User = {
    id: authUser.id,
    email: authUser.email || "",
    full_name: authUser.user_metadata?.full_name,
    avatar_url: authUser.user_metadata?.avatar_url,
  }

  console.log("[v0] loadProfileForUser: start for", base.email)

  const timeout = new Promise<User>((resolve) => {
    setTimeout(() => {
      console.log("[v0] loadProfileForUser: TIMEOUT after", timeoutMs, "ms - returning base user")
      resolve(base)
    }, timeoutMs)
  })

  const fetchProfile = (async (): Promise<User> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, status, role, subscription_status")
        .eq("id", authUser.id)
        .maybeSingle()

      if (error) {
        console.log("[v0] loadProfileForUser: error", error.message)
        return base
      }

      if (!data) {
        console.log("[v0] loadProfileForUser: no profile row found")
        return base
      }

      console.log("[v0] loadProfileForUser: success - status:", data.status, "role:", data.role)
      return {
        ...base,
        full_name: data.full_name || base.full_name,
        avatar_url: data.avatar_url || base.avatar_url,
        status: data.status as User["status"],
        role: data.role as User["role"],
        subscription_status: data.subscription_status as User["subscription_status"],
      }
    } catch (err) {
      console.log("[v0] loadProfileForUser: unexpected error", err)
      return base
    }
  })()

  return Promise.race([fetchProfile, timeout])
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const refreshProfile = async () => {
    console.log("[v0] refreshProfile: called")
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.log("[v0] refreshProfile: no session")
      return
    }
    const full = await loadProfileForUser(session.user)
    if (mountedRef.current) setUser(full)
  }

  useEffect(() => {
    mountedRef.current = true
    console.log("[v0] UserProvider: mount")

    // Hard safety net: loading MUST end within 10 seconds no matter what.
    // Prevents any "spinner forever" scenario if a fetch hangs.
    const safety = setTimeout(() => {
      if (mountedRef.current) {
        console.log("[v0] UserProvider: SAFETY TIMEOUT (10s) - forcing loading=false")
        setLoading(false)
      }
    }, 10000)

    const init = async () => {
      try {
        console.log("[v0] UserProvider.init: calling getSession")
        // IMPORTANT: use getSession() not getUser()
        //  - getSession() reads the token from localStorage synchronously (fast)
        //  - getUser() makes an HTTP call that can hang on slow/flaky networks
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.log("[v0] UserProvider.init: getSession error", error.message)
        }

        if (session?.user) {
          console.log("[v0] UserProvider.init: session present for", session.user.email)
          const full = await loadProfileForUser(session.user)
          if (mountedRef.current) setUser(full)
        } else {
          console.log("[v0] UserProvider.init: no session")
          if (mountedRef.current) setUser(null)
        }
      } catch (err) {
        console.log("[v0] UserProvider.init: unexpected error", err)
        if (mountedRef.current) setUser(null)
      } finally {
        // CRITICAL: always end loading, no matter what happened above.
        if (mountedRef.current) {
          console.log("[v0] UserProvider.init: finally - loading=false")
          setLoading(false)
        }
        clearTimeout(safety)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] onAuthStateChange: event =", event, "session =", session ? "present" : "null")
      if (!mountedRef.current) return

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      const full = await loadProfileForUser(session.user)
      if (mountedRef.current) {
        setUser(full)
        setLoading(false)
      }
    })

    return () => {
      console.log("[v0] UserProvider: unmount")
      mountedRef.current = false
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    console.log("[v0] signOut: called")
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.log("[v0] signOut: error", error)
    }
  }

  return (
    <UserContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}
