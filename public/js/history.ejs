(function () {
  const KEY = "ns_history_v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }

  function save(obj) {
    localStorage.setItem(KEY, JSON.stringify(obj));
  }

  function ensure() {
    const data = load();
    if (!data.items) data.items = [];
    if (!data.progress) data.progress = {};
    return data;
  }

  window.NSHistory = {
    getAll() {
      return ensure();
    },
    addItem(item) {
      const data = ensure();
      data.items = (data.items || []).filter(x => x.shortPlayId !== item.shortPlayId);
      data.items.unshift({ ...item, ts: Date.now() });
      data.items = data.items.slice(0, 60);
      save(data);
    },
    setProgress(shortPlayId, episodeNo, second) {
      const data = ensure();
      data.progress[shortPlayId] = {
        episodeNo: Number(episodeNo || 1),
        second: Number(second || 0),
        ts: Date.now()
      };
      save(data);
    },
    getProgress(shortPlayId) {
      const data = ensure();
      return data.progress[shortPlayId] || null;
    },
    clearProgress(shortPlayId) {
      const data = ensure();
      delete data.progress[shortPlayId];
      save(data);
    }
  };
})();
