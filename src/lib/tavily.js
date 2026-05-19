// This script integrates Tavily web search as a fallback mechanism when no relevant content is found in the knowledge base.

const axios = require('axios');

async function searchTavily(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  const response = await axios.get('https://api.tavily.com/search', {
    params: {
      q: query,
      apiKey: apiKey,
    },
  });

  return response.data.results;
}

module.exports = { searchTavily };