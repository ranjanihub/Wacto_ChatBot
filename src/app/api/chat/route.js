import { NextResponse } from 'next/server';
import { wactoRAG } from '@/lib/wacto-rag';

/**
 * SIMPLIFIED CHAT API - GROQ LLM ONLY
 *
 * Architecture:
 * Chatbot UI → This API → Groq LLM (via wactoRAG) → Response back
 *
 * NO n8n or webhook dependency. All AI processing is done by Groq LLM.
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

  // Booking intent - new for demo scheduling
  if (/\bbook|schedule|booking|appointment|call|meeting|session\b/i.test(lowerMessage)) {
    return 'booking';
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

    // Call Groq LLM via wactoRAG with conversation history
    let botReply;
    try {
      botReply = await wactoRAG.queryWactoInfo(message, history);
    } catch (llmError) {
      console.error('❌ Error from Groq LLM:', llmError.message);
      return NextResponse.json({
        error: 'AI service unavailable',
        reply: '❌ AI service is temporarily unavailable. Please try again later.',
        source: 'error',
        chips: generateChips(userIntent)
      }, { status: 503 });
    }

    // Generate chips based on detected intent
    const chips = generateChips(userIntent);

    // Check if this should trigger booking flow
    const shouldShowBookingFlow = (userIntent === 'demo' || userIntent === 'booking');

    console.log('✅ Bot Reply:', String(botReply).substring(0, 150));
    console.log('💡 Generated chips:', JSON.stringify(chips, null, 2));
    console.log('📨 === CHAT RESPONSE COMPLETE ===\n');

    // Return to chatbot with chips
    return NextResponse.json({
      reply: String(botReply).trim(),
      source: 'groq-llm',
      detectedLanguage: 'en',
      detectedIntent: userIntent,
      chips: chips,
      bookingFlow: shouldShowBookingFlow
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR in chat API:', error.message);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({
      error: 'Unexpected error',
      reply: '❌ An unexpected error occurred. Please try again or contact our team.',
      source: 'error',
      chips: getDefaultChips(),
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
