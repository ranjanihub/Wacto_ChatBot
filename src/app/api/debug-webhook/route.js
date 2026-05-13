import { NextResponse } from 'next/server';

/**
 * Debug endpoint to test n8n webhook connection
 * Access: http://localhost:3001/api/debug-webhook
 */

export async function GET(req) {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  
  return NextResponse.json({
    status: 'debug-info',
    webhook_configured: !!webhookUrl,
    webhook_url: webhookUrl || 'NOT SET',
    test_available: true,
    info: 'Send POST request to test webhook'
  });
}

export async function POST(req) {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    
    console.log('\n🔍 === DEBUG WEBHOOK TEST ===');
    console.log('Webhook URL:', webhookUrl);

    if (!webhookUrl) {
      return NextResponse.json({
        error: 'Webhook URL not configured',
        webhook_url: 'NOT SET in .env.local'
      }, { status: 400 });
    }

    const testPayload = {
      message: 'Test message',
      conversationHistory: [],
      metadata: { timestamp: new Date().toISOString(), source: 'debug-test' }
    };

    console.log('📤 Sending test payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    console.log('📥 Response status:', response.status);

    const responseText = await response.text();
    console.log('📥 Response body:', responseText);

    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw_response: responseText };
    }

    return NextResponse.json({
      status: 'test-complete',
      webhook_status: response.status,
      webhook_response: responseData,
      success: response.ok,
      debug_info: {
        is_2xx: response.status >= 200 && response.status < 300,
        is_4xx: response.status >= 400 && response.status < 500,
        is_5xx: response.status >= 500,
        headers: Object.fromEntries(response.headers)
      }
    });

  } catch (error) {
    console.error('❌ Debug test error:', error.message);
    return NextResponse.json({
      error: 'Test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
