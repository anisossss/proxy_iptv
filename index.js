require("dotenv").config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const routes = require("./router");

const axios = require('axios');
const cors = require("cors");
const { Stream, Playlist } = require("./database");

const app = express();
const PORT = 8000;

const IPTV_URL = 'http://r360.fyi:2103/enAWHBHe/aPQdnzc/12071';

app.use(cors({
  origin : "*"
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);
Stream
Playlist


app.use('/proxy', async (req, res, next) => {
  if (!req.query.url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const targetUrl = decodeURIComponent(req.query.url);
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stream: ${response.statusText}`);
    }

    // Set proper headers for MPEG-TS
    res.header('Content-Type', 'video/mp2t');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cache-Control', 'no-cache');

    // Stream the content directly
    for await (const chunk of response.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.log('error', error.message);
    
    res.status(500).send('Proxy error');
  }
});

app.get('/stream', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'video/mp2t');

    const response = await axios.get(IPTV_URL, { responseType: 'stream' });
    response.data.pipe(res);

  } catch (error) {
    console.error('error', error.message);
    res.status(500).send('err.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/stream`);
});
