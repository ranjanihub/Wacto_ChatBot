# 🎯 QUICK START - What You Need to Do NOW

## 🔴 Current Status

❌ **Chatbot is broken** - Waiting for you to complete these steps:

1. N8N workflow is **INACTIVE** → Returns 404
2. No Ollama node in n8n → Can't generate responses
3. Backend expects n8n to work → Will fail without active workflow

---

## ⚡ IMMEDIATE ACTION (5 minutes)

### Step 1: Activate N8N Workflow (⭐ MOST IMPORTANT)

1. **Open n8n** - http://localhost:5678 (or your cloud URL)
2. **Find your workflow** in the sidebar
3. **Look TOP RIGHT** - Find the toggle/switch
4. **Click it** - Should turn **GREEN** (currently RED/OFF)
5. See message: **"Workflow is active"**
6. **Save** - Click save button

### Step 2: Verify N8N Workflow Has Right Nodes

Your workflow **must have**:

✅ **Webhook Node** (trigger):
```
- HTTP Method: POST
- Path: [auto-generated, keep it]
```

✅ **Ollama Node** (for AI):
```
- Model: llama2 (or your model)
- Input: {{ $json.message }}
```

❓ **Don't have Ollama node?**
→ Read: [N8N_OLLAMA_WORKFLOW_SETUP.md](N8N_OLLAMA_WORKFLOW_SETUP.md)

✅ **Respond to Webhook Node** (return response):
```json
{
  "reply": "{{ $node["Ollama"].json.output }}"
}
```

### Step 3: Test It Works

```bash
node test-webhook.js
```

**Should show:**
```
✅ Response Status: 200
✅ SUCCESS! Your webhook is reachable.
```

**If still 404:**
- N8N workflow is NOT active
- Go back to Step 1
- Make sure toggle is GREEN

### Step 4: Restart Your Server

```bash
# Stop current server (Ctrl+C)
# Then:
npm run dev
```

### Step 5: Test in Browser

1. Open: http://localhost:3000
2. Send message: "Hello"
3. **Check server logs** (terminal where npm runs)
   - Should see: ✅ Calling n8n webhook...
4. **Check n8n** - Go to Executions tab
   - Should see new execution with your message
   - Click it to see details

---

## 🎯 If Everything Works

Chatbot will:
1. ✅ Show responses from Ollama
2. ✅ Have no OpenAI quota issues  
3. ✅ Process messages locally
4. ✅ Log all requests to n8n

---

## 🆘 If It Still Doesn't Work

### Problem: Webhook returns 404
```
"The workflow must be ACTIVE for a production URL"
```
**Fix:** 
- Go to n8n workflow
- Click the green toggle at **TOP RIGHT**
- Make sure it's **ON** (green)
- **Save**

### Problem: No response from chatbot
**Check:**
1. Is n8n workflow **ACTIVE**? (green toggle)
2. Does workflow have **Ollama node**?
3. Did you run: `node test-webhook.js`?
4. Did you restart server: `npm run dev`?

### Problem: Ollama node missing from n8n
**Solution:**
1. Open n8n Settings
2. Community Nodes
3. Install "Ollama"
4. Restart n8n
5. Add Ollama node to workflow

### Problem: Ollama not responding
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# List models
ollama list

# Pull a model (if needed)
ollama pull llama2
```

---

## 📖 Documentation

Read these in order:

1. **[ARCHITECTURE_REDESIGN.md](ARCHITECTURE_REDESIGN.md)** - Understand what changed
2. **[N8N_OLLAMA_WORKFLOW_SETUP.md](N8N_OLLAMA_WORKFLOW_SETUP.md)** - How to set up n8n
3. **[N8N_WEBHOOK_DEBUGGING.md](N8N_WEBHOOK_DEBUGGING.md)** - Troubleshooting

---

## ✨ What's Different Now

### Old (Broken):
```
Chatbot → Backend → OpenAI API ❌ QUOTA ERROR
```

### New (Working):
```
Chatbot → Backend (relay) → N8N → Ollama ✅ LOCAL
```

**Benefits:**
- ✅ No OpenAI quota issues
- ✅ Fast local processing
- ✅ No cost per request
- ✅ Full control of AI

---

## 💡 Pro Tips

**Monitor what's happening:**
```bash
# Terminal 1 - Run chatbot
npm run dev

# Terminal 2 - Watch test
node test-webhook.js

# Browser - n8n Executions tab
# Shows every message received
```

**Quick debug:**
```bash
# Check if server is up
curl http://localhost:3000/api/chat

# Check webhook configuration
curl http://localhost:3000/api/chat-debug
```

---

## 🎉 You're Done When

- ✅ `node test-webhook.js` returns status 200
- ✅ Chatbot sends message and gets response
- ✅ Server logs show: "Calling n8n webhook..."
- ✅ n8n Executions shows incoming requests
- ✅ Response appears in chatbot UI

---

## 📞 Need Help?

Check these files:
- **Setup issues** → [N8N_OLLAMA_WORKFLOW_SETUP.md](N8N_OLLAMA_WORKFLOW_SETUP.md)
- **Webhook issues** → [N8N_WEBHOOK_DEBUGGING.md](N8N_WEBHOOK_DEBUGGING.md)
- **Architecture questions** → [ARCHITECTURE_REDESIGN.md](ARCHITECTURE_REDESIGN.md)

---

## 🚀 You've Got This!

The system is already configured. You just need to:

1. ⬜ Activate n8n workflow (1 click)
2. ⬜ Ensure Ollama node exists (5 min setup)
3. ⬜ Run test script (1 command)
4. ⬜ Restart server (1 command)

**Total time: ~10 minutes** ⏱️

Then your chatbot will work perfectly with Ollama! 🎊
