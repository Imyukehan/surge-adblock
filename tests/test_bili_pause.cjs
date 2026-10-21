// Run with the pinned response.bundle.js path as the first argument.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const moduleText = fs.readFileSync(path.join(root, 'Domestic-Adblock.sgmodule'), 'utf8');
const rule = moduleText.split('\n').find(line => line.startsWith('Adblock.Bili.view.'));
const pattern = new RegExp(rule.match(/pattern=([^,]+)/)[1]);
const argument = rule.split('argument=')[1];
const script = fs.readFileSync(process.argv[2], 'utf8');
const source = JSON.parse(fs.readFileSync(path.join(root, 'sources.json'))).scripts
  .find(source => source.name === 'bilibili-response-0.7.5.js');
assert.equal(crypto.createHash('sha256').update(script).digest('hex'), source.sha256);
const rpc = '/bilibili.app.viewunite.v1.View/PlayPause';
const frame = new Uint8Array([0, 0, 0, 0, 2, 8, 1]);
function run(url, enabled = true, input = frame) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Script did not complete')), 5000);
    const ctx = {
      URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, setTimeout, clearTimeout,
      console: {log() {}, error() {}},
      $script: {name: 'Adblock.Bili.view.response.grpc', type: 'http-response'},
      $environment: {'surge-version': '6.9.1', system: 'macOS'},
      $argument: enabled ? argument : argument.replace('View.AD="true"', 'View.AD="false"'),
      $request: {url, method: 'POST', headers: {'user-agent': 'bili-universal/91500100', 'x-bili-moss-engine-type': '1'}},
      $response: {status: 200, headers: {'Content-Type': 'application/grpc'}, body: input.slice()},
      $persistentStore: {read: () => null, write: () => true},
      $notification: {post() {}},
      $done: result => {clearTimeout(timer); resolve(result);},
    };
    try { vm.runInNewContext(script, ctx, {timeout: 3000}); }
    catch (error) {clearTimeout(timer); reject(error);}
  });
}
(async () => {
  for (const host of ['grpc.biliapi.net', 'app.bilibili.com', 'app.biliapi.net']) {
    const url = `https://${host}${rpc}`;
    assert(pattern.test(url));
    const result = await run(url);
    assert.deepEqual(Array.from(result.body), [0, 0, 0, 0, 0]);
    const disabled = await run(url, false);
    assert.deepEqual(Array.from(disabled.body), Array.from(frame));
  }
  for (const endpoint of ['PlayPauseExtra', 'Unknown']) {
    assert(!pattern.test(`https://grpc.biliapi.net/bilibili.app.viewunite.v1.View/${endpoint}`));
  }
  assert(pattern.test('https://grpc.biliapi.net/bilibili.app.playerunite.v1.Player/PlayViewUnite'));
  for (const endpoint of ['View', 'ViewEndPage', 'RelatesFeed', 'AIRelateAsync', 'ViewProgress']) {
    assert(pattern.test(`https://grpc.biliapi.net/bilibili.app.viewunite.v1.View/${endpoint}`));
  }
  assert(!pattern.test('https://grpc.biliapi.net/bilibili.app.playurl.v1.PlayURL/PlayView'));
  // Wire fixture based on upstream AIRelateAsync tests: normal and future cards
  // must survive while ad cards and CM are removed, including unknown metadata.
  const varint = n => { const out = []; do { out.push((n & 127) | (n > 127 ? 128 : 0)); n = Math.floor(n / 128); } while(n); return out; };
  const concat = (...parts) => Uint8Array.from(parts.flatMap(part => Array.from(part)));
  const scalar = (n, v) => concat(varint(n * 8), varint(v));
  const bytes = (n, v) => concat(varint(n * 8 + 2), varint(v.length), v);
  const opaque = bytes(100, new TextEncoder().encode('unknown metadata'));
  const card = n => concat(scalar(1, n), opaque);
  const reply = cards => concat(bytes(1, []), bytes(2, bytes(1, concat(scalar(1, 28), bytes(22, concat(...cards.map(c => bytes(1, c)), opaque)), opaque))), bytes(3, opaque), opaque);
  const framed = payload => concat([0, payload.length >>> 24, payload.length >>> 16 & 255, payload.length >>> 8 & 255, payload.length & 255], payload);
  const payload = reply([card(1), card(4), card(5), card(11), card(8), card(99)]);
  const expected = reply([card(1), card(8), card(99)]).slice(2); // CM field 1 is absent after filtering.
  const asyncURL = 'https://grpc.biliapi.net/bilibili.app.viewunite.v1.View/AIRelateAsync';
  const filtered = await run(asyncURL, true, framed(payload));
  assert.deepEqual(Array.from(filtered.body).slice(5), Array.from(expected));
  assert.equal(Object.entries(filtered.headers).find(([k]) => k.toLowerCase() === 'grpc-status')?.[1], '0');
  const untouched = await run(asyncURL, false, framed(payload));
  assert.deepEqual(Array.from(untouched.body).slice(5), Array.from(payload));
  console.log('OK: AIRelateAsync removes ads and CM, preserves normal/future cards, unknown metadata and grpc-status');
  console.log('OK: pause replies become valid empty gRPC frames; video endpoints are covered and unrelated playback services excluded');
})().catch(error => {console.error(error); process.exitCode = 1;});
