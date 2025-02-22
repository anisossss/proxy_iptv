// api/proxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");
const express = require("express");
const cors = require("cors");

// Convert middleware to promise-based function for serverless
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

const validateUrl = async (req, res) => {
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
    return true;
  } catch (error) {
    console.error("URL validation error:", error.message);
    res.status(400).send(`Invalid URL: ${error.message}`);
    return false;
  }
};

const handler = async (req, res) => {
  // Enable CORS
  await runMiddleware(req, res, cors());

  // Validate URL
  const isValid = await validateUrl(req, res);
  if (!isValid) return;

  // Configure proxy
  const proxy = createProxyMiddleware({
    target: req.targetUrl.origin,
    changeOrigin: true,
    followRedirects: true,
    pathRewrite: (path) => {
      const params = new URLSearchParams(req.query);
      params.delete("url");
      const queryString = params.toString();
      return queryString
        ? `${req.targetUrl.pathname}?${queryString}`
        : req.targetUrl.pathname;
    },
    onProxyReq: (proxyReq, req) => {
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "host") {
          proxyReq.setHeader(key, value);
        }
      });
    },
  });

  // Run the proxy
  await runMiddleware(req, res, proxy);
};

module.exports = handler;
