const express = require('express');
const axios = require('axios');
const layouts = require('express-ejs-layouts');

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(layouts);
app.set('layout', 'layout');

const API = 'https://netshort.sansekai.my.id';

/* HOME */
app.get('/', async (req, res) => {
  const search = await axios.post(`${API}/search`, {
    language: 'id_ID',
    searchCode: ['ceo']
  });

  res.render('home', {
    title: 'Streaming Drama Pendek Terbaru',
    desc: 'Nonton drama pendek vertikal eksklusif, update setiap hari',
    dramas: search.data.searchCodeSearchResult
  });
});

/* DETAIL */
app.get('/detail/:id', (req, res) => {
  res.render('detail', {
    title: 'Nonton Drama Episode Lengkap',
    desc: 'Streaming drama pendek kualitas HD',
    id: req.params.id
  });
});

/* API DETAIL */
app.get('/api/detail/:id', async (req, res) => {
  const data = await axios.get(`${API}/shortPlay/detail?shortPlayId=${req.params.id}`);
  res.json(data.data);
});

app.listen(3000, () => console.log('🔥 Server jalan http://localhost:3000'));
