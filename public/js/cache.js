'use strict';

(function () {
  const NS = 'panstream_cache_v1';

  function now() { return Date.now(); }

  function readAll() {
    try { return JSON.parse(localStorage.getItem(NS) || '{}'); }
    catch { return {}; }
  }

  function writeAll(obj) {
    try { localStorage.setItem(NS, JSON.stringify(obj)); } catch {}
  }

  window.PSCache = {
    get(key) {
      const all = readAll();
      const it = all[key];
      if (!it) return null;
      if (it.exp && now() > it.exp) {
        delete all[key];
        writeAll(all);
        return null;
      }
      return it.val;
    },
    set(key, val, ttlMs) {
      const all = readAll();
      all[key] = { val, exp: ttlMs ? now() + ttlMs : 0 };
      writeAll(all);
    },
    del(key) {
      const all = readAll();
      delete all[key];
      writeAll(all);
    }
  };
})();
