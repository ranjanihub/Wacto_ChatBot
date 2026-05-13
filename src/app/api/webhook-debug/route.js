import { NextResponse } from 'next/server';

export async function GET(req) {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  
  return NextResponse.json({
    status: 'configuration_check',
    webhook_url_configured: !!webhookUrl,
    webhook_url: webhookUrl || 'NOT SET',
    environment_vars: {
      NEXT_PUBLIC_N8N_WEBHOOK_URL: webhookUrl ? '✅ SET' : '❌ NOT SET'
    },
    instructions: [
      '1. Ensure your .env.local file has NEXT_PUBLIC_N8N_WEBHOOK_URL set',
      '2. Make sure n8n webhook is in LISTENING mode (green indicator)',
      '3. Test with POST /api/webhook-test with data',
      '4. Check n8n execution logs for incoming requests'
    ]
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

    console.log('🧪 WEBHOOK DEBUG TEST');
    console.log('URL:', webhookUrl);
    console.log('Body received:', body);

    if (!webhookUrl) {
      return NextResponse.json({
        error: 'NEXT_PUBLIC_N8N_WEBHOOK_URL not configured',
        received_data: body
      }, { status: 400 });
    }

    // Send to n8n
    console.log('\n📤 SENDING TO N8N...');
    const fetch_response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    console.log('Response status:', fetch_response.status);
    const response_text = await fetch_response.text();
    console.log('Response body:', response_text);

    return NextResponse.json({
      success: true,
      message: 'Data sent to n8n',
      webhook_url: webhookUrl,
      n8n_response_status: fetch_response.status,
      n8n_response_body: response_text,
      sent_data: body
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
