// Test script for Wacto RAG functionality
import { wactoRAG } from './src/lib/wacto-rag';

async function testRAG() {
  console.log('Testing Wacto RAG functionality...\n');

  // Test questions
  const testQuestions = [
    "What services does Wacto offer?",
    "Tell me about WhatsApp API pricing",
    "How do I integrate WhatsApp Business API?",
    "What are Wacto's features?",
    "This is not a Wacto question"
  ];

  for (const question of testQuestions) {
    console.log(`Question: "${question}"`);
    console.log(`Is Wacto-related: ${wactoRAG.isWactoRelatedQuestion(question)}`);

    if (wactoRAG.isWactoRelatedQuestion(question)) {
      console.log('Getting RAG response...');
      const response = await wactoRAG.queryWactoInfo(question);
      console.log(`Response: ${response}\n`);
    } else {
      console.log('Not Wacto-related, skipping RAG\n');
    }
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRAG().catch(console.error);
}

export { testRAG };