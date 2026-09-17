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

  // Check for Gemini API key
  const geminiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
  let geminiKey = geminiKeyMatch ? geminiKeyMatch[1].trim() : '';

  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    console.log('✅ Gemini API key is already configured');
  } else {
    console.log('\n🔑 Google Gemini API Key Required');
    console.log('Get your API key from: https://aistudio.google.com/app/apikey');
    console.log('This is used for Wacto RAG responses and chatbot functionality.\n');

    geminiKey = await askQuestion('Enter your Gemini API key: ');

    if (!geminiKey || geminiKey.trim() === '') {
      console.log('❌ Gemini API key is required for chatbot functionality');
      rl.close();
      return;
    }

    // Update env content
    if (envContent.includes('GEMINI_API_KEY=')) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${geminiKey.trim()}`);
    } else {
      envContent += `\nGEMINI_API_KEY=${geminiKey.trim()}`;
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