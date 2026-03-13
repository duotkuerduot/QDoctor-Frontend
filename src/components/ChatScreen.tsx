"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Search,
  Bot,
  User,
  Copy,
  Check,
  Pencil,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ChatCard from "@/components/chat-input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/provider/auth-provider";

// ─── Types ─────────────────────────────────────────────────────
interface VariantInfo {
  id: string;
  content: string;
  sources: string[];
}

interface BackendMessage {
  id: string;
  role: string;
  content: string;
  sources?: string[];
  parent_id?: string;
  created_at: string;
  _variants?: VariantInfo[];
  _active_variant?: number;
}

interface Message {
  id: number;
  dbId?: string;
  parentDbId?: string;
  type: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
  isStreaming?: boolean;
  variants?: VariantInfo[];
  activeVariant?: number;
}

// ─── Token queue ───────────────────────────────────────────────
class TokenQueue {
  private queue: string[] = [];
  private isProcessing = false;
  private onToken: (token: string) => void;
  private onDone: (() => void) | null = null;
  private isDone = false;
  private speed: number;

  constructor(onToken: (token: string) => void, speed = 15) {
    this.onToken = onToken;
    this.speed = speed;
  }

  push(token: string) {
    this.queue.push(token);
    if (!this.isProcessing) this.process();
  }

  finish(onDone: () => void) {
    this.isDone = true;
    this.onDone = onDone;
    if (this.queue.length === 0 && !this.isProcessing) onDone();
  }

  private async process() {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const token = this.queue.shift()!;
      this.onToken(token);
      const delay =
        this.queue.length > 20 ? 5 : this.queue.length > 10 ? 10 : this.speed;
      await new Promise((r) => setTimeout(r, delay));
    }
    this.isProcessing = false;
    if (this.isDone && this.onDone) this.onDone();
  }
}

async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function parseBackendMessages(raw: BackendMessage[]): Message[] {
  return raw.map((m, i) => ({
    id: i + 1,
    dbId: m.id,
    parentDbId: m.parent_id || undefined,
    type: m.role as "user" | "assistant",
    content: m.content,
    sources: m.sources || [],
    timestamp: new Date(m.created_at),
    variants: m._variants || undefined,
    activeVariant: m._active_variant ?? undefined,
  }));
}

