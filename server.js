const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const apiProxy = require('./src/routes/apiProxy');
const pages = require('./src/routes/pages');

const app = express();
const PORT = process.env.PORT || 3000;

// FIX: Trust Proxy setting (WAJIB ADA untuk express-rate-limit di belakang proxy)
// Angka 1 berarti percaya pada 1 hop reverse proxy (misal Nginx/Load Balancer)
app.set('trust proxy', 1);

app.use(compression());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 100, // limit setiap IP ke 100 request per windowMs
  standardHeaders: true, // Return rate limit info di `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Handler opsional jika limit tercapai (biar tidak crash client)
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      message: 'Too many requests, please try again later.'
    });
  }
});

// Apply rate limiter ke semua request
app.use(limiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.static(path.join(__dirname, 'src/public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware untuk handle Layout EJS vs AJAX
app.use((req, res, next) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    app.set('layout', false);
  } else {
    app.set('layout', 'layouts/main');
  }
  next();
});

// Routes
app.use('/api', apiProxy);
app.use('/', pages);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('pages/404', { title: '404 - Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
