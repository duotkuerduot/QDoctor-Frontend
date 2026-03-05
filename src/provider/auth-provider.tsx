"use client"

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { Session } from "@supabase/supabase-js"

import { AuthModal, type AuthTab } from "@/components/auth-modal"
import { supabase } from "@/lib/supabase/client"

type AuthContextType = {
  session: Session | null
  isAuthenticated: boolean
  authModalOpen: boolean
  authTab: AuthTab
  openAuthModal: (tab?: AuthTab) => void
  closeAuthModal: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<AuthTab>("login")

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()
      setSession(currentSession)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      authModalOpen,
      authTab,
      openAuthModal: (tab = "login") => {
        setAuthTab(tab)
        setAuthModalOpen(true)
      },
      closeAuthModal: () => setAuthModalOpen(false),
    }),
    [session, authModalOpen, authTab]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={authModalOpen}
        activeTab={authTab}
        onClose={() => setAuthModalOpen(false)}
        onTabChange={setAuthTab}
      />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.")
  }

  return context
}
