const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/home', { title: 'PansaDrama - Home' });
});

router.get('/search', (req, res) => {
  res.render('pages/search', { title: 'Search - PansaDrama' });
});

router.get('/categories', (req, res) => {
  res.render('pages/categories', { title: 'Categories - PansaDrama' });
});

router.get('/history', (req, res) => {
  res.render('pages/history', { title: 'History - PansaDrama' });
});

router.get('/watch/:bookId', (req, res) => {
  res.render('pages/detail', { 
    title: 'Watch - PansaDrama',
    bookId: req.params.bookId 
  });
});

module.exports = router;
