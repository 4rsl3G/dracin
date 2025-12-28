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

app.use(compression());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.static(path.join(__dirname, 'src/public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    app.set('layout', false);
  } else {
    app.set('layout', 'layouts/main');
  }
  next();
});

app.use('/api', apiProxy);
app.use('/', pages);

app.use((req, res) => {
  res.status(404).render('pages/404', { title: '404 - Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
