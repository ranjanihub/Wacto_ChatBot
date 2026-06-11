# Wacto ChatBot

A Next.js chatbot application with RAG (Retrieval-Augmented Generation) capabilities for answering questions about Wacto.in using live website data.

## Features

- 🤖 **Intelligent Chatbot**: Powered by OpenAI GPT models
- 🌍 **Multilingual Support**: Automatically detects and responds in multiple languages (English, Spanish, French, German, Italian, Portuguese, and more)
- 🔍 **RAG Technology**: Automatically fetches and uses live data from wacto.in for relevant questions
- 💬 **WhatsApp API Focus**: Specializes in Wacto WhatsApp API services and business messaging
- 🎨 **Modern UI**: Clean, responsive chat interface
- ⚡ **Real-time Responses**: Fast and accurate answers using vector search

## 🚀 Demo Mode (No API Key Required!)

**Great news!** The chatbot works perfectly **without any API keys** using intelligent demo responses!

### Demo Mode Features:
- ✅ **No Setup Required** - Works immediately after `npm install && npm run dev`
- ✅ **Smart Responses** - Keyword-based matching for relevant Wacto information
- ✅ **Comprehensive Coverage** - Services, pricing, features, API details
- ✅ **Graceful Fallbacks** - Handles general questions appropriately

### Demo Responses Include:
- **Services**: WhatsApp API integration, automated messaging, chatbots, CRM integrations
- **Pricing**: Flexible plans from basic to enterprise solutions
- **Features**: API setup, branding, ads, QR codes, widgets, analytics
- **API Info**: Business messaging capabilities and integration options

### Try Demo Questions:
- "What services does Wacto offer?"
- "Tell me about pricing"
- "What are the features?"
- "How do I integrate WhatsApp API?"

## 🌍 Multilingual Support

The chatbot automatically detects the language of user messages and responds appropriately:

### Supported Languages:
- 🇺🇸 **English** (en)
- 🇪🇸 **Spanish** (es) - "Hola, ¿qué servicios ofrecen?"
- 🇫🇷 **French** (fr) - "Bonjour, quels services proposez-vous?"
- 🇩🇪 **German** (de) - "Hallo, welche Dienstleistungen bieten Sie an?"
- 🇮🇹 **Italian** (it) - "Ciao, quali servizi offrite?"
- 🇵🇹 **Portuguese** (pt) - "Olá, que serviços você oferece?"
- And many more languages supported through automatic detection

### How It Works:
1. **Language Detection**: Uses advanced algorithms to identify the input language
2. **Translation to English**: Converts user queries to English for processing
3. **Response Generation**: Processes queries using RAG and AI models
4. **Translation Back**: Translates responses back to the user's original language

### Example Multilingual Queries:
- **Spanish**: "¿Cuáles son los precios de Wacto?"
- **French**: "Quelles sont les fonctionnalités de l'API WhatsApp?"
- **German**: "Wie integriere ich die WhatsApp Business API?"
- **Italian**: "Quali servizi offre Wacto?"

**Note**: Full translation requires a valid OpenAI API key. In demo mode, responses are provided in English with language detection working.

