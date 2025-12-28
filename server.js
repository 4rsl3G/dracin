const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const compression = require('compression');
const fetch = require('node-fetch'); // Pastikan pakai node-fetch v2

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. CONFIGURATION
// ==========================================
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static Files
app.use(express.static(path.join(__dirname, 'src/public')));

// Middleware: Handle Layout for AJAX/SPA
app.use((req, res, next) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    app.set('layout', false);
  } else {
    app.set('layout', 'layouts/main');
  }
  next();
});

// ==========================================
// 2. PROXY HELPER
// ==========================================
const API_BASE = 'https://d.sapimu.au/api';
// Header ini PENTING agar request dianggap dari Browser, bukan Bot
const PROXY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Referer': 'https://d.sapimu.au/'
};

async function fetchUpstream(endpoint) {
    try {
        const url = API_BASE + endpoint;
        console.log(`[PROXY] Fetching: ${url}`); 
        
        const response = await fetch(url, { 
            headers: PROXY_HEADERS, 
            timeout: 15000 
        });
        
        if (!response.ok) {
            console.error(`[PROXY FAIL] ${response.status} on ${url}`);
            return { code: response.status, data: null };
        }
        return await response.json();
    } catch (error) {
        console.error(`[PROXY ERROR] ${error.message}`);
        return { code: 500, message: 'Upstream Connection Error' };
    }
}

// ==========================================
// 3. API ROUTES (FLEXIBLE PATHS)
// ==========================================

// 1. FOR YOU
// Support: /api/foryou (Page 1) DAN /api/foryou/2 (Page 2)
app.get('/api/foryou/:page?', async (req, res) => {
    const page = req.params.page || req.query.page || 1;
    const data = await fetchUpstream(`/foryou/${page}?lang=in`);
    res.json(data);
});

// 2. NEW ARRIVALS
// Support: /api/new (Page 1) DAN /api/new/2 (Page 2)
app.get('/api/new/:page?', async (req, res) => {
    const page = req.params.page || req.query.page || 1;
    const data = await fetchUpstream(`/new/${page}?lang=in&pageSize=10`);
    res.json(data);
});

// 3. SEARCH
// Support: /api/search/keyword/1
app.get('/api/search/:q?/:page?', async (req, res) => {
    const q = req.params.q || req.query.q;
    const page = req.params.page || req.query.page || 1;

    if(!q) return res.json({ code: 400, message: "Keyword is required" });

    const encodedQ = encodeURIComponent(q);
    const data = await fetchUpstream(`/search/${encodedQ}/${page}?lang=in`);
    res.json(data);
});

// 4. CATEGORIES
app.get('/api/categories', async (req, res) => {
    const data = await fetchUpstream('/categories?lang=in');
    res.json(data);
});

// 5. CLASSIFY / GENRE DETAIL
app.get('/api/classify', async (req, res) => {
    const { genre, pageNo = 1 } = req.query;
    const data = await fetchUpstream(`/classify?lang=in&pageNo=${pageNo}&genre=${genre}&sort=1`);
    res.json(data);
});

// 6. BOOK DETAIL
app.get('/api/book/:bookId/detail', async (req, res) => {
    const data = await fetchUpstream(`/chapters/detail/${req.params.bookId}?lang=in`);
    res.json(data);
});

// 7. CHAPTERS
app.get('/api/book/:bookId/chapters', async (req, res) => {
    const data = await fetchUpstream(`/chapters/${req.params.bookId}?lang=in`);
    res.json(data);
});

// 8. PLAYER (POST)
app.post('/api/player', async (req, res) => {
    try {
        const { bookId, chapterIndex } = req.body;
        // Khusus POST, kita fetch manual agar bisa kirim body
        const response = await fetch(`${API_BASE}/watch/player?lang=in`, {
            method: 'POST',
            headers: PROXY_HEADERS,
            body: JSON.stringify({ 
                bookId, 
                chapterIndex: parseInt(chapterIndex), 
                lang: 'in' 
            })
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('[PLAYER ERROR]', e.message);
        res.status(500).json({ code: 500 });
    }
});

// ==========================================
// 4. PAGE ROUTES
// ==========================================
const pages = require('./src/routes/pages'); 
app.use('/', pages);

// 404 Handler
app.use((req, res) => {
    res.status(404).render('pages/404', { title: '404 - Not Found' });
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Test API: http://localhost:${PORT}/api/foryou/1`);
});
