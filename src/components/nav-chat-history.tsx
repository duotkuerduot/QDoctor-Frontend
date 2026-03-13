"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconDots,
  IconMessage,
  IconPencil,
  IconTrash,
  IconPlus,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/provider/auth-provider";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

function groupSessions(sessions: ChatSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const groups: { label: string; sessions: ChatSession[] }[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "This Week", sessions: [] },
    { label: "This Month", sessions: [] },
    { label: "Older", sessions: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.updated_at);
    if (d >= today) groups[0].sessions.push(s);
    else if (d >= yesterday) groups[1].sessions.push(s);
    else if (d >= weekAgo) groups[2].sessions.push(s);
    else if (d >= monthAgo) groups[3].sessions.push(s);
    else groups[4].sessions.push(s);
  }

  return groups.filter((g) => g.sessions.length > 0);
}

export function NavChatHistory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeSessionId = searchParams.get("session");

  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setSessions([]);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const handler = () => fetchSessions();
    window.addEventListener("session-updated", handler);
    return () => window.removeEventListener("session-updated", handler);
  }, [fetchSessions]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleNewChat = () => {
    router.replace("/");
  };

  const handleSessionClick = (sessionId: string) => {
    if (renamingId === sessionId) return;
    window.dispatchEvent(
      new CustomEvent("load-session", { detail: { sessionId } })
    );
    router.push(`/new?session=${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        router.replace("/");
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

  const startRename = (session: ChatSession) => {
    setRenamingId(session.id);
    setRenameValue(session.title);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const submitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      cancelRename();
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const newTitle = renameValue.trim();
    setSessions((prev) =>
      prev.map((s) => (s.id === renamingId ? { ...s, title: newTitle } : s))
    );

    try {
      await fetch(`/api/sessions/${renamingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (e) {
      console.error("Failed to rename session:", e);
      fetchSessions();
    }

    setRenamingId(null);
    setRenameValue("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitRename();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  };

  if (!isAuthenticated) return null;

  const grouped = groupSessions(sessions);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupAction onClick={handleNewChat} title="New Chat">
        <IconPlus className="!size-4" />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {isLoading && sessions.length === 0 && (
            <SidebarMenuItem>
              <div className="px-2 py-1.5">
                <span className="text-xs text-muted-foreground">
                  Loading chats...
                </span>
              </div>
            </SidebarMenuItem>
          )}

          {!isLoading && sessions.length === 0 && (
            <SidebarMenuItem>
              <div className="px-2 py-1.5">
                <span className="text-xs text-muted-foreground">
                  No conversations yet
                </span>
              </div>
            </SidebarMenuItem>
          )}

          {grouped.map((group) => (
            <div key={group.label} className="mt-2 first:mt-0">
              <div className="px-2 py-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
              {group.sessions.map((s) => (
                <SidebarMenuItem key={s.id} className="px-1">
                  {renamingId === s.id ? (
                    /* ─── Inline rename ──────────────────── */
                    <div className="flex items-center gap-1.5 px-2 py-1.5 w-full rounded-md bg-sidebar-accent">
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={submitRename}
                        className="flex-1 min-w-0 text-sm bg-transparent border border-border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-ring"
                        maxLength={100}
                      />
                      <button
                        onClick={submitRename}
                        className="p-1 rounded hover:bg-sidebar-accent-foreground/10 text-muted-foreground hover:text-foreground"
                        title="Save"
                      >
                        <IconCheck className="!size-3.5" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1 rounded hover:bg-sidebar-accent-foreground/10 text-muted-foreground hover:text-foreground"
                        title="Cancel"
                      >
                        <IconX className="!size-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* ─── Session row: single highlight box ─ */
                    <div
                      onClick={() => handleSessionClick(s.id)}
                      className={[
                        "group/item flex items-center w-full rounded-md cursor-pointer transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        activeSessionId === s.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "",
                      ].join(" ")}
                    >
                      {/* Icon + title */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 pr-1 py-1.5">
                        <IconMessage className="!size-4 shrink-0 opacity-60" />
                        <span className="truncate text-sm">{s.title}</span>
                      </div>

                      {/* Options dots — inside the same highlight box */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={[
                              "p-1 mr-1 rounded shrink-0 transition-opacity",
                              "text-muted-foreground hover:text-foreground",
                              "hover:bg-sidebar-accent-foreground/10",
                              "opacity-0 group-hover/item:opacity-100",
                              "data-[state=open]:opacity-100",
                            ].join(" ")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDots className="!size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="right" className="w-36">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              startRename(s);
                            }}
                          >
                            <IconPencil className="!size-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(s.id);
                            }}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <IconTrash className="!size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </SidebarMenuItem>
              ))}
              </div>
            </div>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}