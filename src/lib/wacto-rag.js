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
      console.log('🌐 Scraping wacto.in website fully (comprehensive)...');

      const content = [];
      
      // Key pages to scrape - now includes Integration page
      const pagesToScrape = [
        { url: 'https://wacto.in/', category: 'Homepage', priority: 1 },
        { url: 'https://wacto.in/best-whatsapp-business-api-pricing-india/', category: 'Pricing', priority: 1 },
        { url: 'https://wacto.in/best-whatsapp-business-integration-services-in-india/', category: 'Integration', priority: 1 },
        { url: 'https://wacto.in/contact-us/#enquiry-now.', category: 'Contact', priority: 2 },
        { url: 'https://wacto.in/partnership/', category: 'Partnership', priority: 2 }
      ];

      // Enhanced parallel fetching for comprehensive data
      const fetchPage = async (page) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000); // Increased timeout for full page load
          
          const response = await fetch(page.url, { signal: controller.signal });
          clearTimeout(timeout);
          
          if (!response.ok) return null;

          const html = await response.text();
          const $ = cheerioLoad(html);

          // Remove unnecessary elements
          $('script, style, nav, footer, .cookie-banner, .sidebar, .modal').remove();

          const pageContent = [];
          
          // Extract main content area
          const mainContent = $('main, article, .content, [role="main"]').first();
          const targetElement = mainContent.length > 0 ? mainContent : $.root();
          
          // Extract headings with hierarchy
          targetElement.find('h1, h2, h3, h4').each((i, elem) => {
            const text = $(elem).text().trim();
            const tag = elem.name;
            if (text.length > 3) pageContent.push(`${tag.toUpperCase()}: ${text}`);
          });

          // Extract paragraphs and descriptions
          targetElement.find('p, .description, .intro, [class*="desc"]').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 15 && text.length < 2000) pageContent.push(text);
          });

          // Extract lists (with context)
          targetElement.find('ul, ol').each((i, list) => {
            const heading = $(list).prev('h2, h3, h4, p').text().trim();
            if (heading) pageContent.push(`List: ${heading}`);
            
            $(list).find('li').each((j, elem) => {
              const text = $(elem).text().trim();
              if (text.length > 5) pageContent.push(`  • ${text}`);
            });
          });

          // Extract feature/benefit boxes
          targetElement.find('.feature, .benefit, .box, [class*="card"], [class*="item"]').each((i, elem) => {
            const title = $(elem).find('h3, h4, .title').text().trim();
            const desc = $(elem).find('p, .description').text().trim();
            if (title || desc) {
              if (title) pageContent.push(`Feature: ${title}`);
              if (desc) pageContent.push(`  ${desc}`);
            }
          });

          // Extract tables
          targetElement.find('table').each((i, table) => {
            $(table).find('tr').each((j, row) => {
              const cells = $(row).find('td, th').map((k, cell) => $(cell).text().trim()).get();
              if (cells.length > 0) pageContent.push(`  ${cells.join(' | ')}`);
            });
          });

          // Extract pricing info if available
          targetElement.find('[class*="price"], [class*="plan"], .pricing').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 10) pageContent.push(`Pricing: ${text}`);
          });

          if (pageContent.length > 0) {
            const fullContent = pageContent.join('\\n');
            return {
              text: fullContent.slice(0, 5000), // Increased to 5000 chars for comprehensive content
              source: `wacto.in-${page.category.toLowerCase()}`,
              url: page.url,
              priority: page.priority,
              size: fullContent.length
            };
          }
          return null;
        } catch (error) {
          console.warn(`⚠️  ${page.category} fetch error: ${error.message}`);
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
      const fallbackDocs = this.getFallbackDocuments();
      
      // Combine scraped docs with critical fallback documents
      let documentsToStore = [];
      if (scrapedDocuments.length > 0) {
        // Use scraped docs but ensure we have structured contact info
        documentsToStore = scrapedDocuments;
        // Add structured contact info from fallback if not in scraped docs
        const hasContactInfo = scrapedDocuments.some(doc => 
          doc.text.includes('+91-8012666888') || doc.text.includes('wecare@wacto.in')
        );
        if (!hasContactInfo) {
          // Add the fallback contact document
          const contactDoc = fallbackDocs.find(doc => doc.source === 'fallback-contact');
          if (contactDoc) {
            documentsToStore.push(contactDoc);
          }
        }
      } else {
        documentsToStore = fallbackDocs;
      }
      
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
        text: "Contact Wacto\nPhone: +91-8012666888\nEmail: wecare@wacto.in\nAddress: 85, Padmini, Gandhinagar, 1st main road, Adyar, Chennai\nWebsite: https://wacto.in\nContact Form: https://wacto.in/contact-us/",
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
      
      // Check if this is a contact-related query
      const isContactQuery = /contact|phone|email|address|location|reach/i.test(question);

      const scored = this.inMemoryDocuments.map(doc => {
        const docText = doc.text.toLowerCase();
        const docSource = (doc.source || '').toLowerCase();
        let score = 0;
        
        words.forEach(word => {
          if (word.length > 3) {
            const occurrences = (docText.match(new RegExp(word, 'g')) || []).length;
            score += occurrences;
          }
        });
        
        // Boost score for contact-related keywords in document
        const contactKeywords = ['phone', 'email', 'address', 'contact', '+91', 'wecare', 'adyar', 'gandhinagar'];
        let hasContactKeywords = 0;
        contactKeywords.forEach(keyword => {
          if (docText.includes(keyword)) {
            hasContactKeywords++;
          }
        });
        
        // Boost score for documents matching the query type
        if (isContactQuery) {
          // ONLY give boost to actually contact-related documents
          if (docSource.includes('contact')) {
            score += 50; // Strong boost for contact documents
          } else if (docSource.includes('fallback-contact')) {
            score += 50; // Strong boost for structured contact data
          }
        }

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

      // Detect if query is about contact information
      const isContactQuery = /contact|phone|email|address|location|reach|call|number|mobile|telephone|how.{0,10}reach/i.test(question);
      const isPricingQuery = /price|pricing|cost|plan|plans|subscription|package/i.test(question);
      // Retrieve relevant documents - more for contact queries
      const topK = isContactQuery ? 3 : 1;
      const contextLength = isContactQuery ? 500 : 300;
      
      let relevantDocs = await this.retrieveRelevantDocuments(question, topK);
      console.log(`📖 Retrieved ${relevantDocs.length} relevant documents`);

      // If this is a contact query, ensure structured contact doc(s) are injected at front
      if (isContactQuery) {
        // Try to get fallback contact from fallback docs
        const fallbackContact = (this.getFallbackDocuments() || []).find(d => (d.source || '').toLowerCase() === 'fallback-contact');

        const existingSources = new Set(relevantDocs.map(r => r.source));

        // If in-memory docs exist (Chroma may be in use but keep fallback available)
        if (this.inMemoryDocuments) {
          const contactDocs = this.inMemoryDocuments.filter(d => {
            const s = (d.source || '').toLowerCase();
            return s.includes('contact') || s.includes('fallback-contact');
          }).map(d => ({ text: d.text, source: d.source }));

          const toPrepend = contactDocs.filter(cd => !existingSources.has(cd.source));
          if (toPrepend.length > 0) {
            relevantDocs = [...toPrepend, ...relevantDocs];
            console.log(`🔗 Injected ${toPrepend.length} contact doc(s) into context (in-memory)`);
          }
        }

        // Always ensure fallbackContact is present if available
        if (fallbackContact && !existingSources.has(fallbackContact.source)) {
          relevantDocs = [{ text: fallbackContact.text, source: fallbackContact.source }, ...relevantDocs];
          console.log('🔗 Injected fallback-contact into context');
        }
      }

      // Build context from retrieved documents (concatenate first doc(s))
      const context = (() => {
        if (!relevantDocs || relevantDocs.length === 0) return '';
        // For contact queries, merge up to first 2 docs to ensure full contact fields
        if (isContactQuery) {
          return relevantDocs.slice(0, 2).map(d => d.text).join('\n').slice(0, contextLength);
        }
        return relevantDocs[0].text.slice(0, contextLength);
      })();

      // Optimized system prompt - minimal, fast
      // For contact queries, require exact contact fields from the context and no hallucination.
      const systemPrompt = `
You are Wacto AI Assistant.

RESPONSE RULES:
- Keep responses under 60 words.
- Maximum 4 lines.
- Use simple business language.
- Never return large paragraphs.
- Never explain everything at once.
- Summarize first.
- Let buttons/chips handle the next step.
- for price queries, fetch details from pricing page and keep it concise.
- Never use Markdown (**text**)
- Embbed Youtube links in the response if the question is about demo videos.
- Embbed contact links if the question is about contact details.
- Use anchor tags for every url in the context that should open in new window.

FORMATTING:
- Use <br> for line breaks.
- Use <strong> for headings.
- Use bullet style: •
- Use <a> tags for links.

SERVICES QUERIES:
Return ONLY these core services:

<strong>Wacto Services</strong><br><br>

• WhatsApp API Setup<br>
• WhatsApp Bluetick Verification<br>
• Click-to-Chat Ads<br>
• WhatsApp QR Code Solutions<br>
• Website Chat Widget<br>
• WhatsApp Chatbot<br>
• Lead Capture Forms<br><br>


DEMO QUERIES:
Return contact page link https://wacto.in/contact-us/#enquiry-now.

BOOKING QUERIES:
Return contact page link https://wacto.in/contact-us/#enquiry-now.

DEMO VIDEOS QUERIES:
Return demo videos page link https://www.youtube.com/@wacto_official.

ABOUT QUERIES:
Return Wacto is a WhatsApp API platform for business messaging. We provide reliable WhatsApp Business API integration for businesses to communicate with their customers effectively.

FOUNDER QUERIES:
Return Wacto founders: Sekher Durgalakshmi and Gunasekaran Rajendran.

PRICING QUERIES:
Return this in bullet-in:
• Engage Plus - ₹2,299 /Monthly<br>
• Automate Pro - ₹4,299/Monthly<br>
• Ultimate Business - Custom Pricing<br>
Then Return pricing page link https://wacto.in/best-whatsapp-business-api-pricing-india/.
${context}
`;
      // Build user prompt
      const userPrompt = question;

      console.log('🔄 Calling Groq LLM with RAG context...');

      // Build message history - minimal for speed
      const messages = [
        ...history.slice(-2).map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content.slice(0, 100)
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
          temperature: 0.2,
          max_tokens: 150,
          top_p: 0.3,
          frequency_penalty: 1.0
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
      'contact': "📞 Phone: +91-8012666888 | 📧 Email: wecare@wacto.in | 📍 Address: 85, Padmini, Gandhinagar, 1st main road, Adyar, Chennai",
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