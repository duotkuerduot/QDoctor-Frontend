"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { Search, Bot, User } from "lucide-react";
import ChatCard from "@/components/chat-input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearchParams } from "next/navigation";

interface Message {
  id: number;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface ContextItem {
  file_name: string;
}

interface ParsedResponse {
  answer?: string;
  response?: string;
  message?: string;
  content?: string;
  data?: string;
  context?: ContextItem[];
  context_sources?: string[];
}

const ChatScreen = () => {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isScrollHovered, setIsScrollHovered] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const isRequesting = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // ✅ Initialize only once
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    const urlSessionId = searchParams.get("sessionId");
    const initialMessage = searchParams.get("initialMessage");
    const response = searchParams.get("response");

    if (urlSessionId) {
      console.log("Session ID:", urlSessionId);
    }

    if (initialMessage && response) {
      try {
        const parsedResponse: ParsedResponse | string = JSON.parse(
          decodeURIComponent(response)
        );
        let responseContent = "I received your message!";
        let sources: string[] = [];

        if (typeof parsedResponse === "object") {
          if (parsedResponse.answer) {
            responseContent = parsedResponse.answer;
            sources =
              parsedResponse.context?.map((c: ContextItem) => c.file_name) ||
              [];
          } else if (parsedResponse.response) {
            responseContent = parsedResponse.response;
            sources = parsedResponse.context_sources || [];
          } else if (parsedResponse.message) {
            responseContent = parsedResponse.message;
          } else if (parsedResponse.content) {
            responseContent = parsedResponse.content;
          } else if (parsedResponse.data) {
            responseContent = parsedResponse.data;
          }
        } else if (typeof parsedResponse === "string") {
          responseContent = parsedResponse;
        }

        setMessages([
          {
            id: 1,
            type: "user",
            content: decodeURIComponent(initialMessage),
            timestamp: new Date(),
          },
          {
            id: 2,
            type: "assistant",
            content: responseContent,
            sources,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error("Error parsing response:", error);
        setMessages([
          {
            id: 1,
            type: "user",
            content: decodeURIComponent(initialMessage),
            timestamp: new Date(),
          },
        ]);
      }
    } else {
      setMessages([
        {
          id: 1,
          type: "assistant",
          content: "Hey! How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [searchParams, initialized]);

  // ✅ Prevent duplicate submits
  const handleSubmit = async (message: string) => {
    if (isRequesting.current || !message.trim()) return;
    isRequesting.current = true;

    console.log("Submitting message:", message);

    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "An error occurred");
      }

      const data: ParsedResponse = await response.json();

      let responseContent = "Sorry, I couldn't process the response.";
      let sources: string[] = [];

      if (data.answer) {
        responseContent = data.answer;
        sources =
          data.context?.map((c: ContextItem) => c.file_name).filter(Boolean) ||
          [];
      } else if (data.response) {
        responseContent = data.response;
        sources = data.context_sources || [];
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        type: "assistant",
        content: responseContent,
        sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        type: "assistant",
        content: `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      isRequesting.current = false;
      setIsTyping(false);
    }
  };

  const suggestionButtons = [
    "What is mental health?",
    "What are common mental disorders?",
    "How can mindfulness improve wellbeing?",
  ];

  const handleSuggestionClick = (suggestion: string) =>
    handleSubmit(suggestion);

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
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-4 ${
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
                    message.type === "user" ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`mb-2 max-w-[80%] ${
                      message.type === "user"
                        ? "bg-border text-primary px-4 py-2 rounded-lg inline-block ml-auto"
                        : ""
                    }`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm max-w-none"
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {message.type === "assistant" && message.sources?.length ? (
                    <div className="text-xs text-gray-500">
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
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-border flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="flex space-x-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            )}

            {messages.length === 1 && messages[0].type === "assistant" && (
              <div className="px-6 py-4">
                <div className="flex flex-col gap-3 w-fit">
                  {suggestionButtons.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
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

      <div className="flex-shrink-0 border-t border-border">
        <ChatCard onMessageSent={handleSubmit} />
      </div>
    </div>
  );
};

export default function NewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatScreen />
    </Suspense>
  );
}
