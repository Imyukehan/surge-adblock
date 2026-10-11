// Run with the pinned response.bundle.js path as the first argument.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const moduleText = fs.readFileSync(path.join(root, 'Domestic-Adblock.sgmodule'), 'utf8');
const rule = moduleText.split('\n').find(line => line.startsWith('Adblock.Bili.pause.'));
const pattern = new RegExp(rule.match(/pattern=([^,]+)/)[1]);
const argument = rule.split('argument=')[1];
const script = fs.readFileSync(process.argv[2], 'utf8');
const source = JSON.parse(fs.readFileSync(path.join(root, 'sources.json'))).scripts
  .find(source => source.name === 'bilibili-response-0.7.3.js');
assert.equal(crypto.createHash('sha256').update(script).digest('hex'), source.sha256);
const rpc = '/bilibili.app.viewunite.v1.View/PlayPause';
const frame = new Uint8Array([0, 0, 0, 0, 2, 8, 1]);
function run(url, enabled = true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Script did not complete')), 5000);
    const ctx = {
      URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, setTimeout, clearTimeout,
      console: {log() {}, error() {}},
      $script: {name: 'Adblock.Bili.pause.response.grpc', type: 'http-response'},
      $environment: {'surge-version': '6.9.1', system: 'macOS'},
      $argument: enabled ? argument : argument.replace('View.AD="true"', 'View.AD="false"'),
      $request: {url, method: 'POST', headers: {}},
      $response: {status: 200, headers: {'Content-Type': 'application/grpc'}, body: frame.slice()},
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
  for (const endpoint of ['View', 'ViewEndPage', 'RelatesFeed', 'PlayPauseExtra']) {
    assert(!pattern.test(`https://grpc.biliapi.net/bilibili.app.viewunite.v1.View/${endpoint}`));
  }
  assert(!pattern.test('https://grpc.biliapi.net/bilibili.app.playerunite.v1.Player/PlayViewUnite'));
  console.log('OK: pause replies become valid empty gRPC frames; other RPCs are excluded');
})().catch(error => {console.error(error); process.exitCode = 1;});
