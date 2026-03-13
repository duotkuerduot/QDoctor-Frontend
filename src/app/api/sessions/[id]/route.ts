// src/app/api/sessions/[id]/route.ts
import { NextRequest } from "next/server";

const BACKEND =
      process.env.BACKEND_URL ?? "http://127.0.0.1:8000";// "https://duotkuerduot-qdoctor.hf.space";

// GET /api/sessions/[id] — load messages (active path with variant info)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${BACKEND}/sessions/${id}/messages`, {
      headers: { Authorization: authorization },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching session messages:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// DELETE /api/sessions/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${BACKEND}/sessions/${id}`, {
      method: "DELETE",
      headers: { Authorization: authorization },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// PATCH /api/sessions/[id] — rename
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const res = await fetch(`${BACKEND}/sessions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error renaming session:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// POST /api/sessions/[id] — switch variant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const res = await fetch(`${BACKEND}/sessions/${id}/switch-variant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error switching variant:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}