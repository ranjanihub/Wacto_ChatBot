import { NextResponse } from 'next/server';

/**
 * SIMPLIFIED CHAT API - N8N + OLLAMA ONLY
 * 
 * Architecture:
 * Chatbot UI → This API (relay only) → N8N Webhook → Ollama Model → Response back
 * 
 * NO OpenAI API calls - all AI processing done by Ollama in n8n
 * 
 * N8N Workflow Requirements:
 * 1. Webhook trigger node (POST method)
 * 2. Ollama node for text generation
 * 3. Optional: Processing nodes for custom logic
 * 4. Respond to Webhook node to send response back
 */

// Intent detection function - Wacto business-focused
function detectIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  // Pricing-related intent
  if (/\bpric|cost|price|plans|tariff|investment|subscription|pay|payment|budget|rate|charge\b/i.test(lowerMessage)) {
    return 'pricing';
  }
  
  // Chatbot/AI services intent
  if (/\bchatbot|ai|artificial intelligence|automation|nlp|conversation|intelligent|smart bot\b/i.test(lowerMessage)) {
    return 'chatbot';
  }
  
  // WhatsApp API intent
  if (/\bwhatsapp|whatsapp api|messaging|sms|communication|bulk message|broadcast\b/i.test(lowerMessage)) {
    return 'whatsapp_api';
  }
  
  // SEO/Marketing intent
  if (/\bseo|search engine|ranking|digital marketing|content|marketing|growth|optimization\b/i.test(lowerMessage)) {
    return 'seo';
  }
  
  // Website development intent
  if (/\bwebsite|web development|web design|ecommerce|online store|web app|platform\b/i.test(lowerMessage)) {
    return 'website';
  }
  
  // Demo/trial intent
  if (/\bdemo|trial|test|try|poc|proof of concept|evaluation\b/i.test(lowerMessage)) {
    return 'demo';
  }
  
  // Contact/Sales intent
  if (/\bcontact|sales|partnership|collaboration|inquiry|enquiry|quote|proposal|enterprise\b/i.test(lowerMessage)) {
    return 'sales';
  }
  
  // Default to general business intent (always Wacto-focused)
  return 'wacto_general';
}

// Function to generate chips based on intent - Maximum 4 chips per intent
function generateChips(intent) {
  const chipTemplates = {
    pricing: [
      { label: "View Pricing Details", action: "message", value: "Show me detailed pricing information" },
      { label: "Enquire Now", action: "message", value: "I want to enquire about pricing" },
      { label: "Custom Quote", action: "message", value: "Get me a custom quote" },
      { label: "Compare Plans", action: "message", value: "Compare different plans" }
    ],
    chatbot: [
      { label: "AI Features", action: "message", value: "Tell me about AI chatbot features" },
      { label: "How It Works", action: "message", value: "How does the chatbot work" },
      { label: "Book Demo", action: "message", value: "Book a demo" },
      { label: "See Examples", action: "message", value: "Show me examples" }
    ],
    whatsapp_api: [
      { label: "API Details", action: "message", value: "Tell me about WhatsApp API" },
      { label: "Integration Steps", action: "message", value: "How to integrate WhatsApp API" },
      { label: "Pricing", action: "message", value: "WhatsApp API pricing" },
      { label: "Get Started", action: "message", value: "Get started with WhatsApp API" }
    ],
    seo: [
      { label: "SEO Services", action: "message", value: "Tell me about SEO services" },
      { label: "Portfolio", action: "message", value: "Show SEO portfolio" },
      { label: "Get SEO Audit", action: "message", value: "Get a free SEO audit" },
      { label: "Enquire", action: "message", value: "Enquire about SEO services" }
    ],
    website: [
      { label: "Web Development", action: "message", value: "Tell me about web development" },
      { label: "Portfolio", action: "message", value: "Show web development portfolio" },
      { label: "Request Quote", action: "message", value: "Request a quote" },
      { label: "Discuss Project", action: "message", value: "Discuss my project" }
    ],
    demo: [
      { label: "Schedule Demo", action: "message", value: "Schedule a demo call" },
      { label: "Live Demo", action: "message", value: "Show me a live demo" },
      { label: "Demo Video", action: "message", value: "Watch demo video" },
      { label: "When Available", action: "message", value: "When is the next demo" }
    ],
    sales: [
      { label: "Talk to Sales", action: "message", value: "Connect me with sales team" },
      { label: "Schedule Call", action: "message", value: "Schedule a call" },
      { label: "Proposal", action: "message", value: "Send me a proposal" },
      { label: "Enterprise Plan", action: "message", value: "Tell me about enterprise plan" }
    ],
    wacto_general: [
      { label: "About Wacto", action: "message", value: "Tell me about Wacto" },
      { label: "Services", action: "message", value: "What services does Wacto offer" },
      { label: "Book Demo", action: "message", value: "Book a demo" },
      { label: "Contact", action: "message", value: "Contact Wacto team" }
    ]
  };
  
  return chipTemplates[intent] || chipTemplates.wacto_general;
}

