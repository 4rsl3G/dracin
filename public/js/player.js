(function () {
  const $modal = () => $("#playerModal");
  const $video = () => $("#videoEl")[0];

  let state = {
    shortPlayId: null,
    dramaName: "",
    episodes: [],
    idx: 0
  };

  function open() {
    $modal().removeClass("hidden");
    document.body.classList.add("overflow-hidden");
  }
  function close() {
    const v = $video();
    try { v.pause(); } catch {}
    $modal().addClass("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  function setMeta() {
    const ep = state.episodes[state.idx];
    $("#playerTitle").text(state.dramaName || "Player");
    $("#playerMeta").text(`Episode ${ep.episodeNo} • ${ep.playClarity || ""}`);
  }

  function playAt(idx, seekSecond) {
    if (idx < 0 || idx >= state.episodes.length) return;
    state.idx = idx;

    const ep = state.episodes[state.idx];
    const v = $video();
    v.src = ep.playVoucher || "";
    v.load();

    setMeta();
    open();

    // update history
    NSHistory.addItem({
      shortPlayId: state.shortPlayId,
      shortPlayName: state.dramaName,
      shortPlayCover: ep.episodeCover || "",
      episodeNo: ep.episodeNo
    });

    const onLoaded = () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      if (Number.isFinite(seekSecond) && seekSecond > 2) {
        try { v.currentTime = seekSecond; } catch {}
      }
      v.play().catch(() => {});
    };
    v.addEventListener("loadedmetadata", onLoaded);
  }

  function next(auto = false) {
    const nextIdx = state.idx + 1;
    if (nextIdx >= state.episodes.length) return;
    playAt(nextIdx, 0);
  }
  function prev() {
    const prevIdx = state.idx - 1;
    if (prevIdx < 0) return;
    playAt(prevIdx, 0);
  }

  function bind() {
    $("#btnClosePlayer").off("click").on("click", close);
    $("#btnNextEp").off("click").on("click", () => next(false));
    $("#btnPrevEp").off("click").on("click", prev);

    // auto next
    const v = $video();
    v.onended = () => next(true);

    // save progress periodically
    let lastTick = 0;
    v.ontimeupdate = () => {
      const now = Date.now();
      if (now - lastTick < 2000) return;
      lastTick = now;
      const ep = state.episodes[state.idx];
      if (!ep) return;
      NSHistory.setProgress(state.shortPlayId, ep.episodeNo, v.currentTime || 0);
    };
  }

  window.NSPlayer = {
    init({ shortPlayId, dramaName, episodes }) {
      state.shortPlayId = shortPlayId;
      state.dramaName = dramaName || "";
      state.episodes = Array.isArray(episodes) ? episodes : [];
      state.idx = 0;
      bind();
    },
    openEpisodeByNo(episodeNo, seekSecond = 0) {
      const no = Number(episodeNo || 1);
      const idx = state.episodes.findIndex(e => Number(e.episodeNo) === no);
      playAt(idx >= 0 ? idx : 0, seekSecond);
    },
    openContinue() {
      const prog = NSHistory.getProgress(state.shortPlayId);
      if (prog) return this.openEpisodeByNo(prog.episodeNo, prog.second);
      return this.openEpisodeByNo(1, 0);
    }
  };
})();
