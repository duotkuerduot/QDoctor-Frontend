// src/app/api/chat/route.ts
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, session_id, parent_id, assistant_retry } = body;
    const authorization = request.headers.get("authorization");

    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const BACKEND =
      process.env.BACKEND_URL ?? "http://127.0.0.1:8000";// "https://duotkuerduot-qdoctor.hf.space";

    const url = new URL(`${BACKEND}/ask/stream`);
    url.searchParams.set("query", message.trim());

    const backendResponse = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify({
        history: history || [],
        session_id: session_id || null,
        parent_id: parent_id || null,
        assistant_retry: assistant_retry || false,
      }),
    });

    if (!backendResponse.ok) {
      const errText = await backendResponse.text();
      return new Response(
        JSON.stringify({ error: "Backend error", detail: errText }),
        { status: backendResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(backendResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("Error forwarding request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}