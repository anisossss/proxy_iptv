require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3500;

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    port: process.env.DB_PORT,
    logging: false
  }
);

const Playlist = sequelize.define("Playlist", {
  host: {
    type: DataTypes.STRING,
    allowNull: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

sequelize
  .sync({ alter: false })
  .then(() => console.log("✅ Database synced with MySQL"))
  .catch((err) => console.error("❌ Error syncing database:", err));

app.post("/playlist", async (req, res) => {
  try {
    const { host, username, password } = req.body;
    if (!host || !username || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const exist = await Playlist.findOne({
      where: { host, username, password }
    });
    if (exist) {
      return res.status(400).json({ error: "Playlist already exists" });
    }
    const playlist = await Playlist.create({ host:decodeURIComponent(host), username, password });
    res.status(200).json({ message: "Playlist created", playlist });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  try {
    if (!req.query.url) {
      return res.status(400).send("Missing URL parameter");
    }

    const decodedUrl = decodeURIComponent(req.query.url);

    const hasProtocol = /^https?:\/\//i.test(decodedUrl);
    const finalUrl = hasProtocol ? decodedUrl : `http://${decodedUrl}`;

    const parsedUrl = new URL(finalUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).send("Invalid protocol");
    }

    req.targetUrl = parsedUrl;
    next();
  } catch (error) {
    console.error("URL validation error:", error.message);
    res.status(400).send(`Invalid URL: ${error.message}`);
  }
});

app.use(
  "/",
  createProxyMiddleware({
    router: (req) => req.targetUrl.origin,
    pathRewrite: (path, req) => {
      const params = new URLSearchParams(req.query);
      params.delete("url");
      const queryString = params.toString();
      return queryString
        ? `${req.targetUrl.pathname}?${queryString}`
        : req.targetUrl.pathname;
    },
    changeOrigin: true,
    followRedirects: true,
    timeout: 1000000,
    proxyTimeout: 1500000,
    onProxyReq: (proxyReq, req) => {
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "host") {
          proxyReq.setHeader(key, value);
        }
      });
    }
  })
);

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
