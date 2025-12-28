// Base URL API Upstream
const API_BASE = 'https://d.sapimu.au/api';
const LANG = 'in';

window.initHome = function() {
  // Direct call ke upstream
  $.get(`${API_BASE}/foryou/1?lang=${LANG}`, function(data) {
    if(data.code === 200) renderGrid(data.data.list, '#foryou-container');
    else $('#foryou-container').html('<p class="text-white">Gagal memuat data.</p>');
  }).fail(handleError);

  let page = 1;
  const observer = new IntersectionObserver((entries) => {
    if(entries[0].isIntersecting) {
      loadNew(page++);
    }
  });
  
  const sentinel = document.getElementById('sentinel');
  if(sentinel) observer.observe(sentinel);
};

function loadNew(page) {
  $.get(`${API_BASE}/new/${page}?lang=${LANG}&pageSize=10`, function(data) {
    if(data.code === 200 && data.data.list) {
      renderGrid(data.data.list, '#new-container', true);
    }
  });
}

window.initCategories = function() {
  $.get(`${API_BASE}/categories?lang=${LANG}`, function(data) {
    if(data.code === 200) {
      const html = data.data.map(c => 
        `<button class="px-4 py-1 border border-gray-300 dark:border-gray-700 rounded-full text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" onclick="loadGenre(${c.id})">${c.name}</button>`
      ).join('');
      $('#categories-list').html(html);
      // Load default genre (item pertama)
      if(data.data.length > 0) loadGenre(data.data[0].id);
    }
  });
};

window.loadGenre = function(id) {
  $('#category-results').html('<div class="col-span-3 text-center py-10">Loading...</div>');
  // Format API upstream untuk classify
  $.get(`${API_BASE}/classify?lang=${LANG}&pageNo=1&genre=${id}&sort=1`, function(data) {
    if(data.code === 200) renderGrid(data.data.list, '#category-results');
  });
};

window.initSearch = function() {
  let timer;
  $('#search-input').on('input', function() {
    clearTimeout(timer);
    const q = $(this).val();
    if(q.length < 2) return;
    
    timer = setTimeout(() => {
      // Direct call upstream search
      $.get(`${API_BASE}/search/${encodeURIComponent(q)}/1?lang=${LANG}`, function(data) {
        if(data.code === 200) renderGrid(data.data.list, '#search-results');
      });
    }, 500);
  });
};

window.initHistory = function() {
  const hist = JSON.parse(localStorage.getItem('pansa_history') || '[]');
  if(hist.length > 0) {
    const html = hist.map(h => `
      <a href="/watch/${h.bookId}" class="nav-link flex gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
        <div class="w-16 h-24 bg-gray-300 bg-cover rounded flex-shrink-0" style="background-image:url(${h.cover})"></div>
        <div class="flex flex-col justify-center">
           <h3 class="font-bold text-gray-900 dark:text-gray-100 line-clamp-2">${h.title}</h3>
           <p class="text-sm text-gray-500 mt-1">Chapter ${h.chapterIndex + 1}</p>
           <div class="text-xs mt-2 px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded inline-block w-fit">Lanjut Nonton</div>
        </div>
      </a>
    `).join('');
    $('#history-list').html(html);
  }
};

function renderGrid(list, selector, append = false) {
  if(!list || list.length === 0) return;
  
  const html = list.map(item => `
    <a href="/watch/${item.id}" class="nav-link group relative block">
      <div class="aspect-[2/3] bg-gray-800 rounded overflow-hidden relative shadow-md">
        <img src="${item.cover_url}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
        <div class="absolute bottom-0 w-full p-2">
          <p class="text-white text-xs font-medium truncate">${item.book_name}</p>
        </div>
      </div>
    </a>
  `).join('');
  
  if(append) $(selector).append(html);
  else $(selector).html(html);
}

function handleError(xhr) {
  console.error(xhr);
  // Jika error CORS atau 403, user akan melihat ini
  if(xhr.status === 0) {
    alert("Koneksi API diblokir (CORS) atau Network Error. Cek koneksi internet.");
  }
}
