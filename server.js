const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const compression = require('compression');
const fetch = require('node-fetch'); 
const https = require('https'); // PENTING: Untuk fix network VPS

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

app.use((req, res, next) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    app.set('layout', false);
  } else {
    app.set('layout', 'layouts/main');
  }
  next();
});

// --- PROXY ENGINE (VPS FIX) ---
const API_BASE = 'https://d.sapimu.au/api';

// AGENT KHUSUS: Paksa IPv4 dan abaikan error SSL ketat
const vpsAgent = new https.Agent({
    family: 4, 
    rejectUnauthorized: false,
    keepAlive: true
});

const PROXY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json', // Pastikan minta JSON
    'Referer': 'https://d.sapimu.au/',
    'Origin': 'https://d.sapimu.au'
};

async function fetchUpstream(endpoint) {
    const url = API_BASE + endpoint;
    // Log request agar terlihat di terminal
    console.log(`[REQ] -> ${url}`); 
    
    try {
        const response = await fetch(url, { 
            headers: PROXY_HEADERS, 
            agent: vpsAgent, // Gunakan agent IPv4
            timeout: 15000 
        });
        
        console.log(`[RES] <- ${response.status} : ${url}`); // Log status

        if (!response.ok) {
            return { code: response.status, data: null, message: "Upstream Error" };
        }

        const json = await response.json();
        
        // NORMALISASI: Pastikan format selalu { code: 200, data: ... }
        // Jaga-jaga jika API mengembalikan data mentah
        if (json.data) {
            return json; // Format sudah benar
        } else {
            return { code: 200, data: json }; // Bungkus data mentah
        }

    } catch (error) {
        console.error(`[ERR] ${error.message} on ${url}`);
        // Return JSON kosong biar gak hang
        return { code: 500, message: 'Server Timeout', data: { list: [] } };
    }
}

// --- ROUTES ---

app.get('/api/foryou/:page?', async (req, res) => {
    const page = req.params.page || req.query.page || 1;
    const data = await fetchUpstream(`/foryou/${page}?lang=in`);
    res.json(data);
});

app.get('/api/new/:page?', async (req, res) => {
    const page = req.params.page || req.query.page || 1;
    const data = await fetchUpstream(`/new/${page}?lang=in&pageSize=10`);
    res.json(data);
});

app.get('/api/search/:q?/:page?', async (req, res) => {
    const q = req.params.q || req.query.q;
    const page = req.params.page || req.query.page || 1;
    if(!q) return res.json({ code: 400 });
    const data = await fetchUpstream(`/search/${encodeURIComponent(q)}/${page}?lang=in`);
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
            agent: vpsAgent,
            body: JSON.stringify({ bookId, chapterIndex: parseInt(chapterIndex), lang: 'in' })
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('[PLAYER ERR]', e.message);
        res.status(500).json({ code: 500 });
    }
});

// --- PAGES ---
const pages = require('./src/routes/pages'); 
app.use('/', pages);

app.use((req, res) => {
    res.status(404).render('pages/404', { title: '404' });
});

app.listen(PORT, () => {
    console.log(`Server RUNNING on http://localhost:${PORT}`);
});
