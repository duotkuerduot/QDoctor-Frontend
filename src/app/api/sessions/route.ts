// src/app/api/sessions/route.ts
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const BACKEND =
      process.env.BACKEND_URL ?? "http://127.0.0.1:8000";// "https://duotkuerduot-qdoctor.hf.space";

    const res = await fetch(`${BACKEND}/sessions`, {
      headers: { Authorization: authorization },
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}