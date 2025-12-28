const axios = require('axios');

const BASE_URL = 'https://sm.sapimu.au/api/v1';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 5000 // 5 seconds
});

// Retry logic interceptor (1x retry)
client.interceptors.response.use(null, async (error) => {
    const { config, message } = error;
    if (!config || !config.retry) {
        config.retry = true;
        return client(config);
    }
    return Promise.reject(error);
});

module.exports = {
    getLanguages: async () => {
        try {
            const res = await client.get('/languages');
            return res.data.data || [];
        } catch (e) { return []; }
    },
    getHome: async (lang) => {
        try {
            const res = await client.get(`/home?lang=${lang}`);
            return res.data.data || [];
        } catch (e) { return []; }
    },
    search: async (q, lang) => {
        try {
            const res = await client.get(`/search?q=${q}&lang=${lang}`);
            return res.data.data || [];
        } catch (e) { return []; }
    },
    getEpisodes: async (code, lang) => {
        try {
            const res = await client.get(`/episodes/${code}?lang=${lang}`);
            return res.data.data || [];
        } catch (e) { return []; }
    },
    getPlay: async (code, ep, lang) => {
        try {
            const res = await client.get(`/play/${code}?lang=${lang}&ep=${ep}`);
            return res.data.data || null;
        } catch (e) { return null; }
    }
};
