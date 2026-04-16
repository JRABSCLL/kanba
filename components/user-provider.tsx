"use client"

import { createContext, useContext, useState, useEffect } from "react"
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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Load the full profile (status, role, subscription) for a given auth user
  const loadProfileForUser = async (authUser: any): Promise<User> => {
    const base: User = {
      id: authUser.id,
      email: authUser.email || "",
      full_name: authUser.user_metadata?.full_name,
      avatar_url: authUser.user_metadata?.avatar_url,
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, status, role, subscription_status")
        .eq("id", authUser.id)
        .single()

      if (error) {
        console.error("[v0] Error loading profile:", error)
        return base
      }

      return {
        ...base,
        full_name: data?.full_name || base.full_name,
        avatar_url: data?.avatar_url || base.avatar_url,
        status: data?.status as User["status"],
        role: data?.role as User["role"],
        subscription_status: data?.subscription_status as User["subscription_status"],
      }
    } catch (err) {
      console.error("[v0] Unexpected error loading profile:", err)
      return base
    }
  }

  const refreshProfile = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser) {
      const full = await loadProfileForUser(authUser)
      setUser(full)
    }
  }

  useEffect(() => {
    const getInitialUser = async () => {
      try {
        if (!supabase.auth) {
          console.warn("Supabase auth not initialized")
          setInitialized(true)
          setLoading(false)
          return
        }

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          const full = await loadProfileForUser(authUser)
          setUser(full)
          setLoading(false)
        }
      } catch (error) {
        console.error("Error getting initial user:", error)
      } finally {
        setInitialized(true)
      }
    }

    getInitialUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const full = await loadProfileForUser(session.user)
        setUser(full)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isLoading = (!initialized && !user) || (loading && !user)

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <UserContext.Provider value={{ user, loading: isLoading, signOut, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}
