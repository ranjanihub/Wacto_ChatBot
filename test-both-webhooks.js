const n8nURL = "https://ranjani123.app.n8n.cloud/webhook-test/bba8872a-485b-49be-b4a2-d8d5159f1abe";
const portholeURL = "https://porthole-seismic-nuclei.ngrok-free.dev/webhook/6f14947d-bb0c-442d-b8ac-8a025029904b";
const productionN8nURL = "https://ranjani123.app.n8n.cloud/webhook/bba8872a-485b-49be-b4a2-d8d5159f1abe"; // guess at production

const testData = {
  event: 'chat_message',
  type: 'test',
  message: 'Test from both webhooks',
  timestamp: new Date().toISOString()
};

async function testWebhook(name, url) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`URL: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    console.log(`✅ Status: ${response.status}`);
    const body = await response.text();
    if (body) console.log(`Response: ${body.substring(0, 200)}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

(async () => {
  console.log('🔧 Testing Multiple Webhook Endpoints\n');
  await testWebhook('Porthole', portholeURL);
  await testWebhook('n8n (Test Mode)', n8nURL);
  await testWebhook('n8n (Production - Guess)', productionN8nURL);
})();
