"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { IconLoader2, IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export type AuthTab = "login" | "signup"

type AuthModalProps = {
  isOpen: boolean
  activeTab: AuthTab
  onTabChange: (tab: AuthTab) => void
  onClose: () => void
}
 
const ROLE_OPTIONS = [
  "Doctor",
  "Nurse",
  "Clinical Officer",
  "Medical Student",
  "Other",
] as const

export function AuthModal({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
}: AuthModalProps) {
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupFirstName, setSignupFirstName] = useState("")
  const [signupLastName, setSignupLastName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("Doctor")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setError("")
    setMessage("")
  }, [isOpen, activeTab])

  const actionLabel = useMemo(() => {
    return activeTab === "login" ? "Sign In" : "Create Account"
  }, [activeTab])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    onClose()
  }

  const handleForgotPassword = async () => {
    setError("")
    setMessage("")

    const email = loginEmail.trim()
    if (!email) {
      setError("Enter your email first to reset your password.")
      return
    }

    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email
    )
    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage("Password reset email sent. Please check your inbox.")
  }

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setMessage("")

    if (signupPassword !== confirmPassword) {
      setError("Password and confirm password do not match.")
      return
    }

    setLoading(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          first_name: signupFirstName.trim(),
          last_name: signupLastName.trim(),
          role,
        },
      },
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setMessage("Check your email to verify your account before signing in.")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close auth modal"
      />
      <div className="relative z-10 w-full max-w-xl rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="inline-flex rounded-md border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => onTabChange("login")}
              className={cn(
                "rounded-sm px-4 py-1.5 text-sm",
                activeTab === "login"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => onTabChange("signup")}
              className={cn(
                "rounded-sm px-4 py-1.5 text-sm",
                activeTab === "signup"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Sign Up
            </button>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            onClick={onClose}
            aria-label="Close modal"
          >
            <IconX className="size-4" />
          </button>
        </div>

        <div className="p-5">
          {activeTab === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="login-email">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-sm font-medium"
                  htmlFor="login-password"
                >
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : null}
                <span>{actionLabel}</span>
              </Button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="signup-first-name"
                  >
                    First Name
                  </label>
                  <Input
                    id="signup-first-name"
                    value={signupFirstName}
                    onChange={(event) => setSignupFirstName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="signup-last-name"
                  >
                    Last Name
                  </label>
                  <Input
                    id="signup-last-name"
                    value={signupLastName}
                    onChange={(event) => setSignupLastName(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="signup-email">
                  Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="signup-password"
                  >
                    Password
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium"
                    htmlFor="confirm-password"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="role">
                  Professional Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as (typeof ROLE_OPTIONS)[number])
                  }
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : null}
                <span>{actionLabel}</span>
              </Button>
            </form>
          )}

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {message ? (
            <p className="mt-4 text-sm text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
