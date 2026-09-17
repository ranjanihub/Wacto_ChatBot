import { GoogleGenerativeAI } from '@google/generative-ai';
import { load as cheerioLoad } from 'cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

class WactoRAGService {
  constructor() {
    this.isInitialized = false;
    this.inMemoryDocuments = [];
    this.geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    console.log('✅ Wacto AI Service initialized - using Live Scraped Knowledge & Gemini for generation');
  }

  async fetchLiveContactDetails() {
    try {
      console.log('📞 Fetching live contact details from wacto.in...');

      const response = await fetch('https://wacto.in/contact-us/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const html = await response.text();
      const $ = cheerioLoad(html);

      const contactInfo = {
        email: ['wecare@wacto.in'],
        phone: ['+91-8012666888'],
        address: ['85, Padmini, Gandhinagar, 1st main road, Adyar, Chennai'],
        social: []
      };

      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const textContent = $('body').text();
      const emails = textContent.match(emailRegex) || [];
      contactInfo.email = [...new Set([...contactInfo.email, ...emails])];

      const phoneRegex = /(\+91[\s-]?)?[6-9]\d{9}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g;
      const phones = textContent.match(phoneRegex) || [];
      contactInfo.phone = [...new Set([...contactInfo.phone, ...phones])];

      $('address, .address, .contact-address, .location').each((i, elem) => {
        const address = $(elem).text().trim();
        if (address.length > 10) {
          contactInfo.address.push(address);
        }
      });

      $('a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"], a[href*="instagram"], a[href*="youtube"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const platform = href.includes('linkedin') ? 'LinkedIn' :
                        href.includes('twitter') ? 'Twitter' :
                        href.includes('facebook') ? 'Facebook' :
                        href.includes('instagram') ? 'Instagram' :
                        href.includes('youtube') ? 'YouTube' : 'Social';
        contactInfo.social.push(`${platform}: ${href}`);
      });

      contactInfo.address = [...new Set(contactInfo.address)];
      contactInfo.social = [...new Set(contactInfo.social)];

      return contactInfo;
    } catch (error) {
      console.warn('⚠️ Error fetching live contact details, using defaults:', error.message);
      return {
        email: ['wecare@wacto.in'],
        phone: ['+91-8012666888'],
        address: ['85, Padmini, Gandhinagar, 1st main road, Adyar, Chennai'],
        social: ['YouTube: https://www.youtube.com/@wacto_official']
      };
    }
  }

  async scrapeWactoWebsite() {
    try {
      console.log('🌐 Scraping wacto.in website pages for live knowledge base...');

      const content = [];
      
      const pagesToScrape = [
        { url: 'https://wacto.in/', category: 'Homepage', title: 'Wacto WhatsApp API Platform' },
        { url: 'https://wacto.in/best-whatsapp-business-api-pricing-india/', category: 'Pricing', title: 'Wacto Pricing Plans' },
        { url: 'https://wacto.in/best-whatsapp-business-integration-services-in-india/', category: 'Integration', title: 'Wacto Integration Services & Tools' },
        { url: 'https://wacto.in/about-wacto-whatsapp-business-api/', category: 'About', title: 'About Wacto & Founders' },
        { url: 'https://wacto.in/contact-us/', category: 'Contact', title: 'Contact Wacto Team & Demo Booking' },
        { url: 'https://wacto.in/partnership/', category: 'Partnership', title: 'Wacto Partnership Program' },
        { url: 'https://wacto.in/best-instagram-chatbot-for-business-in-india/', category: 'Instagram Chatbot', title: 'Instagram Automation & Chatbot' }
      ];

      const fetchPage = async (page) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(page.url, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          clearTimeout(timeout);
          
          if (!response.ok) return null;

          const html = await response.text();
          const $ = cheerioLoad(html);

          $('script, style, noscript, nav, footer, .cookie-banner, .sidebar, .modal').remove();

          const pageContent = [];
          pageContent.push(`PAGE: ${page.title} (${page.url})`);
          pageContent.push(`CATEGORY: ${page.category}`);

          // Headings
          $('h1, h2, h3, h4').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 2) pageContent.push(`${elem.name.toUpperCase()}: ${text}`);
          });

