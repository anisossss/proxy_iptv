const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const app = express();
const PORT = 3500;

app.use(cors({ origin: "*" }));

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
