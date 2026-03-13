"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Mic, Send } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/provider/auth-provider"

interface ChatCardProps {
  /**
   * If provided, the component acts as an in-page input (chat screen mode).
   * The parent handles the API call.
   */
  onMessageSent?: (message: string) => void
  disabled?: boolean
}

export default function ChatCard({
  onMessageSent,
  disabled = false,
}: ChatCardProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isAuthenticated, openAuthModal } = useAuth()
  const [input, setInput] = useState("")

  const inputDisabled = disabled || !isAuthenticated

  useEffect(() => {
    if (!inputDisabled) {
      textareaRef.current?.focus()
    }
  }, [inputDisabled])

  const handleAuthRequired = () => {
    openAuthModal("login")
  }

  const handleSendMessage = () => {
    if (disabled) return

    if (!isAuthenticated) {
      handleAuthRequired()
      return
    }

    if (!input.trim()) return

    const message = input.trim()
    setInput("")

    if (onMessageSent) {
      // Chat screen mode: delegate to parent
      onMessageSent(message)
    } else {
      // Home page mode: navigate INSTANTLY, chat page handles the API call
      router.push(`/new?q=${encodeURIComponent(message)}`)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="w-full px-2 sm:px-4 pb-2 sm:pb-4">
      <div className="mx-auto max-w-4xl space-y-2 sm:space-y-4">
        <div>
          <div className="rounded-2xl sm:rounded-3xl border-2 border-border p-2 sm:p-4 pt-1 sm:pt-1">
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
                rows={1}
                className="text-primary placeholder:text-muted-foreground/60 scrollbar-hide w-full resize-none border-0 bg-transparent p-2 sm:p-4 text-sm sm:text-lg shadow-none outline-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[36px] sm:min-h-[56px] max-h-[120px] sm:max-h-[200px]"
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
            <div className="mt-1 sm:mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-row gap-2" />

              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={inputDisabled}
                className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-lg bg-border p-0 text-primary shadow-none hover:bg-border/80"
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
                      <Send className="h-4 w-4 sm:h-5 sm:w-5" />
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
                      <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
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