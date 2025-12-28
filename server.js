const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const compression = require('compression');
const fetch = require('node-fetch'); // Wajib: npm install node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIG ---
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.use(express.static(path.join(__dirname, 'src/public')));

// Middleware Layout AJAX
app.use((req, res, next) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    app.set('layout', false);
  } else {
    app.set('layout', 'layouts/main');
  }
  next();
});

// --- PROXY HELPER ---
const API_BASE = 'https://d.sapimu.au/api';
// Header Penyamaran (PENTING)
const PROXY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Referer': 'https://d.sapimu.au/'
};

async function fetchUpstream(endpoint) {
    try {
        const url = API_BASE + endpoint;
        console.log(`[PROXY] Fetching: ${url}`); // Cek terminal untuk debug
        
        const response = await fetch(url, { headers: PROXY_HEADERS, timeout: 15000 });
        
        if (!response.ok) {
            console.error(`[PROXY FAIL] ${response.status} on ${url}`);
            // Tetap return JSON error agar frontend tidak hang
            return { code: response.status, data: null, msg: "Upstream Error" };
        }
        return await response.json();
    } catch (error) {
        console.error(`[PROXY ERROR] ${error.message}`);
        return { code: 500, message: 'Internal Server Error' };
    }
}

// --- API ROUTES (SINKRON DENGAN FRONTEND) ---

// 1. FOR YOU
// Frontend panggil: /api/foryou (tanpa page) atau /api/foryou/1
app.get('/api/foryou/:page?', async (req, res) => {
    // Default page 1 jika tidak ada params
    const page = req.params.page || req.query.page || 1;
    const data = await fetchUpstream(`/foryou/${page}?lang=in`);
    res.json(data);
});

// 2. NEW ARRIVALS
app.get('/api/new/:page?', async (req, res) => {
    const page = req.params.page || req.query.page || 1;
    const data = await fetchUpstream(`/new/${page}?lang=in&pageSize=10`);
    res.json(data);
});

// 3. SEARCH
app.get('/api/search/:q?/:page?', async (req, res) => {
    const q = req.params.q || req.query.q;
    const page = req.params.page || req.query.page || 1;
    
    if(!q) return res.json({ code: 400, message: "Butuh keyword" });

    const data = await fetchUpstream(`/search/${encodeURIComponent(q)}/${page}?lang=in`);
    res.json(data);
});

// 4. CATEGORIES
app.get('/api/categories', async (req, res) => {
    const data = await fetchUpstream('/categories?lang=in');
    res.json(data);
});

// 5. CLASSIFY / GENRE
app.get('/api/classify', async (req, res) => {
    const { genre, pageNo = 1 } = req.query;
    const data = await fetchUpstream(`/classify?lang=in&pageNo=${pageNo}&genre=${genre}&sort=1`);
    res.json(data);
});

// 6. DETAIL & CHAPTERS
app.get('/api/book/:bookId/detail', async (req, res) => {
    const data = await fetchUpstream(`/chapters/detail/${req.params.bookId}?lang=in`);
    res.json(data);
});

app.get('/api/book/:bookId/chapters', async (req, res) => {
    const data = await fetchUpstream(`/chapters/${req.params.bookId}?lang=in`);
    res.json(data);
});

// 7. PLAYER (POST)
app.post('/api/player', async (req, res) => {
    try {
        const { bookId, chapterIndex } = req.body;
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
        res.status(500).json({ code: 500 });
    }
});

// --- PAGE ROUTES ---
const pages = require('./src/routes/pages'); 
app.use('/', pages);

app.use((req, res) => {
    res.status(404).render('pages/404', { title: '404' });
});

app.listen(PORT, () => {
    console.log(`Server JALAN di http://localhost:${PORT}`);
});