          // Paragraphs & descriptions
          $('p, .description, .intro, [class*="desc"], [class*="content"]').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 15 && text.length < 2000) pageContent.push(text);
          });

          // Lists
          $('ul, ol').each((i, list) => {
            $(list).find('li').each((j, elem) => {
              const text = $(elem).text().trim();
              if (text.length > 5) pageContent.push(`• ${text}`);
            });
          });

          // Tables / Pricing items
          $('[class*="price"], [class*="plan"], .pricing, table').each((i, elem) => {
            const text = $(elem).text().replace(/\s+/g, ' ').trim();
            if (text.length > 10 && text.length < 1500) pageContent.push(`Plan/Pricing info: ${text}`);
          });

          if (pageContent.length > 0) {
            const fullContent = pageContent.join('\n');
            return {
              text: fullContent.slice(0, 6000),
              source: `wacto.in-${page.category.toLowerCase()}`,
              category: page.category,
              title: page.title,
              url: page.url
            };
          }
          return null;
        } catch (error) {
          console.warn(`⚠️  ${page.category} fetch warning: ${error.message}`);
          return null;
        }
      };

      const results = await Promise.all(pagesToScrape.map(fetchPage));
      results.forEach(result => {
        if (result) {
          content.push(result);
          console.log(`✅ Loaded page: ${result.title}`);
        }
      });

      // Add contact information document
      try {
        const contactInfo = await this.fetchLiveContactDetails();
        content.push({
          text: `Contact & Reach Wacto:
Email: ${contactInfo.email.join(', ')}
Phone: ${contactInfo.phone.join(', ')}
Address: ${contactInfo.address.join(' | ')}
Official Website: https://wacto.in
Contact / Demo Form: https://wacto.in/contact-us/#enquiry-now
YouTube Demo Channel: https://www.youtube.com/@wacto_official
Social: ${contactInfo.social.join(', ')}`,
          source: 'wacto.in-contact-info',
          category: 'Contact',
          title: 'Official Contact Details',
          url: 'https://wacto.in/contact-us/'
        });
      } catch (e) {
        console.warn('⚠️ Contact details fetch error');
      }

      console.log(`🎯 Loaded ${content.length} scraped documents from wacto.in`);
      return content;
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      return [];
    }
  }

  async initializeDocuments() {
    if (this.isInitialized) return;

    try {
      console.log('📚 Initializing knowledge base from live wacto.in website...');
      
      const scrapedDocuments = await this.scrapeWactoWebsite();
      const fallbackDocs = this.getFallbackDocuments();
      
      let allDocs = [];
      if (scrapedDocuments.length > 0) {
        allDocs = [...scrapedDocuments, ...fallbackDocs];
      } else {
        allDocs = fallbackDocs;
      }
      
      // Chunk documents for optimal retrieval
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1200,
        chunkOverlap: 200
      });

      const chunkedDocs = [];
      for (const doc of allDocs) {
        const splits = await textSplitter.splitText(doc.text);
        for (const split of splits) {
          chunkedDocs.push({
            text: split,
            source: doc.source || 'wacto-doc',
            category: doc.category || 'General',
            title: doc.title || '',
            url: doc.url || 'https://wacto.in'
          });
        }
      }

      this.inMemoryDocuments = chunkedDocs;
      this.isInitialized = true;
      console.log(`✅ Knowledge base ready - indexed ${chunkedDocs.length} knowledge chunks in memory`);
    } catch (error) {
      console.error('❌ Error initializing documents:', error.message);
      this.inMemoryDocuments = this.getFallbackDocuments();
      this.isInitialized = true;
    }
  }

  getFallbackDocuments() {
    return [
      {
        text: `Wacto - WhatsApp Business API Platform
Wacto (wacto.in) is India's leading WhatsApp Business API & AI Chatbot service provider based in Chennai.
Founders: Sekher Durgalakshmi (Durga) and Gunasekaran Rajendran.
Core Services: WhatsApp API Setup, WhatsApp Bluetick Verification, Click-to-Chat Ads, WhatsApp QR Code Solutions, Website Chat Widget, WhatsApp Chatbot, Instagram Automation, Lead Capture Forms, Shared Team Inbox, Analytics & Reporting.`,
        source: 'wacto-about',
        category: 'About',
        title: 'About Wacto & Founders',
        url: 'https://wacto.in/about-wacto-whatsapp-business-api/'
      },
      {
        text: `Wacto Pricing Plans:
• Starter / Engage Plus Plan - ₹2,299/Monthly (WhatsApp API, basic automation, broadcast messaging)
• Growth / Automate Pro Plan - ₹4,299/Monthly (Advanced chatbots, automation, CRM integrations, multi-agent support)
• Ultimate Business / Enterprise Plan - Custom Pricing (Dedicated account manager, custom API integrations, high volume messaging)
Offer: Start Reaching Customers Instantly! Pay ₹999 & Unlock 500 FREE Messages.
Detailed Pricing Page: https://wacto.in/best-whatsapp-business-api-pricing-india/`,
        source: 'wacto-pricing',
        category: 'Pricing',
        title: 'Wacto Pricing Details',
        url: 'https://wacto.in/best-whatsapp-business-api-pricing-india/'
      },
      {
        text: `Contact Wacto:
Phone: +91-8012666888
Email: wecare@wacto.in
Address: 85, Padmini, Gandhinagar, 1st main road, Adyar, Chennai, India
Website: https://wacto.in
Contact / Demo Booking Form: https://wacto.in/contact-us/#enquiry-now
YouTube Demo Channel: https://www.youtube.com/@wacto_official`,
        source: 'wacto-contact',
        category: 'Contact',
        title: 'Wacto Contact & Demo',
        url: 'https://wacto.in/contact-us/'
      },
      {
        text: `Wacto Integrations:
Wacto integrates with CRM systems, e-commerce platforms (Shopify, WooCommerce), ERPs, payment gateways, and custom applications via REST API and Webhooks.
Integration Page: https://wacto.in/best-whatsapp-business-integration-services-in-india/`,
        source: 'wacto-integration',
        category: 'Integration',
        title: 'Wacto Integration Services',
        url: 'https://wacto.in/best-whatsapp-business-integration-services-in-india/'
      },
      {
        text: `Wacto Partnership Program:
Wacto offers a partnership program for digital marketing agencies, consultants, software vendors, and resellers.
Key Benefits: Up to 30% commission, dedicated partner support, co-marketing, and one-time settlement.
Partnership Page: https://wacto.in/partnership/`,
        source: 'wacto-partnership',
        category: 'Partnership',
        title: 'Wacto Partnership Program',
        url: 'https://wacto.in/partnership/'
      }
    ];
  }

  // Keyword & semantic relevance ranking
  async retrieveRelevantDocuments(question, topK = 4) {
    if (!this.inMemoryDocuments || this.inMemoryDocuments.length === 0) {
      return [];
    }

    const lowerQuestion = question.toLowerCase();
    const words = lowerQuestion
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Intent boosters
    const isPricing = /pric|cost|rate|fee|charge|plan|subscription|engage|automate|₹|quote/i.test(lowerQuestion);
    const isContact = /contact|phone|call|email|address|location|reach|support|sales|chennai|adyar/i.test(lowerQuestion);
    const isIntegration = /integrat|crm|shopify|woocommerce|api|webhook|tool|connect/i.test(lowerQuestion);
    const isFounder = /founder|owner|ceo|durga|sekher|gunasekaran|started|who founded/i.test(lowerQuestion);
    const isDemo = /demo|video|watch|youtube|see|preview|trial|book|schedule/i.test(lowerQuestion);
    const isInstagram = /instagram|insta|dm|story/i.test(lowerQuestion);

    const scored = this.inMemoryDocuments.map(doc => {
      const docText = (doc.text || '').toLowerCase();
      const docSource = (doc.source || '').toLowerCase();
      const docTitle = (doc.title || '').toLowerCase();
      const docCat = (doc.category || '').toLowerCase();

      let score = 0;

      // Word matching
      words.forEach(word => {
        const count = (docText.match(new RegExp(`\\b${word}`, 'g')) || []).length;
        score += count * 3;
        if (docTitle.includes(word)) score += 10;
        if (docCat.includes(word)) score += 8;
      });

      // Semantic category boosts
      if (isPricing && (docCat.includes('pricing') || docSource.includes('pricing') || docText.includes('₹') || docText.includes('engage plus'))) {
        score += 50;
      }
      if (isContact && (docCat.includes('contact') || docSource.includes('contact') || docText.includes('wecare@wacto.in') || docText.includes('+91'))) {
        score += 50;
      }
      if (isIntegration && (docCat.includes('integration') || docSource.includes('integration'))) {
        score += 50;
      }
      if (isFounder && (docCat.includes('about') || docText.includes('founder') || docText.includes('durga') || docText.includes('gunasekaran'))) {
        score += 60;
      }
      if (isDemo && (docText.includes('youtube') || docText.includes('demo') || docCat.includes('contact'))) {
        score += 40;
      }
      if (isInstagram && (docCat.includes('instagram') || docText.includes('instagram'))) {
        score += 50;
      }

      return { ...doc, score };
    });

    const ranked = scored
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (ranked.length === 0) {
      return this.inMemoryDocuments.slice(0, topK);
    }

    return ranked;
  }

  async queryWactoInfo(question, history = []) {
    try {
      if (!this.isInitialized) {
        await this.initializeDocuments();
      }

      // Retrieve top relevant website chunks
      const relevantDocs = await this.retrieveRelevantDocuments(question, 4);
      console.log(`📖 Retrieved ${relevantDocs.length} relevant document chunks from website data`);

      // Build context
      const context = relevantDocs.map((d, i) => `[Source: ${d.title || d.source} (${d.url})]\n${d.text}`).join('\n\n---\n\n');

      const systemPrompt = `
You are the official Wacto AI Assistant for Wacto (https://wacto.in) — India's premier WhatsApp Business API, AI Chatbot, and automation platform.

PRIMARY DIRECTIVES:
1. Answer the user's question accurately and helpfully using the provided SCRAPED WEBSITE CONTEXT below.
2. Ground your answers in real facts from the context (pricing numbers, feature names, integration options, founder names, contact details).
3. Keep responses concise, clean, and nicely formatted (around 3 to 6 lines or bullet points).
4. CRITICAL LAYOUT & BULLET POINT RULES:
   - When listing features, plans, contact details, or points, ALWAYS place EACH point on its OWN NEW LINE vertically:
     <br><br>• First point<br>• Second point<br>• Third point<br><br>
   - NEVER place multiple bullet points on the same line (never write "• Point 1 • Point 2").
   - Use <br><br> between introductory text, bullet lists, and closing sentences/links.
5. HTML FORMATTING RULES (NEVER use markdown **bold** or *italic*):
   - <strong>Heading or Important Term</strong> for bold headings and labels
   - <br> for line breaks
   - • for bullet points
   - <a href="URL" target="_blank">Anchor Text</a> for links
6. Relevant Links Guide:
   - Pricing inquiries: Link to <a href="https://wacto.in/best-whatsapp-business-api-pricing-india/" target="_blank">View Pricing Plans</a>
   - Demo / Booking inquiries: Link to <a href="https://wacto.in/contact-us/#enquiry-now" target="_blank">Book Demo / Contact Form</a>
   - Demo Videos: Link to <a href="https://www.youtube.com/@wacto_official" target="_blank">Watch Demo Videos on YouTube</a>
   - Integrations: Link to <a href="https://wacto.in/best-whatsapp-business-integration-services-in-india/" target="_blank">Integration Details</a>
   - Contact / Sales: Mention phone (+91-8012666888), email (wecare@wacto.in), and Chennai address.

SCRAPED WEBSITE CONTEXT:
${context}
`;

      const userPrompt = question;
      console.log('🔄 Calling Gemini LLM with live RAG website context...');

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || this.geminiApiKey;
      if (!apiKey) {
        console.warn('⚠️ Gemini API key not found in environment, using fallback response');
        return this.getFallbackResponse(question);
      }

      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
          topP: 0.8
        }
      });

      // Prepare conversation history formatted for Gemini
      const geminiHistory = [];
      for (const h of history.slice(-6)) {
        const role = h.role === 'assistant' ? 'model' : 'user';
        if (!h.content) continue;
        if (geminiHistory.length === 0 && role !== 'user') {
          continue;
        }
        if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === role) {
          geminiHistory[geminiHistory.length - 1].parts[0].text += '\n' + h.content.slice(0, 250);
        } else {
          geminiHistory.push({
            role: role,
            parts: [{ text: h.content.slice(0, 250) }]
          });
        }
      }

      const chat = model.startChat({
        history: geminiHistory
      });

      const result = await chat.sendMessage(userPrompt);
      const botReply = result.response.text();

      if (!botReply) {
        return this.getFallbackResponse(question);
      }

      console.log('✅ Gemini RAG response received');
      return this.formatBotReply(botReply);

    } catch (error) {
      console.error('Error in Gemini RAG query:', error.message);
      return this.getFallbackResponse(question);
    }
  }

  // Ensures bullet points, bold tags, and line breaks are strictly vertical and well-spaced
  formatBotReply(text) {
    if (!text) return '';
    let formatted = String(text).trim();

    // Convert markdown bold **text** to <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Convert markdown links [text](url) to HTML
    formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Normalize line breaks
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Convert markdown dash or asterisk bullets to •
    formatted = formatted.replace(/^[\t ]*[-*]\s+/gm, '• ');
    formatted = formatted.replace(/\n[\t ]*[-*]\s+/g, '\n• ');

    // Break horizontal/inline bullet points into individual new lines
    // e.g. "offers: • Item 1 • Item 2" => "offers:\n• Item 1\n• Item 2"
    formatted = formatted.replace(/([^\n])[\t ]*•[\t ]*/g, '$1\n• ');

    // Convert newlines to HTML <br>
    formatted = formatted.replace(/\n+/g, '<br>');

    // Ensure double break before the start of a bullet list if preceded by text or colon
    formatted = formatted.replace(/([^>])<br>• /g, '$1<br><br>• ');

    // Clean up duplicate <br> inside bullet sequences so bullets stay compact
    formatted = formatted.replace(/• (.*?)<br><br>• /g, '• $1<br>• ');

    // Clean up excessive <br> sequences
    formatted = formatted.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

    // Remove leading/trailing breaks
    formatted = formatted.replace(/^(<br\s*\/?>\s*)+/gi, '').replace(/(<br\s*\/?>\s*)+$/gi, '');

    return formatted.trim();
  }

  getFallbackResponse(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (/contact|phone|email|address|location|reach/i.test(lowerQuestion)) {
      return "<strong>Contact Wacto</strong><br><br>📞 Phone: +91-8012666888<br>📧 Email: wecare@wacto.in<br>📍 Address: 85, Padmini, Gandhinagar, 1st main road, Adyar, Chennai<br><br><a href=\"https://wacto.in/contact-us/#enquiry-now\" target=\"_blank\">Contact Us / Book Demo</a>";
    }
    
    if (/price|pricing|cost|plan|subscription/i.test(lowerQuestion)) {
      return "<strong>Wacto Pricing Plans</strong><br><br>• Engage Plus - ₹2,299 /Monthly<br>• Automate Pro - ₹4,299 /Monthly<br>• Ultimate Business - Custom Pricing<br><br><a href=\"https://wacto.in/best-whatsapp-business-api-pricing-india/\" target=\"_blank\">View Full Pricing Details</a>";
    }

    if (/demo|video|watch/i.test(lowerQuestion)) {
      return "<strong>Wacto Demos & Videos</strong><br><br>Visit our <a href=\"https://www.youtube.com/@wacto_official\" target=\"_blank\">YouTube Channel</a> for demo videos or <a href=\"https://wacto.in/contact-us/#enquiry-now\" target=\"_blank\">schedule a live demo call</a> with our team.";
    }

    if (/founder|founded|owner|ceo|durga|sekher/i.test(lowerQuestion)) {
      return "<strong>About Wacto Founders</strong><br><br>Wacto was founded in Chennai by <strong>Sekher Durgalakshmi</strong> and <strong>Gunasekaran Rajendran</strong> to provide reliable WhatsApp Business API solutions.";
    }

    return "<strong>Wacto WhatsApp Business API</strong><br><br>Wacto helps businesses automate customer communication with official WhatsApp APIs, chatbots, bulk messaging, and CRM integrations.<br><br>Visit <a href=\"https://wacto.in\" target=\"_blank\">wacto.in</a> or contact <a href=\"mailto:wecare@wacto.in\">wecare@wacto.in</a> for more info.";
  }

  isWactoRelatedQuestion(question) {
    const lowerQuestion = question.toLowerCase();
    const wactoKeywords = [
      'wacto', 'whatsapp', 'api', 'bot', 'chat', 'pricing', 'price', 'plan',
      'cost', 'contact', 'email', 'phone', 'address', 'founder', 'feature',
      'service', 'demo', 'integration', 'crm', 'message', 'support', 'sales',
      'bulk', 'broadcast', 'help', 'booking', 'schedule', 'agency', 'partner'
    ];
    return wactoKeywords.some(kw => lowerQuestion.includes(kw));
  }
}

// Export singleton instance
export const wactoRAG = new WactoRAGService();