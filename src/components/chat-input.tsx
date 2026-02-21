"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send } from "lucide-react";
import { useRouter } from "next/navigation";

interface ApiResponse {
  response?: string;
  message?: string;
  content?: string;
  data?: string;
  context_sources?: string[];
  error?: boolean;
}

interface ChatCardProps {
  onMessageSent?: (message: string, response: ApiResponse | null) => void;
  disabled?: boolean;
}

export default function ChatCard({ onMessageSent, disabled = false }: ChatCardProps) {
    const router = useRouter();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => {
        // Generate a unique session ID
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    });

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading || disabled) return;

        const message = input.trim();
        setInput("");
        setIsLoading(true);

        if (onMessageSent) {
            onMessageSent(message, null);
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, sessionId }),
            });

            if (!response.ok) throw new Error("HTTP error");

            const data: ApiResponse = await response.json();

            if (onMessageSent) {
                onMessageSent(message, data);
            }

        } catch (error) {
            if (onMessageSent) {
                onMessageSent(message, {
                    response: "Sorry, I encountered an error.",
                    error: true
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="p-4 w-full">
            <div className="max-w-4xl mx-auto space-y-4">
                <div>
                    <div className="rounded-3xl p-4 pt-1 border-2 border-border">
                        <div className="flex flex-row items-center">
                            <Textarea
                                ref={textareaRef}
                                placeholder="Ask anything"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading || disabled}
                                className="text-primary text-lg w-full outline-0 resize-none p-4 shadow-none bg-transparent border-0 placeholder-primary focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-hide"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                            <div className="flex flex-row gap-2">
                            {/* 
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 rounded-full bg-border text-primary"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-6 px-2 rounded-full bg-primary text-gray-800 text-xs flex items-center gap-1"
                                >
                                    <Globe className="h-3 w-3" />
                                    Search
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-6 px-2 rounded-full bg-primary text-gray-800 text-xs flex items-center gap-1"
                                >
                                    <Brain className="h-3 w-3" />
                                    Reason
                                </Button> 
                            */}
                            </div>

                            <Button
                                size="icon"
                                onClick={handleSendMessage}
                                disabled={isLoading || disabled}
                                className="h-6 w-6 rounded-lg shadow-none bg-border text-primary p-4 overflow-hidden relative"
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
                                            <Send className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`} />
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
    );
}