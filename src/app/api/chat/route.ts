// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const BACKEND = process.env.BACKEND_URL ?? 'https://duotkuerduot-qdoctor.hf.space';
    
    // The backend expects query as a URL parameter, not in the body
    const url = new URL(`${BACKEND}/ask`);
    url.searchParams.set('query', message.trim());
    
    const backendResponse = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: '', // Empty body as shown in the curl example
    });

    const respText = await backendResponse.text();

    if (!backendResponse.ok) {
      console.error('Backend error:', backendResponse.status, respText);
      return NextResponse.json(
        { error: 'Backend error', detail: respText },
        { status: backendResponse.status }
      );
    }

    let data;
    try {
      data = JSON.parse(respText);
    } catch {
      data = { response: respText };
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error forwarding request to backend:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}