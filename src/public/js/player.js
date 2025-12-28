window.initDetail = function(bookId) {
  if(!bookId) return;
  
  // Fetch Detail & Chapters
  $.get(`/api/book/${bookId}/detail`, function(res) {
    if(res.code === 200) {
      const b = res.data;
      $('#book-info').html(`
        <h1 class="text-2xl font-bold mb-2">${b.book_name}</h1>
        <p class="text-sm text-gray-500 line-clamp-3">${b.summary}</p>
      `);
      
      // Save for history
      window.currentBookMeta = { id: b.id, title: b.book_name, cover: b.cover_url };
    }
  });

  $.get(`/api/book/${bookId}/chapters`, function(res) {
    if(res.code === 200) {
      window.chapters = res.data.chapters || [];
      const saved = getProgress(bookId);
      renderChapters(window.chapters, saved ? saved.chapterIndex : 0);
      loadPlayer(bookId, saved ? saved.chapterIndex : 0);
    }
  });
};

function renderChapters(list, activeIdx) {
  const html = list.map((c, i) => `
    <button onclick="loadPlayer('${window.currentBookMeta.id}', ${i})" 
      class="p-2 text-xs rounded border ${i == activeIdx ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'}">
      ${i + 1}
    </button>
  `).join('');
  $('#chapter-list').html(html);
}

window.loadPlayer = async function(bookId, chapterIndex) {
  const video = document.getElementById('main-video');
  const status = document.getElementById('player-status');
  
  // Update UI active chapter
  renderChapters(window.chapters, chapterIndex);

  status.style.display = 'flex';
  status.innerHTML = '<div class="loader w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';

  try {
    const res = await $.post('/api/player', { bookId, chapterIndex });
    
    if (res.code === 200 && res.data && res.data.url) {
      video.src = res.data.url;
      video.load();
      status.style.display = 'none';
      
      // Auto Play
      video.play().catch(() => {/* Silent fail for autoplay policy */});
      
      setupControls(video, bookId, chapterIndex);
      saveHistory(bookId, chapterIndex);
    } else {
      throw new Error('No video URL');
    }
  } catch (e) {
    status.innerHTML = `<div class="text-white text-center"><p>Error loading video.</p><button onclick="loadPlayer('${bookId}',${chapterIndex})" class="text-xs underline mt-2">Retry</button></div>`;
  }
};

function setupControls(video, bookId, chapterIndex) {
  const btnPlay = $('#play-pause-btn');
  const seekFill = $('#seek-fill');
  const seekContainer = $('#seek-bar-container');
  const timeDisplay = $('#time-display');
  
  // Watermark Loop
  const wm = $('#watermark-overlay');
  wm.removeClass('hidden');
  setInterval(() => {
    const top = Math.random() * 80 + 10;
    const left = Math.random() * 80 + 10;
    wm.css({ top: top + '%', left: left + '%' });
  }, 15000);

  // Play/Pause
  btnPlay.on('click', togglePlay);
  $(video).on('click', togglePlay);
  
  function togglePlay() {
    if(video.paused) {
      video.play();
      btnPlay.html('<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>');
    } else {
      video.pause();
      btnPlay.html('<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
    }
  }

  // Time Update & Resume
  const savedTime = getProgress(bookId);
  if(savedTime && savedTime.chapterIndex == chapterIndex && savedTime.time > 0) {
    video.currentTime = savedTime.time;
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
  $('#speed-select').on('change', function() { video.playbackRate = this.value; });

  // Fullscreen
  $('#fullscreen-btn').on('click', () => {
    if(!document.fullscreenElement) document.getElementById('player-container').requestFullscreen();
    else document.exitFullscreen();
  });

  // Theater
  $('#theater-btn').on('click', () => {
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
    if(e.target.tagName === 'INPUT') return;
    switch(e.key.toLowerCase()) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'arrowright': video.currentTime += 10; break;
      case 'arrowleft': video.currentTime -= 10; break;
      case 'f': $('#fullscreen-btn').click(); break;
      case 'm': video.muted = !video.muted; break;
    }
  });
}

// Helpers
function formatTime(s) {
  if(isNaN(s)) return "00:00";
  const m = Math.floor(s / 60);
  const sc = Math.floor(s % 60);
  return `${m < 10 ? '0'+m : m}:${sc < 10 ? '0'+sc : sc}`;
}

function saveHistory(bookId, chapterIndex) {
  let hist = JSON.parse(localStorage.getItem('pansa_history') || '[]');
  hist = hist.filter(h => h.bookId != bookId);
  hist.unshift({ bookId, chapterIndex, ...window.currentBookMeta });
  localStorage.setItem('pansa_history', JSON.stringify(hist.slice(0, 20)));
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
