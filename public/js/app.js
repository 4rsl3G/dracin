'use strict';

(function () {
  const route = (window.__PANSTREAM__ && window.__PANSTREAM__.route) || '';

  // ===== Store (global state required) =====
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

  // ===== Toast =====
  const $toast = $('#psToast');
  let toastT = null;
  function toast(msg, kind = 'info') {
    if (!$toast.length) return;
    $toast.text(msg);
    $toast.attr('class', `ps-toast is-show is-${kind}`);
    clearTimeout(toastT);
    toastT = setTimeout(() => {
      $toast.attr('class', 'ps-toast').text('');
    }, 2400);
  }

  // ===== Navbar solid on scroll =====
  const $nav = $('#psNav');
  function onScrollNav() {
    if (!$nav.length) return;
    $nav.toggleClass('is-solid', (window.scrollY || 0) > 24);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  // ===== Fallback cover (real inline SVG data URI) =====
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
    $('.ps-card-poster, .ps-detail-hero').each(function () {
      const url = $(this).attr('data-cover');
      if (url && url !== 'null') $(this).css('background-image', `url("${url}")`);
      else $(this).css('background-image', `url("${fallback}")`);
    });
  }
  applyCovers();

  // ===== Row scroll buttons =====
  $('.ps-row-btn').on('click', function () {
    const rid = $(this).attr('data-row');
    const dir = Number($(this).attr('data-dir') || 1);
    const rail = document.getElementById(`row_${rid}`);
    if (!rail) return;
    const amount = Math.max(rail.clientWidth * 0.9, 320);
    rail.scrollBy({ left: amount * dir, behavior: 'smooth' });
  });

  // ===== Debounce =====
  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ===== jQuery AJAX helper with 429 handling =====
  function ajaxJson(url, opts = {}) {
    return $.ajax({
      url,
      method: 'GET',
      dataType: 'json',
      timeout: 12000,
      ...opts
    }).fail(function (xhr) {
      if (xhr && xhr.status === 429) {
        toast('Terlalu banyak request. Tenang…', 'warn');
      }
    });
  }

  // ===== Search overlay =====
  const $overlay = $('#psSearchOverlay');
  const $openSearch = $('#psOpenSearch');
  const $closeScrim = $('#psCloseSearch');
  const $closeBtn = $('#psCloseSearchBtn');
  const $input = $('#psSearchInput');
  const $resultsEl = $('#psSearchResults');
  const $emptyEl = $('#psSearchEmpty');

  function setOverlay(open) {
    if (!$overlay.length) return;
    $overlay.toggleClass('is-open', open);
    $overlay.attr('aria-hidden', open ? 'false' : 'true');
    $('body').toggleClass('ps-no-scroll', open);
    if (open) setTimeout(() => $input.trigger('focus'), 60);
  }

  $openSearch.on('click', () => setOverlay(true));
  $closeScrim.on('click', () => setOverlay(false));
  $closeBtn.on('click', () => setOverlay(false));
  $(window).on('keydown', (e) => {
    if (e.key === 'Escape' && $overlay.hasClass('is-open')) setOverlay(false);
  });

  function escapeHtml(s) {
    return String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderSearch(list) {
    $resultsEl.empty();
    const empty = Array.isArray(list) && list.length === 0;
    $emptyEl.prop('hidden', !empty);

    (list || []).forEach(item => {
      const id = String(item.shortPlayId || '');
      const cover = item.shortPlayCover && item.shortPlayCover !== 'null' ? item.shortPlayCover : fallback;
      const titleHtml = item.shortPlayName || ''; // contains <em> from API
      const intro = item.shotIntroduce || '';
      const heat = item.formatHeatScore || '';

      const $card = $(`
        <a class="ps-search-item" href="/detail/${encodeURIComponent(id)}">
          <div class="ps-search-poster"></div>
          <div class="ps-search-info">
            <div class="ps-search-name">${titleHtml}</div>
            <div class="ps-search-intro">${escapeHtml(intro)}</div>
            <div class="ps-search-meta">${heat ? `<span class="ps-badge">${escapeHtml(heat)}</span>` : ''}</div>
          </div>
        </a>
      `);
      $card.find('.ps-search-poster').css('background-image', `url('${cover}')`);
      $resultsEl.append($card);
    });
  }

  const doSearch = debounce(() => {
    const q = String($input.val() || '').trim();

    if (!q) {
      store.setState({ searchResult: [], loading: false, error: null });
      $resultsEl.empty();
      $emptyEl.prop('hidden', true);
      return;
    }

    store.setState({ loading: true, error: null });

    ajaxJson(`/api/search?query=${encodeURIComponent(q)}`)
      .done((data) => {
        const list = Array.isArray(data?.searchCodeSearchResult) ? data.searchCodeSearchResult : [];
        store.setState({ loading: false, searchResult: list });
        renderSearch(list);
      })
      .fail((xhr) => {
        store.setState({ loading: false, error: 'Search gagal.', searchResult: [] });
        toast(xhr && xhr.status === 429 ? 'Search kena rate limit.' : 'Search gagal.', 'error');
        renderSearch([]);
      });
  }, 400);

  $input.on('input', doSearch);

  // ===== Browse infinite (AJAX + retry 1x) =====
  const $grid = $('#psBrowseGrid');
  const $inf = $('#psInfinite');

  let page = 1;
  let isLoading = false;
  let exhausted = false;

  function showSkeleton(show) {
    if (!$inf.length) return;
    $inf.css('display', show ? 'block' : 'none');
  }

  function cardHTML(item) {
    const id = String(item.shortPlayId || '');
    const name = item.shortPlayName || '';
    const cover = item.shortPlayCover && item.shortPlayCover !== 'null' ? item.shortPlayCover : fallback;
    const labels = Array.isArray(item.labelArray) ? item.labelArray : [];
    const scriptName = item.scriptName || '';
    const heat = item.heatScoreShow || '';

    const tags = labels.slice(0, 3).map(t => `<span class="ps-tag">${escapeHtml(t)}</span>`).join('');

    return `
      <a class="ps-card" href="/detail/${encodeURIComponent(id)}" data-id="${escapeHtml(id)}">
        <div class="ps-card-poster" style="background-image:url('${cover}')">
          <div class="ps-card-gradient"></div>
          <div class="ps-card-badges">
            ${scriptName ? `<span class="ps-badge ps-badge-accent">${escapeHtml(scriptName)}</span>` : ''}
            ${heat ? `<span class="ps-badge">${escapeHtml(heat)}</span>` : ''}
          </div>
          <div class="ps-card-overlay">
            <div class="ps-card-title">${escapeHtml(name)}</div>
            ${tags ? `<div class="ps-card-tags">${tags}</div>` : ''}
            <div class="ps-card-cta">
              <span class="ps-playdot"><i class="fa-solid fa-play"></i></span>
              <span>Detail</span>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  function nearBottom() {
    const y = window.scrollY || 0;
    const h = window.innerHeight || 0;
    const full = document.documentElement.scrollHeight || 0;
    return y + h > full - 900;
  }

  function loadNextPage() {
    if (route !== 'browse') return;
    if (!$grid.length || !$inf.length) return;
    if (isLoading || exhausted) return;

    isLoading = true;
    showSkeleton(true);
    store.setState({ loading: true, error: null });

    const targetPage = page + 1;

    function attempt() {
      return ajaxJson(`/api/foryou?page=${targetPage}`);
    }

    attempt()
      .fail(() => attempt()) // retry 1x
      .done((data) => {
        const list = Array.isArray(data?.contentInfos) ? data.contentInfos : [];
        if (!list.length) {
          exhausted = true;
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
        $grid[0].appendChild(frag);

        isLoading = false;
        showSkeleton(false);
        store.setState({ loading: false });
      })
      .fail((xhr) => {
        isLoading = false;
        showSkeleton(false);
        store.setState({ loading: false, error: 'Gagal memuat halaman berikutnya.' });
        toast(xhr && xhr.status === 429 ? 'Rate limit. Coba lagi.' : 'Gagal memuat. Coba lagi.', 'error');
      });
  }

  if (route === 'browse') {
    showSkeleton(false);
    $(window).on('scroll', debounce(() => {
      if (nearBottom()) loadNextPage();
    }, 120));
  }

  // ===== Detail: virtual scroll episodes + copy link =====
  if (route === 'detail') {
    $('#psCopyLink').on('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        toast('Link disalin', 'info');
      } catch {
        toast('Gagal menyalin', 'error');
      }
    });

    const rail = document.getElementById('psEpisodeRail');
    const winEl = document.getElementById('psEpisodeWindow');
    const topSp = document.getElementById('psEpisodeTopSpacer');
    const botSp = document.getElementById('psEpisodeBottomSpacer');
    const detail = window.__PANSTREAM__ && window.__PANSTREAM__.detail;

    if (rail && winEl && topSp && botSp && detail && Array.isArray(detail.shortPlayEpisodeInfos)) {
      const list = detail.shortPlayEpisodeInfos;
      const rowH = 76;
      const overscan = 8;

      rail.style.setProperty('--ps-ep-row-h', `${rowH}px`);

      function render() {
        const scrollTop = rail.scrollTop || 0;
        const viewH = rail.clientHeight || 1;
        const start = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
        const end = Math.min(list.length, Math.ceil((scrollTop + viewH) / rowH) + overscan);

        topSp.style.height = `${start * rowH}px`;
        botSp.style.height = `${(list.length - end) * rowH}px`;

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
              <div class="ps-ep-go"><i class="fa-solid fa-play"></i></div>
            </a>
          `;
        }).join('');
      }

      rail.addEventListener('scroll', debounce(render, 16), { passive: true });
      render();
    }
  }
})();
