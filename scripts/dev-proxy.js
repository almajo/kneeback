#!/usr/bin/env node
/**
 * Development proxy that adds COOP/COEP headers to all responses from the
 * Expo Metro dev server. These headers enable SharedArrayBuffer, which
 * drizzle-orm/expo-sqlite requires for synchronous SQLite operations on web.
 *
 * Usage: node scripts/dev-proxy.js
 * Then open http://localhost:8082 instead of http://localhost:8081
 *
 * Production (Vercel) already has these headers set in vercel.json.
 */

const http = require("http");

const METRO_PORT = 8081;
const PROXY_PORT = 8082;

const COOP_HEADERS = {
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-embedder-policy": "credentialless",
};

const server = http.createServer((req, res) => {
  const options = {
    hostname: "localhost",
    port: METRO_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
  };

  const proxy = http.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers, ...COOP_HEADERS };
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    res.writeHead(502);
    res.end("Proxy error: " + err.message);
  });

  req.pipe(proxy, { end: true });
});

// Forward WebSocket upgrades (required for Metro hot reload)
server.on("upgrade", (req, socket, head) => {
  const options = {
    hostname: "localhost",
    port: METRO_PORT,
    path: req.url,
    headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
  };

  const proxyReq = http.request(options);
  proxyReq.on("upgrade", (proxyRes, proxySocket) => {
    const headers = Object.entries(proxyRes.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${headers}\r\n\r\n`
    );
    proxySocket.pipe(socket, { end: true });
    socket.pipe(proxySocket, { end: true });
  });
  proxyReq.on("error", () => socket.destroy());
  proxyReq.end();
});

server.listen(PROXY_PORT, () => {
  console.log(`\n✓ Dev proxy running at http://localhost:${PROXY_PORT}`);
  console.log(`  Proxying Metro at http://localhost:${METRO_PORT}`);
  console.log(`  COOP/COEP headers added to all responses\n`);
});
