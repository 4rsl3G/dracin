const router = require("express").Router();
const api = require("../lib/netshort");
const { safeText } = require("../lib/sanitize");

async function loadHomeData() {
  const [theaters] = await Promise.all([
    api.theaters()
  ]);
  return { theaters };
}

router.get("/", async (req, res) => {
  try {
    const data = await loadHomeData();
    res.render("index", {
      pageTitle: "NetShort Drama",
      initial: {
        theaters: data.theaters
      }
    });
  } catch (e) {
    res.render("index", {
      pageTitle: "NetShort Drama",
      initial: { theaters: [] },
      error: "Gagal memuat data."
    });
  }
});

router.get("/p/home", async (req, res) => {
  try {
    const { theaters } = await loadHomeData();
    res.render("partials/home", { theaters });
  } catch (e) {
    res.status(500).send(`<div class="p-4 text-red-300">Gagal memuat home.</div>`);
  }
});

router.get("/p/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const data = q ? await api.search(q) : null;

    const list = data?.searchCodeSearchResult || [];
    const total = data?.total ?? list.length;

    res.render("partials/search", { q, list, total, safeText });
  } catch (e) {
    res.status(500).send(`<div class="p-4 text-red-300">Gagal search.</div>`);
  }
});

router.get("/p/drama/:id", async (req, res) => {
  try {
    const shortPlayId = req.params.id;
    const data = await api.allEpisode(shortPlayId);

    const drama = {
      shortPlayId: data.shortPlayId,
      shortPlayName: data.shortPlayName,
      shortPlayCover: data.shortPlayCover,
      shortPlayLabels: data.shortPlayLabels || [],
      shotIntroduce: data.shotIntroduce || "",
      totalEpisode: data.totalEpisode || (data.shortPlayEpisodeInfos ? data.shortPlayEpisodeInfos.length : 0),
      isFinish: data.isFinish
    };

    const episodes = Array.isArray(data.shortPlayEpisodeInfos) ? data.shortPlayEpisodeInfos : [];

    res.render("partials/drama", { drama, episodes, safeText });
  } catch (e) {
    res.status(500).send(`<div class="p-4 text-red-300">Gagal memuat drama.</div>`);
  }
});

module.exports = router;
