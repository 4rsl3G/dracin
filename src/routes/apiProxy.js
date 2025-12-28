const express = require('express');
const router = express.Router();
const client = require('../services/apiClient');

router.get('/foryou', async (req, res) => {
  const data = await client.get('/foryou/' + (req.query.page || 1));
  res.json(data || {});
});

router.get('/new', async (req, res) => {
  const data = await client.get('/new/' + (req.query.page || 1), { pageSize: 10 });
  res.json(data || {});
});

router.get('/rank', async (req, res) => {
  const data = await client.get('/rank/' + (req.query.page || 1));
  res.json(data || {});
});

router.get('/categories', async (req, res) => {
  const data = await client.get('/categories');
  res.json(data || {});
});

router.get('/classify', async (req, res) => {
  const { pageNo = 1, genre = 1357 } = req.query;
  const data = await client.get('/classify', { pageNo, genre, sort: 1 });
  res.json(data || {});
});

router.get('/search', async (req, res) => {
  const { q, page = 1 } = req.query;
  const data = await client.get(`/search/${encodeURIComponent(q)}/${page}`);
  res.json(data || {});
});

router.get('/suggest', async (req, res) => {
  const data = await client.get(`/suggest/${encodeURIComponent(req.query.q)}`);
  res.json(data || {});
});

router.get('/book/:bookId/detail', async (req, res) => {
  const data = await client.get(`/chapters/detail/${req.params.bookId}`);
  res.json(data || {});
});

router.get('/book/:bookId/chapters', async (req, res) => {
  const data = await client.get(`/chapters/${req.params.bookId}`);
  res.json(data || {});
});

router.post('/player', async (req, res) => {
  const { bookId, chapterIndex } = req.body;
  const data = await client.post('/watch/player', { 
    bookId, 
    chapterIndex: parseInt(chapterIndex), 
    lang: 'in' 
  });
  res.json(data || {});
});

module.exports = router;
