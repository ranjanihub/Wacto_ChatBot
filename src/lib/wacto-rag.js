import { load as cheerioLoad } from 'cheerio';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import OpenAI from 'openai';

class WactoRAGService {
  constructor() {
    // Use environment variable or fallback to demo mode
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.startsWith('sk-proj-B8Tdm3Z0GtwHX')) {
      console.warn('⚠️  OpenAI API key not configured or invalid. RAG will use demo mode with pre-written responses.');
      this.demoMode = true;
      this.embeddings = null;
      this.openai = null;
      this.vectorStore = null;
      this.isInitialized = false;
      return;
    }

    this.demoMode = false;
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-small'
    });

    this.openai = new OpenAI({
      apiKey: apiKey
    });

    this.vectorStore = null;
    this.isInitialized = false;
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
      console.log('Scraping wacto.in website...');

      const response = await fetch('https://wacto.in');
      const html = await response.text();
      const $ = cheerioLoad(html);

      // Extract text content from various sections
      const content = [];

      // Get main content
      $('main, .content, .main-content, article, section').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 50) { // Only include substantial content
          content.push({
            text: text,
            source: 'main-content',
            url: 'https://wacto.in'
          });
        }
      });

      // Get headings and descriptions
      $('h1, h2, h3, h4, h5, h6, p, .description, .about').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 20 && text.length < 1000) {
          content.push({
            text: text,
            source: 'headings-descriptions',
            url: 'https://wacto.in'
          });
        }
      });

      // Get service/feature descriptions
      $('.service, .feature, .card, .pricing, .plan').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 30) {
          content.push({
            text: text,
            source: 'services-features',
            url: 'https://wacto.in'
          });
        }
      });

      // Extract contact information and add as content
      const contactInfo = await this.fetchLiveContactDetails();
      if (contactInfo.email.length > 0 || contactInfo.phone.length > 0 || contactInfo.address.length > 0) {
        let contactText = 'Contact Information: ';
        if (contactInfo.email.length > 0) contactText += `Email: ${contactInfo.email.join(', ')}. `;
        if (contactInfo.phone.length > 0) contactText += `Phone: ${contactInfo.phone.join(', ')}. `;
        if (contactInfo.address.length > 0) contactText += `Address: ${contactInfo.address.join(', ')}. `;
        if (contactInfo.social.length > 0) contactText += `Social Media: ${contactInfo.social.join(', ')}. `;

        content.push({
          text: contactText,
          source: 'contact-info',
          url: 'https://wacto.in'
        });
      }

      console.log(`Extracted ${content.length} content pieces from wacto.in`);
      return content;

    } catch (error) {
      console.error('Error scraping wacto.in:', error);
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

  async queryWactoInfo(question) {
    // Check if this is a contact-related question
    const lowerQuestion = question.toLowerCase();
    const contactKeywords = ['contact', 'email', 'phone', 'telephone', 'address', 'location', 'reach', 'connect', 'call', 'message'];
    const isContactQuestion = contactKeywords.some(keyword => lowerQuestion.includes(keyword));

    if (isContactQuestion) {
      console.log('Contact-related question detected, fetching live contact details...');
      const contactInfo = await this.fetchLiveContactDetails();

      let contactResponse = "Here are Wacto's contact details:\n\n";

      if (contactInfo.email.length > 0) {
        contactResponse += `📧 Email: ${contactInfo.email.join(', ')}\n`;
      }

      if (contactInfo.phone.length > 0) {
        contactResponse += `📱 Phone: ${contactInfo.phone.join(', ')}\n`;
      }

      if (contactInfo.address.length > 0) {
        contactResponse += `📍 Address: ${contactInfo.address.join(', ')}\n`;
      }

      if (contactInfo.social.length > 0) {
        contactResponse += `🌐 Social Media: ${contactInfo.social.join(', ')}\n`;
      }

      if (contactInfo.email.length === 0 && contactInfo.phone.length === 0 &&
          contactInfo.address.length === 0 && contactInfo.social.length === 0) {
        contactResponse = "I couldn't find specific contact details on the Wacto website at the moment. Please visit https://wacto.in directly for the most up-to-date contact information.";
      }

      return contactResponse;
    }

    // Demo mode - provide helpful fallback responses
    if (this.demoMode) {
      console.log('🔄 Using demo mode for RAG response');

      const demoResponses = {
        // Direct keyword matches
        'services': "Wacto offers comprehensive WhatsApp API solutions including WhatsApp Business API integration, automated messaging, customer support chatbots, bulk messaging, and CRM integrations. Our services help businesses communicate effectively with their customers through WhatsApp.",
        'pricing': "Wacto offers flexible pricing plans starting from basic packages for small businesses to enterprise solutions. Contact our sales team for detailed pricing information and custom packages tailored to your needs.",
        'features': "Key features include WhatsApp API Setup, Bluetick Branding, Click-to-Chat Ads, QR codes, Website Chat Widgets, AI Chatbots, Lead Capture Forms, WhatsApp Broadcast, Shared Team Inbox, and comprehensive Reports & Analytics.",
        'api': "Our WhatsApp Business API provides reliable messaging capabilities with features like automated responses, bulk messaging, rich media support, and real-time delivery tracking.",
        'integration': "We provide seamless integration options for various CRM systems, e-commerce platforms, and business applications. Our technical team assists with API setup and configuration.",
        'cost': "Wacto offers flexible pricing plans starting from basic packages for small businesses to enterprise solutions. Contact our sales team for detailed pricing information and custom packages tailored to your needs.",
        'price': "Wacto offers flexible pricing plans starting from basic packages for small businesses to enterprise solutions. Contact our sales team for detailed pricing information and custom packages tailored to your needs.",
        'business': "Wacto is a leading WhatsApp API service provider offering business messaging solutions, automated chatbots, and CRM integrations. We help businesses leverage WhatsApp for customer communication and marketing.",
        'solution': "Wacto offers comprehensive WhatsApp API solutions including WhatsApp Business API integration, automated messaging, customer support chatbots, bulk messaging, and CRM integrations.",
        'platform': "Our WhatsApp Business API platform provides reliable messaging capabilities with features like automated responses, bulk messaging, rich media support, and real-time delivery tracking.",
        'automation': "Wacto provides automated messaging solutions and AI chatbots to help businesses streamline their customer communication processes.",
        'support': "We offer dedicated customer support and technical assistance for all our WhatsApp API services and integrations.",
        'marketing': "Wacto helps businesses with WhatsApp marketing through bulk messaging, automated campaigns, and lead capture solutions.",
        'communication': "Wacto enables effective business communication through WhatsApp API integration, automated messaging, and customer support chatbots."
      };

      // Simple keyword matching for demo responses
      for (const [key, response] of Object.entries(demoResponses)) {
        if (lowerQuestion.includes(key)) {
          return response;
        }
      }

      // Default demo response
      return "Wacto is a leading WhatsApp API service provider offering business messaging solutions, automated chatbots, and CRM integrations. We help businesses leverage WhatsApp for customer communication and marketing. For specific details about our services, pricing, or features, please visit wacto.in or contact our sales team.";
    }

    try {
      if (!this.isInitialized) {
        await this.initializeVectorStore();
      }

      if (!this.vectorStore) {
        return "I'm sorry, I couldn't access the Wacto website information at the moment. Please try again later.";
      }

      // Perform similarity search
      const relevantDocs = await this.vectorStore.similaritySearch(question, 3);

      if (relevantDocs.length === 0) {
        return "I couldn't find specific information about that on the Wacto website. Please try rephrasing your question.";
      }

      // Combine the relevant content
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

      // Create a prompt for OpenAI
      const prompt = `You are a helpful assistant answering questions about Wacto, a WhatsApp API service provider. Use the following information from their website to answer the user's question accurately and helpfully.

Context from Wacto website:
${context}

Question: ${question}

Answer the question based on the provided context. If the context doesn't contain enough information to fully answer the question, say so politely and provide what information you can. Keep your response conversational and helpful.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      return response.choices[0].message.content;

    } catch (error) {
      console.error('Error querying RAG system:', error);
      return "I apologize, but I'm having trouble accessing Wacto information right now. Please try again later.";
    }
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