window.initDetail = function(bookId) {
  if(!bookId) return;
  
  // 1. Detail
  $.get(`/api/book/${bookId}/detail`, function(res) {
    if(res.code === 200) {
      const b = res.data;
      $('#book-info').html(`
        <h1 class="text-xl md:text-2xl font-bold mb-2 text-gray-900 dark:text-white leading-tight">${b.book_name}</h1>
        <div class="flex flex-wrap gap-2 mb-3">
           ${b.tags ? b.tags.split(',').map(t => `<span class="text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700">${t}</span>`).join('') : ''}
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">${b.summary}</p>
      `);
      
      window.currentBookMeta = { id: b.id, title: b.book_name, cover: b.cover_url };
    }
  });

  // 2. Chapters
  $.get(`/api/book/${bookId}/chapters`, function(res) {
    if(res.code === 200) {
      window.chapters = res.data.chapters || [];
      const saved = getProgress(bookId);
      const startIdx = saved ? saved.chapterIndex : 0;
      
      renderChapters(window.chapters, startIdx);
      loadPlayer(bookId, startIdx);
    }
  });
};

function renderChapters(list, activeIdx) {
  const html = list.map((c, i) => `
    <button onclick="loadPlayer('${window.currentBookMeta.id}', ${i})" 
      class="h-10 w-full flex items-center justify-center text-xs font-semibold rounded border transition-all duration-200
      ${i == activeIdx 
        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md scale-105' 
        : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600'}">
      ${i + 1}
    </button>
  `).join('');
  $('#chapter-list').html(html);
}

window.loadPlayer = async function(bookId, chapterIndex) {
  const video = document.getElementById('main-video');
  const status = document.getElementById('player-status');
  
  renderChapters(window.chapters, chapterIndex);

  status.style.display = 'flex';
  status.innerHTML = '<div class="loader w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>';

  try {
    const res = await $.ajax({
      url: '/api/player',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ bookId, chapterIndex })
    });
    
    if (res.code === 200 && res.data && res.data.url) {
      video.src = res.data.url;
      video.load();
      status.style.display = 'none';
      
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => {
            status.innerHTML = '<button onclick="document.getElementById(\'main-video\').play(); this.parentElement.style.display=\'none\'" class="bg-white/20 hover:bg-white/30 p-4 rounded-full backdrop-blur-sm text-white">▶ Play</button>';
            status.style.display = 'flex';
        });
      }
      
      setupControls(video, bookId, chapterIndex);
      saveHistory(bookId, chapterIndex);
    } else {
      throw new Error('No URL');
    }
  } catch (e) {
    status.innerHTML = `<div class="text-center"><p class="text-white text-sm mb-2">Gagal memuat video</p><button onclick="loadPlayer('${bookId}',${chapterIndex})" class="text-xs bg-white text-black px-3 py-1 rounded">Retry</button></div>`;
  }
};

function setupControls(video, bookId, chapterIndex) {
  const btnPlay = $('#play-pause-btn');
  const seekFill = $('#seek-fill');
  const seekContainer = $('#seek-bar-container');
  const timeDisplay = $('#time-display');
  
  const wm = $('#watermark-overlay');
  wm.removeClass('hidden');
  if(window.wmInterval) clearInterval(window.wmInterval);
  window.wmInterval = setInterval(() => {
    wm.css({ top: (Math.random()*80+10)+'%', left: (Math.random()*80+10)+'%' });
  }, 15000);

  btnPlay.off().on('click', togglePlay);
  $(video).off().on('click', (e) => { if(!e.target.closest('#video-controls')) togglePlay(); });
  
  function togglePlay() {
    if(video.paused) {
      video.play();
      btnPlay.html('<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>');
    } else {
      video.pause();
      btnPlay.html('<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
    }
  }

  const saved = getProgress(bookId);
  if(saved && saved.chapterIndex == chapterIndex && saved.time > 0 && saved.time < video.duration) {
    video.currentTime = saved.time;
  }

  $(video).on('timeupdate', () => {
    const pct = (video.currentTime / video.duration) * 100;
    seekFill.css('width', pct + '%');
    timeDisplay.text(formatTime(video.currentTime));
    saveProgress(bookId, chapterIndex, video.currentTime);
  });

  seekContainer.off().on('click', (e) => {
    const w = e.currentTarget.getBoundingClientRect().width;
    const x = e.offsetX;
    video.currentTime = (x / w) * video.duration;
  });

  $('#fullscreen-btn').off().on('click', () => {
    const c = document.getElementById('player-container');
    document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen();
  });
  
  $(video).on('ended', () => {
    if(chapterIndex + 1 < window.chapters.length) loadPlayer(bookId, chapterIndex + 1);
  });
}

function formatTime(s) {
  if(isNaN(s)) return "00:00";
  const m = Math.floor(s/60), sc = Math.floor(s%60);
  return `${m<10?'0'+m:m}:${sc<10?'0'+sc:sc}`;
}
function saveHistory(bookId, chapterIndex) {
  let h = JSON.parse(localStorage.getItem('pansa_history')||'[]').filter(x=>x.bookId!=bookId);
  if(window.currentBookMeta) {
    h.unshift({bookId, chapterIndex, ...window.currentBookMeta});
    localStorage.setItem('pansa_history', JSON.stringify(h.slice(0,20)));
  }
}
function saveProgress(bookId, idx, time) {
  const d = JSON.parse(localStorage.getItem('pansa_progress')||'{}');
  d[bookId] = {chapterIndex: idx, time};
  localStorage.setItem('pansa_progress', JSON.stringify(d));
}
function getProgress(bookId) {
  return JSON.parse(localStorage.getItem('pansa_progress')||'{}')[bookId];
}
