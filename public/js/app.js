/**
 * STREAM SIMPLE APP LOGIC
 * Stack: jQuery + Vanilla JS + HLS.js
 * Features: PJAX Navigation, HLS Streaming, UI Interactions
 */

// --- Global State Management ---
const AppState = {
    hls: null,              // Instance HLS.js
    countdownInterval: null // Instance Timer
};

$(document).ready(function() {
    // Initial Setup
    initApp();

    // Handle Browser Back/Forward Buttons
    window.addEventListener('popstate', function() {
        loadPage(window.location.href, false);
    });

    // Delegated Event Listeners (Binding Global untuk elemen dinamis)
    bindGlobalEvents();
});

/**
 * Main Initialization (Runs on first load & after PJAX swap)
 */
function initApp() {
    // Reset State
    if (AppState.hls) {
        AppState.hls.destroy();
        AppState.hls = null;
    }
    if (AppState.countdownInterval) {
        clearInterval(AppState.countdownInterval);
        AppState.countdownInterval = null;
    }

    // Initialize Page Specifics
    initPlayer();
    initCountdown();
    
    // Scroll to top
    window.scrollTo(0, 0);
}

/**
 * Bind Events that don't need re-binding after AJAX
 */
function bindGlobalEvents() {
    // 1. Intercept Links for SPA Navigation
    $(document).on('click', 'a.spa-link', function(e) {
        e.preventDefault();
        const url = $(this).attr('href');
        if (url && url !== '#') {
            loadPage(url, true);
        }
    });

    // 2. Search Form Handling
    $(document).on('submit', '#search-form, #mobile-search-form', function(e) {
        e.preventDefault();
        const q = $(this).find('input[name="q"]').val();
        const url = `/home?q=${encodeURIComponent(q)}`;
        loadPage(url, true);
    });

    // 3. Language Selector
    $(document).on('change', '#lang-select', function() {
        const lang = $(this).val();
        $.get(`/set-lang/${lang}`, function() {
            window.location.reload(); // Full reload needed for lang change to affect layouts
        });
    });

    // 4. Modal Close
    $(document).on('click', '#info-modal button', function() {
        $('#info-modal').addClass('hidden');
    });
}

/**
 * PJAX Page Loader
 * @param {string} url - URL to fetch
 * @param {boolean} pushState - Whether to push to history
 */
function loadPage(url, pushState) {
    const $main = $('#main-content');
    
    // UI Loading State
    $main.css('opacity', '0.5');

    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            // Parse HTML response
            const doc = new DOMParser().parseFromString(response, 'text/html');
            
            // Extract Content
            const newContent = $(doc).find('#main-content').html();
            const newTitle = $(doc).attr('title');
            
            // Extract Scripts (layout extraction support)
            // jQuery .html() executes inline scripts, but we ensure safety
            $main.html(newContent).css('opacity', '1');

            // Update Title
            document.title = newTitle;

            // Update History
            if (pushState) {
                history.pushState({}, newTitle, url);
            }

            // Re-Initialize App Logic
            initApp();
        },
        error: function() {
            $main.css('opacity', '1');
            alert('Failed to load content. Please check your connection.');
        }
    });
}

/**
 * Video Player Logic (HLS.js)
 */
function initPlayer() {
    const video = document.getElementById('video-player');
    
    // Check if we are on a player page
    if (!video) return;

    // Retrieve data: Priority Window Object (Layout extracted) -> Fallback ID
    let sources = window.VIDEO_DATA; 
    
    // Safety check if window.VIDEO_DATA wasn't updated by PJAX yet
    if (!sources) {
        const scriptData = document.getElementById('video-data');
        if (scriptData) {
            try { sources = JSON.parse(scriptData.textContent); } catch(e) {}
        }
    }

    if (!sources) return;

    const defaultSource = sources.video_720 || sources.video_1080 || sources.video_480;

    // HLS Support Check
    if (Hls.isSupported()) {
        AppState.hls = new Hls();
        AppState.hls.loadSource(defaultSource);
        AppState.hls.attachMedia(video);
        
        AppState.hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(() => console.log('Autoplay blocked by browser'));
            setupQualityControls(sources, video);
        });
    } 
    // Native HLS (Safari/iOS)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = defaultSource;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
        setupQualityControls(sources, video, true); // True = native mode
    }
}

/**
 * Quality Controls Logic
 */
function setupQualityControls(sources, video, isNative = false) {
    const $select = $('#quality-selector');
    $select.empty();

    // Populate Options
    Object.keys(sources).forEach(key => {
        const label = key.replace('video_', '') + 'p';
        const isSelected = (sources[key] === video.src || key === 'video_720') ? 'selected' : '';
        $select.append(`<option value="${sources[key]}" ${isSelected}>${label}</option>`);
    });

    // Handle Change
    $select.off('change').on('change', function() {
        const newUrl = $(this).val();
        const currentTime = video.currentTime;
        const isPaused = video.paused;

        if (isNative) {
            video.src = newUrl;
            video.currentTime = currentTime;
            if (!isPaused) video.play();
        } else if (AppState.hls) {
            AppState.hls.loadSource(newUrl);
            // HLS.js usually handles seeking after manifest load, 
            // but we ensure position is kept
            AppState.hls.on(Hls.Events.LEVEL_LOADED, function() {
                video.currentTime = currentTime;
                if (!isPaused) video.play();
                AppState.hls.off(Hls.Events.LEVEL_LOADED);
            });
        }
    });
}

/**
 * Countdown Timer
 */
function initCountdown() {
    const el = document.getElementById('countdown');
    if (!el) return;

    const expiresTimestamp = parseInt(el.getAttribute('data-expires'), 10);
    
    const updateTick = () => {
        const now = Math.floor(Date.now() / 1000);
        const diff = expiresTimestamp - now;

        if (diff <= 0) {
            el.innerText = "Link Expired";
            el.className = "font-mono font-bold text-red-600";
            if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
            return;
        }

        const m = Math.floor(diff / 60);
        const s = diff % 60;
        el.innerText = `${m}m ${s < 10 ? '0' + s : s}s`;
    };

    updateTick(); // Run immediately
    AppState.countdownInterval = setInterval(updateTick, 1000);
}

/**
 * Global Helpers
 */
window.showLockedModal = function() {
    $('#modal-msg').text('This episode is locked. Please upgrade to premium (Demo).');
    $('#info-modal').removeClass('hidden');
};
