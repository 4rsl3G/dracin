const API_BASE_PLAYER = 'https://d.sapimu.au/api';

window.initDetail = function(bookId) {
  if(!bookId) return;
  
  // 1. Get Detail Book
  $.get(`${API_BASE_PLAYER}/chapters/detail/${bookId}?lang=in`, function(res) {
    if(res.code === 200) {
      const b = res.data;
      $('#book-info').html(`
        <h1 class="text-2xl font-bold mb-2 text-gray-900 dark:text-white">${b.book_name}</h1>
        <div class="flex flex-wrap gap-2 mb-2">
           ${b.tags ? b.tags.split(',').map(t => `<span class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">${t}</span>`).join('') : ''}
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">${b.summary}</p>
      `);
      
      // Simpan metadata untuk history
      window.currentBookMeta = { id: b.id, title: b.book_name, cover: b.cover_url };
    }
  });

  // 2. Get Chapter List
  $.get(`${API_BASE_PLAYER}/chapters/${bookId}?lang=in`, function(res) {
    if(res.code === 200) {
      window.chapters = res.data.chapters || [];
      const saved = getProgress(bookId);
      renderChapters(window.chapters, saved ? saved.chapterIndex : 0);
      
      // Auto load last watched or first chapter
      loadPlayer(bookId, saved ? saved.chapterIndex : 0);
    }
  });
};

function renderChapters(list, activeIdx) {
  const html = list.map((c, i) => `
    <button onclick="loadPlayer('${window.currentBookMeta.id}', ${i})" 
      class="p-2 text-xs font-mono rounded border transition-colors ${i == activeIdx 
        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow' 
        : 'bg-white dark:bg-transparent border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-black dark:hover:border-white'}">
      ${i + 1}
    </button>
  `).join('');
  $('#chapter-list').html(html);
}

window.loadPlayer = async function(bookId, chapterIndex) {
  const video = document.getElementById('main-video');
  const status = document.getElementById('player-status');
  
  // Update UI active chapter visual
  renderChapters(window.chapters, chapterIndex);

  // Show Loading
  status.style.display = 'flex';
  status.innerHTML = '<div class="loader w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';

  try {
    // REQUEST LANGSUNG KE UPSTREAM
    // Menggunakan $.ajax agar bisa set Content-Type JSON
    const res = await $.ajax({
      url: `${API_BASE_PLAYER}/watch/player?lang=in`,
      type: 'POST',
      contentType: 'application/json', // WAJIB JSON
      data: JSON.stringify({
        bookId: bookId,
        chapterIndex: parseInt(chapterIndex),
        lang: 'in'
      })
    });
    
    if (res.code === 200 && res.data && res.data.url) {
      // HLS / MP4 URL
      video.src = res.data.url;
      video.load();
      status.style.display = 'none';
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
            // Auto-play prevented
            status.innerHTML = '<button onclick="document.getElementById(\'main-video\').play(); this.parentElement.style.display=\'none\'" class="text-white text-4xl opacity-80 hover:opacity-100">▶</button>';
            status.style.display = 'flex';
        });
      }
      
      setupControls(video, bookId, chapterIndex);
      saveHistory(bookId, chapterIndex);
    } else {
      throw new Error('Video URL not found in response');
    }
  } catch (e) {
    console.error("Player Error:", e);
    status.innerHTML = `<div class="text-white text-center flex flex-col items-center gap-2">
      <p class="text-sm text-red-400">Gagal memuat video.</p>
      <button onclick="loadPlayer('${bookId}',${chapterIndex})" class="px-3 py-1 bg-white text-black text-xs rounded hover:opacity-90">Coba Lagi</button>
    </div>`;
  }
};

// ... (Fungsi setupControls, saveHistory, dll SAMA PERSIS dengan sebelumnya)
// Salin ulang fungsi setupControls, formatTime, saveHistory, saveProgress, getProgress dari kode sebelumnya di sini.
// Agar tidak memotong output, saya asumsikan fungsi helper di bawah ini tetap sama.

function setupControls(video, bookId, chapterIndex) {
  const btnPlay = $('#play-pause-btn');
  const seekFill = $('#seek-fill');
  const seekContainer = $('#seek-bar-container');
  const timeDisplay = $('#time-display');
  
  // Watermark Loop
  const wm = $('#watermark-overlay');
  wm.removeClass('hidden');
  
  // Clear previous interval if any (penting saat ganti chapter)
  if(window.wmInterval) clearInterval(window.wmInterval);
  window.wmInterval = setInterval(() => {
    const top = Math.random() * 80 + 10;
    const left = Math.random() * 80 + 10;
    wm.css({ top: top + '%', left: left + '%' });
  }, 15000);

  // Unbind events lama agar tidak double
  btnPlay.off('click');
  $(video).off('click timeupdate ended');
  seekContainer.off('click');

  // Play/Pause
  btnPlay.on('click', togglePlay);
  $(video).on('click', (e) => {
    // Jangan toggle kalau klik controls
    if(e.target.closest('#video-controls')) return;
    togglePlay();
  });
  
  function togglePlay() {
    if(video.paused) {
      video.play();
      btnPlay.html('<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>');
    } else {
      video.pause();
      btnPlay.html('<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
    }
  }

  // Resume Time
  const savedTime = getProgress(bookId);
  if(savedTime && savedTime.chapterIndex == chapterIndex && savedTime.time > 0) {
    // Cek durasi agar tidak error
    if(savedTime.time < video.duration || video.duration === Infinity || isNaN(video.duration)) {
        video.currentTime = savedTime.time;
    }
  }

  $(video).on('timeupdate', () => {
    const pct = (video.currentTime / video.duration) * 100;
    seekFill.css('width', pct + '%');
    timeDisplay.text(formatTime(video.currentTime) + ' / ' + formatTime(video.duration));
    saveProgress(bookId, chapterIndex, video.currentTime);
  });

  // Seek
  seekContainer.on('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  });

  // Speed
  $('#speed-select').off('change').on('change', function() { video.playbackRate = this.value; });

  // Fullscreen
  $('#fullscreen-btn').off('click').on('click', () => {
    if(!document.fullscreenElement) document.getElementById('player-container').requestFullscreen();
    else document.exitFullscreen();
  });

  // Theater
  $('#theater-btn').off('click').on('click', () => {
    $('#player-container').toggleClass('theater-mode');
  });

  // Auto Next
  $(video).on('ended', () => {
    if(chapterIndex + 1 < window.chapters.length) {
      loadPlayer(bookId, chapterIndex + 1);
    }
  });

  // Keyboard Shortcuts
  $(document).off('keydown').on('keydown', (e) => {
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch(e.key.toLowerCase()) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'arrowright': video.currentTime += 10; break;
      case 'arrowleft': video.currentTime -= 10; break;
      case 'f': $('#fullscreen-btn').click(); break;
      case 'm': video.muted = !video.muted; break;
    }
  });
}

function formatTime(s) {
  if(isNaN(s)) return "00:00";
  const m = Math.floor(s / 60);
  const sc = Math.floor(s % 60);
  return `${m < 10 ? '0'+m : m}:${sc < 10 ? '0'+sc : sc}`;
}

function saveHistory(bookId, chapterIndex) {
  let hist = JSON.parse(localStorage.getItem('pansa_history') || '[]');
  hist = hist.filter(h => h.bookId != bookId);
  if(window.currentBookMeta) {
    hist.unshift({ bookId, chapterIndex, ...window.currentBookMeta });
    localStorage.setItem('pansa_history', JSON.stringify(hist.slice(0, 20)));
  }
}

function saveProgress(bookId, idx, time) {
  const data = JSON.parse(localStorage.getItem('pansa_progress') || '{}');
  data[bookId] = { chapterIndex: idx, time };
  localStorage.setItem('pansa_progress', JSON.stringify(data));
}

function getProgress(bookId) {
  const data = JSON.parse(localStorage.getItem('pansa_progress') || '{}');
  return data[bookId];
}
