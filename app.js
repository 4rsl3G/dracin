'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const routes = require('./routes/index');

const app = express();

const PORT = parseInt(process.env.PORT || '3000', 10);
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

if (TRUST_PROXY) app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", "https:"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "media-src": ["'self'", "https:"],
      "connect-src": ["'self'"],
      "font-src": ["'self'", "data:"],
      "frame-ancestors": ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '180', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded. Please slow down.' }
});
app.use(limiter);

app.use('/public', express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));

app.use('/', routes);

app.use((req, res) => {
  res.status(404).render('layouts/main', {
    title: '404 • PANSTREAM',
    view: 'home',
    data: {
      theaters: [],
      error: 'Halaman tidak ditemukan.'
    },
    meta: { route: '404' }
  });
});

app.use((err, req, res, next) => {
  const status = err?.status || 500;
  const msg = status === 500 ? 'Terjadi kesalahan pada server.' : (err?.message || 'Error');
  res.status(status).render('layouts/main', {
    title: `${status} • PANSTREAM`,
    view: 'home',
    data: { theaters: [], error: msg },
    meta: { route: 'error' }
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PANSTREAM listening on :${PORT} (${process.env.NODE_ENV || 'development'})`);
});
