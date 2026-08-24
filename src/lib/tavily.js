import axios from 'axios';

export async function searchTavily(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  const response = await axios.get('https://api.tavily.com/search', {
    params: {
      q: query,
      apiKey: apiKey,
    },
  });

  return response.data.results;
}