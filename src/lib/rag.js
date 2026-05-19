import OpenAI from 'openai';
import weaviate from 'weaviate-client';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Weaviate client with error handling
let client;
try {
  client = weaviate.client({
    scheme: 'http',
    host: 'localhost:8080', // Replace with your Weaviate instance URL
  });
  console.log('Weaviate client initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Weaviate client:', error.message);
}

// Load indexed data
let indexedData = [];
try {
  if (fs.existsSync('./data/indexedData.json')) {
    indexedData = JSON.parse(fs.readFileSync('./data/indexedData.json', 'utf-8'));
  }
} catch (error) {
  console.error('Error loading indexed data:', error);
}

// Add embeddings to Weaviate
export async function addEmbeddings() {
  if (!client) {
    console.error('Weaviate client is not initialized. Cannot add embeddings.');
    return;
  }

  for (const item of indexedData) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: item.content,
    });

    await client.data.creator()
      .withClassName('Document')
      .withProperties({
        content: item.content,
      })
      .withVector(embedding.data[0].embedding)
      .do();
  }
}

// RAG pipeline
export async function getAnswer(query) {
  if (!client) {
    console.error('Weaviate client is not initialized. Cannot retrieve answers.');
    return 'Error: Weaviate client not initialized.';
  }

  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const result = await client.graphql.get()
    .withClassName('Document')
    .withFields('content')
    .withNearVector({ vector: queryEmbedding.data[0].embedding })
    .withLimit(1)
    .do();

  const relevantContent = result.data.Get.Document[0]?.content || '';

  const response = await openai.completions.create({
    model: 'gpt-4',
    prompt: `Answer the question based on the following content: ${relevantContent}\n\nQuestion: ${query}`,
    max_tokens: 150,
  });

  return response.choices[0].text;
}

// Test Weaviate connection
async function testWeaviateConnection() {
  if (!client) {
    console.error('Weaviate client is not initialized. Cannot test connection.');
    return;
  }

  try {
    const result = await client.misc.pingGetter().do();
    console.log('Weaviate connection successful:', result);
  } catch (error) {
    console.error('Weaviate connection failed:', error.message);
  }
}

// Call the test function
(async () => {
  await testWeaviateConnection();
})();
