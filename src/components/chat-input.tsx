"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Mic, Send } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/provider/auth-provider"

interface ApiResponse {
  response?: string;
  message?: string;
  content?: string;
  data?: string;
  context_sources?: string[];
  error?: boolean;
}

interface ChatCardProps {
  onUserMessage?: (message: string) => void
  onAssistantMessage?: (message: string, response: ApiResponse) => void
  /** @deprecated Use onUserMessage + onAssistantMessage instead */
  onMessageSent?: (message: string, response: ApiResponse | null) => void
  disabled?: boolean
}

export default function ChatCard({
  onUserMessage,
  onAssistantMessage,
  onMessageSent,
  disabled = false,
}: ChatCardProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isAuthenticated, openAuthModal } = useAuth()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  })

  const inputDisabled = isLoading || disabled || !isAuthenticated

  useEffect(() => {
    if (!inputDisabled) {
      textareaRef.current?.focus()
    }
  }, [inputDisabled])

  const handleAuthRequired = () => {
    openAuthModal("login")
  }

  const handleSendMessage = async () => {
    if (isLoading || disabled) return

    if (!isAuthenticated) {
      handleAuthRequired()
      return
    }

    if (!input.trim()) return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      handleAuthRequired()
      return
    }

    const message = input.trim()
    setInput("")
    setIsLoading(true)

    if (onUserMessage) {
      onUserMessage(message)
    } else if (onMessageSent) {
      onMessageSent(message, null)
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
      })

      if (response.status === 401) {
        await supabase.auth.signOut()
        handleAuthRequired()
        throw new Error("Session expired. Please sign in again.")
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      console.log("Response from backend:", data)

      if (onAssistantMessage) {
        onAssistantMessage(message, data)
      } else if (onMessageSent) {
        onMessageSent(message, data)
      } else {
        router.push(
          `/new?sessionId=${sessionId}&initialMessage=${encodeURIComponent(message)}&response=${encodeURIComponent(JSON.stringify(data))}`
        )
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorResponse: ApiResponse = {
        response:
          "Sorry, I encountered an error while processing your request. Please try again.",
        error: true,
      }

      if (onAssistantMessage) {
        onAssistantMessage(message, errorResponse)
      } else if (onMessageSent) {
        onMessageSent(message, errorResponse)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="w-full p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <div className="rounded-3xl border-2 border-border p-4 pt-1">
            <div className="relative flex flex-row items-center">
              <Textarea
                ref={textareaRef}
                placeholder={
                  isAuthenticated
                    ? "Ask anything"
                    : "Sign in to ask clinical questions..."
                }
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyPress={handleKeyPress}
                disabled={inputDisabled}
                className="text-primary placeholder-primary scrollbar-hide w-full resize-none border-0 bg-transparent p-4 text-lg shadow-none outline-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {!isAuthenticated ? (
                <button
                  type="button"
                  className="absolute inset-0 cursor-text"
                  onClick={handleAuthRequired}
                  aria-label="Sign in to chat"
                />
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-row gap-2" />

              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={inputDisabled}
                className="relative h-6 w-6 overflow-hidden rounded-lg bg-border p-4 text-primary shadow-none"
              >
                <AnimatePresence mode="wait">
                  {input.trim() ? (
                    <motion.span
                      key="send"
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Send
                        className={`h-5 w-5 ${isLoading ? "animate-pulse" : ""}`}
                      />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="mic"
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Mic className="h-5 w-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
