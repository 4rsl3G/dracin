$(document).ready(function() {
  function handleLink(e) {
    const href = $(this).attr('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;
    
    e.preventDefault();
    history.pushState(null, '', href);
    loadPage(href);
  }

  window.loadPage = function(url) {
    $('#app').css('opacity', '0.5');
    
    $.ajax({
      url: url,
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      success: function(response) {
        // Extract content logic or direct injection
        // Since server renders partial on XHR, we inject directly
        $('#app').html(response).css('opacity', '1');
        window.scrollTo(0, 0);
        
        // Re-init scripts based on view
        if (url === '/' || url.includes('/new')) window.initHome();
        if (url.includes('/watch/')) window.initDetail(url.split('/').pop());
        if (url.includes('/categories')) window.initCategories();
        if (url.includes('/search')) window.initSearch();
        if (url.includes('/history')) window.initHistory();
      },
      error: function() {
        $('#app').html('<div class="text-center p-10">Error loading page. <button onclick="location.reload()">Retry</button></div>');
      }
    });
  };

  $(document).on('click', '.nav-link', handleLink);
  
  window.onpopstate = function() {
    loadPage(location.pathname);
  };

  // Initial Router Check
  const path = location.pathname;
  if (path === '/') window.initHome();
  else if (path.includes('/watch/')) window.initDetail(path.split('/').pop());
  else if (path.includes('/categories')) window.initCategories();
  else if (path.includes('/search')) window.initSearch();
  else if (path.includes('/history')) window.initHistory();
});
