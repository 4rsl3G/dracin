// Global State
let hlsInstance = null;

$(document).ready(function() {
    initApp();

    // Browser Back/Forward Handling
    window.addEventListener('popstate', function() {
        loadPage(window.location.href, false);
    });
});

function initApp() {
    bindLinks();
    bindSearch();
    bindLang();
    initPlayer(); // Only runs if player element exists
    startCountdown(); // Only runs if countdown element exists
}

// ---------------------------
// SPA / PJAX Navigation
// ---------------------------
function bindLinks() {
    $(document).off('click', 'a.spa-link').on('click', 'a.spa-link', function(e) {
        e.preventDefault();
        const url = $(this).attr('href');
        loadPage(url, true);
    });
}

function loadPage(url, pushState) {
    // Show top loading bar if you wanted one, for now just simple opacity
    $('#main-content').css('opacity', '0.5');

    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            // Parse the full HTML response to extract #main-content
            const newDoc = new DOMParser().parseFromString(response, 'text/html');
            const newContent = $(newDoc).find('#main-content').html();
            const newTitle = $(newDoc).attr('title');

            // Swap content
            $('#main-content').html(newContent).css('opacity', '1');
            document.title = newTitle;

            // Scroll top
            window.scrollTo(0, 0);

            // Update URL
            if (pushState) {
                history.pushState({}, newTitle, url);
            }

            // Re-init scripts for the new content
            if (hlsInstance) {
                hlsInstance.destroy();
                hlsInstance = null;
            }
            initApp();
        },
        error: function() {
            $('#main-content').css('opacity', '1');
            alert('Failed to load content.');
        }
    });
}

// ---------------------------
// Search & Language
// ---------------------------
function bindSearch() {
    $('#search-form, #mobile-search-form').off('submit').on('submit', function(e) {
        e.preventDefault();
        const q = $(this).find('input[name="q"]').val();
        const url = `/home?q=${encodeURIComponent(q)}`;
        loadPage(url, true);
    });
}

function bindLang() {
    $('#lang-select').off('change').on('change', function() {
        const lang = $(this).val();
        $.get(`/set-lang/${lang}`, function() {
            // Reload current page to apply lang
            window.location.reload(); 
        });
    });
}

// ---------------------------
// Video Player Logic (HLS)
// ---------------------------
function initPlayer() {
    const video = document.getElementById('video-player');
    const dataEl = document.getElementById('video-data');
    
    if (!video || !dataEl) return;

    const sources = JSON.parse(dataEl.textContent);
    // Default to 720 or highest available
    const sourceUrl = sources.video_720 || sources.video_1080 || sources.video_480;

    if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(sourceUrl);
        hlsInstance.attachMedia(video);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(e => console.log("Auto-play prevented"));
            updateQualityControls(sources);
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    }
}

function updateQualityControls(sources) {
    const $select = $('#quality-selector');
    $select.empty();
    
    // Simplistic Quality switch logic: reload source
    // A better implementation would use hls.levels, 
    // but the API provides distinct URLs for qualities.
    
    Object.keys(sources).forEach(key => {
        const label = key.replace('video_', '') + 'p';
        $select.append(`<option value="${sources[key]}">${label}</option>`);
    });

    $select.on('change', function() {
        const newUrl = $(this).val();
        const currentTime = document.getElementById('video-player').currentTime;
        
        if (hlsInstance) {
            hlsInstance.loadSource(newUrl);
            hlsInstance.attachMedia(document.getElementById('video-player'));
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
                const vid = document.getElementById('video-player');
                vid.currentTime = currentTime;
                vid.play();
            });
        }
    });
}

// ---------------------------
// Helpers
// ---------------------------
function startCountdown() {
    const el = document.getElementById('countdown');
    if (!el) return;

    const expires = parseInt(el.getAttribute('data-expires'));
    
    const tick = () => {
        const now = Math.floor(Date.now() / 1000);
        const diff = expires - now;

        if (diff <= 0) {
            el.innerText = "Expired";
            return;
        }

        const m = Math.floor(diff / 60);
        const s = diff % 60;
        el.innerText = `${m}m ${s < 10 ? '0'+s : s}s`;
    };

    tick();
    setInterval(tick, 1000);
}

// Exposed globally for inline onclick
window.showLockedModal = function() {
    $('#modal-msg').text('This episode is locked for demonstration purposes.');
    $('#info-modal').removeClass('hidden');
}
