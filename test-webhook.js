#!/usr/bin/env node

/**
 * Test the webhook connection to n8n
 * Usage: node test-webhook.js
 */

require('dotenv').config({ path: '.env.local' });

const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

console.log('\n🧪 WEBHOOK CONNECTION TEST\n');
console.log('🔍 Webhook URL:', webhookUrl || '❌ NOT SET');

if (!webhookUrl) {
  console.error('\n❌ ERROR: NEXT_PUBLIC_N8N_WEBHOOK_URL is not set in .env.local');
  console.log('\n📋 Please add to .env.local:');
  console.log('NEXT_PUBLIC_N8N_WEBHOOK_URL=https://YOUR_N8N_WEBHOOK_URL\n');
  process.exit(1);
}

// Test data
const testData = {
  event: 'chat_message',
  type: 'test',
  message: 'Test message from webhook test script',
  timestamp: new Date().toISOString(),
  source: 'webhook-test-script'
};

console.log('\n📤 Sending test data...');
console.log('Data:', JSON.stringify(testData, null, 2));

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
  .then(response => {
    console.log('\n✅ Response Status:', response.status);
    return response.text();
  })
  .then(body => {
    console.log('✅ Response Body:', body);
    console.log('\n🎉 SUCCESS! Your webhook is reachable.');
    console.log('\n📋 Next steps:');
    console.log('1. Check n8n for incoming webhook execution');
    console.log('2. Check n8n logs for the request');
    console.log('3. Make sure n8n workflow is ACTIVE\n');
  })
  .catch(error => {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Verify the webhook URL is correct');
    console.log('2. Check if n8n is running and webhook is LISTENING');
    console.log('3. Check firewall/CORS settings');
    console.log('4. Try the webhook URL in your browser\n');
  });
