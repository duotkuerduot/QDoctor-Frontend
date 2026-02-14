"use client"

import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      {...props}
      storageKey="theme"
      enableColorScheme={false}
    >
      {children}
    </NextThemesProvider>
  )
}