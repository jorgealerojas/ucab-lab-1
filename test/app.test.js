'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { afterEach, test } = require('node:test');
const { createHandler, startServer } = require('../app');
const { createStateHandler, startStateServer } = require('../state-service');

const openServers = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

async function start(register, handler) {
  const server = register(handler, 0);
  openServers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test('expone identidad y request ID', async () => {
  const appUrl = await start(startServer, createHandler({ nodeName: 'test-web' }));
  const response = await fetch(appUrl, { headers: { 'x-request-id': 'req-123' } });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.node, 'test-web');
  assert.equal(body.requestId, 'req-123');
  assert.equal(typeof body.pid, 'number');
});

test('dos procesos simulados mantienen contadores locales independientes', async () => {
  const web1 = await start(startServer, createHandler({ nodeName: 'web1' }));
  const web2 = await start(startServer, createHandler({ nodeName: 'web2' }));

  await fetch(`${web1}/counter/local`, { method: 'POST' });
  await fetch(`${web1}/counter/local`, { method: 'POST' });
  const first = await (await fetch(`${web1}/counter/local`)).json();
  const second = await (await fetch(`${web2}/counter/local`)).json();

  assert.equal(first.counter, 2);
  assert.equal(second.counter, 0);
});

test('dos nodos observan el mismo contador compartido', async () => {
  const stateUrl = await start(startStateServer, createStateHandler());
  const web1 = await start(startServer, createHandler({ nodeName: 'web1', stateUrl }));
  const web2 = await start(startServer, createHandler({ nodeName: 'web2', stateUrl }));

  await fetch(`${web1}/counter/shared`, { method: 'POST' });
  const body = await (await fetch(`${web2}/counter/shared`)).json();

  assert.equal(body.node, 'web2');
  assert.equal(body.counter, 1);
});
