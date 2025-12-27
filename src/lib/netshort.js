const BASE = "https://netshort.sansekai.my.id/api";

function withTimeout(ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, done: () => clearTimeout(t) };
}

async function getJSON(url) {
  const { ctrl, done } = withTimeout(15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "accept": "application/json, text/plain, */*"
      }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`Upstream ${res.status}`);
      err.status = res.status;
      err.body = text.slice(0, 500);
      throw err;
    }
    return await res.json();
  } finally {
    done();
  }
}

module.exports = {
  theaters: () => getJSON(`${BASE}/netshort/theaters`),
  foryou: (pageNo = 1, pageSize = 24) =>
    getJSON(`${BASE}/netshort/foryou?pageNo=${encodeURIComponent(pageNo)}&pageSize=${encodeURIComponent(pageSize)}`),
  search: (q) =>
    getJSON(`${BASE}/netshort/search?keyword=${encodeURIComponent(q || "")}`),
  allEpisode: (shortPlayId) =>
    getJSON(`${BASE}/netshort/allepisode?shortPlayId=${encodeURIComponent(shortPlayId || "")}`)
};