### Upgrading to Full RAG (Optional):
For live website scraping and AI-powered responses:
1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Run `npm run setup` and enter your API key
3. The system will scrape wacto.in and provide dynamic responses

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- **OpenAI API key (optional)** - Required only for full RAG functionality with live website scraping

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ranjanihub/Wacto_ChatBot.git
cd Wacto_ChatBot
```

2. Install dependencies:
```bash
npm install
```

3. **For Demo Mode (No API Key Required):**
```bash
npm run dev
# Open http://localhost:3000 - works immediately!
```

4. **For Full RAG (Optional):**
```bash
npm run setup  # Configure OpenAI API key
npm run dev
```

Or manually edit `.env.local`:
```
OPENAI_API_KEY=your_actual_openai_api_key
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/chat
```

## How RAG Works

When users ask questions about Wacto or WhatsApp API services, the chatbot:

1. **Detects Wacto-related queries** using keyword matching
2. **Scrapes live content** from wacto.in website
3. **Creates embeddings** of the website content using OpenAI
4. **Stores in vector database** (ChromaDB) for fast retrieval
5. **Performs semantic search** to find relevant information
6. **Generates contextual responses** using retrieved data

### Example Queries
- "What services does Wacto offer?"
- "Tell me about WhatsApp API pricing"
- "How do I integrate WhatsApp Business API?"
- "What are Wacto's features?"

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key for embeddings and chat | Yes |
| `N8N_WEBHOOK_URL` | n8n workflow URL for general chat (optional) | No |

## Tech Stack

- **Frontend**: Next.js 16, React 19
- **AI/ML**: OpenAI GPT-4, LangChain, ChromaDB
- **Web Scraping**: Cheerio
- **Styling**: CSS Modules
- **Backend**: Next.js API Routes

## Project Structure

```
src/
├── app/
│   ├── api/chat/          # Chat API with RAG logic
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   └── page.js           # Main page
├── components/
│   └── Chatbot.js        # Chat interface component
└── lib/
    └── wacto-rag.js      # RAG service implementation
    └── booking-service.js # Demo booking service
```

## 📅 Demo Booking Feature

The chatbot includes a complete demo booking system that allows users to schedule a meeting directly from the chat.

### Features
- **Conversational Booking Flow**: Multi-step form with conversational UX
- **SMS OTP Verification**: Firebase-based phone verification
- **Google Sheets Integration**: Automatic booking data storage
- **Email Notifications**: Confirmation emails to user and admin
- **Calendly Integration**: Seamless meeting scheduling
- **Responsive Design**: Works on all devices

### Booking Flow
1. User types "Book a demo" or "Schedule a call"
2. Bot triggers booking form with steps:
   - Name input
   - Email input
   - Phone number input
   - SMS OTP verification
   - Confirmation & Calendly redirect
3. Data stored in Google Sheet
4. Emails sent to user and admin
5. User redirected to Calendly for time selection

### Setup
For complete setup instructions, see [BOOKING_SETUP.md](./BOOKING_SETUP.md)

Quick checklist:
- [ ] Firebase project created with Phone Auth
- [ ] Gmail SMTP configured with App Password
- [ ] Google Sheets API key generated
- [ ] Google Sheet shared with service account
- [ ] `.env.local` file created with all credentials
- [ ] Calendly link added to environment variables

### Keywords that Trigger Booking
- "Book a demo"
- "Schedule a call"
- "I want to schedule"
- "Book an appointment"
- "Schedule a meeting"
- "Can I book a session?"

## N8N Workflow Setup

The chatbot includes an n8n workflow for handling general conversation (non-Wacto questions). To use it:

### Prerequisites
- [n8n](https://n8n.io/) installed and running
- OpenAI API credentials configured in n8n

### Setup Steps

1. **Import the workflow:**
   ```bash
   # In n8n UI, go to Workflows > Import from File
   # Select n8n-workflow.json from this repository
   ```

2. **Configure OpenAI credentials in n8n:**
   - Go to Settings > Credentials
   - Add new OpenAI credential
   - Enter your OpenAI API key

3. **Update webhook URL:**
   - In your `.env.local` file, update the n8n webhook URL:
   ```
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/wacto-chat-webhook
   ```
   - Or for local n8n: `http://localhost:5678/webhook/wacto-chat-webhook`

4. **Activate the workflow** in n8n

### Workflow Logic

- **Wacto-related questions** → Handled by RAG system (Next.js)
- **General questions** → Handled by n8n workflow with OpenAI
- **Fallback** → Polite message directing users to Wacto services

### Testing

Test with different types of questions:
- Wacto: "What services does Wacto offer?" → RAG response
- General: "What's the weather like?" → n8n/OpenAI response

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
