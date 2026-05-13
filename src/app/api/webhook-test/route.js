import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('=== WEBHOOK TEST ENDPOINT ===');
    console.log('Received data:', JSON.stringify(body, null, 2));
    console.log('Timestamp:', new Date().toISOString());
    
    // Try to forward to n8n
    const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    console.log('n8n Webhook URL:', n8nUrl);
    
    if (!n8nUrl) {
      return NextResponse.json({
        status: 'error',
        message: 'n8n Webhook URL not configured',
        env_check: {
          hasUrl: !!n8nUrl,
          url: 'NOT SET'
        }
      }, { status: 400 });
    }

    // Test the connection to n8n
    console.log('Attempting to send to n8n at:', n8nUrl);
    
    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    console.log('n8n Response Status:', n8nResponse.status);
    const n8nText = await n8nResponse.text();
    console.log('n8n Response Body:', n8nText);

    return NextResponse.json({
      status: 'success',
      message: 'Data forwarded to n8n',
      n8n_status: n8nResponse.status,
      n8n_response: n8nText,
      webhook_url: n8nUrl
    });

  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function GET(req) {
  return NextResponse.json({
    status: 'webhook-test-running',
    message: 'Send a POST request to test the webhook',
    example: {
      method: 'POST',
      body: {
        event: 'test',
        message: 'Hello n8n'
      }
    }
  });
}
