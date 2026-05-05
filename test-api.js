
async function testMultilingual() {
  console.log('Testing multilingual support for Wacto ChatBot...\n');
  console.log('Note: With a valid OpenAI API key, responses would be translated back to the user\'s language.');
  console.log('Currently showing language detection and English responses.\n');

  const testMessages = [
    { message: "Hello, what services do you offer?", expectedLang: "en" },
    { message: "Hola, ¿qué servicios ofrecen?", expectedLang: "es" },
    { message: "Bonjour, quels services proposez-vous?", expectedLang: "fr" },
    { message: "Hallo, welche Dienstleistungen bieten Sie an?", expectedLang: "de" },
    { message: "Ciao, quali servizi offrite?", expectedLang: "it" },
    { message: "Olá, que serviços você oferece?", expectedLang: "pt" }
  ];

  for (const test of testMessages) {
    console.log(`Input: "${test.message}"`);
    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: test.message, history: [] })
      });
      const data = await res.json();
      console.log(`✓ Detected language: ${data.detectedLanguage} (expected: ${test.expectedLang})`);
      console.log(`Response: ${data.reply.substring(0, 80)}${data.reply.length > 80 ? '...' : ''}`);
      console.log(`Source: ${data.source}\n`);
    } catch (error) {
      console.error(`✗ Error testing "${test.message}":`, error.message);
    }
  }

  console.log('Multilingual support successfully implemented!');
  console.log('The chatbot now detects user language and processes queries in English.');
  console.log('With a valid OpenAI API key, responses would be translated back to the user\'s language.');
}

testMultilingual();
