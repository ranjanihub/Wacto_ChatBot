import { NextResponse } from 'next/server';
import { wactoRAG } from '@/lib/wacto-rag';
import OpenAI from 'openai';
import { franc } from 'franc-min';

const openaiApiKey = process.env.OPENAI_API_KEY;
const isValidApiKey = openaiApiKey && openaiApiKey.length > 20 && openaiApiKey.startsWith('sk-') && !openaiApiKey.includes('your_openai_api_key_here') && !openaiApiKey.includes('example') && !openaiApiKey.includes('placeholder');

const openai = isValidApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// Language detection and translation utilities
async function detectLanguage(text) {
  try {
    // First check for common greetings that might confuse franc
    const lowerText = text.toLowerCase().trim();

    // English greetings
    if (lowerText.startsWith('hello') || lowerText.startsWith('hi') || lowerText.startsWith('hey') ||
        lowerText.includes('what services') || lowerText.includes('do you offer')) {
      return 'en';
    }

    // Spanish greetings
    if (lowerText.startsWith('hola') || lowerText.startsWith('buenos') || lowerText.includes('servicios') ||
        lowerText.includes('ofrecen') || lowerText.includes('qué')) {
      return 'es';
    }

    // French greetings
    if (lowerText.startsWith('bonjour') || lowerText.startsWith('salut') || lowerText.includes('services') ||
        lowerText.includes('proposez') || lowerText.includes('quels')) {
      return 'fr';
    }

    // German greetings
    if (lowerText.startsWith('hallo') || lowerText.startsWith('guten') || lowerText.includes('dienstleistungen') ||
        lowerText.includes('bieten') || lowerText.includes('welche')) {
      return 'de';
    }

    // Italian greetings
    if (lowerText.startsWith('ciao') || lowerText.startsWith('buongiorno') || lowerText.includes('servizi') ||
        lowerText.includes('offrite') || lowerText.includes('quali')) {
      return 'it';
    }

    // Portuguese greetings
    if (lowerText.startsWith('olá') || lowerText.startsWith('oi') || lowerText.includes('serviços') ||
        lowerText.includes('oferece') || lowerText.includes('que')) {
      return 'pt';
    }

    // Use franc for other cases
    const lang = franc(text);
    const langMap = {
      'eng': 'en',
      'spa': 'es',
      'fra': 'fr',
      'deu': 'de',
      'ita': 'it',
      'por': 'pt',
      'rus': 'ru',
      'ara': 'ar',
      'hin': 'hi',
      'chi': 'zh',
      'jpn': 'ja',
      'kor': 'ko',
      'nld': 'nl',
      'swe': 'sv',
      'dan': 'da',
      'nor': 'no',
      'fin': 'fi',
      'tur': 'tr',
      'pol': 'pl',
      'ces': 'cs',
      'slk': 'sk',
      'hun': 'hu',
      'ron': 'ro',
      'bul': 'bg',
      'hrv': 'hr',
      'slv': 'sl',
      'est': 'et',
      'lav': 'lv',
      'lit': 'lt',
      'ell': 'el',
      'heb': 'he',
      'tha': 'th',
      'vie': 'vi',
      'ind': 'id',
      'msa': 'ms',
      'tam': 'ta',
      'tel': 'te',
      'mar': 'mr',
      'ben': 'bn',
      'urd': 'ur',
      'fas': 'fa',
      'amh': 'am',
      'swa': 'sw',
      'yor': 'yo',
      'zul': 'zu'
    };
    return langMap[lang] || 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

async function translateText(text, fromLang, toLang) {
  if (fromLang === toLang) return text;

  // If OpenAI is available, use it for translation
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `Translate the following text from ${fromLang} to ${toLang}. Only return the translated text, no explanations or additional content.`
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.1,
        max_tokens: 1000
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text
    }
  }

  // When OpenAI is not available, return original text (in production, you might want to implement alternative translation)
  return text;
}

