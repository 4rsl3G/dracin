// Init Home
window.initHome = function() {
  console.log("Loading Home Data...");

  // 1. FOR YOU
  $.get('/api/foryou', function(res) {
    console.log("ForYou Res:", res); // Cek console browser kalau error
    
    // LOGIKA BARU: Cek data lebih longgar
    // Selama ada res.data.list, tampilkan saja
    if(res && res.data && Array.isArray(res.data.list)) {
        renderGrid(res.data.list, '#foryou-container');
    } else {
        $('#foryou-container').html('<div class="col-span-3 text-center text-xs text-gray-500 py-4">Data For You kosong.</div>');
    }
  }).fail(function() {
      // Error hanya jika koneksi ke server sendiri mati
      $('#foryou-container').html('<div class="col-span-3 text-center text-xs text-gray-500 py-4">Gagal koneksi.</div>');
  });

  // 2. NEW ARRIVALS
  let page = 1;
  const observer = new IntersectionObserver((entries) => {
    if(entries[0].isIntersecting) {
        loadNew(page);
        page++;
    }
  });
  
  const sentinel = document.getElementById('sentinel');
  if(sentinel) observer.observe(sentinel);
};

function loadNew(currentPage) {
  $.get(`/api/new/${currentPage}`, function(res) {
    if(res && res.data && Array.isArray(res.data.list)) {
      if(res.data.list.length > 0) {
          renderGrid(res.data.list, '#new-container', true);
      } else {
          $('#sentinel').hide();
      }
    }
  });
}

// Categories
window.initCategories = function() {
  $.get('/api/categories', function(res) {
    // Cek res.data saja
    if(res && Array.isArray(res.data)) {
      const html = res.data.map(c => 
        `<button class="flex-shrink-0 px-4 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" onclick="loadGenre(${c.id}, this)">${c.name}</button>`
      ).join('');
      $('#categories-list').html(html);
      if(res.data.length > 0) loadGenre(res.data[0].id);
    }
  });
};

window.loadGenre = function(id, btn) {
  if(btn) {
      $('#categories-list button').removeClass('bg-black text-white dark:bg-white dark:text-black').addClass('border-gray-200 dark:border-gray-800');
      $(btn).removeClass('border-gray-200 dark:border-gray-800').addClass('bg-black text-white dark:bg-white dark:text-black');
  }

  $('#category-results').html('<div class="col-span-full text-center py-10"><div class="inline-block w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div></div>');
  
  $.get(`/api/classify?genre=${id}`, function(res) {
    if(res && res.data && Array.isArray(res.data.list)) {
        renderGrid(res.data.list, '#category-results');
    } else {
        $('#category-results').html('<div class="col-span-full text-center py-10 text-gray-500">Kosong.</div>');
    }
  });
};

// Search
window.initSearch = function() {
  let timer;
  $('#search-input').on('input', function() {
    clearTimeout(timer);
    const q = $(this).val();
    if(q.length < 2) return;
    
    timer = setTimeout(() => {
      $.get(`/api/search/${encodeURIComponent(q)}/1`, function(res) {
        if(res && res.data && Array.isArray(res.data.list)) {
            renderGrid(res.data.list, '#search-results');
        } else {
            $('#search-results').html('<div class="col-span-full text-center py-4 text-gray-500">Tidak ditemukan.</div>');
        }
      });
    }, 600);
  });
};

// History (Tidak berubah, karena pakai localStorage)
window.initHistory = function() {
  const hist = JSON.parse(localStorage.getItem('pansa_history') || '[]');
  if(hist.length > 0) {
    const html = hist.map(h => `
      <a href="/watch/${h.bookId}" class="nav-link flex gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all">
        <div class="w-16 h-20 bg-gray-200 rounded-lg bg-cover bg-center flex-shrink-0" style="background-image:url(${h.cover})"></div>
        <div class="flex flex-col justify-center min-w-0">
           <h3 class="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">${h.title}</h3>
           <p class="text-xs text-gray-500 mt-1">Lanjut Episode ${h.chapterIndex + 1}</p>
        </div>
      </a>
    `).join('');
    $('#history-list').html(html);
  } else {
    $('#history-list').html('<div class="text-center py-10 text-gray-400 text-sm">Belum ada riwayat.</div>');
  }
};

// Render Helper
function renderGrid(list, selector, append = false) {
  if(!list || list.length === 0) {
      if(!append) $(selector).html(''); 
      return;
  }
  
  const html = list.map(item => `
    <a href="/watch/${item.id}" class="nav-link group relative block overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
      <div class="aspect-[2/3] w-full relative">
        <img src="${item.cover_url}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" alt="${item.book_name}">
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
        <div class="absolute bottom-0 left-0 w-full p-3">
          <p class="text-white text-xs font-semibold leading-tight line-clamp-2 drop-shadow-md">${item.book_name}</p>
        </div>
      </div>
    </a>
  `).join('');
  
  if(append) $(selector).append(html);
  else $(selector).html(html);
}
