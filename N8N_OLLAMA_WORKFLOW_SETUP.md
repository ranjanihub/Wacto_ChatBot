# 🎯 N8N Workflow Setup Guide - Using Ollama Only

## 📋 What Changed

Your chatbot backend **NO LONGER calls OpenAI**. Instead:

```
Chatbot UI
    ↓
Backend (/api/chat) - Simple relay only
    ↓
N8N Webhook
    ↓
Ollama (local model)
    ↓
Response back to Chatbot
```

**Benefits:**
- ✅ No OpenAI quota issues
- ✅ Completely local AI processing
- ✅ Faster inference with Ollama
- ✅ Full control over AI responses

---

## 🔧 N8N Workflow Configuration

### Required Nodes in Your Workflow

Your n8n workflow needs these components:

#### 1️⃣ **Webhook Trigger Node** (Entry point)
```
- Name: "Webhook"
- HTTP Method: POST
- Path: (auto-generated or keep as is)
- Status: MUST BE ACTIVE
```

**The webhook receives:**
```json
{
  "message": "user's question here",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "metadata": {
    "timestamp": "2026-05-12T...",
    "source": "wacto-chatbot-frontend"
  }
}
```

#### 2️⃣ **Ollama Node** (AI Processing)
```
- Node type: LLM (Large Language Model)
- Model: Select your local Ollama model
  - Options: llama2, mistral, neural-chat, etc.
  - Must match what's running locally
- Input: {{ $node["Webhook"].json.message }}
- System prompt: (optional, customize for Wacto)
```

**Example Ollama Node Setup:**
```
Input field:
{{ $node["Webhook"].json.message }}

System Prompt:
"You are a helpful AI assistant for Wacto WhatsApp API services. Answer questions about WhatsApp integration, pricing, and features."
```

#### 3️⃣ **Format Response Node** (Optional but recommended)
Use "Function" or "Set" node to format Ollama's output:

```javascript
// In a Function node:
return {
  reply: $node["Ollama"].json.output,  // or whatever field Ollama returns
  source: "ollama",
  timestamp: new Date().toISOString()
};
```

#### 4️⃣ **Respond to Webhook Node** (Return response)
```
- Connect this to the Ollama output
- Response Body:
  {
    "reply": "{{ $node["Ollama"].json.output }}"
  }
- Status Code: 200
```

---

## 📐 Minimal Working Workflow

Here's the simplest workflow structure that works:

```
[Webhook Trigger]
        ↓
[Ollama Node] 
  Input: {{ $json.message }}
  Model: llama2 (or your model)
        ↓
[Respond to Webhook]
  Body: {
    "reply": "{{ $node["Ollama"].json.output }}"
  }
```

---

## 🚀 Step-by-Step Setup

### Step 1: Create/Open Workflow
1. Go to n8n
2. Create new workflow OR edit existing one
3. Delete any old OpenAI nodes

### Step 2: Add Webhook Node
1. Click "+" to add node
2. Search "Webhook"
3. Select "Webhook"
4. HTTP Method: **POST**
5. Copy the generated path
6. Save

### Step 3: Add Ollama Node
1. Click "+" after Webhook
2. Search "Ollama" or "LLM"
3. If not available, you may need to install Ollama integration
4. Configure:
   - Model: (select from dropdown or enter manually)
   - Input: `{{ $node["Webhook"].json.message }}`
   - Temperature: 0.7 (adjust as needed)

### Step 4: Add Response Node
1. Click "+" after Ollama
2. Search "Respond to Webhook"
3. Select it
4. Body:
   ```json
   {
     "reply": "{{ $node["Ollama"].json.output }}"
   }
   ```
   (Adjust field name if Ollama returns different field)

### Step 5: Activate Workflow
1. Click the **toggle at top-right** to turn ON
2. Should turn **GREEN** and show "Active"
3. Click "Save"

### Step 6: Test
```bash
node test-webhook.js
```

Expected output:
```
✅ Response Status: 200
✅ SUCCESS! Your webhook is reachable.
```

---

## 🐛 Troubleshooting

### Workflow Still Returns 404
**Problem:** Webhook is not active
**Solution:** 
1. Go to workflow editor
2. Look at top-right corner
3. Toggle should be ON (green)
4. Click "Save"

### Ollama Node Not Available
**Problem:** Ollama integration not installed
**Solution:**
1. Go to n8n Settings
2. Look for "Community Nodes"
3. Search for "Ollama"
4. Install the official Ollama node
5. Restart n8n

### Ollama Returns Empty Response
**Problem:** 
- Model not running locally
- Wrong model name
- Ollama connection issue

**Solution:**
1. Check Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```
2. Verify model is loaded:
   ```bash
   ollama list
   ```
3. In Ollama node, ensure model name matches exactly

### Timeout Error
**Problem:** Ollama taking too long
**Solution:**
1. Reduce max_tokens in Ollama node
2. Set timeout to higher value (e.g., 60 seconds)
3. Use faster model if available

---

## 📊 Expected Data Flow

### Request from Chatbot
```json
{
  "message": "What is WhatsApp API?",
  "conversationHistory": [],
  "metadata": {
    "timestamp": "2026-05-12T10:30:00Z",
    "source": "wacto-chatbot-frontend"
  }
}
```

### Response from N8N
```json
{
  "reply": "WhatsApp API is a service that allows businesses to send and receive messages through WhatsApp. Wacto provides integration for this service..."
}
```

### Chatbot Displays
```
Bot: "WhatsApp API is a service that allows..."
```

---

## 🔄 After Workflow is Set Up

1. **Restart your chatbot backend:**
   ```bash
   npm run dev
   ```

2. **Test in browser:**
   - Open http://localhost:3000
   - Send a message
   - Watch server logs for: ✅ Calling n8n webhook...
   - Check n8n Executions for the incoming request

3. **Monitor Executions:**
   - In n8n, go to "Executions" tab
   - Should see recent executions
   - Click to see full request/response

---

## ⚡ Optional Enhancements

### Add Context from Wacto RAG
In n8n, after Ollama node, add a backend call to fetch Wacto info:

```javascript
// Get Wacto RAG context
const context = await fetch('http://localhost:3000/api/wacto-context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: $json.message })
}).then(r => r.json());

return {
  reply: $node["Ollama"].json.output,
  context: context
};
```

### Add Conversation Memory
Store conversation history in n8n:

```javascript
// In Function node
return {
  reply: $node["Ollama"].json.output,
  conversationId: $json.metadata.conversationId,
  savedAt: new Date().toISOString()
};
```

### Add Logging
Log all requests to database:

```
[Webhook] → [Set variables] → [Ollama] → [Save to DB] → [Respond]
```

---

## ✅ Validation Checklist

Before going live:

- [ ] n8n workflow is ACTIVE (green toggle)
- [ ] Webhook node configured to POST
- [ ] Ollama node selected with correct model name
- [ ] Respond to Webhook node returns { reply: "..." }
- [ ] `test-webhook.js` returns success
- [ ] Chatbot sends message and receives response
- [ ] Server logs show: ✅ Calling n8n webhook...
- [ ] n8n Executions tab shows incoming requests

---

## 📞 Quick Help

**Webhook URL not working?**
```bash
# Test it
node test-webhook.js

# Or with curl
curl -X POST [YOUR_WEBHOOK_URL] \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

**Ollama not responding?**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Check available models
ollama list

# Pull a model if needed
ollama pull llama2
```

**Check n8n logs:**
```bash
# If running in Docker
docker logs [n8n-container-name]

# Check workflow execution details
# Go to n8n UI → Executions tab
```

