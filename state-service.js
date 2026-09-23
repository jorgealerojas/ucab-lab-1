'use strict';

const http = require('node:http');

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function createStateHandler() {
  let counter = 0;

  return function stateHandler(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    if (pathname === '/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'ok' });
    }

    if (pathname === '/counter' && req.method === 'GET') {
      return sendJson(res, 200, { counter });
    }

    if (pathname === '/counter' && req.method === 'POST') {
      counter += 1;
      return sendJson(res, 200, { counter });
    }

    return sendJson(res, 404, { error: 'not_found' });
  };
}

function startStateServer(handler = createStateHandler(), port = Number(process.env.PORT || 4000)) {
  const server = http.createServer(handler);
  return server.listen(port, '0.0.0.0', () => {
    console.log(`State service listening on ${server.address().port}`);
  });
}

if (require.main === module) {
  startStateServer();
}

module.exports = { createStateHandler, startStateServer };
