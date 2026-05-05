#!/usr/bin/env node

// Setup script for Wacto ChatBot RAG functionality
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setup() {
  console.log('🚀 Wacto ChatBot Setup');
  console.log('==========================\n');

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ Found existing .env.local file');
  } else {
    console.log('📝 Creating new .env.local file');
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
    }
  }

  // Check for OpenAI API key
  const openaiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
  let openaiKey = openaiKeyMatch ? openaiKeyMatch[1].trim() : '';

  if (openaiKey && openaiKey !== 'your_openai_api_key_here' && !openaiKey.startsWith('sk-proj-B8Tdm3Z0GtwHX')) {
    console.log('✅ OpenAI API key is already configured');
  } else {
    console.log('\n🔑 OpenAI API Key Required');
    console.log('Get your API key from: https://platform.openai.com/api-keys');
    console.log('This is used for both Wacto RAG responses and general chat functionality.\n');

    openaiKey = await askQuestion('Enter your OpenAI API key: ');

    if (!openaiKey || openaiKey.trim() === '') {
      console.log('❌ OpenAI API key is required for chatbot functionality');
      rl.close();
      return;
    }

    // Update env content
    if (envContent.includes('OPENAI_API_KEY=')) {
      envContent = envContent.replace(/OPENAI_API_KEY=.*/, `OPENAI_API_KEY=${openaiKey.trim()}`);
    } else {
      envContent += `\nOPENAI_API_KEY=${openaiKey.trim()}`;
    }
  }

  // Write .env.local file
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment variables saved to .env.local');

  console.log('\n🎉 Setup Complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Open: http://localhost:3000');
  console.log('3. Ask questions about Wacto and WhatsApp API!');
  console.log('4. The chatbot will handle both Wacto-specific and general questions directly.');

  rl.close();
}

setup().catch(console.error);