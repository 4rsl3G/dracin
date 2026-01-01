'use strict';

const axios = require('axios');
const NodeCache = require('node-cache');

const BASE_API_URL = (process.env.BASE_API_URL || 'https://netshort.sansekai.my.id/api').replace(/\/+$/, '');

const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

const http = axios.create({
  baseURL: BASE_API_URL,
  timeout: 12000,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'PANSTREAM/1.0'
  },
  validateStatus: (s) => s >= 200 && s < 500
});

function isRateLimited(res) {
  return res && res.status === 429;
}

function normalizeError(res, fallbackMessage) {
  const status = res?.status || 500;
  const message = status === 429
    ? 'Rate limit API. Coba lagi sebentar.'
    : (fallbackMessage || 'Gagal memuat data.');
  const err = new Error(message);
  err.status = status;
  err.payload = res?.data;
  return err;
}

async function getWithCache(key, ttlSec, fn) {
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await fn();
  cache.set(key, data, ttlSec);
  return data;
}

async function fetchTheaters() {
  return getWithCache('theaters', 300, async () => {
    const res = await http.get('/netshort/theaters');
    if (res.status !== 200) throw normalizeError(res, 'Gagal memuat theaters.');
    return Array.isArray(res.data) ? res.data : [];
  });
}

async function fetchForYou(page) {
  const p = Number(page || 1);
  const key = `foryou:${p}`;
  return getWithCache(key, 300, async () => {
    const res = await http.get('/netshort/foryou', { params: { page: p } });
    if (res.status !== 200) throw normalizeError(res, 'Gagal memuat For You.');
    return res.data && typeof res.data === 'object' ? res.data : { contentName: '', contentInfos: [] };
  });
}

async function fetchAllEpisode(shortPlayId) {
  const id = String(shortPlayId);
  const key = `detail:${id}`;
  return getWithCache(key, 300, async () => {
    const res = await http.get('/netshort/allepisode', { params: { shortPlayId: id } });
    if (res.status !== 200) throw normalizeError(res, 'Gagal memuat detail & episode.');
    return res.data && typeof res.data === 'object' ? res.data : null;
  });
}

async function search(query) {
  const q = String(query || '').trim();
  const res = await http.get('/netshort/search', { params: { query: q } });
  if (isRateLimited(res)) throw normalizeError(res, 'Rate limit API search.');
  if (res.status !== 200) throw normalizeError(res, 'Gagal search.');
  return res.data && typeof res.data === 'object' ? res.data : { searchCodeSearchResult: [] };
}

module.exports = {
  fetchTheaters,
  fetchForYou,
  fetchAllEpisode,
  search
};
