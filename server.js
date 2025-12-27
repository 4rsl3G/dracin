const express = require("express");
const axios = require("axios");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const app = express();
const PORT = 3000;

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// ===== API BASE =====
const API_BASE = "https://netshort.sansekai.my.id/api";

// ===== HOME =====
app.get("/", async (req, res) => {
  const { data } = await axios.get(`${API_BASE}/foryou`);
  res.render("home", {
    title: "Streaming Drama Pendek",
    dramas: data.contentInfos
  });
});

// ===== SEARCH (GET for SEO) =====
app.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.render("search", { results: [], q: "" });

  const { data } = await axios.post(`${API_BASE}/search`, {
    keyword: q,
    language: "id_ID"
  });

  res.render("search", {
    q,
    results: data.searchCodeSearchResult
  });
});

// ===== SEARCH (POST for SPA) =====
app.post("/search", async (req, res) => {
  try {
    const { q } = req.body;
    const { data } = await axios.post(`${API_BASE}/search`, {
      keyword: q,
      language: "id_ID"
    });
    res.json(data.searchCodeSearchResult);
  } catch (e) {
    res.status(500).json({ error: true });
  }
});

// ===== WATCH =====
app.get("/watch/:id", async (req, res) => {
  const id = req.params.id;
  res.render("watch", {
    title: "Watch Drama",
    id
  });
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`🔥 Server jalan http://localhost:${PORT}`);
});
