function stripTags(html = "") {
  return String(html).replace(/<[^>]*>/g, "");
}

function safeText(s, max = 300) {
  const t = stripTags(s);
  return t.length > max ? t.slice(0, max) + "…" : t;
}

module.exports = { stripTags, safeText };
