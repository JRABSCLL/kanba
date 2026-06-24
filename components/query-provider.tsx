"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Capa de caché de datos para toda la app.
// - staleTime 30s: al volver a una vista ya cargada se muestra al instante (cache)
//   y solo revalida en segundo plano si pasaron >30s.
// - refetchOnWindowFocus false: evita parpadeos al cambiar de pestaña.
// - retry 1: un reintento ante fallos de red transitorios.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
