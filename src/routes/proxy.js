const router = require("express").Router();
const api = require("../lib/netshort");

router.get("/theaters", async (req, res) => {
  try {
    const data = await api.theaters();
    res.json(data);
  } catch (e) {
    res.status(e.status || 500).json({ error: "Upstream error", message: e.message });
  }
});

router.get("/foryou", async (req, res) => {
  const pageNo = Number(req.query.pageNo || 1);
  const pageSize = Number(req.query.pageSize || 24);
  try {
    const data = await api.foryou(pageNo, pageSize);
    res.json(data);
  } catch (e) {
    res.status(e.status || 500).json({ error: "Upstream error", message: e.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const data = await api.search(q);
    res.json(data);
  } catch (e) {
    res.status(e.status || 500).json({ error: "Upstream error", message: e.message });
  }
});

router.get("/allepisode", async (req, res) => {
  try {
    const id = req.query.shortPlayId || "";
    const data = await api.allEpisode(id);
    res.json(data);
  } catch (e) {
    res.status(e.status || 500).json({ error: "Upstream error", message: e.message });
  }
});

module.exports = router;
