'use strict';

(function () {
  const cfg = window.__PANSTREAM__ && window.__PANSTREAM__.player;
  if (!cfg) return;

  const $ = (q, el = document) => el.querySelector(q);

  const video = $('#psVideo');
  const shell = $('#psPlayerShell');
  const overlay = $('#psOverlay');
  const controls = $('#psControls');
  const bigPlay = $('#psBigPlay');

  const playPause = $('#psPlayPause');
  const rew = $('#psRew');
  const fwd = $('#psFwd');
  const nextBtn = $('#psNext');
  const fsBtn = $('#psFs');

  const timeNow = $('#psTimeNow');
  const timeDur = $('#psTimeDur');

  const progressWrap = $('#psProgressWrap');
  const playedBar = $('#psPlayedBar');
  const bufferBar = $('#psBufferBar');
  const thumb = $('#psThumb');

  const muteBtn = $('#psMute');
  const vol = $('#psVol');

  const toastEl = $('#psPlayerToast');
  const theaterBtn = $('#psTheaterBtn');

  function pToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(pToast._t);
    pToast._t = setTimeout(() => toastEl.classList.remove('is-show'), 1800);
  }

  if (!video) return;

  // NO default UI
  video.controls = false;

  const key = `panstream_progress:${cfg.shortPlayId}:${cfg.episodeId}`;

  function fmt(t) {
    if (!Number.isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  let idleT = null;
  function showControls() {
    if (!overlay || !controls) return;
    overlay.classList.add('is-active');
    controls.classList.add('is-active');
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      overlay.classList.remove('is-active');
      controls.classList.remove('is-active');
    }, 2500); // hide after 2.5s idle
  }

  function setPlayIcon() {
    const playing = !video.paused && !video.ended;
    if (bigPlay) bigPlay.textContent = playing ? '❚❚' : '▶';
  }

  function saveProgress() {
    try {
      const cur = video.currentTime || 0;
      const dur = video.duration || 0;
      const payload = { t: cur, d: dur, at: Date.now() };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {}
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || !Number.isFinite(p.t)) return null;
      return p;
    } catch {
      return null;
    }
  }

  // Required global state fields
  window.PSStore && window.PSStore.setState({
    currentEpisode: { shortPlayId: cfg.shortPlayId, episodeId: cfg.episodeId },
    videoProgress: window.PSStore.getState().videoProgress || {}
  });

  let loadedOnce = false;

  async function loadVideoSource() {
    // Episode playVoucher source is provided by server render.
    // If playVoucher expired and fails, reload episode data by reloading page (server will refresh cache).
    video.src = cfg.src || '';
    video.load();
  }

  function updateProgressUI() {
    const cur = video.currentTime || 0;
    const dur = video.duration || 0;

    if (timeNow) timeNow.textContent = fmt(cur);
    if (timeDur) timeDur.textContent = fmt(dur);

    const pct = dur > 0 ? (cur / dur) : 0;
    if (playedBar) playedBar.style.transform = `scaleX(${pct})`;
    if (thumb) thumb.style.left = `${pct * 100}%`;

    // buffer bar
    try {
      if (bufferBar && dur > 0 && video.buffered && video.buffered.length) {
        const end = video.buffered.end(video.buffered.length - 1);
        const bp = clamp(end / dur, 0, 1);
        bufferBar.style.transform = `scaleX(${bp})`;
      }
    } catch {}
  }

  function seekTo(pct) {
    const dur = video.duration || 0;
    if (!dur) return;
    video.currentTime = clamp(pct, 0, 1) * dur;
    updateProgressUI();
    saveProgress();
  }

  // Click scrub
  if (progressWrap) {
    let isDrag = false;

    const onMove = (clientX) => {
      const rect = progressWrap.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      seekTo(pct);
    };

    progressWrap.addEventListener('mousedown', (e) => {
      isDrag = true;
      showControls();
      onMove(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDrag) return;
      onMove(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      if (!isDrag) return;
      isDrag = false;
      showControls();
    });

    // touch
    progressWrap.addEventListener('touchstart', (e) => {
      isDrag = true;
      showControls();
      onMove(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDrag) return;
      onMove(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!isDrag) return;
      isDrag = false;
      showControls();
    }, { passive: true });
  }

  function togglePlay() {
    if (video.paused || video.ended) {
      video.play().catch(() => {
        pToast('Tidak bisa autoplay. Tap untuk play.');
      });
    } else {
      video.pause();
    }
  }

  if (bigPlay) bigPlay.addEventListener('click', () => { showControls(); togglePlay(); });
  if (playPause) playPause.addEventListener('click', () => { showControls(); togglePlay(); });
  if (rew) rew.addEventListener('click', () => { showControls(); video.currentTime = Math.max(0, (video.currentTime || 0) - 10); saveProgress(); });
  if (fwd) fwd.addEventListener('click', () => { showControls(); video.currentTime = Math.min(video.duration || 0, (video.currentTime || 0) + 10); saveProgress(); });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (!cfg.next) return;
    location.href = `/watch/${encodeURIComponent(cfg.shortPlayId)}/${encodeURIComponent(cfg.next.episodeId)}`;
  });

  if (fsBtn) fsBtn.addEventListener('click', async () => {
    showControls();
    try {
      if (!document.fullscreenElement) {
        await shell.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      pToast('Fullscreen tidak tersedia.');
    }
  });

  if (theaterBtn) theaterBtn.addEventListener('click', () => {
    document.body.classList.toggle('ps-theater');
    showControls();
  });

  if (muteBtn && vol) {
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? '🔇' : '🔊';
      showControls();
    });
    vol.addEventListener('input', () => {
      video.volume = Number(vol.value);
      if (video.volume === 0) {
        video.muted = true;
        muteBtn.textContent = '🔇';
      } else {
        video.muted = false;
        muteBtn.textContent = '🔊';
      }
      showControls();
    });
  }

  // Keyboard: Space play/pause, arrows seek
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      showControls();
      togglePlay();
    }
    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      showControls();
      video.currentTime = Math.max(0, (video.currentTime || 0) - 5);
      saveProgress();
    }
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      showControls();
      video.currentTime = Math.min(video.duration || 0, (video.currentTime || 0) + 5);
      saveProgress();
    }
  });

  // Activity to keep controls visible
  ['mousemove', 'touchstart', 'click'].forEach(evt => {
    shell && shell.addEventListener(evt, showControls, { passive: true });
  });

  video.addEventListener('timeupdate', () => {
    updateProgressUI();
    saveProgress();

    // global state: videoProgress
    if (window.PSStore) {
      const st = window.PSStore.getState();
      const vp = { ...(st.videoProgress || {}) };
      vp[key] = video.currentTime || 0;
      window.PSStore.setState({ videoProgress: vp });
    }
  });

  video.addEventListener('loadedmetadata', () => {
    updateProgressUI();

    if (!loadedOnce) {
      loadedOnce = true;

      const p = loadProgress();
      if (p && Number.isFinite(p.t) && (video.duration || 0) > 0) {
        // resume last second (avoid resuming at very end)
        const safeT = Math.min(p.t, Math.max(0, (video.duration || 0) - 2));
        if (safeT > 1) video.currentTime = safeT;
      }

      // Auto play
      video.play().catch(() => {
        pToast('Tap untuk mulai.');
      });
    }
    setPlayIcon();
  });

  video.addEventListener('play', () => { setPlayIcon(); showControls(); });
  video.addEventListener('pause', () => { setPlayIcon(); showControls(); });
  video.addEventListener('waiting', () => { pToast('Buffering…'); });

  video.addEventListener('ended', () => {
    saveProgress();
    // Auto next episode
    if (cfg.next) {
      location.href = `/watch/${encodeURIComponent(cfg.shortPlayId)}/${encodeURIComponent(cfg.next.episodeId)}`;
    } else {
      pToast('Selesai.');
    }
  });

  // Error handling video fail (expired playVoucher → reload page)
  video.addEventListener('error', () => {
    const err = video.error;
    const code = err ? err.code : 0;
    pToast('Video error. Memuat ulang…');

    // Try reload once; if still error, hard reload page (refresh detail/episode data)
    setTimeout(() => {
      if (code) {
        video.load();
        video.play().catch(() => {});
      }
    }, 700);

    setTimeout(() => {
      // If still cannot play, reload page to refresh playVoucher
      location.reload();
    }, 1800);
  });

  // init
  showControls();
  loadVideoSource();
})();