async function correctTyposAndRecognizeIntent(text, language = 'en') {
  // If OpenAI is not available, return original text
  if (!openai) return text;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are an expert at understanding user intent and correcting typos. Your task is to:

1. Correct any spelling mistakes in the user's message
2. Understand the user's intended meaning, even if they made typing errors
3. Rephrase the message to be clearer while preserving the original intent
4. Keep the response natural and conversational
5. If the message is already clear, return it mostly unchanged
6. Focus on common typing errors, autocorrect mistakes, and unclear phrasing

Examples:
- "wat is wacto" → "What is Wacto?"
- "how much cost your services" → "How much do your services cost?"
- "i want to send bulk messges" → "I want to send bulk messages"
- "do you have whatsapp api" → "Do you have WhatsApp API?"

Return only the corrected/rephrased message, no explanations.`
      }, {
        role: 'user',
        content: text
      }],
      temperature: 0.2,
      max_tokens: 200
    });

    const correctedText = response.choices[0].message.content.trim();
    console.log(`Original: "${text}" → Corrected: "${correctedText}"`);
    return correctedText;
  } catch (error) {
    console.error('Intent correction error:', error);
    return text; // Fallback to original text
  }
}

function isGreeting(text) {
  const lowerText = text.toLowerCase().trim();

  // Common greeting patterns
  const greetingPatterns = [
    /^hi(\s|$)/, /^hello(\s|$)/, /^hey(\s|$)/, /^good\s+(morning|afternoon|evening)/,
    /^hola(\s|$)/, /^buenos?\s+dias/, /^bonjour/, /^guten\s+tag/, /^ciao/, /^salut/,
    /^hallo/, /^oi/, /^olá/, /^привет/, /^здравствуйте/, /^你好/, /^こんにちは/
  ];

  return greetingPatterns.some(pattern => pattern.test(lowerText));
}

function isContactQuery(text) {
  const lowerText = text.toLowerCase().trim();

  // Common contact-related patterns
  const contactPatterns = [
    /contact/, /reach/, /call/, /email/, /phone/, /address/, /location/,
    /speak.*to.*someone/, /talk.*to.*someone/, /get.*in.*touch/, /connect/,
    /support.*contact/, /customer.*service/, /help.*contact/, /sales.*contact/,
    /enquiry/, /inquiry/, /question/, /ask.*question/
  ];

  return contactPatterns.some(pattern => pattern.test(lowerText));
}

function getContactResponse(language = 'en') {
  const baseUrl = 'https://wacto.in';
  const enquiryUrl = `${baseUrl}/contact-us/#enquiry-now`;

  // Always respond in English for consistency
  return `I'd be happy to help you get in touch with our team! Please visit our <a href="${enquiryUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">contact form</a> to send us your enquiry.`;
}

function getGreetingResponse(language = 'en') {
  // Always respond in English for consistency
  return "Hello! 👋 I'm here to help you with Wacto's WhatsApp API services. How can I assist you today?";
}

