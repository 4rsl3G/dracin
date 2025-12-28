// Init Home
window.initHome = function() {
  // Panggil Proxy Lokal
  $.get('/api/foryou', function(data) {
    if(data.code === 200) {
        renderGrid(data.data.list, '#foryou-container');
    } else {
        $('#foryou-container').html('<div class="text-center p-4 text-gray-500">Gagal memuat data.</div>');
    }
  });

  let page = 1;
  const observer = new IntersectionObserver((entries) => {
    if(entries[0].isIntersecting) loadNew(page++);
  });
  
  const sentinel = document.getElementById('sentinel');
  if(sentinel) observer.observe(sentinel);
};

function loadNew(page) {
  $.get(`/api/new?page=${page}`, function(data) {
    if(data.code === 200 && data.data.list) {
      renderGrid(data.data.list, '#new-container', true);
    }
  });
}

// Init Categories
window.initCategories = function() {
  $.get('/api/categories', function(data) {
    if(data.code === 200) {
      const html = data.data.map(c => 
        `<button class="px-4 py-1 border border-gray-300 dark:border-gray-700 rounded-full text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex-shrink-0" onclick="loadGenre(${c.id})">${c.name}</button>`
      ).join('');
      $('#categories-list').html(html);
      if(data.data.length > 0) loadGenre(data.data[0].id);
    }
  });
};

window.loadGenre = function(id) {
  $('#category-results').html('<div class="col-span-3 text-center py-8 text-gray-500">Loading genre...</div>');
  $.get(`/api/classify?genre=${id}`, function(data) {
    if(data.code === 200) renderGrid(data.data.list, '#category-results');
    else $('#category-results').html('<div class="col-span-3 text-center">Empty</div>');
  });
};

// Init Search
window.initSearch = function() {
  let timer;
  $('#search-input').on('input', function() {
    clearTimeout(timer);
    const q = $(this).val();
    if(q.length < 2) return;
    
    timer = setTimeout(() => {
      $.get(`/api/search?q=${q}`, function(data) {
        if(data.code === 200) renderGrid(data.data.list, '#search-results');
      });
    }, 500);
  });
};

// Init History
window.initHistory = function() {
  const hist = JSON.parse(localStorage.getItem('pansa_history') || '[]');
  if(hist.length > 0) {
    const html = hist.map(h => `
      <a href="/watch/${h.bookId}" class="nav-link flex gap-4 p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
        <div class="w-20 h-28 bg-gray-300 bg-cover rounded flex-shrink-0" style="background-image:url(${h.cover})"></div>
        <div class="flex flex-col py-1">
           <h3 class="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 text-sm">${h.title}</h3>
           <p class="text-xs text-gray-500 mt-1">Episode ${h.chapterIndex + 1}</p>
           <div class="mt-auto">
             <span class="text-[10px] px-2 py-1 bg-black text-white dark:bg-white dark:text-black rounded">Lanjutkan</span>
           </div>
        </div>
      </a>
    `).join('');
    $('#history-list').html(html);
  } else {
    $('#history-list').html('<p class="text-center text-gray-500 py-10">Belum ada riwayat tontonan.</p>');
  }
};

// Helper Render
function renderGrid(list, selector, append = false) {
  if(!list || list.length === 0) return;
  
  const html = list.map(item => `
    <a href="/watch/${item.id}" class="nav-link group relative block">
      <div class="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative shadow-sm border border-transparent hover:border-gray-500 transition-colors">
        <img src="${item.cover_url}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div class="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p class="text-white text-xs font-medium truncate drop-shadow-md">${item.book_name}</p>
        </div>
      </div>
    </a>
  `).join('');
  
  if(append) $(selector).append(html);
  else $(selector).html(html);
}
