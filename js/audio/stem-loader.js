// Stateless bounded-concurrency stem loader.
// The calling player decides when to publish buffers; cancelled songs never replace live audio.
async function loadStemBuffers(tracks, context, options = {}) {
  const signal = options.signal;
  const onProgress = options.onProgress || (() => {});
  const request = options.fetchImpl || fetch;
  const concurrency = Math.max(1, Math.min(tracks.length, Math.floor(options.concurrency || 2)));
  const buffers = {};
  const failed = [];
  let nextIndex = 0;
  let completed = 0;
  let loaded = 0;

  async function worker() {
    while (nextIndex < tracks.length && !signal?.aborted) {
      const track = tracks[nextIndex++];
      try {
        const response = await request(track.file, { signal });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const bytes = await response.arrayBuffer();
        if (signal?.aborted) return;
        // Limit simultaneous decoding as well as simultaneous downloads.
        const buffer = await context.decodeAudioData(bytes);
        if (signal?.aborted) return;
        buffers[track.id] = buffer;
        loaded++;
      } catch (error) {
        if (signal?.aborted || error?.name === 'AbortError') return;
        failed.push({ track, error });
      }
      completed++;
      if (!signal?.aborted) onProgress({ loaded, completed, total: tracks.length });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { buffers, failed, loaded, total: tracks.length, aborted: !!signal?.aborted };
}
