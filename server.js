const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

const pages = require('./src/routes/pages');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Optimization
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false, // Penting agar script eksternal/gambar jalan
  crossOriginEmbedderPolicy: false,
}));

// Setup View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Setup Layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static Files
app.use(express.static(path.join(__dirname, 'src/public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware Layout untuk AJAX
app.use((req, res, next) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    app.set('layout', false);
  } else {
    app.set('layout', 'layouts/main');
  }
  next();
});

// Routes (Hanya Halaman, TANPA /api)
app.use('/', pages);

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: '404 - Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
