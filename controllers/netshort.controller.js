'use strict';

const service = require('../services/netshort.service');

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeTheaters(theaters) {
  const arr = safeArray(theaters)
    .map((row) => ({
      contentType: row?.contentType,
      groupId: row?.groupId,
      contentName: row?.contentName,
      contentModel: row?.contentModel,
      contentInfos: safeArray(row?.contentInfos).filter(Boolean)
    }))
    .filter((row) => row.contentInfos.length > 0); // UI RULE: hide empty rows
  return arr;
}

async function home(req, res, next) {
  try {
    const theatersRaw = await service.fetchTheaters();
    const theaters = normalizeTheaters(theatersRaw);

    res.render('layouts/main', {
      title: 'PANSTREAM • Home',
      view: 'home',
      data: { theaters, error: null },
      meta: { route: 'home' }
    });
  } catch (e) {
    next(e);
  }
}

async function browse(req, res, next) {
  try {
    const first = await service.fetchForYou(1);
    res.render('layouts/main', {
      title: 'PANSTREAM • Browse',
      view: 'browse',
      data: {
        initial: {
          contentName: first?.contentName || 'Semua Serial',
          contentInfos: safeArray(first?.contentInfos)
        }
      },
      meta: { route: 'browse' }
    });
  } catch (e) {
    next(e);
  }
}

async function detail(req, res, next) {
  try {
    const { shortPlayId } = req.params;
    const detailData = await service.fetchAllEpisode(shortPlayId);
    if (!detailData || !detailData.shortPlayId) {
      const err = new Error('Detail tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    res.render('layouts/main', {
      title: `PANSTREAM • ${detailData.shortPlayName || 'Detail'}`,
      view: 'detail',
      data: { detail: detailData },
      meta: { route: 'detail' }
    });
  } catch (e) {
    next(e);
  }
}

async function player(req, res, next) {
  try {
    const { shortPlayId, episodeId } = req.params;
    const detailData = await service.fetchAllEpisode(shortPlayId);
    if (!detailData || !detailData.shortPlayId) {
      const err = new Error('Konten tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    const eps = safeArray(detailData.shortPlayEpisodeInfos);
    const idx = eps.findIndex((x) => String(x?.episodeId) === String(episodeId));
    if (idx < 0) {
      const err = new Error('Episode tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    const episode = eps[idx];
    const nextEp = eps[idx + 1] || null;

    res.render('layouts/main', {
      title: `PANSTREAM • Watch • Ep ${episode?.episodeNo ?? ''}`,
      view: 'player',
      data: {
        detail: detailData,
        episode,
        nextEpisode: nextEp
      },
      meta: { route: 'player' }
    });
  } catch (e) {
    next(e);
  }
}

// API proxy endpoints for smooth infinite scroll & realtime search (same origin)
async function apiForYou(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const data = await service.fetchForYou(page);
    res.status(200).json(data);
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message || 'Error' });
  }
}

async function apiSearch(req, res) {
  try {
    const q = String(req.query.query || '').trim();
    if (!q) return res.status(200).json({ searchCodeSearchResult: [] });
    const data = await service.search(q);
    res.status(200).json(data);
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message || 'Error', searchCodeSearchResult: [] });
  }
}

module.exports = {
  home,
  browse,
  detail,
  player,
  apiForYou,
  apiSearch
};
