const express = require("express");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");

const pages = require("./src/routes/pages");
const proxy = require("./src/routes/proxy");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));

app.use("/public", express.static(path.join(__dirname, "public"), {
  maxAge: "7d",
  etag: true
}));

app.use("/", pages);
app.use("/api", proxy);

// 404
app.use((req, res) => {
  res.status(404).send("Not Found");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("NetShort Web running on port", PORT));