// ─── Chat Screen ───────────────────────────────────────────────
export default function ChatScreen() {
  const searchParams = useSearchParams();
  const { openAuthModal } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isScrollHovered, setIsScrollHovered] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const isRequesting = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track initialization to prevent re-processing when URL changes
  const isInitialized = useRef(false);
  const hasProcessedQuery = useRef(false);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Flag to reload from backend after streaming completes (for variant accuracy)
  const reloadAfterStream = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (editingId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      const len = editTextareaRef.current.value.length;
      editTextareaRef.current.setSelectionRange(len, len);
    }
  }, [editingId]);

  const buildHistory = useCallback((currentMessages: Message[]) => {
    return currentMessages
      .filter((m) => m.content && !m.isStreaming)
      .map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }));
  }, []);

  // ─── Reload session from backend (for variant accuracy) ─────
  const reloadSession = useCallback(
    async (sid: string) => {
      const token = await getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(`/api/sessions/${sid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        setMessages(parseBackendMessages(data.messages || []));
      } catch (e) {
        console.error("Failed to reload session:", e);
      }
    },
    []
  );

  // ─── Load session ────────────────────────────────────────────
  const loadSession = useCallback(
    async (sid: string) => {
      const token = await getAuthToken();
      if (!token) return;

      setIsLoadingSession(true);
      try {
        const res = await fetch(`/api/sessions/${sid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        setMessages(parseBackendMessages(data.messages || []));
        setSessionId(sid);
      } catch (e) {
        console.error("Failed to load session:", e);
      } finally {
        setIsLoadingSession(false);
      }
    },
    []
  );

  // ─── SSE streaming API call ──────────────────────────────────
  const sendMessage = useCallback(
    async (
      message: string,
      existingMessages: Message[],
      options?: {
        parentId?: string;
        assistantRetry?: boolean;
      }
    ) => {
      if (isRequesting.current) return;

      const token = await getAuthToken();
      if (!token) {
        openAuthModal("login");
        return;
      }

      isRequesting.current = true;
      setIsTyping(true);

      const assistantLocalId = Date.now() + 1;
      const history = buildHistory(existingMessages);

      // parent_id: explicit > last message's dbId
      const parentId =
        options?.parentId !== undefined
          ? options.parentId
          : (() => {
              for (let i = existingMessages.length - 1; i >= 0; i--) {
                if (existingMessages[i].dbId) return existingMessages[i].dbId;
              }
              return undefined;
            })();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message,
            history,
            session_id: sessionId,
            parent_id: parentId || null,
            assistant_retry: options?.assistantRetry || false,
          }),
        });

        if (response.status === 401) {
          await supabase.auth.signOut();
          openAuthModal("login");
          throw new Error("Session expired.");
        }

        if (!response.ok) {
          const errorText = await response.text();
          let detail = "An error occurred";
          try {
            detail = JSON.parse(errorText).detail || detail;
          } catch {}
          throw new Error(detail);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let sources: string[] = [];
        let streamError: string | null = null;
        let receivedSessionId: string | null = null;
        let userMsgDbId: string | undefined;
        let userMsgParentId: string | undefined;
        let assistantMsgDbId: string | undefined;
        let assistantMsgParentId: string | undefined;

        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: assistantLocalId,
            type: "assistant",
            content: "",
            isStreaming: true,
            timestamp: new Date(),
          },
        ]);

        let contentSoFar = "";
        const tokenQueue = new TokenQueue((tk: string) => {
          contentSoFar += tk;
          const snapshot = contentSoFar;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantLocalId
                ? { ...msg, content: snapshot }
                : msg
            )
          );
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              let data: unknown;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                continue;
              }

              if (currentEvent === "session") {
                const d = data as { session_id: string; is_new: boolean };
                receivedSessionId = d.session_id;
                setSessionId(d.session_id);
                // Update URL so refreshing resumes this chat
                window.history.replaceState(
                  null,
                  "",
                  `/new?session=${d.session_id}`
                );
                window.dispatchEvent(new CustomEvent("session-updated"));
              } else if (currentEvent === "msg_id") {
                const d = data as {
                  user_msg_id: string;
                  parent_id: string | null;
                };
                userMsgDbId = d.user_msg_id;
                userMsgParentId = d.parent_id || undefined;

                // Attach to last user message
                setMessages((prev) => {
                  let idx = -1;
                  for (let i = prev.length - 1; i >= 0; i--) {
                    if (prev[i].type === "user") {
                      idx = i;
                      break;
                    }
                  }
                  if (idx === -1) return prev;
                  return prev.map((m, i) =>
                    i === idx
                      ? { ...m, dbId: userMsgDbId, parentDbId: userMsgParentId }
                      : m
                  );
                });
              } else if (currentEvent === "assistant_msg_id") {
                const d = data as {
                  assistant_msg_id: string;
                  parent_id: string | null;
                };
                assistantMsgDbId = d.assistant_msg_id;
                assistantMsgParentId = d.parent_id || undefined;
              } else if (currentEvent === "token") {
                tokenQueue.push(data as string);
              } else if (currentEvent === "sources") {
                sources = data as string[];
              } else if (currentEvent === "replace") {
                contentSoFar = data as string;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantLocalId
                      ? { ...msg, content: contentSoFar }
                      : msg
                  )
                );
              } else if (currentEvent === "done") {
                const capturedDbId = assistantMsgDbId;
                const capturedParentDbId = assistantMsgParentId;
                const capturedSources = [...sources];
                const shouldReload = reloadAfterStream.current;
                const reloadSid =
                  receivedSessionId || sessionId;

                tokenQueue.finish(() => {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantLocalId
                        ? {
                            ...msg,
                            isStreaming: false,
                            sources: capturedSources,
                            dbId: capturedDbId,
                            parentDbId: capturedParentDbId,
                          }
                        : msg
                    )
                  );

                  // After edit/retry, reload from backend
                  // to get accurate variant counts
                  if (shouldReload && reloadSid) {
                    reloadAfterStream.current = false;
                    // Small delay so the user sees the streamed result first
                    setTimeout(() => reloadSession(reloadSid), 300);
                  }
                });
              } else if (currentEvent === "error") {
                streamError = String(data);
              }
            }
          }
          if (streamError) break;
        }

        if (streamError) throw new Error(streamError);

        // Safety net
        tokenQueue.finish(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantLocalId && msg.isStreaming
                ? {
                    ...msg,
                    isStreaming: false,
                    sources,
                    dbId: assistantMsgDbId,
                    parentDbId: assistantMsgParentId,
                  }
                : msg
            )
          );
        });
      } catch (error) {
        setIsTyping(false);
        setMessages((prev) => {
          const hasStreaming = prev.some((m) => m.id === assistantLocalId);
          const errContent = `Sorry, I encountered an error: ${
            error instanceof Error ? error.message : String(error)
          }`;
          if (hasStreaming) {
            return prev.map((msg) =>
              msg.id === assistantLocalId
                ? { ...msg, content: errContent, isStreaming: false }
                : msg
            );
          }
          return [
            ...prev,
            {
              id: assistantLocalId,
              type: "assistant" as const,
              content: errContent,
              timestamp: new Date(),
            },
          ];
        });
      } finally {
        isRequesting.current = false;
        setIsTyping(false);
      }
    },
    [openAuthModal, buildHistory, sessionId, reloadSession]
  );

  // ─── Initialization ──────────────────────────────────────────
  useEffect(() => {
    // Prevent re-initialization when URL changes (e.g., after replaceState)
    if (isInitialized.current) return;
    
    const existingSession = searchParams.get("session");
    const initialQuery = searchParams.get("q");

    if (existingSession) {
      isInitialized.current = true;
      loadSession(existingSession);
    } else if (initialQuery && !hasProcessedQuery.current) {
      isInitialized.current = true;
      hasProcessedQuery.current = true;
      const userMsg = decodeURIComponent(initialQuery);
      const userMessage: Message = {
        id: Date.now(),
        type: "user",
        content: userMsg,
        timestamp: new Date(),
      };
      setMessages([userMessage]);
      sendMessage(userMsg, []);
    } else if (!existingSession && !initialQuery) {
      isInitialized.current = true;
      setMessages([
        {
          id: 1,
          type: "assistant",
          content: "Hey! How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [searchParams, loadSession, sendMessage]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { sessionId: sid } = (e as CustomEvent).detail;
      if (sid && sid !== sessionId) {
        // Reset initialization flags when explicitly loading a different session
        isInitialized.current = false;
        hasProcessedQuery.current = false;
        setMessages([]);
        setSessionId(null);
        setIsTyping(false);
        isRequesting.current = false;
        loadSession(sid);
      }
    };
    window.addEventListener("load-session", handler);
    return () => window.removeEventListener("load-session", handler);
  }, [sessionId, loadSession]);

  // ─── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (message: string) => {
    if (isRequesting.current || !message.trim()) return;

    const currentMessages = messages;
    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    sendMessage(message, [...currentMessages, userMessage]);
  };

  // ─── Copy ────────────────────────────────────────────────────
  const handleCopy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  // ─── Edit ────────────────────────────────────────────────────
  const handleStartEdit = (message: Message) => {
    setEditingId(message.id);
    setEditValue(message.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSubmitEdit = () => {
    if (!editingId || !editValue.trim() || isRequesting.current) return;

    const editIndex = messages.findIndex((m) => m.id === editingId);
    if (editIndex === -1) return;

    const original = messages[editIndex];
    const editedContent = editValue.trim();

    if (editedContent === original.content) {
      handleCancelEdit();
      return;
    }

    const truncated = messages.slice(0, editIndex);
    const editedMessage: Message = {
      id: Date.now(),
      type: "user",
      content: editedContent,
      timestamp: new Date(),
    };

    const newMessages = [...truncated, editedMessage];
    setMessages(newMessages);
    setEditingId(null);
    setEditValue("");

    // Reload after streaming to get variant counts from backend
    reloadAfterStream.current = true;

    // parent_id = original's parent → new message is a sibling (variant)
    sendMessage(editedContent, newMessages, {
      parentId: original.parentDbId,
    });
  };

  // ─── Retry ───────────────────────────────────────────────────
  const handleRetry = (message: Message) => {
    if (isRequesting.current) return;

    const msgIndex = messages.findIndex((m) => m.id === message.id);
    if (msgIndex === -1) return;

    reloadAfterStream.current = true;

    if (message.type === "user") {
      // USER RETRY: create a new sibling user message with same content
      const truncated = messages.slice(0, msgIndex);
      const retryMessage: Message = {
        ...message,
        id: Date.now(),
        dbId: undefined,
        timestamp: new Date(),
      };
      const newMessages = [...truncated, retryMessage];
      setMessages(newMessages);

      // Same parent as original → sibling in tree
      sendMessage(message.content, newMessages, {
        parentId: message.parentDbId,
      });
    } else {
      // ASSISTANT RETRY: DON'T create a new user message.
      // Create a new assistant response as sibling of the old one.
      let userMsgIndex = -1;
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].type === "user") {
          userMsgIndex = i;
          break;
        }
      }
      if (userMsgIndex === -1) return;

      const userMessage = messages[userMsgIndex];

      // Remove the old assistant response
      const truncated = messages.slice(0, msgIndex);
      setMessages(truncated);

      // Tell backend: this is an assistant retry.
      // parent_id = user message's dbId (new assistant is sibling of old one)
      sendMessage(userMessage.content, truncated, {
        parentId: userMessage.dbId,
        assistantRetry: true,
      });
    }
  };

  // ─── Navigate variant ────────────────────────────────────────
  const navigateVariant = async (message: Message, direction: -1 | 1) => {
    if (!message.variants || message.variants.length <= 1) return;
    if (!sessionId) return;

    const currentActive = message.activeVariant ?? 0;
    const newActive = currentActive + direction;
    if (newActive < 0 || newActive >= message.variants.length) return;

    const chosenVariant = message.variants[newActive];
    const token = await getAuthToken();
    if (!token) return;

    const parentKey = message.parentDbId || "root";

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parent_id: parentKey,
          message_id: chosenVariant.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(parseBackendMessages(data.messages || []));
      }
    } catch (e) {
      console.error("Failed to switch variant:", e);
    }
  };

  // ─── Suggestions ─────────────────────────────────────────────
  const suggestionButtons = [
    "What is mental health?",
    "What are common mental disorders?",
    "How can mindfulness improve wellbeing?",
  ];

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="w-full h-[90dvh] flex flex-col">
      <div
        className="flex-1 overflow-hidden"
        onMouseEnter={() => setIsScrollHovered(true)}
        onMouseLeave={() => setIsScrollHovered(false)}
      >
        <style jsx>{`
          .chat-scrollbar-container {
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
          }
          .chat-scrollbar-container::-webkit-scrollbar {
            width: 6px;
            opacity: ${isScrollHovered ? "1" : "0"};
            transition: opacity 0.3s;
          }
          .chat-scrollbar-container::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.5);
            border-radius: 3px;
          }
        `}</style>

        <div className="chat-scrollbar-container h-full">
          <div className="p-2 py-6 space-y-6 container mx-auto max-w-4xl">
            {/* Skeleton */}
            {isLoadingSession && (
              <div className="space-y-6 animate-pulse">
                <div className="flex items-start space-x-4 flex-row-reverse space-x-reverse">
                  <div className="w-8 h-8 rounded-full bg-border" />
                  <div className="flex-1 flex flex-col items-end">
                    <div className="w-[55%] space-y-2 bg-border rounded-lg px-4 py-3">
                      <div className="h-3 bg-muted-foreground/20 rounded w-full" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-border" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 bg-border rounded w-[80%]" />
                    <div className="h-3 bg-border rounded w-[65%]" />
                    <div className="h-3 bg-border rounded w-[90%]" />
                  </div>
                </div>
                <div className="flex items-start space-x-4 flex-row-reverse space-x-reverse">
                  <div className="w-8 h-8 rounded-full bg-border" />
                  <div className="flex-1 flex flex-col items-end">
                    <div className="w-[40%] space-y-2 bg-border rounded-lg px-4 py-3">
                      <div className="h-3 bg-muted-foreground/20 rounded w-full" />
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-border" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 bg-border rounded w-[70%]" />
                    <div className="h-3 bg-border rounded w-[85%]" />
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {!isLoadingSession &&
              messages.map((message) => {
                const hasVariants =
                  message.variants && message.variants.length > 1;
                const variantIndex = (message.activeVariant ?? 0) + 1;
                const variantTotal = message.variants?.length ?? 1;

                return (
                  <div
                    key={message.id}
                    className={`group/msg flex items-start space-x-4 ${
                      message.type === "user"
                        ? "flex-row-reverse space-x-reverse"
                        : ""
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-border flex items-center justify-center">
                      {message.type === "assistant" ? (
                        <Bot className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-primary" />
                      )}
                    </div>

                    <div
                      className={`flex-1 ${
                        message.type === "user"
                          ? "flex flex-col items-end"
                          : ""
                      }`}
                    >
                      {editingId === message.id ? (
                        <div className="w-full max-w-[80%] space-y-2">
                          <textarea
                            ref={editTextareaRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitEdit();
                              }
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
                            rows={Math.min(
                              editValue.split("\n").length + 1,
                              6
                            )}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 text-xs rounded-md border border-border hover:bg-border/50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSubmitEdit}
                              disabled={!editValue.trim()}
                              className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`mb-1 max-w-[80%] ${
                              message.type === "user"
                                ? "bg-border text-primary px-4 py-2 rounded-lg"
                                : ""
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="prose prose-sm max-w-none"
                            >
                              {message.content}
                            </ReactMarkdown>

                            {message.isStreaming && (
                              <span className="inline-block w-2 h-4 ml-0.5 bg-primary/70 animate-pulse rounded-sm" />
                            )}
                          </div>

                          {message.type === "assistant" &&
                          !message.isStreaming &&
                          message.sources?.length ? (
                            <div className="text-xs text-gray-500 mb-1">
                              <div className="font-medium mb-1">Sources:</div>
                              <div className="flex flex-wrap gap-1">
                                {message.sources.map((src, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
                                  >
                                    {src.replace(".pdf", "")}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {!message.isStreaming && message.content && (
                            <div
                              className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ${
                                message.type === "user"
                                  ? "flex-row-reverse"
                                  : ""
                              }`}
                            >
                              <span className="text-[11px] text-muted-foreground/60 px-1 tabular-nums">
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>

                              <button
                                onClick={() => handleCopy(message)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-border/50 transition-colors"
                                title="Copy"
                              >
                                {copiedId === message.id ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {message.type === "user" && (
                                <button
                                  onClick={() => handleStartEdit(message)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-border/50 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleRetry(message)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-border/50 transition-colors"
                                title="Retry"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              {hasVariants && (
                                <div className="flex items-center gap-0.5 ml-1 select-none">
                                  <button
                                    onClick={() =>
                                      navigateVariant(message, -1)
                                    }
                                    disabled={variantIndex <= 1}
                                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-[11px] text-muted-foreground tabular-nums min-w-[28px] text-center">
                                    {variantIndex}/{variantTotal}
                                  </span>
                                  <button
                                    onClick={() =>
                                      navigateVariant(message, 1)
                                    }
                                    disabled={variantIndex >= variantTotal}
                                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {!isLoadingSession && isTyping && (
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-border flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="flex space-x-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            )}

            {!isLoadingSession &&
              messages.length <= 1 &&
              messages[0]?.type === "assistant" &&
              !messages[0]?.isStreaming && (
                <div className="px-6 py-4">
                  <div className="flex flex-col gap-3 w-fit">
                    {suggestionButtons.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSubmit(s)}
                        className="cursor-pointer flex items-center space-x-2 px-4 py-2 rounded-lg border border-border transition-colors hover:bg-border/10"
                      >
                        {i === 0 && <Search className="w-4 h-4" />}
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <ChatCard onMessageSent={handleSubmit} />
      </div>
    </div>
  );
}