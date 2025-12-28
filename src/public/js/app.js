window.initHome = function() {
  $.get('/api/foryou', function(data) {
    if(data.code === 200) renderGrid(data.data.list, '#foryou-container');
  });

  let page = 1;
  const observer = new IntersectionObserver((entries) => {
    if(entries[0].isIntersecting) {
      loadNew(page++);
    }
  });
  observer.observe(document.getElementById('sentinel'));
};

function loadNew(page) {
  $.get(`/api/new?page=${page}`, function(data) {
    if(data.code === 200 && data.data.list) {
      renderGrid(data.data.list, '#new-container', true);
    }
  });
}

window.initCategories = function() {
  $.get('/api/categories', function(data) {
    if(data.code === 200) {
      const html = data.data.map(c => 
        `<button class="px-4 py-1 border border-gray-300 dark:border-gray-700 rounded-full text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" onclick="loadGenre(${c.id})">${c.name}</button>`
      ).join('');
      $('#categories-list').html(html);
      loadGenre(data.data[0].id);
    }
  });
};

window.loadGenre = function(id) {
  $('#category-results').html('<div class="col-span-3 text-center">Loading...</div>');
  $.get(`/api/classify?genre=${id}`, function(data) {
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
      $.get(`/api/search?q=${q}`, function(data) {
        if(data.code === 200) renderGrid(data.data.list, '#search-results');
      });
    }, 500);
  });
};

window.initHistory = function() {
  const hist = JSON.parse(localStorage.getItem('pansa_history') || '[]');
  if(hist.length > 0) {
    const html = hist.map(h => `
      <a href="/watch/${h.bookId}" class="nav-link flex gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div class="w-16 h-24 bg-gray-300 bg-cover rounded" style="background-image:url(${h.cover})"></div>
        <div>
           <h3 class="font-bold">${h.title}</h3>
           <p class="text-sm text-gray-500">Chapter ${h.chapterIndex}</p>
           <div class="text-xs mt-2 px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded inline-block">Continue</div>
        </div>
      </a>
    `).join('');
    $('#history-list').html(html);
  }
};

function renderGrid(list, selector, append = false) {
  const html = list.map(item => `
    <a href="/watch/${item.id}" class="nav-link group relative block">
      <div class="aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded overflow-hidden relative">
        <img src="${item.cover_url}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
        <div class="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2">
          <p class="text-white text-xs truncate">${item.book_name}</p>
        </div>
      </div>
    </a>
  `).join('');
  
  if(append) $(selector).append(html);
  else $(selector).html(html);
}
