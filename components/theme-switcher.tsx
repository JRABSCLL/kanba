"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "sepia", label: "Sepia", icon: BookOpen },
] as const

// Conmutador de tema discreto para usar fuera de Configuración (p. ej. en la
// barra superior). Muestra el icono del tema activo; al desplegar ofrece los tres.
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0]
  const Icon = mounted ? current.icon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Cambiar tema">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={mounted && theme === t.value ? "font-medium" : ""}
          >
            <t.icon className="mr-2 h-4 w-4" strokeWidth={1.75} />
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
