(function () {
  // --- SPA loader (partial HTML) ---
  async function loadPartial(url, push = true) {
    $("#spaRoot").addClass("opacity-60 pointer-events-none");
    try {
      const html = await $.get(url);
      $("#spaRoot").html(html);
      if (push) history.pushState({ url }, "", url === "/p/home" ? "/" : url);
      afterPartialLoaded();
    } finally {
      $("#spaRoot").removeClass("opacity-60 pointer-events-none");
    }
  }

  function isPartialUrl(href) {
    return href.startsWith("/p/");
  }

  function normalizeHref(href) {
    if (href === "/") return "/p/home";
    return href;
  }

  // --- Infinite render helpers ---
  function createDramaCard(item) {
    const cover = item.shortPlayCover || item.groupShortPlayCover || "";
    const title = item.shortPlayName || "";
    const labels = (item.labelArray || item.labelNameList || []).slice(0, 3);

    return `
      <a href="/p/drama/${item.shortPlayId}" data-spa
         class="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
        <div class="relative aspect-[3/4] overflow-hidden">
          <img src="${cover}" alt="" class="h-full w-full object-cover group-hover:scale-[1.03] transition duration-300" loading="lazy" />
          <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div class="line-clamp-2 text-sm font-semibold leading-snug">${title}</div>
            <div class="mt-2 flex flex-wrap gap-1">
              ${labels.map(l => `<span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">${l}</span>`).join("")}
            </div>
          </div>
        </div>
      </a>
    `;
  }

  function attachInfiniteGrid($grid, items, chunk = 12) {
    let cursor = 0;

    function renderMore() {
      const next = items.slice(cursor, cursor + chunk);
      if (!next.length) return false;
      cursor += next.length;
      const html = next.map(createDramaCard).join("");
      $grid.append(html);
      return true;
    }

    // initial
    renderMore();

    // observer
    const sentinel = document.createElement("div");
    sentinel.className = "h-6";
    $grid.after(sentinel);

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const ok = renderMore();
          if (!ok) io.disconnect();
        }
      }
    }, { rootMargin: "800px" });

    io.observe(sentinel);
  }

  function attachInfiniteEpisodes($list, episodes, shortPlayId) {
    let cursor = 0;
    const chunk = 14;

    function episodeRow(ep) {
      const locked = ep.isLock ? "opacity-60" : "";
      const badge = ep.isVip ? "VIP" : (ep.isAd ? "AD" : (ep.isLock ? "LOCK" : "FREE"));
      const badgeCls = ep.isLock ? "bg-rose-500/20 border-rose-500/30 text-rose-200"
        : ep.isVip ? "bg-amber-500/20 border-amber-500/30 text-amber-200"
        : "bg-emerald-500/20 border-emerald-500/30 text-emerald-200";

      return `
        <button data-episode-no="${ep.episodeNo}"
          class="text-left ${locked} group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden">
          <div class="flex gap-3 p-3">
            <div class="relative w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <img src="${ep.episodeCover || ""}" class="h-20 w-20 object-cover" loading="lazy" />
              <div class="absolute bottom-1 left-1 rounded-lg px-2 py-0.5 text-[10px] border ${badgeCls}">${badge}</div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold">Episode ${ep.episodeNo}</div>
                <div class="text-xs text-white/60">${ep.playClarity || ""}</div>
              </div>
              <div class="mt-1 text-xs text-white/60">Like: ${ep.likeNums || "-"} • Chase: ${ep.chaseNums || "-"}</div>
              <div class="mt-2 text-xs text-white/70">Klik untuk play • Auto next</div>
            </div>
          </div>
        </button>
      `;
    }

    function renderMore() {
      const next = episodes.slice(cursor, cursor + chunk);
      if (!next.length) return false;
      cursor += next.length;
      $list.append(next.map(episodeRow).join(""));
      return true;
    }

    renderMore();

    // click to play
    $list.off("click").on("click", "button[data-episode-no]", function () {
      const no = Number($(this).data("episode-no") || 1);
      NSHistory.addItem({ shortPlayId, episodeNo: no });
      window.__OPEN_EPISODE_NO__ = no;
      NSPlayer.openEpisodeByNo(no, 0);
    });

    const sentinel = document.createElement("div");
    sentinel.className = "h-8";
    $list.after(sentinel);

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const ok = renderMore();
          if (!ok) io.disconnect();
        }
      }
    }, { rootMargin: "900px" });

    io.observe(sentinel);
  }

  // --- After partial hooks ---
  function afterPartialLoaded() {
    // 1) grids (home/search)
    $("[data-infinite-grid]").each(function () {
      const $grid = $(this);
      if ($grid.data("__bound")) return;
      $grid.data("__bound", true);

      const raw = decodeURIComponent($grid.attr("data-items") || "%5B%5D");
      let items = [];
      try { items = JSON.parse(raw) || []; } catch {}
      attachInfiniteGrid($grid, items, 12);
    });

    // 2) drama episode list
    const $episodeList = $("#episodeList");
    if ($episodeList.length) {
      const raw = decodeURIComponent($episodeList.attr("data-episodes") || "%5B%5D");
      let eps = [];
      try { eps = JSON.parse(raw) || []; } catch {}
      const shortPlayId = $episodeList.attr("data-shortplay");

      // init player state
      const dramaName = $(".lg\\:col-span-4 .text-lg.font-semibold").first().text() || "Drama";
      NSPlayer.init({ shortPlayId, dramaName, episodes: eps });

      attachInfiniteEpisodes($episodeList, eps, shortPlayId);

      $("#btnPlayContinue").off("click").on("click", () => NSPlayer.openContinue());
      $("#btnClearProgress").off("click").on("click", () => {
        NSHistory.clearProgress(shortPlayId);
        alert("Progress direset.");
      });

      // auto open continue if user coming from history (optional)
      const prog = NSHistory.getProgress(shortPlayId);
      if (prog) {
        // no auto-play; user click continue
      }
    }
  }

  // --- SPA events ---
  $(document).on("click", "a[data-spa]", function (e) {
    const href = $(this).attr("href");
    if (!href) return;
    e.preventDefault();
    const target = normalizeHref(href);
    loadPartial(target, true);
  });

  window.addEventListener("popstate", (ev) => {
    const url = (ev.state && ev.state.url) ? ev.state.url : normalizeHref(location.pathname + location.search);
    loadPartial(url, false);
  });

  // --- Search UI ---
  $("#openSearchMobile").on("click", () => $("#mobileSearchSheet").removeClass("hidden"));
  $("#mobileSearchClose").on("click", () => $("#mobileSearchSheet").addClass("hidden"));

  function goSearch(q) {
    const url = `/p/search?q=${encodeURIComponent(q || "")}`;
    loadPartial(url, true);
    $("#mobileSearchSheet").addClass("hidden");
  }

  $("#mobileSearchGo").on("click", () => goSearch($("#mobileSearchInput").val()));
  $("#topSearchForm").on("submit", (e) => {
    e.preventDefault();
    goSearch($("#topSearchInput").val());
  });

  // --- Home reload ---
  $(document).on("click", "#btnReloadHome", () => loadPartial("/p/home", true));

  // --- History modal simple ---
  $("#openHistory").on("click", (e) => {
    e.preventDefault();
    const data = NSHistory.getAll();
    const items = data.items || [];
    const html = `
      <div class="fixed inset-0 z-[90]">
        <div class="absolute inset-0 bg-black/70"></div>
        <div class="absolute left-1/2 top-14 -translate-x-1/2 w-[min(92vw,720px)]">
          <div class="rounded-3xl border border-white/10 bg-slate-950 overflow-hidden">
            <div class="p-4 border-b border-white/10 flex items-center justify-between">
              <div class="font-semibold">History</div>
              <button id="closeHistory" class="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs border border-white/10">Close</button>
            </div>
            <div class="p-4 space-y-2 max-h-[70vh] overflow-auto">
              ${items.length ? items.map(it => `
                <a href="/p/drama/${it.shortPlayId}" data-spa
                   class="block rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-3">
                  <div class="text-sm font-semibold">${it.shortPlayName || "Drama"}</div>
                  <div class="text-xs text-white/60 mt-1">Episode ${it.episodeNo || 1}</div>
                </a>
              `).join("") : `<div class="text-white/60 text-sm">Belum ada history.</div>`}
            </div>
          </div>
        </div>
      </div>
    `;
    $("body").append(`<div id="historyOverlay">${html}</div>`);
    $("#closeHistory").on("click", () => $("#historyOverlay").remove());
  });

  // initial
  afterPartialLoaded();
})();
