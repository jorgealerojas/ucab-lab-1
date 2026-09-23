'use strict';

const http = require('node:http');
const os = require('node:os');

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function createHandler(options = {}) {
  const nodeName = options.nodeName || process.env.NODE_NAME || os.hostname();
  const configuredDelay = Number(options.delayMs ?? process.env.DELAY_MS ?? 0);
  const delayMs = Number.isFinite(configuredDelay) && configuredDelay >= 0 ? configuredDelay : 0;
  const stateUrl = options.stateUrl ?? process.env.STATE_URL ?? null;
  let localCounter = 0;

  return async function handler(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    if (delayMs > 0 && pathname !== '/health') {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (pathname === '/' && req.method === 'GET') {
      return sendJson(res, 200, {
        message: 'Hello UCAB',
        node: nodeName,
        pid: process.pid,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || null,
      });
    }

    if (pathname === '/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'ok', node: nodeName });
    }

    if (pathname === '/counter/local' && req.method === 'GET') {
      return sendJson(res, 200, { node: nodeName, counter: localCounter });
    }

    if (pathname === '/counter/local' && req.method === 'POST') {
      localCounter += 1;
      return sendJson(res, 200, { node: nodeName, counter: localCounter });
    }

    if (pathname === '/counter/shared' && (req.method === 'GET' || req.method === 'POST')) {
      if (!stateUrl) {
        return sendJson(res, 503, {
          error: 'shared_state_unavailable',
          detail: 'STATE_URL is not configured',
        });
      }

      try {
        const upstream = await fetch(`${stateUrl}/counter`, {
          method: req.method,
          signal: AbortSignal.timeout(1000),
        });
        const body = await upstream.json();
        return sendJson(res, upstream.status, { node: nodeName, ...body });
      } catch (error) {
        return sendJson(res, 503, {
          error: 'shared_state_unavailable',
          detail: error.name,
        });
      }
    }

    return sendJson(res, 404, { error: 'not_found' });
  };
}

function startServer(handler = createHandler(), port = Number(process.env.PORT || 3000)) {
  const server = http.createServer(handler);
  return server.listen(port, '0.0.0.0', () => {
    console.log(`App listening on ${server.address().port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createHandler, startServer };
