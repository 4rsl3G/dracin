'use strict';

(function () {
  const cfg = window.__PANSTREAM__ && window.__PANSTREAM__.player;
  if (!cfg) return;

  const video = document.getElementById('psVideo');
  const shell = document.getElementById('psPlayerShell');
  const overlay = document.getElementById('psOverlay');
  const controls = document.getElementById('psControls');
  const bigPlay = document.getElementById('psBigPlay');

  const playPause = document.getElementById('psPlayPause');
  const rew = document.getElementById('psRew');
  const fwd = document.getElementById('psFwd');
  const nextBtn = document.getElementById('psNext');
  const fsBtn = document.getElementById('psFs');

  const fitFillBtn = document.getElementById('psFitFill');

  const timeNow = document.getElementById('psTimeNow');
  const timeDur = document.getElementById('psTimeDur');

  const progressWrap = document.getElementById('psProgressWrap');
  const playedBar = document.getElementById('psPlayedBar');
  const bufferBar = document.getElementById('psBufferBar');
  const thumb = document.getElementById('psThumb');

  const muteBtn = document.getElementById('psMute');
  const vol = document.getElementById('psVol');

  const toastEl = document.getElementById('psPlayerToast');
  const theaterBtn = document.getElementById('psTheaterBtn');

  if (!video) return;
  video.controls = false;

  function pToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(pToast._t);
    pToast._t = setTimeout(() => toastEl.classList.remove('is-show'), 1800);
  }

  // state key
  const key = `panstream_progress:${cfg.shortPlayId}:${cfg.episodeId}`;

  // Fit/Fill preference
  const FF_KEY = 'panstream_fitfill_v1'; // "fit" | "fill"
  function getFF() {
    try {
      const v = localStorage.getItem(FF_KEY);
      return (v === 'fit' || v === 'fill') ? v : 'fit';
    } catch {
      return 'fit';
    }
  }
  function setFF(v) {
    try { localStorage.setItem(FF_KEY, v); } catch {}
  }

  let isVertical = false;
  let ffMode = getFF();

  function setBtnIcon(btn, iconClass) {
    if (!btn) return;
    btn.innerHTML = `<i class="${iconClass}"></i>`;
  }

  function setBigIcon(iconClass) {
    if (!bigPlay) return;
    bigPlay.innerHTML = `<i class="${iconClass}"></i>`;
  }

  function applyFF(mode) {
    if (!shell) return;
    shell.classList.toggle('is-fit', mode === 'fit');
    shell.classList.toggle('is-fill', mode === 'fill');
    if (fitFillBtn) fitFillBtn.textContent = mode.toUpperCase();
  }

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
    }, 2500);
  }

  function saveProgress() {
    try {
      const cur = video.currentTime || 0;
      const dur = video.duration || 0;
      localStorage.setItem(key, JSON.stringify({ t: cur, d: dur, at: Date.now() }));
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

  function updateProgressUI() {
    const cur = video.currentTime || 0;
    const dur = video.duration || 0;

    if (timeNow) timeNow.textContent = fmt(cur);
    if (timeDur) timeDur.textContent = fmt(dur);

    const pct = dur > 0 ? (cur / dur) : 0;
    if (playedBar) playedBar.style.transform = `scaleX(${pct})`;
    if (thumb) thumb.style.left = `${pct * 100}%`;

    try {
      if (bufferBar && dur > 0 && video.buffered && video.buffered.length) {
        const end = video.buffered.end(video.buffered.length - 1);
        bufferBar.style.transform = `scaleX(${clamp(end / dur, 0, 1)})`;
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

  if (progressWrap) {
    let isDrag = false;

    const onMove = (clientX) => {
      const rect = progressWrap.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      seekTo(pct);
    };

    progressWrap.addEventListener('mousedown', (e) => { isDrag = true; showControls(); onMove(e.clientX); });
    window.addEventListener('mousemove', (e) => { if (isDrag) onMove(e.clientX); });
    window.addEventListener('mouseup', () => { if (!isDrag) return; isDrag = false; showControls(); });

    progressWrap.addEventListener('touchstart', (e) => { isDrag = true; showControls(); onMove(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchmove', (e) => { if (isDrag) onMove(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend', () => { if (!isDrag) return; isDrag = false; showControls(); }, { passive: true });
  }

  function setPlayStateIcons() {
    const playing = !video.paused && !video.ended;
    setBtnIcon(playPause, playing ? 'fa-solid fa-pause' : 'fa-solid fa-play');
    setBigIcon(playing ? 'fa-solid fa-pause' : 'fa-solid fa-play');
  }

  function togglePlay() {
    if (video.paused || video.ended) {
      video.play().catch(() => pToast('Tap untuk mulai.'));
    } else {
      video.pause();
    }
  }

  // bind controls
  if (bigPlay) bigPlay.addEventListener('click', () => { showControls(); togglePlay(); });
  if (playPause) playPause.addEventListener('click', () => { showControls(); togglePlay(); });

  if (rew) rew.addEventListener('click', () => {
    showControls();
    video.currentTime = Math.max(0, (video.currentTime || 0) - 10);
    saveProgress();
  });

  if (fwd) fwd.addEventListener('click', () => {
    showControls();
    video.currentTime = Math.min(video.duration || 0, (video.currentTime || 0) + 10);
    saveProgress();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (!cfg.next) return;
    location.href = `/watch/${encodeURIComponent(cfg.shortPlayId)}/${encodeURIComponent(cfg.next.episodeId)}`;
  });

  if (fsBtn) fsBtn.addEventListener('click', async () => {
    showControls();
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
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
      muteBtn.innerHTML = video.muted
        ? '<i class="fa-solid fa-volume-xmark"></i>'
        : '<i class="fa-solid fa-volume-high"></i>';
      showControls();
    });

    vol.addEventListener('input', () => {
      video.volume = Number(vol.value);
      if (video.volume === 0) {
        video.muted = true;
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      } else {
        video.muted = false;
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      }
      showControls();
    });
  }

  if (fitFillBtn) {
    fitFillBtn.addEventListener('click', () => {
      showControls();
      ffMode = (ffMode === 'fit') ? 'fill' : 'fit';
      setFF(ffMode);
      applyFF(ffMode);
      pToast(ffMode === 'fit' ? 'FIT: tanpa crop' : 'FILL: cinematic');
    });
  }

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (e.code === 'Space') { e.preventDefault(); showControls(); togglePlay(); }
    if (e.code === 'ArrowLeft') { e.preventDefault(); showControls(); video.currentTime = Math.max(0, (video.currentTime || 0) - 5); saveProgress(); }
    if (e.code === 'ArrowRight') { e.preventDefault(); showControls(); video.currentTime = Math.min(video.duration || 0, (video.currentTime || 0) + 5); saveProgress(); }
    if (e.code === 'KeyF' && fitFillBtn) { e.preventDefault(); fitFillBtn.click(); }
  });

  ['mousemove', 'touchstart', 'click'].forEach(evt => {
    shell && shell.addEventListener(evt, showControls, { passive: true });
  });

  // events
  video.addEventListener('timeupdate', () => { updateProgressUI(); saveProgress(); });

  video.addEventListener('loadedmetadata', () => {
    const vw = video.videoWidth || 0;
    const vh = video.videoHeight || 0;
    isVertical = (vh > vw && vw > 0);

    if (shell) shell.classList.toggle('is-vertical', isVertical);

    // apply fit/fill preference (stored)
    applyFF(ffMode);

    updateProgressUI();

    const p = loadProgress();
    if (p && Number.isFinite(p.t) && (video.duration || 0) > 0) {
      const safeT = Math.min(p.t, Math.max(0, (video.duration || 0) - 2));
      if (safeT > 1) video.currentTime = safeT;
    }

    video.play().catch(() => pToast('Tap untuk mulai.'));
    setPlayStateIcons();
  });

  video.addEventListener('play', () => { setPlayStateIcons(); showControls(); });
  video.addEventListener('pause', () => { setPlayStateIcons(); showControls(); });
  video.addEventListener('waiting', () => { pToast('Buffering…'); });

  video.addEventListener('ended', () => {
    saveProgress();
    if (cfg.next) {
      location.href = `/watch/${encodeURIComponent(cfg.shortPlayId)}/${encodeURIComponent(cfg.next.episodeId)}`;
    } else {
      pToast('Selesai.');
    }
  });

  video.addEventListener('error', () => {
    pToast('Video error. Memuat ulang…');
    setTimeout(() => { try { video.load(); video.play().catch(()=>{}); } catch {} }, 700);
    setTimeout(() => { location.reload(); }, 1800);
  });

  window.addEventListener('resize', () => showControls(), { passive: true });

  // init icons
  setPlayStateIcons();
  if (rew) rew.innerHTML = `<i class="fa-solid fa-rotate-left"></i><span class="ps-ctl-mini">10</span>`;
  if (fwd) fwd.innerHTML = `<i class="fa-solid fa-rotate-right"></i><span class="ps-ctl-mini">10</span>`;

  // load source
  video.src = cfg.src || '';
  video.load();
  showControls();
})();
