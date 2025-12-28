const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const compression = require('compression');
const fetch = require('node-fetch'); // Pastikan sudah npm install node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

// Config Dasar
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.use(express.static(path.join(__dirname, 'src/public')));

// Middleware Layout (Agar AJAX tidak muat ulang header/footer)
app.use((req, res, next) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    app.set('layout', false);
  } else {
    app.set('layout', 'layouts/main');
  }
  next();
});

// ==========================================
// API PROXY (Backend Fetcher)
// ==========================================
const API_BASE = 'https://d.sapimu.au/api';
// Headers ini PENTING agar server kita tidak dikira BOT jahat
const PROXY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Referer': 'https://d.sapimu.au/'
};

// Fungsi bantu fetch data
async function fetchUpstream(endpoint) {
    try {
        const url = API_BASE + endpoint;
        console.log(`[PROXY] Fetching: ${url}`); // Cek log di terminal VPS
        const response = await fetch(url, { headers: PROXY_HEADERS, timeout: 15000 });
        
        if (!response.ok) {
            console.error(`[PROXY FAIL] ${response.status} ${response.statusText}`);
            return { code: response.status, data: null };
        }
        return await response.json();
    } catch (error) {
        console.error(`[PROXY ERROR] ${error.message}`);
        return { code: 500, message: 'Server Internal Error' };
    }
}

// 1. Home Routes
app.get('/api/foryou', async (req, res) => {
    const page = req.query.page || 1;
    const data = await fetchUpstream(`/foryou/${page}?lang=in`);
    res.json(data);
});

app.get('/api/new', async (req, res) => {
    const page = req.query.page || 1;
    const data = await fetchUpstream(`/new/${page}?lang=in&pageSize=10`);
    res.json(data);
});

// 2. Search & Category
app.get('/api/search', async (req, res) => {
    const q = encodeURIComponent(req.query.q);
    const page = req.query.page || 1;
    const data = await fetchUpstream(`/search/${q}/${page}?lang=in`);
    res.json(data);
});

app.get('/api/categories', async (req, res) => {
    const data = await fetchUpstream('/categories?lang=in');
    res.json(data);
});

app.get('/api/classify', async (req, res) => {
    const { genre, pageNo = 1 } = req.query;
    const data = await fetchUpstream(`/classify?lang=in&pageNo=${pageNo}&genre=${genre}&sort=1`);
    res.json(data);
});

// 3. Detail & Player
app.get('/api/book/:bookId/detail', async (req, res) => {
    const data = await fetchUpstream(`/chapters/detail/${req.params.bookId}?lang=in`);
    res.json(data);
});

app.get('/api/book/:bookId/chapters', async (req, res) => {
    const data = await fetchUpstream(`/chapters/${req.params.bookId}?lang=in`);
    res.json(data);
});

app.post('/api/player', async (req, res) => {
    try {
        const { bookId, chapterIndex } = req.body;
        const response = await fetch(`${API_BASE}/watch/player?lang=in`, {
            method: 'POST',
            headers: PROXY_HEADERS,
            body: JSON.stringify({ bookId, chapterIndex: parseInt(chapterIndex), lang: 'in' })
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('[PLAYER ERROR]', e);
        res.status(500).json({ code: 500 });
    }
});

// ==========================================
// PAGE ROUTES (Render HTML)
// ==========================================
// Pastikan file src/routes/pages.js Anda masih ada
const pages = require('./src/routes/pages'); 
app.use('/', pages);

// 404 Handler
app.use((req, res) => {
    res.status(404).render('pages/404', { title: '404 - Not Found' });
});

app.listen(PORT, () => {
    console.log(`Server CLEAN running on http://localhost:${PORT}`);
});