function generateContextualSuggestions(message, history = [], language = 'en') {
  const lowerMessage = message.toLowerCase();
  const conversationHistory = history.map(h => h.content?.toLowerCase() || '').join(' ');

  // Base suggestions for new conversations
  let suggestions = [
    { text: "What is WhatsApp API?", emoji: "🤔" },
    { text: "How does it work?", emoji: "⚙️" },
    { text: "Pricing plans", emoji: "💰" }
  ];

  // Pricing-related conversation
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing') ||
      lowerMessage.includes('plan') || lowerMessage.includes('fee') || lowerMessage.includes('charge') ||
      conversationHistory.includes('price') || conversationHistory.includes('cost') || conversationHistory.includes('pricing')) {
    suggestions = [
      { text: "Basic plan details", emoji: "📦" },
      { text: "Premium features", emoji: "⭐" },
      { text: "Enterprise pricing", emoji: "🏢" },
      { text: "Free trial available?", emoji: "🎁" },
      { text: "Compare plans", emoji: "⚖️" }
    ];
  }

  // API integration related
  else if (lowerMessage.includes('api') || lowerMessage.includes('integrat') || lowerMessage.includes('setup') ||
           lowerMessage.includes('connect') || lowerMessage.includes('webhook') ||
           conversationHistory.includes('api') || conversationHistory.includes('integrat')) {
    suggestions = [
      { text: "API documentation", emoji: "📚" },
      { text: "Integration guide", emoji: "🛠️" },
      { text: "Webhook setup", emoji: "🔗" },
      { text: "Testing tools", emoji: "🧪" },
      { text: "Code examples", emoji: "💻" }
    ];
  }

  // Features and capabilities
  else if (lowerMessage.includes('feature') || lowerMessage.includes('can') || lowerMessage.includes('support') ||
           lowerMessage.includes('able') || lowerMessage.includes('function') ||
           conversationHistory.includes('feature') || conversationHistory.includes('can')) {
    suggestions = [
      { text: "Bulk messaging", emoji: "📤" },
      { text: "Chatbots", emoji: "🤖" },
      { text: "CRM integration", emoji: "📊" },
      { text: "Analytics", emoji: "📈" },
      { text: "Automation", emoji: "⚡" }
    ];
  }

  // Getting started / onboarding
  else if (lowerMessage.includes('start') || lowerMessage.includes('begin') || lowerMessage.includes('new') ||
           lowerMessage.includes('sign up') || lowerMessage.includes('register') ||
           conversationHistory.includes('start') || conversationHistory.includes('begin')) {
    suggestions = [
      { text: "Quick start guide", emoji: "🚀" },
      { text: "Create account", emoji: "📝" },
      { text: "Demo request", emoji: "🎬" },
      { text: "Support contact", emoji: "📞" },
      { text: "Requirements", emoji: "✅" }
    ];
  }

  // Support and help
  else if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('problem') ||
           lowerMessage.includes('issue') || lowerMessage.includes('trouble') ||
           conversationHistory.includes('help') || conversationHistory.includes('support')) {
    suggestions = [
      { text: "Contact support", emoji: "🆘" },
      { text: "FAQs", emoji: "❓" },
      { text: "Troubleshooting", emoji: "🔧" },
      { text: "Documentation", emoji: "📖" },
      { text: "Live chat", emoji: "💬" }
    ];
  }

  // Contact and support related
  if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('call') ||
      lowerMessage.includes('email') || lowerMessage.includes('phone') || lowerMessage.includes('address') ||
      lowerMessage.includes('speak') || lowerMessage.includes('talk') || lowerMessage.includes('connect') ||
      lowerMessage.includes('enquiry') || lowerMessage.includes('inquiry') ||
      conversationHistory.includes('contact') || conversationHistory.includes('support')) {
    suggestions = [
      { text: "Submit enquiry", emoji: "📝" },
      { text: "Schedule demo", emoji: "📅" },
      { text: "Technical support", emoji: "🛠️" },
      { text: "Sales inquiry", emoji: "💼" },
      { text: "Partnership opportunities", emoji: "🤝" }
    ];
  }

  // Business/industry specific
  else if (lowerMessage.includes('business') || lowerMessage.includes('company') || lowerMessage.includes('enterprise') ||
           lowerMessage.includes('industry') || lowerMessage.includes('use case') ||
           conversationHistory.includes('business') || conversationHistory.includes('company')) {
    suggestions = [
      { text: "E-commerce integration", emoji: "🛒" },
      { text: "Customer service", emoji: "👥" },
      { text: "Marketing campaigns", emoji: "📢" },
      { text: "Order notifications", emoji: "📦" },
      { text: "Lead generation", emoji: "🎯" }
    ];
  }

  // Translate suggestions if needed
  if (language !== 'en') {
    // For now, keep in English but this could be enhanced with translation
    // The frontend can handle translation if needed
  }

  return suggestions.slice(0, 4); // Return max 4 suggestions
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, history, language = 'en' } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Detect language of the input message
    const detectedLang = await detectLanguage(message);
    console.log(`Detected language: ${detectedLang}`);

    // Quick contact query check - provide enquiry form URL
    if (isContactQuery(message)) {
      console.log('Contact query detected - providing enquiry form URL');
      const contactResponse = getContactResponse(detectedLang);
      const suggestions = generateContextualSuggestions(message, history, detectedLang);
      return NextResponse.json({
        reply: contactResponse,
        source: 'contact',
        detectedLanguage: 'en',
        suggestions: suggestions
      });
    }

    // Quick greeting check - provide instant response for greetings
    if (isGreeting(message)) {
      console.log('Greeting detected - providing instant response');
      const greetingResponse = getGreetingResponse(detectedLang);
      const suggestions = generateContextualSuggestions(message, history, detectedLang);
      return NextResponse.json({
        reply: greetingResponse,
        source: 'greeting',
        detectedLanguage: 'en',
        suggestions: suggestions
      });
    }

    // For non-greeting messages, proceed with full processing
    // Correct typos and recognize user intent
    const correctedMessage = await correctTyposAndRecognizeIntent(message, detectedLang);
    console.log(`Corrected message: "${correctedMessage}"`);

    // Translate to English for processing if not already English
    const messageInEnglish = detectedLang !== 'en' ? await translateText(correctedMessage, detectedLang, 'en') : correctedMessage;
    console.log(`Message in English: ${messageInEnglish}`);

    // Check if the question is about Wacto (using English version)
    if (wactoRAG.isWactoRelatedQuestion(messageInEnglish)) {
      console.log('Wacto-related question detected, using RAG...');

      const ragResponse = await wactoRAG.queryWactoInfo(messageInEnglish);

      // Always respond in English for consistency
      const finalResponse = ragResponse;
      const suggestions = generateContextualSuggestions(correctedMessage, history, 'en');

      return NextResponse.json({
        reply: finalResponse,
        source: 'wacto-rag',
        detectedLanguage: 'en',
        suggestions: suggestions
      });
    }

    // For non-Wacto questions, use OpenAI directly if available
    if (openai) {
      try {
        const systemPrompt = `You are a helpful AI assistant for Wacto, a WhatsApp API service provider. While your primary expertise is in WhatsApp API services and business messaging solutions, you can also help with general questions.

If the user asks about topics outside of WhatsApp API or business messaging, provide a helpful response but gently steer the conversation back to Wacto's services when appropriate. Be friendly, professional, and informative.

Key information about Wacto:
- We provide WhatsApp Business API integration
- We offer automated messaging and chatbot solutions
- We help businesses communicate with customers via WhatsApp
- Our services include bulk messaging, CRM integration, and analytics

Keep responses conversational and not too salesy.`;

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageInEnglish }
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        });

        const aiReply = response.choices[0].message.content;

        // Always respond in English for consistency
        const finalReply = aiReply;
        const suggestions = generateContextualSuggestions(correctedMessage, history, 'en');

        return NextResponse.json({
          reply: finalReply,
          source: 'openai-general',
          detectedLanguage: 'en',
          suggestions: suggestions
        });

      } catch (aiError) {
        console.warn('OpenAI API failed:', aiError.message);
        const fallbackReply = "I'm here to help with questions about Wacto and WhatsApp API services. For other topics, I'm currently focused on our messaging solutions. Please ask me about our WhatsApp Business API, pricing, or features!";
        const finalFallback = fallbackReply;
        const suggestions = generateContextualSuggestions(correctedMessage, history, 'en');
        
        return NextResponse.json({
          reply: finalFallback,
          source: 'fallback',
          detectedLanguage: 'en',
          suggestions: suggestions
        });
      }
    } else {
      // No valid OpenAI key - provide helpful fallback for general questions
      const lowerMessage = messageInEnglish.toLowerCase().trim();

      let fallbackReply = '';

      if (lowerMessage.includes('hello') || lowerMessage === 'hi' || lowerMessage === 'hey') {
        fallbackReply = "Hello! I'm here to help you with questions about Wacto and WhatsApp API services. How can I assist you today?";
      } else if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you do')) {
        fallbackReply = "I'm doing well, thank you! I'm here to help you learn about Wacto's WhatsApp API services and how we can help your business communicate better with customers.";
      } else if (lowerMessage.includes('what can you') || lowerMessage.includes('help') || lowerMessage.includes('assist')) {
        fallbackReply = "I can provide information about:\n• WhatsApp Business API integration\n• Automated messaging solutions\n• Customer support chatbots\n• Bulk messaging services\n• CRM integrations\n• Pricing and plans\n\nWhat would you like to know about Wacto?";
      } else {
        // Default fallback
        fallbackReply = "I'm here to help with questions about Wacto and WhatsApp API services. For other topics, I'm currently focused on our messaging solutions. Please ask me about our WhatsApp Business API, pricing, or features!";
      }

      // Always respond in English for consistency
      const finalFallback = fallbackReply;
      const suggestions = generateContextualSuggestions(message, history, 'en');

      return NextResponse.json({
        reply: finalFallback,
        source: 'fallback-general',
        detectedLanguage: 'en',
        suggestions: suggestions
      });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
