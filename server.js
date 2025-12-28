const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const compression = require('compression');
const fetch = require('node-fetch'); // Wajib install: npm i node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIG
// ==========================================
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine
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

// ==========================================
// API PROXY (Solusi Anti CORS & Rate Limit)
// ==========================================
const API_BASE = 'https://d.sapimu.au/api';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json'
};

// Helper Fetch
const getApi = async (endpoint) => {
    try {
        const res = await fetch(API_BASE + endpoint, { headers: HEADERS, timeout: 10000 });
        if(!res.ok) return { code: res.status, data: null };
        return await res.json();
    } catch (e) {
        console.error('[PROXY ERROR]', endpoint, e.message);
        return { code: 500, message: 'Server Connection Error' };
    }
};

// 1. Home / For You
app.get('/api/foryou', async (req, res) => {
    const data = await getApi('/foryou/' + (req.query.page || 1) + '?lang=in');
    res.json(data);
});

// 2. New Arrivals
app.get('/api/new', async (req, res) => {
    const data = await getApi(`/new/${req.query.page || 1}?lang=in&pageSize=10`);
    res.json(data);
});

// 3. Search
app.get('/api/search', async (req, res) => {
    const q = encodeURIComponent(req.query.q);
    const data = await getApi(`/search/${q}/${req.query.page || 1}?lang=in`);
    res.json(data);
});

// 4. Categories
app.get('/api/categories', async (req, res) => {
    const data = await getApi('/categories?lang=in');
    res.json(data);
});

// 5. Classify / Genre Detail
app.get('/api/classify', async (req, res) => {
    const { genre, pageNo = 1 } = req.query;
    const data = await getApi(`/classify?lang=in&pageNo=${pageNo}&genre=${genre}&sort=1`);
    res.json(data);
});

// 6. Book Detail
app.get('/api/book/:bookId/detail', async (req, res) => {
    const data = await getApi(`/chapters/detail/${req.params.bookId}?lang=in`);
    res.json(data);
});

// 7. Chapters List
app.get('/api/book/:bookId/chapters', async (req, res) => {
    const data = await getApi(`/chapters/${req.params.bookId}?lang=in`);
    res.json(data);
});

// 8. Player (POST)
app.post('/api/player', async (req, res) => {
    try {
        const { bookId, chapterIndex } = req.body;
        const response = await fetch(`${API_BASE}/watch/player?lang=in`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ bookId, chapterIndex: parseInt(chapterIndex), lang: 'in' })
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ code: 500 });
    }
});

// ==========================================
// PAGE ROUTES
// ==========================================
const pages = require('./src/routes/pages'); // File route halaman lama tetap dipakai
app.use('/', pages);

// 404
app.use((req, res) => {
    res.status(404).render('pages/404', { title: '404 - Not Found' });
});

app.listen(PORT, () => {
    console.log(`Server stabil berjalan di http://localhost:${PORT}`);
});
