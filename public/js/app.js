'use strict';

(function () {
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));

  // ---------- Global Store (WAJIB) ----------
  const store = (function createStore() {
    let state = {
      loading: false,
      error: null,
      currentEpisode: null,
      videoProgress: {},
      searchResult: []
    };
    const subs = new Set();
    return {
      getState: () => state,
      setState: (patch) => {
        state = Object.freeze({ ...state, ...patch });
        subs.forEach(fn => fn(state));
      },
      subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); }
    };
  })();

  window.PSStore = store;

  // ---------- Toast ----------
  const toastEl = $('#psToast');
  let toastT = null;
  function toast(msg, kind = 'info') {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = `ps-toast is-show is-${kind}`;
    clearTimeout(toastT);
    toastT = setTimeout(() => {
      toastEl.className = 'ps-toast';
      toastEl.textContent = '';
    }, 2400);
  }

  // ---------- Navbar scroll ----------
  const nav = $('#psNav');
  function onScrollNav() {
    if (!nav) return;
    const y = window.scrollY || 0;
    nav.classList.toggle('is-solid', y > 24);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  // ---------- Card cover fallback & lazy-ish ----------
  const fallback = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#1b1b1b"/>
          <stop offset="1" stop-color="#0b0b0b"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#g)"/>
      <text x="50%" y="50%" fill="#ffffff" opacity="0.22" font-family="system-ui,Segoe UI,Arial" font-size="54" text-anchor="middle">
        PANSTREAM
      </text>
    </svg>
  `)}`;

  function applyCovers() {
    $$('.ps-card-poster, .ps-detail-hero').forEach(el => {
      const url = el.getAttribute('data-cover');
      if (url && url !== 'null') {
        el.style.backgroundImage = `url("${url}")`;
      } else {
        el.style.backgroundImage = `url("${fallback}")`;
      }
    });
  }
  applyCovers();

  // ---------- Home: horizontal row controls ----------
  function bindRowScrollButtons() {
    $$('.ps-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rid = btn.getAttribute('data-row');
        const dir = Number(btn.getAttribute('data-dir') || 1);
        const rail = document.getElementById(`row_${rid}`);
        if (!rail) return;
        const amount = Math.max(rail.clientWidth * 0.9, 320);
        rail.scrollBy({ left: amount * dir, behavior: 'smooth' });
      });
    });
  }
  bindRowScrollButtons();

  // ---------- Debounce ----------
  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ---------- Fetch helper with 429 handling ----------
  async function psFetchJson(url, opts = {}) {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      ...opts
    });

    if (res.status === 429) {
      toast('Terlalu banyak request. Tenang…', 'warn');
      const err = new Error('Rate limited');
      err.status = 429;
      throw err;
    }
    if (!res.ok) {
      const err = new Error('Request failed');
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // ---------- Realtime Search (400ms) ----------
  const overlay = $('#psSearchOverlay');
  const openSearch = $('#psOpenSearch');
  const closeScrim = $('#psCloseSearch');
  const closeBtn = $('#psCloseSearchBtn');
  const input = $('#psSearchInput');
  const resultsEl = $('#psSearchResults');
  const emptyEl = $('#psSearchEmpty');

  function setOverlay(open) {
    if (!overlay) return;
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('ps-no-scroll', open);
    if (open) setTimeout(() => input && input.focus(), 50);
  }

  if (openSearch) openSearch.addEventListener('click', () => setOverlay(true));
  if (closeScrim) closeScrim.addEventListener('click', () => setOverlay(false));
  if (closeBtn) closeBtn.addEventListener('click', () => setOverlay(false));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) setOverlay(false);
  });

  function renderSearch(list) {
    if (!resultsEl || !emptyEl) return;
    resultsEl.innerHTML = '';
    emptyEl.hidden = !(Array.isArray(list) && list.length === 0);

    (list || []).forEach(item => {
      const id = String(item.shortPlayId || '');
      const cover = item.shortPlayCover && item.shortPlayCover !== 'null' ? item.shortPlayCover : fallback;
      const titleHtml = item.shortPlayName || '';
      const intro = item.shotIntroduce || '';
      const heat = item.formatHeatScore || '';

      const card = document.createElement('a');
      card.className = 'ps-search-item';
      card.href = `/detail/${id}`;
      card.innerHTML = `
        <div class="ps-search-poster" style="background-image:url('${cover}')"></div>
        <div class="ps-search-info">
          <div class="ps-search-name">${titleHtml}</div>
          <div class="ps-search-intro">${escapeHtml(intro)}</div>
          <div class="ps-search-meta">${heat ? `<span class="ps-badge">${escapeHtml(heat)}</span>` : ''}</div>
        </div>
      `;
      resultsEl.appendChild(card);
    });

    // highlight <em> already in API response (allowed), ensure overlay style stays.
  }

  function escapeHtml(s) {
    return String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  const doSearch = debounce(async () => {
    const q = String(input?.value || '').trim();
    if (!q) {
      store.setState({ searchResult: [] });
      if (resultsEl) resultsEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = true;
      return;
    }

    store.setState({ loading: true, error: null });

    try {
      const data = await psFetchJson(`/api/search?query=${encodeURIComponent(q)}`);
      const list = Array.isArray(data?.searchCodeSearchResult) ? data.searchCodeSearchResult : [];
      store.setState({ loading: false, searchResult: list });
      renderSearch(list);
    } catch (e) {
      store.setState({ loading: false, error: 'Search gagal.' });
      toast(e?.status === 429 ? 'Search kena rate limit.' : 'Search gagal.', 'error');
      renderSearch([]);
    }
  }, 400);

  if (input) input.addEventListener('input', doSearch);

  // ---------- Browse: Infinite Scroll + Skeleton shimmer + retry 1x on error ----------
  const grid = $('#psBrowseGrid');
  const inf = $('#psInfinite');
  const route = (window.__PANSTREAM__ && window.__PANSTREAM__.route) || '';

  let page = 1;
  let isLoading = false;
  let exhausted = false;

  function cardHTML(item) {
    const id = String(item.shortPlayId || '');
    const name = item.shortPlayName || '';
    const cover = item.shortPlayCover && item.shortPlayCover !== 'null' ? item.shortPlayCover : fallback;
    const labels = Array.isArray(item.labelArray) ? item.labelArray : [];
    const scriptName = item.scriptName || '';
    const heat = item.heatScoreShow || '';

    const tags = labels.slice(0,3).map(t => `<span class="ps-tag">${escapeHtml(t)}</span>`).join('');
    return `
      <a class="ps-card" href="/detail/${id}" data-id="${id}">
        <div class="ps-card-poster" style="background-image:url('${cover}')">
          <div class="ps-card-gradient"></div>
          <div class="ps-card-badges">
            ${scriptName ? `<span class="ps-badge ps-badge-accent">${escapeHtml(scriptName)}</span>` : ''}
            ${heat ? `<span class="ps-badge">${escapeHtml(heat)}</span>` : ''}
          </div>
          <div class="ps-card-overlay">
            <div class="ps-card-title">${escapeHtml(name)}</div>
            ${tags ? `<div class="ps-card-tags">${tags}</div>` : ''}
            <div class="ps-card-cta"><span class="ps-playdot">▶</span><span>Detail</span></div>
          </div>
        </div>
      </a>
    `;
  }

  function showSkeleton(show) {
    if (!inf) return;
    inf.style.display = show ? 'block' : 'none';
  }

  async function loadNextPage() {
    if (route !== 'browse') return;
    if (!grid || !inf) return;
    if (isLoading || exhausted) return;

    isLoading = true;
    showSkeleton(true);
    store.setState({ loading: true, error: null });

    const targetPage = page + 1;

    async function attempt() {
      const data = await psFetchJson(`/api/foryou?page=${targetPage}`);
      const list = Array.isArray(data?.contentInfos) ? data.contentInfos : [];
      return list;
    }

    try {
      let list;
      try {
        list = await attempt();
      } catch (e1) {
        // retry 1x
        list = await attempt();
      }

      if (!list.length) {
        exhausted = true; // Pagination habis → stop infinite scroll
        showSkeleton(false);
        isLoading = false;
        store.setState({ loading: false });
        return;
      }

      page = targetPage;
      const frag = document.createDocumentFragment();
      list.forEach(item => {
        const wrap = document.createElement('div');
        wrap.innerHTML = cardHTML(item);
        frag.appendChild(wrap.firstElementChild);
      });
      grid.appendChild(frag);

      isLoading = false;
      showSkeleton(false);
      store.setState({ loading: false });

    } catch (e) {
      isLoading = false;
      showSkeleton(false);
      store.setState({ loading: false, error: 'Gagal memuat halaman berikutnya.' });
      toast(e?.status === 429 ? 'Rate limit. Coba lagi.' : 'Gagal memuat. Coba lagi.', 'error');
    }
  }

  function nearBottom() {
    const y = window.scrollY || 0;
    const h = window.innerHeight || 0;
    const doc = document.documentElement;
    const full = doc.scrollHeight || 0;
    return y + h > full - 900;
  }

  if (route === 'browse') {
    showSkeleton(false);
    window.addEventListener('scroll', debounce(() => {
      if (nearBottom()) loadNextPage();
    }, 120), { passive: true });
  }

  // ---------- Detail: Virtual Scroll episodes ----------
  if (route === 'detail') {
    const rail = $('#psEpisodeRail');
    const winEl = $('#psEpisodeWindow');
    const topSp = $('#psEpisodeTopSpacer');
    const botSp = $('#psEpisodeBottomSpacer');
    const detail = window.__PANSTREAM__ && window.__PANSTREAM__.detail;

    const copyBtn = $('#psCopyLink');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          toast('Link disalin', 'info');
        } catch {
          toast('Gagal menyalin', 'error');
        }
      });
    }

    if (rail && winEl && topSp && botSp && detail && Array.isArray(detail.shortPlayEpisodeInfos)) {
      const list = detail.shortPlayEpisodeInfos;
      const rowH = 76; // fixed row height for virtualization
      const overscan = 8;

      rail.style.setProperty('--ps-ep-row-h', `${rowH}px`);

      function render() {
        const scrollTop = rail.scrollTop || 0;
        const viewH = rail.clientHeight || 1;
        const start = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
        const end = Math.min(list.length, Math.ceil((scrollTop + viewH) / rowH) + overscan);

        const topPad = start * rowH;
        const botPad = (list.length - end) * rowH;

        topSp.style.height = `${topPad}px`;
        botSp.style.height = `${botPad}px`;

        const slice = list.slice(start, end);

        winEl.innerHTML = slice.map(ep => {
          const cover = ep.episodeCover && ep.episodeCover !== 'null' ? ep.episodeCover : fallback;
          const lock = ep.isLock ? 'Terkunci' : '';
          const vip = ep.isVip ? 'VIP' : '';
          const ad = ep.isAd ? 'Ad' : '';
          const tags = [lock, vip, ad].filter(Boolean).map(t => `<span class="ps-ep-badge">${escapeHtml(t)}</span>`).join('');

          return `
            <a class="ps-ep" href="/watch/${encodeURIComponent(detail.shortPlayId)}/${encodeURIComponent(ep.episodeId)}">
              <div class="ps-ep-cover" style="background-image:url('${cover}')"></div>
              <div class="ps-ep-info">
                <div class="ps-ep-title">Episode ${ep.episodeNo}${ep.playClarity ? ` • ${escapeHtml(ep.playClarity)}` : ''}</div>
                <div class="ps-ep-meta">${tags || '<span class="ps-ep-dim">Siap diputar</span>'}</div>
              </div>
              <div class="ps-ep-go">▶</div>
            </a>
          `;
        }).join('');
      }

      rail.addEventListener('scroll', debounce(render, 16), { passive: true });
      render();
    }
  }
})();
