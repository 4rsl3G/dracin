const fetch = require('node-fetch');

const BASE_URL = 'https://d.sapimu.au/api';
const CACHE = new Map();
const DEFAULT_HEADERS = {
  'User-Agent': 'PansaDrama/1.0',
  'Content-Type': 'application/json'
};

const getTTL = (endpoint) => {
  if (endpoint.includes('watch/player')) return 0;
  if (endpoint.includes('detail') || endpoint.includes('chapters')) return 60 * 1000;
  return 120 * 1000;
};

const cleanCache = () => {
  const now = Date.now();
  for (const [key, value] of CACHE.entries()) {
    if (now > value.expiry) CACHE.delete(key);
  }
};
setInterval(cleanCache, 60000);

const apiClient = {
  get: async (endpoint, params = {}) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('lang', 'in');
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const cacheKey = url.toString();
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      const response = await fetch(url.toString(), { 
        method: 'GET', 
        headers: DEFAULT_HEADERS,
        timeout: 10000 
      });
      
      if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
      
      const data = await response.json();
      
      const ttl = getTTL(endpoint);
      if (ttl > 0) {
        CACHE.set(cacheKey, { data, expiry: Date.now() + ttl });
      }
      
      return data;
    } catch (error) {
      console.error(`Fetch Error [GET] ${endpoint}:`, error.message);
      return null;
    }
  },

  post: async (endpoint, body = {}) => {
    const url = `${BASE_URL}${endpoint}?lang=in`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(body),
        timeout: 10000
      });

      if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Fetch Error [POST] ${endpoint}:`, error.message);
      return null;
    }
  }
};

module.exports = apiClient;
