import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, history, language = 'en' } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      return NextResponse.json({ 
        reply: "n8n Webhook URL is missing. Please add N8N_WEBHOOK_URL to your .env.local file to connect the backend." 
      });
    }

    // Forward the chat payload to your n8n workflow
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        language,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n responded with status ${response.status}`);
    }

    // We expect n8n to respond with a JSON object containing a "reply" field
    const data = await response.json();
    
    return NextResponse.json({ reply: data.reply || "No reply received from n8n workflow." });
    
  } catch (error) {
    console.error('Error in n8n proxy API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
