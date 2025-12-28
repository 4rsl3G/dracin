const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts'); // Import Lib
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup View Engine & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Konfigurasi EJS Layouts
app.use(expressLayouts);
app.set('layout', 'layout'); // Mengarah ke src/views/layout.ejs
app.set('layout extractScripts', true); // Ekstrak script dari page ke bawah layout
app.set('layout extractStyles', true);  // Ekstrak style dari page ke head layout

// Middleware Standard
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Middleware
app.use((req, res, next) => {
    res.locals.lang = req.query.lang || req.cookies.lang || 'en';
    res.locals.currentUrl = req.originalUrl.split('?')[0];
    next();
});

// Routes
app.use('/', routes);

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/home', { 
        title: 'Error', 
        shows: [], 
        languages: [], 
        error: 'Terjadi kesalahan pada server.' 
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