// Function to generate default fallback chips - always Wacto business-focused
// NOTE: All chips use message action - no direct URLs to maintain control via n8n
function getDefaultChips() {
  return [
    { label: "About Wacto", action: "message", value: "Tell me about Wacto" },
    { label: "Services", action: "message", value: "What services does Wacto offer" },
    { label: "Book Demo", action: "message", value: "Book a demo" }
  ];
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('\n📨 === CHAT REQUEST ===');
    console.log('User message:', message);
    console.log('History length:', history.length);
    console.log('Timestamp:', new Date().toISOString());

    // Detect user intent early
    const userIntent = detectIntent(message);
    console.log('🎯 Detected intent:', userIntent);

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.error('❌ ERROR: n8n Webhook URL not configured!');
      console.error('Must set NEXT_PUBLIC_N8N_WEBHOOK_URL in .env.local');
      return NextResponse.json(
        { 
          error: 'System not configured',
          reply: '❌ System configuration error: n8n webhook URL not set. Please configure .env.local'
        },
        { status: 500 }
      );
    }

    console.log('📤 n8n Webhook URL:', n8nWebhookUrl);

    // Build payload for n8n
    const payload = {
      message: message.trim(),
      conversationHistory: history.map(h => ({
        role: h.role,
        content: h.content
      })),
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'wacto-chatbot-frontend',
        detectedIntent: userIntent
      }
    };

    console.log('📦 Sending payload to n8n:', JSON.stringify(payload, null, 2));

    // Send to n8n and wait for response
    let n8nResponse;
    let responseBody; // Store body to avoid reading twice
    
    try {
      console.log('🔄 Calling n8n webhook with POST method...');
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 n8n Response Status:', n8nResponse.status);
      
      // Read the body once to avoid "Body already read" errors
      responseBody = await n8nResponse.text();
      
      // If POST fails with 404, try GET
      if (n8nResponse.status === 404) {
        if (responseBody.includes('POST requests')) {
          console.warn('⚠️ POST failed, trying GET method instead...');
          n8nResponse = await fetch(`${n8nWebhookUrl}?message=${encodeURIComponent(message)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          responseBody = await n8nResponse.text();
          console.log('📥 n8n GET Response Status:', n8nResponse.status);
        }
      }
    } catch (fetchError) {
      console.error('❌ Network error calling n8n:', fetchError.message);
      return NextResponse.json({
        error: 'Failed to connect to n8n',
        reply: '❌ Cannot connect to processing system. Check if n8n is running and webhook is active.',
        source: 'error',
        chips: generateChips(userIntent)
      }, { status: 503 });
    }

    // Handle n8n response status codes
    if (n8nResponse.status === 404) {
      console.error('❌ n8n returned 404:', responseBody);
      
      // Check if it's a GET/POST mismatch
      if (responseBody.includes('POST requests') || responseBody.includes('GET request')) {
        console.error('⚠️ WEBHOOK HTTP METHOD MISMATCH - Webhook may be set to GET instead of POST');
        return NextResponse.json({
          error: 'Webhook method mismatch',
          reply: '⚠️ N8N webhook is not accepting POST requests. Check webhook HTTP method is set to POST in n8n.',
          source: 'error',
          chips: generateChips(userIntent)
        }, { status: 503 });
      }
      
      return NextResponse.json({
        error: 'Webhook not registered',
        reply: '⚠️ The AI workflow is not active or webhook not registered. Please activate the n8n workflow (toggle at top-right).',
        source: 'error',
        chips: generateChips(userIntent)
      }, { status: 503 });
    }

    if (!n8nResponse.ok) {
      console.error(`❌ n8n returned error ${n8nResponse.status}:`, responseBody);
      
      // Log detailed error info
      try {
        const errorJson = JSON.parse(responseBody);
        console.error('Error details:', errorJson);
      } catch (e) {
        console.error('Raw error text:', responseBody);
      }
      
      return NextResponse.json({
        error: `n8n error (${n8nResponse.status})`,
        reply: `⚠️ AI processing error. Status: ${n8nResponse.status}. The workflow may be misconfigured or Ollama is not responding.`,
        source: 'error',
        chips: generateChips(userIntent),
        debug: process.env.NODE_ENV === 'development' ? { status: n8nResponse.status, preview: responseBody.substring(0, 200) } : undefined
      }, { status: n8nResponse.status });
    }

    // Parse n8n response
    let responseData;
    const contentType = n8nResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = JSON.parse(responseBody);
        console.log('✅ n8n JSON Response:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.warn('⚠️ Failed to parse JSON response:', parseError.message);
        responseData = { reply: responseBody };
      }
    } else {
      console.log('ℹ️ n8n Text Response:', responseBody);
      responseData = { reply: responseBody };
    }

    // Extract the AI response from n8n output
    // n8n can return various formats, handle all of them
    let botReply = 
      responseData.reply || 
      responseData.message || 
      responseData.response ||
      responseData.text ||
      responseData.output ||
      (responseData.data && (responseData.data.reply || responseData.data.message)) ||
      null;

    // If we got an object, stringify it
    if (botReply && typeof botReply === 'object') {
      botReply = JSON.stringify(botReply);
    }

    if (!botReply) {
      console.warn('⚠️ No response text found in n8n response');
      console.log('n8n response structure:', Object.keys(responseData));
      botReply = 'Processing complete. (Note: Response format not recognized - check n8n workflow output)';
    }

    console.log('✅ Bot Reply:', botReply.substring(0, 150));
    
    // Generate chips based on detected intent or use chips from n8n response
    const chips = responseData.chips || generateChips(userIntent);
    
    console.log('💡 Generated chips:', JSON.stringify(chips, null, 2));
    console.log('📨 === CHAT RESPONSE COMPLETE ===\n');

    // Return to chatbot with chips
    return NextResponse.json({
      reply: String(botReply).trim(),
      source: 'n8n-ollama',
      detectedLanguage: 'en',
      detectedIntent: userIntent,
      chips: chips
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR in chat API:', error.message);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json({
      error: 'Unexpected error',
      reply: '❌ An unexpected error occurred. Please try again or contact our team.',
      source: 'error',
      chips: generateChips(userIntent),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * GET endpoint for health checks and configuration info
 */
export async function GET(req) {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  
  return NextResponse.json({
    status: 'ok',
    api: 'chat-api-v2-n8n-only',
    timestamp: new Date().toISOString(),
    configuration: {
      webhook_configured: !!webhookUrl,
      webhook_url: webhookUrl ? '✅ SET' : '❌ NOT SET',
      ai_backend: 'Ollama (via n8n)',
      openai_enabled: false,
      openai_bypass: true
    },
    instructions: {
      step1: 'Ensure n8n workflow is ACTIVE (toggle at top-right)',
      step2: 'Webhook must be in production mode (not test mode)',
      step3: 'Ollama node in n8n must be configured',
      step4: 'Workflow must respond with { reply: "..." }'
    }
  });
}
