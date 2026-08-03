import assert from 'node:assert/strict';
import fs from 'node:fs';

const serviceWorker = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const registration = fs.readFileSync(new URL('../src/serviceWorkerRegistration.js', import.meta.url), 'utf8');
const buildScript = fs.readFileSync(new URL('../scripts/generate-precache-manifest.mjs', import.meta.url), 'utf8');
const firebase = JSON.parse(fs.readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));

assert.match(serviceWorker, /request\.method !== 'GET'/);
assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
assert.match(serviceWorker, /contentType\.includes\('text\/html'\)/);
assert.match(serviceWorker, /request\.mode === 'navigate'/);
assert.match(serviceWorker, /CACHE_PREFIX/);
assert.match(registration, /import\.meta\.env\.PROD/);
assert.match(registration, /window\.addEventListener\('load'/);
assert.match(buildScript, /createHash\('sha256'\)/);
assert.ok(firebase.hosting.headers.some(rule => rule.source === '/assets/**'));
assert.ok(firebase.hosting.headers.some(rule => rule.source.includes('sw.js')));

console.log('Service Worker structure test passed.');
