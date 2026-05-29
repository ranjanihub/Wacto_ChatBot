import { load as cheerioLoad } from 'cheerio';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path for Node.js ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROMA_DIR = path.join(__dirname, '../../.chroma');

class WactoRAGService {
  constructor() {
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
      console.warn('⚠️  GROQ API key not configured.');
      this.demoMode = true;
      this.chromaVectorStore = null;
      this.isInitialized = false;
      return;
    }

    this.demoMode = false;
    this.chromaVectorStore = null;
    this.isInitialized = false;
    this.inMemoryDocuments = [];
    this.groqApiKey = groqApiKey;
    
    console.log('✅ Wacto AI Service initialized - using ChromaDB for knowledge storage');
  }

  async fetchLiveContactDetails() {
    try {
      console.log('Fetching live contact details from wacto.in...');

      const response = await fetch('https://wacto.in');
      const html = await response.text();
      const $ = cheerioLoad(html);

      const contactInfo = {
        email: [],
        phone: [],
        address: [],
        social: []
      };

      // Extract email addresses
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const textContent = $('body').text();
      const emails = textContent.match(emailRegex) || [];
      contactInfo.email = [...new Set(emails)]; // Remove duplicates

      // Extract phone numbers (common patterns)
      const phoneRegex = /(\+91[\s-]?)?[6-9]\d{9}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g;
      const phones = textContent.match(phoneRegex) || [];
      contactInfo.phone = [...new Set(phones)];

      // Extract addresses from specific elements
      $('address, .address, .contact-address, .location').each((i, elem) => {
        const address = $(elem).text().trim();
        if (address.length > 10) {
          contactInfo.address.push(address);
        }
      });

      // Extract social media links
      $('a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"], a[href*="instagram"], a[href*="youtube"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const platform = href.includes('linkedin') ? 'LinkedIn' :
                        href.includes('twitter') ? 'Twitter' :
                        href.includes('facebook') ? 'Facebook' :
                        href.includes('instagram') ? 'Instagram' :
                        href.includes('youtube') ? 'YouTube' : 'Social';
        contactInfo.social.push(`${platform}: ${href}`);
      });

      // Also check for contact sections
      $('.contact, .contact-us, .get-in-touch').each((i, elem) => {
        const contactText = $(elem).text().trim();
        if (contactText.length > 20) {
          // Try to extract more contact info from contact sections
          const sectionEmails = contactText.match(emailRegex) || [];
          const sectionPhones = contactText.match(phoneRegex) || [];
          contactInfo.email.push(...sectionEmails);
          contactInfo.phone.push(...sectionPhones);
        }
      });

      // Remove duplicates
      contactInfo.email = [...new Set(contactInfo.email)];
      contactInfo.phone = [...new Set(contactInfo.phone)];
      contactInfo.address = [...new Set(contactInfo.address)];
      contactInfo.social = [...new Set(contactInfo.social)];

      console.log('Live contact details fetched:', contactInfo);
      return contactInfo;

    } catch (error) {
      console.error('Error fetching live contact details:', error);
      return {
        email: [],
        phone: [],
        address: [],
        social: []
      };
    }
  }

  async scrapeWactoWebsite() {
    try {
      console.log('🌐 Scraping wacto.in website (parallel)...');

      const content = [];
      
      // Key pages to scrape
      const pagesToScrape = [
        { url: 'https://wacto.in/', category: 'Homepage' },
        { url: 'https://wacto.in/best-whatsapp-business-api-pricing-india/', category: 'Pricing' },
        { url: 'https://wacto.in/contact-us/', category: 'Contact' },
        { url: 'https://wacto.in/partnership/', category: 'Partnership' }
      ];

      // Parallel fetching for speed
      const fetchPage = async (page) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          
          const response = await fetch(page.url, { signal: controller.signal });
          clearTimeout(timeout);
          
          if (!response.ok) return null;

          const html = await response.text();
          const $ = cheerioLoad(html);

          // Remove unnecessary elements
          $('script, style, nav, footer, .cookie-banner, .sidebar').remove();

          const pageContent = [];
          
          // Extract headings
          $('h1, h2, h3').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 5) pageContent.push(text);
          });

          // Extract paragraphs
          $('p').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 20 && text.length < 1500) pageContent.push(text);
          });

          // Extract lists
          $('li').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 5) pageContent.push(`• ${text}`);
          });

          if (pageContent.length > 0) {
            return {
              text: pageContent.join('\\n').slice(0, 3000),
              source: `wacto.in-${page.category.toLowerCase()}`,
              url: page.url
            };
          }
          return null;
        } catch (error) {
          console.warn(`⚠️  ${page.category} fetch error`);
          return null;
        }
      };

      // Fetch all pages in parallel
      const results = await Promise.all(pagesToScrape.map(fetchPage));
      results.forEach(result => {
        if (result) {
          content.push(result);
          console.log(`✅ ${result.source}`);
        }
      });

      // Fetch contact details
      try {
        const contactInfo = await this.fetchLiveContactDetails();
        if (contactInfo.email.length > 0 || contactInfo.phone.length > 0) {
          let contactText = 'Contact: ';
          if (contactInfo.email.length > 0) contactText += `Email: ${contactInfo.email.join(', ')} `;
          if (contactInfo.phone.length > 0) contactText += `Phone: ${contactInfo.phone.join(', ')}`;
          
          content.push({
            text: contactText,
            source: 'wacto.in-contact',
            url: 'https://wacto.in/contact-us'
          });
        }
      } catch (e) {
        console.warn('⚠️  Contact details error');
      }

      console.log(`🎯 Loaded ${content.length} documents`);
      return content;

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      return [];
    }
  }

  async initializeVectorStore() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing RAG vector store...');

      const documents = await this.scrapeWactoWebsite();

      if (documents.length === 0) {
        console.warn('No documents scraped, using fallback content');
        // Fallback content about Wacto
        const fallbackContent = [
          {
            text: "Wacto is a WhatsApp API service provider offering business messaging solutions. We provide reliable WhatsApp Business API integration for businesses to communicate with their customers effectively.",
            source: 'fallback',
            url: 'https://wacto.in'
          },
          {
            text: "Our services include WhatsApp API integration, automated messaging, customer support chatbots, and bulk messaging solutions for businesses of all sizes.",
            source: 'fallback',
            url: 'https://wacto.in'
          },
          {
            text: "Wacto offers competitive pricing plans starting from basic packages for small businesses to enterprise solutions with advanced features and dedicated support.",
            source: 'fallback',
            url: 'https://wacto.in'
          }
        ];
        documents.push(...fallbackContent);
      }

      // Split documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });

      const docs = documents.map(doc => ({
        pageContent: doc.text,
        metadata: {
          source: doc.source,
          url: doc.url
        }
      }));

      const splitDocs = await textSplitter.splitDocuments(docs);

      // Create vector store
      this.vectorStore = await Chroma.fromDocuments(
        splitDocs,
        this.embeddings,
        {
          collectionName: 'wacto-website-content'
        }
      );

      this.isInitialized = true;
      console.log('RAG vector store initialized successfully');

    } catch (error) {
      console.error('Error initializing vector store:', error);
      this.isInitialized = false;
    }
  }

  async initializeDocuments() {
    if (this.isInitialized) return;

    try {
      console.log('📚 Initializing ChromaDB knowledge base from wacto.in...');
      
      // Scrape live website
      const scrapedDocuments = await this.scrapeWactoWebsite();
      
      const documentsToStore = scrapedDocuments.length > 0 
        ? scrapedDocuments 
        : this.getFallbackDocuments();
      
      console.log(`📝 Storing ${documentsToStore.length} documents in ChromaDB...`);
      
      // Store documents in memory for retrieval
      // ChromaDB persistence is handled by Chroma's internal storage
      try {
        const docs = documentsToStore.map((doc, idx) => ({
          pageContent: doc.text,
          metadata: {
            source: doc.source,
            url: doc.url || '',
            doc_id: `${idx}`,
            timestamp: new Date().toISOString()
          }
        }));

        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200
        });

        const splitDocs = await textSplitter.splitDocuments(docs);

        // Initialize Chroma with default embeddings
        this.chromaVectorStore = await Chroma.fromDocuments(splitDocs, null, {
          collectionName: 'wacto-knowledge-base',
          url: `http://localhost:8000`
        });

        console.log(`✅ ChromaDB initialized with ${splitDocs.length} document chunks`);
        console.log(`📦 Knowledge stored at: ${CHROMA_DIR}`);
      } catch (chromaError) {
        console.warn('⚠️  ChromaDB persistence error, using in-memory storage:', chromaError.message);
        // Fallback to in-memory document storage
        this.chromaVectorStore = null;
        this.inMemoryDocuments = documentsToStore;
        console.log(`✅ Documents loaded in memory (${documentsToStore.length} docs)`);
      }

      this.isInitialized = true;
      console.log(`✅ Knowledge base ready - ${documentsToStore.length} documents stored`);
    } catch (error) {
      console.error('❌ Error initializing documents:', error.message);
      this.inMemoryDocuments = this.getFallbackDocuments();
      this.isInitialized = true;
    }
  }

  getFallbackDocuments() {
    return [
      {
        text: "Wacto - WhatsApp Business API Platform\nWacto is a leading WhatsApp Business API service provider based in Chennai. We help businesses of all sizes communicate with customers through WhatsApp.",
        source: 'fallback-about',
        url: 'https://wacto.in/'
      },
      {
        text: "Wacto Founders and Leadership\nWacto founders: Sekher Durgalakshmi and Gunasekaran Rajendran. Sekher Durgalakshmi (often referred to as Durga) is the co-founder and visionary behind Wacto's mission to revolutionize business communication. Gunasekaran Rajendran is the co-founder who brings technical expertise and strategic direction to the company. Founded by these entrepreneurs in Chennai, Wacto has become a trusted WhatsApp Business API platform. The founders Durga and Gunasekaran lead Wacto's vision for seamless customer communication.",
        source: 'fallback-founders',
        url: 'https://wacto.in/about-wacto-whatsapp-business-api/'
      },
      {
        text: "Wacto Services and Features:\n• WhatsApp API Integration - Connect your business directly to WhatsApp\n• Automated Messaging - Send bulk messages, automated replies, notifications\n• AI Chatbots - Customer support through intelligent chatbots\n• CRM Integration - Connect with your existing CRM systems\n• Lead Capture Forms - Capture leads directly from chat\n• Shared Team Inbox - Manage multiple conversations\n• Analytics & Reporting - Track messages, engagement, ROI\n• Bluetick Branding - Show verified status\n• Click-to-Chat Ads - WhatsApp ads integration",
        source: 'fallback-features',
        url: 'https://wacto.in/'
      },
      {
        text: "Wacto Pricing\nWacto offers flexible pricing plans starting from basic packages for small businesses to enterprise solutions with advanced features. Visit https://wacto.in/best-whatsapp-business-api-pricing-india/ for detailed pricing information and custom quotes.",
        source: 'fallback-pricing',
        url: 'https://wacto.in/best-whatsapp-business-api-pricing-india/'
      },
      {
        text: "Contact Wacto\nAddress: 85, Padmini, Gandhinagar, 1st main road, Adyar, Chennai (Above Bata Showroom)\nPhone: +91-8012666888\nEmail: wecare@wacto.in\nWebsite: https://wacto.in\nContact Form: https://wacto.in/contact-us/",
        source: 'fallback-contact',
        url: 'https://wacto.in/contact-us/'
      },
      {
        text: "Wacto Company Information\nWacto was founded by Sekher Durgalakshmi (Durga) and Gunasekaran Rajendran. The team is dedicated to providing seamless WhatsApp integration solutions for businesses. Founded in Chennai, Wacto has grown to become a trusted partner for WhatsApp Business API services.",
        source: 'fallback-company',
        url: 'https://wacto.in/about-wacto-whatsapp-business-api/'
      },
      {
        text: "Wacto Integration and Support\nWacto provides seamless integration with e-commerce platforms, CRM systems, and business applications. Our technical team assists with API setup, configuration, and troubleshooting to ensure smooth deployment.",
        source: 'fallback-integration',
        url: 'https://wacto.in/whatsapp-business-api-platform/'
      },
      {
        text: "Wacto Partnership Program\nWacto offers partnership opportunities for agencies, consultants, and resellers. For partnership inquiries, visit https://wacto.in/partnership/ or contact our team.",
        source: 'fallback-partnership',
        url: 'https://wacto.in/partnership/'
      }
    ];
  }

  // Simple keyword-based document retrieval
  async retrieveRelevantDocuments(question, topK = 3) {
    try {
      // Try ChromaDB semantic search first
      if (this.chromaVectorStore) {
        console.log('🔍 Searching ChromaDB for relevant documents...');
        const results = await this.chromaVectorStore.similaritySearch(question, topK);
        
        if (results.length > 0) {
          console.log(`✅ Found ${results.length} documents in ChromaDB`);
          return results.map(doc => ({
            text: doc.pageContent,
            source: doc.metadata.source
          }));
        }
      }
    } catch (chromaSearchError) {
      console.warn('⚠️  ChromaDB search failed, using fallback:', chromaSearchError.message);
    }

    // Fallback to keyword matching
    if (this.inMemoryDocuments) {
      console.log('🔍 Using keyword-based retrieval...');
      const lowerQuestion = question.toLowerCase();
      const words = lowerQuestion.split(/\s+/);

      const scored = this.inMemoryDocuments.map(doc => {
        const docText = doc.text.toLowerCase();
        let score = 0;
        
        words.forEach(word => {
          if (word.length > 3) {
            const occurrences = (docText.match(new RegExp(word, 'g')) || []).length;
            score += occurrences;
          }
        });

        return { ...doc, score };
      });

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(doc => doc.score > 0)
        .map(({ text, source }) => ({ text, source }));
    }

    return [];
  }

  async queryWactoInfo(question, history = []) {
    try {
      // Initialize documents if not already done
      if (!this.isInitialized) {
        await this.initializeDocuments();
      }

      // Retrieve relevant documents (now async)
      const relevantDocs = await this.retrieveRelevantDocuments(question, 2);
      console.log(`📖 Retrieved ${relevantDocs.length} relevant documents from ChromaDB/fallback`);

      // Build context from retrieved documents
      const context = relevantDocs.length > 0 
        ? relevantDocs.map(doc => doc.text).slice(0, 500).join('\n')
        : '';

      // Optimized system prompt for speed and Wacto AI Assistant branding
      const systemPrompt = `You are Wacto AI Assistant - customer support for Wacto WhatsApp Business API.
Based on live data from https://wacto.in/

COMPANY FACTS:
- Founders: Sekher Durgalakshmi (Durga) and Gunasekaran Rajendran
- Location: Chennai, India
- Services: WhatsApp Business API, Chatbots, CRM Integration, Analytics

RULES: Be direct, concise, no markdown. No promotional content. Short replies (1-3 sentences).
Greeting: "Hello! I'm Wacto AI. How can I help?"

KNOWLEDGE: ${context ? context : 'Wacto provides WhatsApp Business API solutions.'}`;

      // Build user prompt
      const userPrompt = question;

      console.log('🔄 Calling Groq LLM with RAG context...');

      // Build message history for context-aware conversation
      const messages = [
        ...history.slice(-4).map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content.slice(0, 200)
        })),
        { role: 'user', content: userPrompt }
      ];

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.3,
          max_tokens: 200,
          top_p: 0.5
        })
      });

      if (!groqResponse.ok) {
        const errorData = await groqResponse.json();
        console.error('Groq API error:', errorData);
        return this.getFallbackResponse(question);
      }

      const groqData = await groqResponse.json();
      const botReply = groqData.choices[0]?.message?.content;

      if (!botReply) {
        return this.getFallbackResponse(question);
      }

      console.log('✅ Groq RAG response received');
      return botReply.trim();

    } catch (error) {
      console.error('Error in RAG query:', error.message);
      return this.getFallbackResponse(question);
    }
  }

  // Fast fallback responses for when Groq is unavailable
  getFallbackResponse(question) {
    const lowerQuestion = question.toLowerCase();
    
    const fallbackResponses = {
      'contact': "You can reach Wacto at: 📧 wecare@wacto.in | 📱 +91-8012666888 | 🌐 https://wacto.in",
      'price': "Wacto offers flexible pricing plans for all business sizes. Contact our sales team for a custom quote.",
      'feature': "Key features: WhatsApp API integration, automated messaging, AI chatbots, bulk messaging, CRM integration, and analytics.",
      'api': "Our WhatsApp Business API provides reliable messaging with automation, analytics, and seamless integrations.",
      'service': "Wacto provides WhatsApp API solutions, chatbots, automation, bulk messaging, and customer communication tools.",
      'demo': "Visit https://wacto.in/videos/ for demo videos or contact us to schedule a live demo.",
      'integration': "We integrate with popular CRM systems, e-commerce platforms, and business applications for seamless communication."
    };

    for (const [key, response] of Object.entries(fallbackResponses)) {
      if (lowerQuestion.includes(key)) {
        return response;
      }
    }

    return "Wacto is a WhatsApp API platform for business messaging. Visit https://wacto.in or contact wecare@wacto.in for more info.";
  }

  isWactoRelatedQuestion(question) {
    const wactoKeywords = [
      'wacto', 'whatsapp api', 'business messaging', 'whatsapp business',
      'api integration', 'messaging service', 'customer communication',
      'bulk messaging', 'automated messaging', 'chatbot', 'pricing',
      'plans', 'services', 'features', 'whatsapp integration',
      'contact', 'email', 'phone', 'telephone', 'address', 'location',
      'reach', 'connect', 'call', 'message',
      // Generic business keywords that should trigger Wacto responses
      'cost', 'price', 'fee', 'charges', 'rate', 'payment',
      'business', 'company', 'organization', 'enterprise',
      'solution', 'platform', 'tool', 'software', 'system',
      'integration', 'setup', 'implementation', 'deployment',
      'support', 'help', 'assistance', 'customer service',
      'automation', 'workflow', 'process', 'efficiency',
      'communication', 'messaging', 'notification', 'alert',
      'marketing', 'sales', 'lead', 'conversion', 'engagement',
      'api', 'webhook', 'integration', 'developer', 'documentation'
    ];

    const lowerQuestion = question.toLowerCase();
    return wactoKeywords.some(keyword => lowerQuestion.includes(keyword));
  }
}


// Export singleton instance
export const wactoRAG = new WactoRAGService();