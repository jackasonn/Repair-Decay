const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ctx = vm.createContext({ fetch: undefined });
vm.runInContext(fs.readFileSync('js/audio/stem-loader.js','utf8'), ctx);
const load = vm.runInContext('loadStemBuffers', ctx);

(async () => {
  const tracks = Array.from({length: 5}, (_, i) => ({ id: 'stem' + i, file: 'stem' + i + '.mp3' }));
  let running = 0, peak = 0;
  const progress = [];
  const output = await load(tracks, {
    async decodeAudioData(bytes) { await Promise.resolve(); return {file: bytes.file}; }
  }, {
    concurrency: 2,
    async fetchImpl(url, { signal }) {
      assert.equal(signal, undefined);
      running++; peak = Math.max(peak, running);
      await Promise.resolve(); await Promise.resolve();
      running--;
      return {ok:true, arrayBuffer: async () => ({file:url})};
    },
    onProgress: p => progress.push({...p})
  });
  assert.equal(peak, 2, 'only two downloads concurrently');
  assert.equal(output.loaded, 5);
  assert.equal(output.failed.length, 0);
  assert.deepEqual(Object.keys(output.buffers), tracks.map(t=>t.id));
  assert.equal(progress.length, 5);
  assert.equal(progress.at(-1).loaded, 5);

  const failed = await load(tracks, {decodeAudioData:async bytes=>bytes}, {
    fetchImpl: async url => url === 'stem2.mp3'
      ? {ok:false,status:404}
      : {ok:true,arrayBuffer:async()=>({file:url})}
  });
  assert.equal(failed.loaded, 4);
  assert.equal(failed.failed.length, 1);
  assert.equal(failed.failed[0].track.id, 'stem2');
  assert.ok(!('stem2' in failed.buffers));

  const controller = new AbortController();
  const cancelled = await load(tracks, {decodeAudioData:async x=>x}, {
    signal: controller.signal,
    fetchImpl: async () => { controller.abort(); throw Object.assign(new Error('aborted'),{name:'AbortError'}); }
  });
  assert.equal(cancelled.aborted, true);
  assert.equal(cancelled.loaded, 0);
  assert.equal(Object.keys(cancelled.buffers).length, 0);

  console.log('PASS: concurrent stem loading limit, ordering, progress, failures and cancellation');
})().catch(error => { console.error(error); process.exitCode = 1; });
