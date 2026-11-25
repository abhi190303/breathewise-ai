import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { category } from '../src/utils/healthRules.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('AQI guidance uses the expected US AQI bands', () => {
  assert.equal(category(0)[0], 'Good');
  assert.equal(category(50)[0], 'Good');
  assert.equal(category(51)[0], 'Moderate');
  assert.equal(category(100)[0], 'Moderate');
  assert.equal(category(101)[0], 'Unhealthy for sensitive groups');
  assert.equal(category(151)[0], 'Unhealthy');
  assert.equal(category(201)[0], 'Very unhealthy');
  assert.equal(category(301)[0], 'Hazardous');
  assert.equal(category(null)[0], 'Unavailable');
  assert.equal(category(undefined)[0], 'Unavailable');
  assert.equal(category(Number.NaN)[0], 'Unavailable');
});

test('page has landmarks and accessible names for key controls', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<header\b/i);
  assert.match(html, /<nav\b/i);
  assert.match(html, /<main\b/i);
  assert.match(html, /<footer\b/i);
  assert.match(html, /id="citySelect"[^>]*aria-label=/i);
  assert.match(html, /id="gpsBtn"[^>]*aria-label=/i);
  assert.match(html, /id="chatInput"[^>]*aria-label=/i);
  assert.match(html, /class="send"[^>]*aria-label=/i);
  assert.match(html, /role="log" aria-live="polite"/i);
  assert.match(html, /data-profile="\$\{p\}" aria-pressed="\$\{p===profile\}"/);
  assert.match(html, /:focus-visible/);
});

let child;
let baseUrl;

before(async () => {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port), GROQ_API_KEY: '', GROK_API_KEY: '', GEMINI_API_KEY: '' },
    stdio: 'ignore'
  });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Test server exited with code ${child.exitCode}`);
    try { if ((await fetch(baseUrl)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Test server did not become ready');
});

after(async () => {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 1500);
    child.once('exit', () => { clearTimeout(timeout); resolve(); });
  });
});

test('server returns the app and only whitelisted public assets', async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /BreatheWise AI/);

  const rules = await fetch(`${baseUrl}/src/utils/healthRules.js`);
  assert.equal(rules.status, 200);
  assert.match(rules.headers.get('content-type'), /javascript/);

  for (const privatePath of ['/.env', '/grok_api.env', '/server.js', '/package.json', '/.git/config']) {
    assert.equal((await fetch(`${baseUrl}${privatePath}`)).status, 404, `${privatePath} must not be public`);
  }
});

test('assistant validates requests and reports missing configuration safely', async () => {
  const invalid = await fetch(`${baseUrl}/api/assistant`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'x' })
  });
  assert.equal(invalid.status, 400);

  const missingKey = await fetch(`${baseUrl}/api/assistant`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: 'What should I do outside?', context: { city: 'Bengaluru', aqi: 74 } })
  });
  assert.equal(missingKey.status, 503);
  assert.match((await missingKey.json()).error, /GROQ_API_KEY/);
});
