// ───────────────────────────────────────────────
// TRACKS + DECAY EVENT DEFINITIONS
// ───────────────────────────────────────────────
const SONGS = [
  {
    id: 'on-time',
    title: 'ON TIME',
    number: 1,
    artist: 'TAYLA KANE AND JACKSON MOORE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/on-time-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/on-time-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/on-time-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/on-time-keys.mp3' },
      { id: 'vocals', name: 'VOCALS', file: 'assets/on-time-vocals.mp3' }
    ]
  },
  {
    id: 'reconcile',
    title: 'RECONCILE',
    number: 2,
    artist: 'JACKSON MOORE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/reconcile-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/reconcile-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/reconcile-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/reconcile-keys.mp3' }
    ]
  }
];
let currentSongIndex = 0;
let TRACKS = SONGS[currentSongIndex].tracks;
const EVENT_TYPES=[ {
  id:'detune',name:'DETUNE',description:'Pitch drift detected without changing playback speed',severity:[10,22]
}
, {
  id:'highpass',name:'HIGH PASS FILTER',description:'Low frequencies being cut away',severity:[12,24]
}
, {
  id:'lowpass',name:'LOW PASS FILTER',description:'High frequencies being cut away',severity:[12,24]
}
, {
  id:'bitcrush',name:'BIT DEGRADATION',description:'Reduced bit depth fidelity',severity:[10,24]
}
, {
  id:'phase',name:'PHASE DRIFT',description:'Stereo image becoming unstable',severity:[8,20]
}
, {
  id:'warp',name:'WARP',description:'Tiny fluctuations in pitch without changing playback speed',severity:[8,18]
}
, {
  id:'delay',name:'DELAY',description:'Three progressively quieter echoes after the original signal',severity:[8,22]
}
, {
  id:'crackle',name:'CRACKLE',description:'Increasing digital/vinyl artefacts',severity:[6,18]
}
];
// ───────────────────────────────────────────────
// GLOBAL AUDIO / UI STATE
// ───────────────────────────────────────────────
const state= {
  playing:false,startedAt:0,nextEventAt:0,selectedTrack:null,soloTrack:null,knobInteracting:false,overallDecay:0,logs:[],audio:null,buffers: {
  }
  ,sources: {
  }
  ,offsets: {
  }
  ,analyser:null,masterGain:null,loaded:false,loadedSongIndex:null,loading:false,loadingPromise:null,songGeneration:0,demoMode:false,noiseBuffer:null,pitchReady:false,waveformCtx:null,waveformData:null,waveformPixelWidth:0,waveformPixelHeight:0,waveformDrawAt:0,lastTrackVisualAt:0,lastClockTextAt:0,waveformColour:'#7f9a63',particlePulse:0,lastParticlePulseAt:0,repairLockToastTimer:null,decayTimer:null,switchSoundBuffers:{},switchSoundLoadPromise:null,switchSoundAssetsLoaded:false
}
;
function createTrackState(tracks) {
  return Object.fromEntries(tracks.map(t => [t.id, {
    events: [], detune: 0, highpass: 20, lowpass: 20000, bitDepth: 16,
    phaseDepth: 0, warpDepth: 0, delayDepth: 0, crackleDepth: 0
  }]));
}
const songTrackStates = Object.fromEntries(SONGS.map(song => [song.id, createTrackState(song.tracks)]));
let trackState = songTrackStates[SONGS[currentSongIndex].id];
const els= {
}
;
// Cached DOM elements used throughout the interface.
// Cache the page elements once the DOM has loaded.
function cacheElements() {
  els.grid = document.getElementById('track-grid');
  els.playerSection = document.getElementById('player-section');
  els.playerPanel = document.getElementById('player-panel');
  els.play = document.getElementById('play-button');
  els.waveform = document.getElementById('waveform');
  els.playbackState = document.getElementById('playback-state');
  els.playbackTime = document.getElementById('playback-time');
  els.maintenance = document.getElementById('maintenance-log');
  els.decayNumber = document.getElementById('decay-number');
  els.decayMeter = document.getElementById('overall-decay-meter');
  els.decayCode = document.getElementById('decay-code');
  els.decayCaption = document.getElementById('decay-caption');
  els.systemDot = document.getElementById('system-dot');
  els.systemStatus = document.getElementById('system-status');
  els.dialog = document.getElementById('track-dialog');
  els.closeDialog = document.getElementById('close-dialog');
  els.dialogTitle = document.getElementById('dialog-title');
  els.dialogStatus = document.getElementById('dialog-status');
  els.dialogDecay = document.getElementById('dialog-decay');
  els.dialogCount = document.getElementById('dialog-event-count');
  els.dialogSignal = document.getElementById('dialog-signal');
  els.solo = document.getElementById('solo-button');
  els.previousSong = document.getElementById('previous-song');
  els.nextSong = document.getElementById('next-song');
  els.songTitle = document.getElementById('song-title');
  els.songNumber = document.getElementById('song-number');
  els.songArtist = document.getElementById('song-artist');
  els.albumArt = document.getElementById('album-art');
  els.artNoise = document.getElementById('art-noise');
  els.albumCoverImage = document.getElementById('album-cover-image');
  els.dialogInstrumentImage = document.getElementById('dialog-instrument-image');
  els.dialogArtStage = document.getElementById('dialog-art-stage');
  els.dialogParticles = document.getElementById('dialog-particles');
  els.faultSwitches = document.getElementById('fault-switches');
  els.rhythmPanel = document.getElementById('rhythm-panel');
  els.rhythmStart = document.getElementById('repair-retry');
  els.repairLockToast = document.getElementById('repair-lock-toast');
}
// Build the instrument cards for the selected song.
function renderTracks() {
  els.grid.innerHTML = TRACKS.map(t => {
    const bars = Array.from({ length: 12 }, () => '<span></span>').join('');
    return '<button class="track-card healthy" type="button" data-track="' + t.id + '" aria-label="Open ' + t.name + ' track diagnostics">' +
      '<div class="track-visual" aria-hidden="true"></div>' +
      '<div class="track-artwork-stage">' +
        '<img class="track-instrument-image" src="assets/' + t.id + '.png" alt="" loading="lazy" decoding="async">' +
      '</div>' +
      '<div class="track-signal" aria-hidden="true">' +
        '<div class="signal-bars">' + bars + '</div>' +
      '</div>' +
      '<div class="track-info">' +
        '<span class="track-name">' + t.name + '</span>' +
        '<span class="track-status" data-status="' + t.id + '">NORMAL</span>' +
        '<span class="track-meter"><span data-meter="' + t.id + '"></span></span>' +
        '<span class="track-event-count" data-count="' + t.id + '">NO ACTIVE EVENTS</span>' +
      '</div>' +
    '</button>';
  }).join('');
  els.grid.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', () => openTrackDialog(card.dataset.track));
  });
}
// Calculate the current decay level for one instrument.
function severityFor(id) {
  return Math.min(100,trackState[id].events.reduce((s,e)=>s+e.severity,0))
}
function statusFor(d) {
  if(d>=70)return {
    text:'CRITICAL / DECAYING',className:'danger'
  }
  ;
  if(d>=30)return {
    text:'WARNING',className:'warning'
  }
  ;
  return {
    text:'NORMAL',className:''
  }
}
// Refresh all visible decay meters, statuses and system text.
function updateUI() {
  let total = 0;
  TRACKS.forEach(t => {
    const d = severityFor(t.id);
    const st = statusFor(d);
    const card = els.grid.querySelector('[data-track="' + t.id + '"]');
    if (!card) return;
    const status = els.grid.querySelector('[data-status="' + t.id + '"]');
    const meter = els.grid.querySelector('[data-meter="' + t.id + '"]');
    const count = els.grid.querySelector('[data-count="' + t.id + '"]');
    total += d;

    card.classList.toggle('healthy', d < 30);
    card.classList.toggle('decaying', d >= 30 && d < 70);
    card.classList.toggle('critical', d >= 70);
    card.style.setProperty('--flash-low', Math.max(0.015, d / 100 * 0.12).toFixed(3));
    card.style.setProperty('--flash-high', Math.max(0.04, d / 100 * 0.78).toFixed(3));
    card.style.setProperty('--flash-duration', (3.5 - d / 100 * 2.5).toFixed(2) + 's');
    status.textContent = st.text;
    status.className = 'track-status ' + st.className;
    meter.style.width = d + '%';
    meter.className = st.className;
    count.textContent = trackState[t.id].events.length
      ? trackState[t.id].events.length + ' ACTIVE EVENT' + (trackState[t.id].events.length === 1 ? '' : 'S')
      : 'NO ACTIVE EVENTS';
  });

  state.overallDecay = Math.round(total / Math.max(1, TRACKS.length));
  const st = statusFor(state.overallDecay);
  els.decayNumber.textContent = state.overallDecay + '%';
  els.decayNumber.className = 'decay-number ' + st.className;
  els.decayMeter.style.width = state.overallDecay + '%';
  els.decayMeter.className = st.className;
  els.decayCode.textContent = String(state.overallDecay).padStart(3, '0');
  els.decayCaption.textContent = state.overallDecay === 0
    ? 'SYSTEM INTACT — NO REPAIRS REQUIRED'
    : state.overallDecay < 30
      ? 'MINOR INSTABILITY — MONITOR THE SIGNAL'
      : state.overallDecay < 70
        ? 'SYSTEM DEGRADED — MAINTENANCE RECOMMENDED'
        : 'CRITICAL FAILURE — IMMEDIATE REPAIR REQUIRED';
  els.systemDot.className = 'status-dot ' + st.className;

  document.body.classList.toggle('decay-calm', state.overallDecay < 30);
  document.body.classList.toggle('decay-warning', state.overallDecay >= 30 && state.overallDecay < 70);
  document.body.classList.toggle('decay-critical', state.overallDecay >= 70);
  const decayAccent = state.overallDecay >= 70 ? '#b94b42' : state.overallDecay >= 30 ? '#d7a72d' : '#7f9a63';
  document.body.style.setProperty('--decay-accent', decayAccent);
  state.waveformColour = decayAccent;
  document.body.style.setProperty('--screen-flash-low', Math.max(0.01, state.overallDecay / 100 * 0.08).toFixed(3));
  document.body.style.setProperty('--screen-flash-high', Math.max(0.025, state.overallDecay / 100 * 0.44).toFixed(3));
  document.body.style.setProperty('--screen-flash-duration', (3.6 - state.overallDecay / 100 * 2.4).toFixed(2) + 's');

  els.systemStatus.textContent = state.demoMode
    ? 'AUDIO FILES NOT INSTALLED'
    : state.overallDecay >= 70
      ? 'SYSTEM CRITICAL'
      : state.overallDecay >= 30
        ? 'SYSTEM UNSTABLE'
        : state.playing ? 'SYSTEM ACTIVE' : 'SYSTEM READY';

  if (state.selectedTrack && els.dialog && els.dialog.open) updateDialog();
}
function addLog(message,type='event') {
  const now=new Date(),time=now.toLocaleTimeString([], {
    hour:'2-digit',minute:'2-digit',hour12:false
  }
  );
  state.logs.unshift( {
    time,message,type
  }
  );
  state.logs=state.logs.slice(0,12);
  els.maintenance.innerHTML=state.logs.map(l=>'<div class="log-entry '+l.type+'"><span class="time">'+l.time+'</span><span>'+l.message+'</span></div>').join('')
}
// Exhibition pacing in milliseconds; adjust these bounds to tune decay frequency.
const DECAY_INTERVAL_MIN_MS = 4000;
const DECAY_INTERVAL_MAX_MS = 7000;
function scheduleNextEvent() {
  if (state.decayTimer) clearTimeout(state.decayTimer);
  state.decayTimer = null;

  if (!state.playing) {
    state.nextEventAt = 0;
    return;
  }

  // Keep decay scheduling independent from requestAnimationFrame so a visual
  // update hiccup cannot permanently stop the decay system.
  const delay = DECAY_INTERVAL_MIN_MS + Math.random() * (DECAY_INTERVAL_MAX_MS - DECAY_INTERVAL_MIN_MS);
  state.nextEventAt = performance.now() + delay;
  state.decayTimer = setTimeout(() => {
    state.decayTimer = null;
    if (!state.playing) {
      state.nextEventAt = 0;
      return;
    }
    try {
      applyEvent();
    } catch (error) {
      console.error('Decay event failed; retrying the decay schedule.', error);
      addLog('A decay event failed to apply. Retrying the decay system.', 'event');
      scheduleNextEvent();
    }
  }, delay);
}
// One shared timeline drives every stem, both while playing and while paused.
function masterTrackForSong() {
  return TRACKS.find(track => track.id === 'drums') || TRACKS[0] || null;
}
function currentMasterOffset() {
  const masterTrack = masterTrackForSong();
  if (!masterTrack) return 0;
  const buffer = state.buffers[masterTrack.id];
  const duration = buffer ? buffer.duration : 1;
  const base = state.offsets[masterTrack.id] || 0;
  const elapsed = state.playing && state.audio ? Math.max(0, state.audio.currentTime - state.startedAt) : 0;
  return (base + elapsed) % Math.max(0.01, duration);
}
function alignAllOffsets(position) {
  TRACKS.forEach(track => {
    const buffer = state.buffers[track.id];
    const duration = buffer ? buffer.duration : 1;
    state.offsets[track.id] = Math.max(0, Math.min(position, Math.max(0, duration - 0.01)));
  });
}
function disposeTrackChain(chain, stopSource = true) {
  if (!chain) return;
  if (chain.source) {
    try { chain.source.onended = null; } catch (_) {}
    if (stopSource) {
      try { chain.source.stop(); } catch (_) {}
    }
  }
  [chain.phaseLfo, chain.warp, chain.lfo].forEach(oscillator => {
    if (!oscillator) return;
    try { oscillator.stop(); } catch (_) {}
  });
  [
    chain.source, chain.pitchShift, chain.crush, chain.highpass, chain.lowpass,
    chain.artifactGain, chain.phase, chain.gain, chain.analyser,
    chain.lfo, chain.lfoDepth, chain.phaseLfo, chain.phaseDepth,
    chain.warp, chain.warpDepth,
    chain.delayOne, chain.delayTwo, chain.delayThree,
    chain.delayGainOne, chain.delayGainTwo, chain.delayGainThree
  ].forEach(node => {
    if (!node) return;
    try { node.disconnect(); } catch (_) {}
  });
}
function clearSources() {
  Object.values(state.sources).forEach(chain => disposeTrackChain(chain));
  state.sources = {};
}
function attachTrackEndHandler(trackId, chain, generation = state.songGeneration) {
  const master = masterTrackForSong();
  if (!master || trackId !== master.id || !chain) return;
  chain.source.onended = () => {
    if (!state.playing || generation !== state.songGeneration) return;
    handleSongFinished(generation);
  };
}
// Create the Web Audio graph and a reusable noise buffer for crackle events.
async function initialiseAudio() {
  if (state.audio) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    state.demoMode = true;
    updateUI();
    return;
  }
  const context = new AudioContextClass();
  const master = context.createGain();
  const analyser = context.createAnalyser();
  master.gain.value = 0.9;
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.82;
  master.connect(analyser);
  analyser.connect(context.destination);
  state.audio = context;
  state.masterGain = master;
  state.analyser = analyser;

  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  state.noiseBuffer = noise;

  if (context.audioWorklet) {
    try {
      await context.audioWorklet.addModule('pitch-shifter.js');
      state.pitchReady = true;
    } catch (error) {
      state.pitchReady = false;
      console.warn('Pitch shifter worklet could not load; pitch-based decay events will be unavailable.', error);
    }
  }
}

// Preload the tiny mechanical switch sounds into the existing Web Audio context.
async function loadSwitchSounds() {
  if (!state.audio) return false;
  if (state.switchSoundAssetsLoaded) return true;
  if (state.switchSoundLoadPromise) return state.switchSoundLoadPromise;

  const context = state.audio;
  const files = {
    on: 'assets/click-on.mp3',
    off: 'assets/click-off.mp3',
    button: 'assets/button-press.mp3',
    error: 'assets/error.mp3',
    plink: 'assets/plink.mp3'
  };
  const operation = Promise.all(Object.entries(files).map(async ([name, url]) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      return [name, buffer];
    } catch (error) {
      console.warn('Could not load switch sound ' + url, error);
      return [name, null];
    }
  })).then(entries => {
    state.switchSoundBuffers = Object.fromEntries(entries);
    // Only mark the set complete when every asset decoded. Failed requests
    // can be retried by the next interaction rather than remaining silent.
    state.switchSoundAssetsLoaded = Object.values(state.switchSoundBuffers).every(Boolean);
    return state.switchSoundAssetsLoaded;
  }).finally(() => {
    if (state.switchSoundLoadPromise === operation) state.switchSoundLoadPromise = null;
  });

  state.switchSoundLoadPromise = operation;
  return operation;
}

// Play UI effects reliably even on the first interaction, without interrupting music.
async function playUISound(name, volume) {
  let context = state.audio;
  let resumePromise = null;

  try {
    if (!context) {
      // initialiseAudio creates/assigns the AudioContext before its first await,
      // so request resume immediately during this pointer/click interaction.
      const setupPromise = initialiseAudio();
      context = state.audio;
      if (context && context.state !== 'running') {
        try { resumePromise = context.resume(); } catch (_) {}
      }
      await setupPromise;
      context = state.audio;
    } else if (context.state !== 'running') {
      // Start resuming before waiting on any fetch/decode work.
      try { resumePromise = context.resume(); } catch (_) {}
    }

    if (!context) return;
    if (!state.switchSoundBuffers || !state.switchSoundBuffers[name]) {
      await loadSwitchSounds();
    }
    const buffer = state.switchSoundBuffers && state.switchSoundBuffers[name];
    if (!buffer || context !== state.audio) return;

    if (resumePromise) {
      try { await resumePromise; } catch (_) {}
    }
    if (context.state !== 'running') {
      try { await context.resume(); } catch (_) {}
    }
    if (context.state !== 'running') return;

    const defaultVolumes = { on: 0.62, off: 0.62, button: 0.62, error: 0.72, plink: 0.05 };
    const outputVolume = Number.isFinite(volume) ? volume : (defaultVolumes[name] ?? 0.62);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = Math.max(0, Math.min(1, outputVolume));
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => {
      try { source.disconnect(); } catch (_) {}
      try { gain.disconnect(); } catch (_) {}
    };
    source.start();
  } catch (error) {
    console.warn('Could not play UI sound ' + name + '.', error);
  }
}
function playSwitchSound(direction) {
  return playUISound(direction, 0.62);
}
async function loadAudio() {
  const requestedSongIndex = currentSongIndex;
  const generation = state.songGeneration;
  const requestedTracks = TRACKS.slice();

  if (state.loaded && state.loadedSongIndex === requestedSongIndex) return true;
  if (state.loadingPromise) {
    try { await state.loadingPromise; } catch (_) {}
    if (generation !== state.songGeneration) return false;
    if (state.loaded && state.loadedSongIndex === requestedSongIndex) return true;
  }
  if (generation !== state.songGeneration) return false;

  state.loading = true;
  let operation;
  operation = (async () => {
    try {
      await initialiseAudio();
      if (generation !== state.songGeneration) return false;
      if (!state.audio) {
        els.playbackState.textContent = 'AUDIO NOT SUPPORTED';
        return false;
      }

      // Load UI effects in the background; they must never delay the music stems.
      void loadSwitchSounds();

      els.playbackState.textContent = 'LOADING TRACKS…';
      const loadedBuffers = {};
      let loaded = 0;
      for (const track of requestedTracks) {
        if (generation !== state.songGeneration) return false;
        try {
          const response = await fetch(track.file);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const buffer = await state.audio.decodeAudioData(await response.arrayBuffer());
          if (generation !== state.songGeneration) return false;
          loadedBuffers[track.id] = buffer;
          loaded++;
        } catch (error) {
          if (generation === state.songGeneration) console.warn('Could not load ' + track.file, error);
        }
      }

      if (generation !== state.songGeneration) return false;
      state.buffers = loadedBuffers;
      state.offsets = Object.fromEntries(requestedTracks.map(t => [t.id, 0]));
      state.loaded = loaded === requestedTracks.length;
      state.loadedSongIndex = state.loaded ? requestedSongIndex : null;
      state.demoMode = !state.loaded;

      if (state.loaded) {
        els.playbackState.textContent = 'READY TO PLAY';
        addLog('All ' + requestedTracks.length + ' stems for ' + SONGS[requestedSongIndex].title + ' loaded successfully.', 'repair');
      } else {
        els.playbackState.textContent = 'ADD STEMS TO BEGIN';
        addLog('Audio setup waiting: ' + loaded + '/' + requestedTracks.length + ' track stems found for ' + SONGS[requestedSongIndex].title + '.', 'event');
      }
      updateUI();
      return state.loaded;
    } catch (error) {
      if (generation === state.songGeneration) {
        console.error('Audio initialisation failed.', error);
        els.playbackState.textContent = 'AUDIO ERROR — SEE CONSOLE';
        addLog('Audio initialisation failed.', 'event');
      }
      return false;
    }
  })();

  state.loadingPromise = operation;
  try {
    return await operation;
  } finally {
    if (state.loadingPromise === operation) {
      state.loadingPromise = null;
      state.loading = false;
    }
  }
}
// Build the audio effects chain and a small analyser for each individual stem.
function makeTrackChain(id, source) {
  const s = trackState[id];
  const hp = state.audio.createBiquadFilter();
  const lp = state.audio.createBiquadFilter();
  const gain = state.audio.createGain();
  const artifactGain = state.audio.createGain();
  const phase = state.audio.createStereoPanner();
  const phaseLfo = state.audio.createOscillator();
  const phaseDepth = state.audio.createGain();
  const warp = state.audio.createOscillator();
  const warpDepth = state.audio.createGain();
  const delayOne = state.audio.createDelay(1.5);
  const delayTwo = state.audio.createDelay(1.5);
  const delayThree = state.audio.createDelay(1.5);
  const delayGainOne = state.audio.createGain();
  const delayGainTwo = state.audio.createGain();
  const delayGainThree = state.audio.createGain();
  const crush = state.audio.createWaveShaper();
  const analyser = state.audio.createAnalyser();
  const pitchShift = state.pitchReady
    ? new AudioWorkletNode(state.audio, 'pitch-shifter', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
        parameterData: { pitchCents: s.detune }
      })
    : null;

  hp.type = 'highpass';
  lp.type = 'lowpass';
  hp.frequency.value = s.highpass;
  lp.frequency.value = s.lowpass;
  gain.gain.value = state.soloTrack && state.soloTrack !== id ? 0.22 : 1;
  // Three discrete taps create exactly three echoes, each quieter than the last.
  delayOne.delayTime.value = 0.32;
  delayTwo.delayTime.value = 0.32;
  delayThree.delayTime.value = 0.32;
  const delayActive = s.delayDepth > 0;
  delayGainOne.gain.value = delayActive ? 0.2 + Math.min(1, s.delayDepth) * 0.5 : 0;
  delayGainTwo.gain.value = delayActive ? 0.55 : 0;
  delayGainThree.gain.value = delayActive ? 0.55 : 0;
  // More frequency bins give the particles a meaningful low/mid/high split.
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.78;

  artifactGain.gain.value = 1;
  phaseLfo.type = 'sine';
  phaseLfo.frequency.value = 0.17;
  phaseDepth.gain.value = s.phaseDepth;
  phaseLfo.connect(phaseDepth);
  phaseDepth.connect(phase.pan);
  phaseLfo.start();

  warp.type = 'sine';
  warp.frequency.value = 0.23;
  warpDepth.gain.value = s.warpDepth * 1000;
  warp.connect(warpDepth);
  if (pitchShift) {
    const pitchParam = pitchShift.parameters.get('pitchCents');
    if (pitchParam) warpDepth.connect(pitchParam);
  }
  warp.start();

  crush.curve = makeBitCurve(s.bitDepth);
  crush.oversample = 'none';
  if (pitchShift) {
    source.connect(pitchShift);
    pitchShift.connect(crush);
  } else {
    source.connect(crush);
  }
  crush.connect(hp);
  hp.connect(lp);
  artifactGain.connect(hp);
  lp.connect(phase);
  // Dry signal plus three decaying, 320 ms-spaced repeats.
  phase.connect(gain);
  phase.connect(delayOne);
  delayOne.connect(delayGainOne);
  delayGainOne.connect(gain);
  delayGainOne.connect(delayTwo);
  delayTwo.connect(delayGainTwo);
  delayGainTwo.connect(gain);
  delayGainTwo.connect(delayThree);
  delayThree.connect(delayGainThree);
  delayGainThree.connect(gain);
  gain.connect(analyser);
  analyser.connect(state.masterGain);

  return {
    source, highpass: hp, lowpass: lp, gain, artifactGain,
    phase, phaseLfo, phaseDepth, warp, warpDepth,
    delayOne, delayTwo, delayThree, delayGainOne, delayGainTwo, delayGainThree,
    crush, pitchShift, analyser,
    analyserData: new Uint8Array(analyser.frequencyBinCount)
  };
}
// Enable or clear the delay's three progressively quieter repeat taps.
function setDelayEffect(chain, depth, when = state.audio.currentTime) {
  if (!chain) return;
  const amount = Math.max(0, Math.min(1, Number(depth) || 0));
  const enabled = amount > 0;
  const levels = [
    [chain.delayGainOne, enabled ? 0.2 + amount * 0.5 : 0],
    [chain.delayGainTwo, enabled ? 0.55 : 0],
    [chain.delayGainThree, enabled ? 0.55 : 0]
  ];
  levels.forEach(([node, level]) => {
    if (node) node.gain.setTargetAtTime(level, when, 0.06);
  });
}

// Quantise the waveform to simulate reduced bit depth.
function makeBitCurve(bits) {
  const n=65536,steps=Math.max(2,Math.pow(2,bits));
  const curve=new Float32Array(n);
  for(let i=0;
  i<n;
  i++) {
    const x=i/(n-1)*2-1;
    curve[i]=Math.round(((x+1)*.5)*(steps-1))/(steps-1)*2-1
  }
  return curve
}
// Schedule all active stems at the same audio-clock instant and shared song position.
function startSources() {
  clearSources();
  const generation = state.songGeneration;
  const startAt = state.audio.currentTime + 0.035;

  TRACKS.forEach(track => {
    const buffer = state.buffers[track.id];
    if (!buffer) return;
    const source = state.audio.createBufferSource();
    source.buffer = buffer;
    const chain = makeTrackChain(track.id, source);
    state.sources[track.id] = chain;

    const pitchParam = chain.pitchShift && chain.pitchShift.parameters.get('pitchCents');
    if (pitchParam) pitchParam.setValueAtTime(trackState[track.id].detune, startAt);
    attachTrackEndHandler(track.id, chain, generation);
    const position = Math.max(0, Math.min(state.offsets[track.id] || 0, Math.max(0, buffer.duration - 0.01)));
    source.start(startAt, position);
  });
  state.startedAt = startAt;
}
function handleSongFinished(generation) {
  if (!state.playing || generation !== state.songGeneration) return;
  if (rhythm?.active && els.dialog?.open && state.selectedTrack === 'drums' && !rhythm.finished) finishRhythmRepair();

  const finishedSong = SONGS[currentSongIndex].title;
  const nextIndex = (currentSongIndex + 1) % SONGS.length;
  const nextSong = SONGS[nextIndex].title;
  addLog(finishedSong + ' finished. Continuing with ' + nextSong + '.', 'repair');

  stopPlayback(true);
  alignAllOffsets(0);
  void switchSong(nextIndex, true);
}

async function startPlayback(fromUserAction = false) {
  if (state.starting || state.playing) return false;
  state.starting = true;
  const generation = state.songGeneration;

  // Resume the existing AudioContext immediately while this call is still
  // running in the user's play-button gesture. Waiting for stem loading first
  // can lose Safari's transient user activation and leave playback silent.
  let gestureResumePromise = null;
  if (state.audio && state.audio.state === 'suspended') {
    try { gestureResumePromise = state.audio.resume(); } catch (_) {}
  }

  try {
    if (!state.loaded || state.loadedSongIndex !== currentSongIndex) {
      const ready = await loadAudio();
      if (!ready || state.loadedSongIndex !== currentSongIndex) {
        if (fromUserAction) void playUISound('error');
        return false;
      }
    }
    await initialiseAudio();
    if (!state.audio || generation !== state.songGeneration) {
      if (fromUserAction && generation === state.songGeneration) void playUISound('error');
      return false;
    }
    if (state.audio.state === 'suspended') {
      if (gestureResumePromise) await gestureResumePromise;
      if (state.audio.state === 'suspended') await state.audio.resume();
    }
    if (state.audio.state !== 'running') {
      throw new Error('The audio engine is still suspended. Press play again to allow audio playback.');
    }

    state.playing = true;
    if (!state.nextEventAt || state.nextEventAt <= performance.now()) scheduleNextEvent();
    startSources();
    els.play.classList.add('playing');
    els.play.setAttribute('aria-label', 'Pause song');
    els.playbackState.textContent = 'PLAYING / DECAY ACTIVE';
    addLog('Playback started. Decay system active.', 'repair');
    updateUI();
    updateTrackAudioVisuals();
    drawWaveform();
    if (fromUserAction) void playUISound('button');
    return true;
  } catch (error) {
    state.playing = false;
    console.error('Playback failed:', error);
    els.play.classList.remove('playing');
    els.play.setAttribute('aria-label', 'Play song');
    els.playbackState.textContent = 'PLAYBACK ERROR — SEE CONSOLE';
    addLog('Playback failed: ' + (error && error.message ? error.message : error), 'event');
    updateUI();
    if (fromUserAction) void playUISound('error');
    return false;
  } finally {
    state.starting = false;
  }
}
function stopPlayback(finished = false) {
  if (!state.audio) {
    state.playing = false;
    return;
  }
  const sharedPosition = currentMasterOffset();
  state.playing = false;
  state.nextEventAt = 0;
  if (state.decayTimer) clearTimeout(state.decayTimer);
  state.decayTimer = null;
  alignAllOffsets(sharedPosition);
  clearSources();

  els.play.classList.remove('playing');
  els.play.setAttribute('aria-label', 'Play song');
  els.playbackState.textContent = finished ? 'SONG COMPLETE' : 'PAUSED';
  if (!finished) addLog('Playback paused. All stems held at the same timeline position.', 'repair');
  updateUI();
  updateTrackAudioVisuals();
  drawWaveform();
}
// Apply one randomly selected decay event to one stem.
function applyEvent() {
  if(!state.playing)return;
  const t=TRACKS[Math.floor(Math.random()*TRACKS.length)],et=EVENT_TYPES[Math.floor(Math.random()*EVENT_TYPES.length)],sev=Math.round(et.severity[0]+Math.random()*(et.severity[1]-et.severity[0])),s=trackState[t.id],e= {
    type:et.id,name:et.name,description:et.description,severity:sev,time:new Date()
  }
  ;
  const d=state.sources[t.id];
  const switchWasAlreadyOn = s.events.some(event => event.type === et.id);
  if(et.id==='detune') {
    const cents=Math.round((Math.random()*2-1)*(35+Math.random()*85));
    s.detune=Math.max(-120,Math.min(120,s.detune+cents));
    e.detail=(cents>0?'+':'')+cents+' CENTS';
    const pitchParam=d?.pitchShift?.parameters.get('pitchCents');
    if(pitchParam)pitchParam.setTargetAtTime(s.detune,state.audio.currentTime,.12)
  }
  if(et.id==='highpass') {
    s.highpass=350+Math.random()*250;
    e.detail=Math.round(s.highpass)+'HZ CUTOFF';
    if(d)d.highpass.frequency.setTargetAtTime(s.highpass,state.audio.currentTime,.08)
  }
  if(et.id==='lowpass') {
    s.lowpass=1400+Math.random()*900;
    e.detail=Math.round(s.lowpass)+'HZ CUTOFF';
    if(d)d.lowpass.frequency.setTargetAtTime(s.lowpass,state.audio.currentTime,.08)
  }
  if(et.id==='bitcrush') {
    s.bitDepth=Math.max(2,s.bitDepth-Math.round(4+Math.random()*5));
    e.detail=s.bitDepth+' BIT — HEAVY REDUCTION';
    if(d)d.crush.curve=makeBitCurve(s.bitDepth)
  }
  if(et.id==='phase') {
    s.phaseDepth=Math.min(.75,s.phaseDepth+.15+Math.random()*.2);
    e.detail='±'+Math.round(s.phaseDepth*100)+'% PAN';
    if(d)d.phaseDepth.gain.setTargetAtTime(s.phaseDepth,state.audio.currentTime,.15)
  }
  if(et.id==='warp') {
    if(t.id==='drums') {
      scheduleNextEvent();
      return
    }
    s.warpDepth=Math.min(.018,s.warpDepth+.004+Math.random()*.004);
    e.detail='±'+Math.round(s.warpDepth*1000)+' CENTS PITCH';
    if(d)d.warpDepth.gain.setTargetAtTime(s.warpDepth*1000,state.audio.currentTime,.15)
  }
  if(et.id==='delay') {
    s.delayDepth = Math.min(1, s.delayDepth + .22 + Math.random() * .18);
    const firstEchoLevel = 0.2 + s.delayDepth * 0.5;
    e.detail = '3 REPEATS / FIRST ECHO ' + Math.round(firstEchoLevel * 100) + '%';
    if (d) setDelayEffect(d, s.delayDepth);
  }
  if(et.id==='crackle') {
    s.crackleDepth=Math.min(.7,s.crackleDepth+.12+Math.random()*.12);
    e.detail='ARTEFACT RATE '+Math.round(s.crackleDepth*100)+'%';
    if(d) {
      const bursts=Math.max(1,Math.round(2+s.crackleDepth*7));
      for(let i=0;
      i<bursts;
      i++) {
        const n=state.audio.createBufferSource(),ng=state.audio.createGain(),now=state.audio.currentTime,when=now+.03+Math.random()*.8;
        n.buffer=state.noiseBuffer;
        ng.gain.setValueAtTime(0,when);
        ng.gain.linearRampToValueAtTime(.04+.08*s.crackleDepth,when+.002);
        ng.gain.exponentialRampToValueAtTime(.001,when+.015+Math.random()*.025);
        n.connect(ng);
        ng.connect(d.artifactGain);
        n.onended = () => { try { n.disconnect(); } catch (_) {} try { ng.disconnect(); } catch (_) {} };
        n.start(when);
        n.stop(when + .05)
      }
    }
  }
  s.events.push(e);
  if (!switchWasAlreadyOn) playSwitchSound('on');
  addLog(t.name+': '+et.name+(e.detail?' / '+e.detail:''),'event');
  updateUI();
  scheduleNextEvent()
}
// Repair one stem, then keep every stem on the same song-clock position.
function repairTrack(id) {
  const s = trackState[id];
  if (!s || !s.events.length) return;
  const eventCount = s.events.length;
  const sharedPosition = currentMasterOffset();

  s.events = [];
  s.detune = 0;
  s.highpass = 20;
  s.lowpass = 20000;
  s.bitDepth = 16;
  s.phaseDepth = 0;
  s.warpDepth = 0;
  s.delayDepth = 0;
  s.crackleDepth = 0;

  alignAllOffsets(sharedPosition);
  if (state.playing) {
    // Reset every Web Audio source at the same clock instant to avoid drift.
    startSources();
  }

  const track = TRACKS.find(item => item.id === id);
  addLog((track ? track.name : id.toUpperCase()) + ' repaired by visitor / ' +
    eventCount + ' event' + (eventCount === 1 ? '' : 's') + ' cleared. All stems remain synchronised.', 'repair');
  updateUI();
  updateTrackAudioVisuals();
  if (state.selectedTrack === id) updateDialog();
}
function openTrackDialog(id) {
  state.selectedTrack = id;
  updateDialog();
  els.dialog.showModal();
  void playUISound('button');
}
function closeTrackDialog(fromUserAction = false) {
  if (fromUserAction) void playUISound('button');
  state.soloTrack = null;
  if (rhythm && rhythm.active) {
    rhythm.active = false;
    if (rhythm.stability >= 100) {
      setRepairFeedback('100% STABILITY — DRUM REPAIR SWITCHES UNLOCKED');
    } else {
      setRepairFeedback('CALIBRATION PAUSED — RESTART TO CONTINUE');
    }
  }
  TRACKS.forEach(track => {
    const chain = state.sources[track.id];
    if (chain && state.audio) chain.gain.gain.setTargetAtTime(1, state.audio.currentTime, .08);
  });
  els.dialog.close();
  updateDialog();
}
function renderDialogParticles(trackId, decay) {
  // Rebuild only when the selected song/instrument changes. Decay updates should
  // never recreate the particles or restart their floating animation.
  const signature = SONGS[currentSongIndex].id + ':' + trackId;
  if (state.particleSignature !== signature) {
    const count = 20;
    els.dialogParticles.innerHTML = Array.from({ length: count }, (_, index) => {
      const band = ['low', 'mid', 'high'][index % 3];
      const size = 4 + Math.random() * 5;
      const x = 6 + Math.random() * 88;
      const y = 6 + Math.random() * 88;
      const drift = 10 + Math.random() * 16;
      const life = 8 + Math.random() * 5;
      const delay = -Math.random() * life;
      const shiverDuration = 0.22 + Math.random() * 0.2;
      const shiverDelay = -Math.random() * shiverDuration;
      const dx1 = (Math.random() * 2 - 1) * drift;
      const dy1 = (Math.random() * 2 - 1) * drift;
      const dx2 = (Math.random() * 2 - 1) * drift * 0.8;
      const dy2 = (Math.random() * 2 - 1) * drift * 0.8;
      const dx3 = (Math.random() * 2 - 1) * drift * 0.65;
      const dy3 = (Math.random() * 2 - 1) * drift * 0.65;
      const shakeDirections = Array.from({ length: 4 }, () => ({
        x: (Math.random() * 2 - 1).toFixed(2),
        y: (Math.random() * 2 - 1).toFixed(2)
      }));
      const shakeVars = shakeDirections.map((point, index) =>
        '--shake-x' + (index + 1) + '-dir:' + point.x + ';' +
        '--shake-y' + (index + 1) + '-dir:' + point.y + ';'
      ).join('');
      return '<span class="decay-particle" data-audio-band="' + band + '" style="' +
        '--x:' + x.toFixed(1) + '%;' +
        '--y:' + y.toFixed(1) + '%;' +
        '--size:' + size.toFixed(1) + 'px;' +
        '--dx1:' + dx1.toFixed(1) + 'px;' +
        '--dy1:' + dy1.toFixed(1) + 'px;' +
        '--dx2:' + dx2.toFixed(1) + 'px;' +
        '--dy2:' + dy2.toFixed(1) + 'px;' +
        '--dx3:' + dx3.toFixed(1) + 'px;' +
        '--dy3:' + dy3.toFixed(1) + 'px;' +
        '--life:' + life.toFixed(2) + 's;' +
        '--delay:' + delay.toFixed(2) + 's;' +
        '--shiver-duration:' + shiverDuration.toFixed(2) + 's;' +
        '--shiver-delay:' + shiverDelay.toFixed(2) + 's;' +
        '--particle-opacity:.7;' +
        '--shake-x1:0px;--shake-y1:0px;--shake-x2:0px;--shake-y2:0px;' +
        '--shake-x3:0px;--shake-y3:0px;--shake-x4:0px;--shake-y4:0px;' +
        shakeVars +
        'background:#7f9a63;color:#7f9a63"></span>';
    }).join('');
    state.particleSignature = signature;
  }

  // Decay affects only the particles' colour and shake amplitude. Their anchor
  // positions, float paths, count and float speed remain unchanged.
  const colour = decay >= 70 ? '#b94b42' : decay >= 30 ? '#d7a72d' : '#7f9a63';
  const shakeAmplitude = 0.08 + Math.max(0, Math.min(100, decay)) * 0.018;
  els.dialogParticles.querySelectorAll('.decay-particle').forEach(particle => {
    particle.style.background = colour;
    particle.style.color = colour;
    for (let i = 1; i <= 4; i++) {
      const xDirection = parseFloat(particle.style.getPropertyValue('--shake-x' + i + '-dir')) || 0;
      const yDirection = parseFloat(particle.style.getPropertyValue('--shake-y' + i + '-dir')) || 0;
      particle.style.setProperty('--shake-x' + i, (xDirection * shakeAmplitude).toFixed(2) + 'px');
      particle.style.setProperty('--shake-y' + i, (yDirection * shakeAmplitude).toFixed(2) + 'px');
    }
  });

  els.dialogArtStage.style.setProperty('--instrument-decay', (decay / 100).toFixed(2));
  els.dialogArtStage.classList.toggle('instrument-warning', decay >= 30 && decay < 70);
  els.dialogArtStage.classList.toggle('instrument-critical', decay >= 70);
}
function repairEventType(typeId) {
  const id = state.selectedTrack;
  const s = trackState[id];
  if (!s) return;
  const activeEvents = s.events.filter(event => event.type === typeId);
  if (!activeEvents.length) return;

  playSwitchSound('off');
  s.events = s.events.filter(event => event.type !== typeId);
  const chain = state.sources[id];
  const now = state.audio ? state.audio.currentTime : 0;

  switch (typeId) {
    case 'detune':
      s.detune = 0;
      if (chain && chain.pitchShift) {
        const pitchParam = chain.pitchShift.parameters.get('pitchCents');
        if (pitchParam) pitchParam.setTargetAtTime(0, now, .12);
      }
      break;
    case 'highpass':
      s.highpass = 20;
      if (chain) chain.highpass.frequency.setTargetAtTime(20, now, .12);
      break;
    case 'lowpass':
      s.lowpass = 20000;
      if (chain) chain.lowpass.frequency.setTargetAtTime(20000, now, .12);
      break;
    case 'bitcrush':
      s.bitDepth = 16;
      if (chain) chain.crush.curve = makeBitCurve(16);
      break;
    case 'phase':
      s.phaseDepth = 0;
      if (chain) chain.phaseDepth.gain.setTargetAtTime(0, now, .12);
      break;
    case 'warp':
      s.warpDepth = 0;
      if (chain) chain.warpDepth.gain.setTargetAtTime(0, now, .12);
      break;
    case 'delay':
      s.delayDepth = 0;
      if (chain) setDelayEffect(chain, 0, now);
      break;
    case 'crackle':
      s.crackleDepth = 0;
      break;
  }

  const definition = EVENT_TYPES.find(event => event.id === typeId);
  addLog((TRACKS.find(track => track.id === id)?.name || id.toUpperCase()) +
    ' repaired: ' + (definition ? definition.name : typeId.toUpperCase()) + '.', 'repair');
  updateUI();
  updateDialog();
}
function updateDialog() {
  const track = TRACKS.find(item => item.id === state.selectedTrack);
  if (!track) return;
  const s = trackState[track.id];
  const decay = severityFor(track.id);
  const status = statusFor(decay);
  const isDrums = track.id === 'drums';
  const stability = rhythm ? rhythm.stability : 50;
  const rhythmLocked = isDrums && stability < 100;

  els.dialogTitle.textContent = track.name;
  els.dialogStatus.textContent = status.text;
  els.dialogStatus.className = 'dialog-status ' + status.className;
  els.dialogDecay.textContent = decay + '%';
  els.dialogCount.textContent = s.events.length;
  els.dialogSignal.textContent = s.events.length ? 'UNSTABLE' : 'STABLE';
  els.rhythmPanel.hidden = !isDrums;

  if (els.dialogInstrumentImage.dataset.track !== track.id) {
    els.dialogInstrumentImage.src = 'assets/' + track.id + '.png';
    els.dialogInstrumentImage.alt = track.name.toLowerCase() + ' instrument illustration';
    els.dialogInstrumentImage.dataset.track = track.id;
  }

  els.faultSwitches.innerHTML = EVENT_TYPES.map(event => {
    const active = s.events.some(item => item.type === event.id);
    const disabled = !active && !rhythmLocked;
    const classes = 'fault-switch ' + (active ? 'is-on' : 'is-off') +
      (rhythmLocked ? ' is-locked' : '');
    return '<button class="' + classes + '" type="button" role="switch" aria-checked="' + active + '" ' +
      'aria-disabled="' + (disabled || rhythmLocked) + '" ' +
      'aria-label="' + (active ? 'Flick ' : 'Inactive ') + event.name + (active ? ' switch off to repair' : ' switch; no repair needed') + '" ' +
      'title="' + event.name + '" data-event="' + event.id + '" ' +
      (disabled ? 'disabled' : '') + '>' +
        '<span class="fault-switch-led" aria-hidden="true"></span>' +
        '<span class="fault-switch-housing" aria-hidden="true">' +
          '<span class="fault-switch-lever"><span class="fault-switch-cap"></span></span>' +
        '</span>' +
        '<span class="fault-switch-label" aria-hidden="true">' + event.name + '</span>' +
    '</button>';
  }).join('');

  renderDialogParticles(track.id, decay);
  updateRhythmPanel();
  els.solo.setAttribute('aria-pressed', state.soloTrack === track.id ? 'true' : 'false');
  els.solo.classList.toggle('active', state.soloTrack === track.id);
  els.solo.innerHTML = '<span class="solo-indicator" aria-hidden="true"></span>' +
    (state.soloTrack === track.id ? 'UNSOLO' : 'SOLO');
}
function toggleSolo() {
  if (!state.selectedTrack || !state.audio) {
    void playUISound('error');
    return;
  }
  state.soloTrack = state.soloTrack === state.selectedTrack ? null : state.selectedTrack;
  TRACKS.forEach(track => {
    const chain = state.sources[track.id];
    if (chain) {
      const targetGain = state.soloTrack && state.soloTrack !== track.id ? 0.22 : 1;
      chain.gain.gain.setTargetAtTime(targetGain, state.audio.currentTime, .08);
    }
  });
  updateDialog();
  void playUISound('button');
}
// Draw the waveform with a reused canvas/context; do not reset its backing store on every frame.
function drawWaveform(timestamp = 0) {
  const canvas = els.waveform;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.floor(rect.width * ratio));
  const pixelHeight = Math.max(1, Math.floor(rect.height * ratio));
  const resized = canvas.width !== pixelWidth || canvas.height !== pixelHeight;

  if (!state.waveformCtx || resized) {
    if (resized) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    state.waveformCtx = canvas.getContext('2d');
    state.waveformCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.waveformPixelWidth = pixelWidth;
    state.waveformPixelHeight = pixelHeight;
    state.waveformData = null;
  }
  if (state.playing && timestamp - state.waveformDrawAt < 33) {
    requestAnimationFrame(drawWaveform);
    return;
  }
  state.waveformDrawAt = timestamp;
  const context = state.waveformCtx;
  context.clearRect(0, 0, rect.width, rect.height);
  let data = null;
  if (state.analyser && state.playing) {
    if (!state.waveformData || state.waveformData.length !== state.analyser.frequencyBinCount) {
      state.waveformData = new Uint8Array(state.analyser.frequencyBinCount);
    }
    data = state.waveformData;
    state.analyser.getByteFrequencyData(data);
  }
  const columnCount = Math.max(1, Math.floor(rect.width / 5));
  const activeColour = state.waveformColour || '#7f9a63';
  for (let i = 0; i < columnCount; i++) {
    const source = data ? data[Math.floor(i / columnCount * data.length)] / 255 : 0.12 + 0.08 * Math.sin(i * 0.45);
    const height = Math.max(2, source * rect.height * 0.65);
    context.fillStyle = state.playing ? activeColour : 'rgba(228,211,140,.24)';
    context.fillRect(i * 5, (rect.height - height) / 2, 2, height);
  }
  if (state.playing) requestAnimationFrame(drawWaveform);
}
function updateDialogAudioPulse(now = performance.now()) {
  if (!els.dialog || !els.dialog.open || !state.selectedTrack || !els.dialogParticles) {
    state.particleBandPulses = { low: 0, mid: 0, high: 0 };
    state.lastParticlePulseAt = 0;
    return;
  }
  if (now - (state.lastParticlePulseAt || 0) < 40) return;
  state.lastParticlePulseAt = now;

  const chain = state.sources[state.selectedTrack];
  const data = chain && chain.analyserData;
  const bandTargets = { low: 0, mid: 0, high: 0 };

  // Read the selected stem's post-effects spectrum so the particles follow the
  // actual sound, including any EQ decay or repairs applied to that instrument.
  if (state.playing && chain && chain.analyser && data && data.length && state.audio) {
    chain.analyser.getByteFrequencyData(data);
    const hzPerBin = state.audio.sampleRate / chain.analyser.fftSize;
    const ranges = {
      low: [35, 250],
      mid: [250, 2000],
      high: [2000, 12000]
    };

    Object.entries(ranges).forEach(([band, range]) => {
      const startBin = Math.max(1, Math.ceil(range[0] / hzPerBin));
      const endBin = Math.min(data.length - 1, Math.floor(range[1] / hzPerBin));
      if (endBin < startBin) return;

      let total = 0;
      let peak = 0;
      let count = 0;
      for (let i = startBin; i <= endBin; i++) {
        const value = data[i];
        total += value;
        if (value > peak) peak = value;
        count++;
      }
      if (!count) return;

      const average = total / count / 255;
      const peakLevel = peak / 255;
      // A little peak sensitivity keeps transients visible, especially in highs.
      bandTargets[band] = Math.min(1, average * 4.5 + peakLevel * 0.48);
    });
  }

  // Smooth each band independently so bass, mids and treble can pulse with
  // different timing and intensity rather than all particles moving together.
  if (!state.particleBandPulses) state.particleBandPulses = { low: 0, mid: 0, high: 0 };
  Object.keys(bandTargets).forEach(band => {
    const previous = state.particleBandPulses[band] || 0;
    const smoothing = band === 'low' ? 0.34 : band === 'mid' ? 0.42 : 0.5;
    state.particleBandPulses[band] = previous * (1 - smoothing) + bandTargets[band] * smoothing;
  });

  els.dialogParticles.querySelectorAll('.decay-particle').forEach(particle => {
    const band = particle.dataset.audioBand || 'mid';
    const pulse = Math.max(0, Math.min(1, state.particleBandPulses[band] || 0));
    // Bass creates a fuller swell, mids add a more obvious glow, and highs
    // create a brighter, quicker sparkle. Position and drift remain untouched.
    const scaleGain = band === 'low' ? 1.05 : band === 'mid' ? 0.82 : 0.62;
    const glowGain = band === 'low' ? 29 : band === 'mid' ? 37 : 44;
    const alphaGain = band === 'high' ? 0.78 : 0.66;
    particle.style.setProperty('--audio-scale', (0.78 + pulse * scaleGain).toFixed(2));
    particle.style.setProperty('--audio-glow', (11 + pulse * glowGain).toFixed(1) + 'px');
    particle.style.setProperty('--audio-glow-wide', (27 + pulse * (glowGain + 20)).toFixed(1) + 'px');
    particle.style.opacity = Math.min(1, 0.4 + pulse * alphaGain).toFixed(2);
  });
}
function updateTrackAudioVisuals() {
  TRACKS.forEach(track => {
    const card = els.grid.querySelector('[data-track="' + track.id + '"]');
    if (!card) return;
    const chain = state.sources[track.id];
    const bars = card.querySelectorAll('.signal-bars span');
    const level = card.querySelector('[data-level="' + track.id + '"]');
    const data = chain ? chain.analyserData : null;
    if (data && chain.analyser && state.playing) chain.analyser.getByteFrequencyData(data);
    bars.forEach((bar, index) => {
      const value = data && state.playing
        ? data[Math.min(data.length - 1, Math.floor(index / bars.length * data.length))] / 255
        : 0;
      const height = state.playing && chain ? 4 + value * 32 : 4;
      bar.style.height = height.toFixed(1) + 'px';
    });
    card.classList.toggle('signal-playing', !!(chain && state.playing));
    const newLabel = state.playing && chain ? 'LIVE SIGNAL' : state.loaded ? 'STANDBY' : 'OFFLINE';
    if (level && level.textContent !== newLabel) level.textContent = newLabel;
  });
}

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}
function updatePlaybackClock() {
  const now = performance.now();
  if (state.audio) {
    const position = currentMasterOffset();
    const masterTrack = TRACKS.find(t => t.id === 'drums') || TRACKS[0];
    const duration = masterTrack && state.buffers[masterTrack.id] ? state.buffers[masterTrack.id].duration : 0;
    els.playbackTime.textContent = formatTime(position) + ' / ' + (duration ? formatTime(duration) : '--:--');
    updateTrackAudioVisuals();
    updateDialogAudioPulse(now);
    updateRhythmRepair();
    if (now - state.lastClockTextAt >= 250) {
      const position = currentMasterOffset();
      const masterTrack = masterTrackForSong();
      const duration = masterTrack && state.buffers[masterTrack.id] ? state.buffers[masterTrack.id].duration : 0;
      els.playbackTime.textContent = formatTime(position) + ' / ' + (duration ? formatTime(duration) : '--:--');
      state.lastClockTextAt = now;
    }
    if (state.playing && now - state.lastTrackVisualAt >= 100) {
      updateTrackAudioVisuals();
      state.lastTrackVisualAt = now;
    }
  }
  requestAnimationFrame(updatePlaybackClock);
}

function renderCurrentSong() {
  const song = SONGS[currentSongIndex];
  els.songTitle.textContent = song.title;
  els.songNumber.textContent = 'SONG ' + String(song.number).padStart(2, '0');
  els.songArtist.textContent = song.artist;
  els.artNoise.textContent = String(currentSongIndex + 1).padStart(3, '0');
  els.albumArt.classList.toggle('has-cover', song.id === 'on-time');
  els.albumArt.setAttribute('aria-label', song.id === 'on-time' ? 'On Time cover artwork' : song.title + ' artwork placeholder');
  document.title = 'REPAIR / DECAY — ' + song.title;
}
function updateSongNavigation() {
  els.previousSong.disabled = currentSongIndex <= 0;
  els.nextSong.disabled = currentSongIndex >= SONGS.length - 1;
  els.previousSong.setAttribute('aria-label', currentSongIndex > 0 ? 'Previous song: ' + SONGS[currentSongIndex - 1].title : 'No previous song');
  els.nextSong.setAttribute('aria-label', currentSongIndex < SONGS.length - 1 ? 'Next song: ' + SONGS[currentSongIndex + 1].title : 'No next song');
}
async function switchSong(nextIndex, finishedNaturally = false, fromUserAction = false) {
  if (nextIndex < 0 || nextIndex >= SONGS.length || nextIndex === currentSongIndex) {
    if (fromUserAction) void playUISound('error');
    return;
  }
  if (fromUserAction) void playUISound('button');

  if (els.dialog && els.dialog.open) closeTrackDialog();
  if (state.playing) stopPlayback(finishedNaturally);

  rhythm = null;
  document.getElementById('rhythm-panel').hidden = true;
  state.songGeneration++;
  currentSongIndex = nextIndex;
  TRACKS = SONGS[currentSongIndex].tracks;
  trackState = songTrackStates[SONGS[currentSongIndex].id];
  state.playing = false;
  state.selectedTrack = null;
  state.soloTrack = null;
  state.overallDecay = 0;
  state.buffers = {};
  state.offsets = {};
  state.sources = {};
  state.loaded = false;
  state.loadedSongIndex = null;
  state.demoMode = false;
  state.nextEventAt = 0;

  els.play.classList.remove('playing');
  els.play.setAttribute('aria-label', 'Play song');
  els.playbackState.textContent = 'LOADING TRACKS…';
  els.playbackTime.textContent = '00:00 / --:--';
  renderCurrentSong();
  updateSongNavigation();
  renderTracks();
  updateUI();
  addLog('Loaded song ' + SONGS[currentSongIndex].title + '. Preparing its individual stems.', 'repair');

  const ready = await loadAudio();
  if (ready && state.loadedSongIndex === currentSongIndex) {
    await startPlayback();
  }
  updateUI();
  updateTrackAudioVisuals();
}

// Keep the cover square and align its outer height precisely with the player
// panel on desktop. A stacked mobile layout keeps the cover square on its own.
function syncAlbumCoverToPlayerPanel() {
  if (!els.playerSection || !els.playerPanel || !els.albumArt) return;
  if (window.matchMedia && window.matchMedia('(max-width: 850px)').matches) {
    els.playerSection.style.removeProperty('grid-template-columns');
    els.albumArt.style.removeProperty('width');
    els.albumArt.style.removeProperty('height');
    return;
  }
  const target = Math.ceil(els.playerPanel.getBoundingClientRect().height);
  if (!target) return;
  const current = Math.round(parseFloat(els.albumArt.style.width) || 0);
  if (Math.abs(current - target) <= 1) return;
  els.playerSection.style.gridTemplateColumns = target + 'px minmax(0, 1fr)';
  els.albumArt.style.width = target + 'px';
  els.albumArt.style.height = target + 'px';
}
function setupAlbumCoverSizing() {
  syncAlbumCoverToPlayerPanel();
  if (typeof ResizeObserver !== 'undefined' && els.playerPanel) {
    const observer = new ResizeObserver(() => requestAnimationFrame(syncAlbumCoverToPlayerPanel));
    observer.observe(els.playerPanel);
    state.albumResizeObserver = observer;
  }
  window.addEventListener('resize', () => requestAnimationFrame(syncAlbumCoverToPlayerPanel), { passive: true });
}

// Initialise the interface and audio system.
document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  renderCurrentSong();
  setupAlbumCoverSizing();
  updateSongNavigation();
  renderTracks();
  addLog('Maintenance system initialised.', 'repair');
  addLog('Waiting for the selected song stems.', 'event');
  updateUI();
  drawWaveform();
  updatePlaybackClock();
  loadAudio();

  els.play.addEventListener('click', () => {
    if (state.starting) {
      void playUISound('error');
    } else if (state.playing) {
      stopPlayback();
      void playUISound('button');
    } else {
      void startPlayback(true);
    }
  });
  document.addEventListener('keydown', handleRepairKey);
  els.previousSong.addEventListener('click', () => switchSong(currentSongIndex - 1, false, true));
  els.nextSong.addEventListener('click', () => switchSong(currentSongIndex + 1, false, true));
  els.closeDialog.addEventListener('click', () => closeTrackDialog(true));
  els.dialog.addEventListener('click', event => {
    if (event.target === els.dialog) closeTrackDialog();
  });
  els.faultSwitches.addEventListener('click', event => {
    const toggle = event.target.closest('[data-event]');
    if (!toggle) return;
    if (state.selectedTrack === 'drums' && (!rhythm || rhythm.stability < 100)) {
      showRepairLockToast(event.clientX, event.clientY);
      void playUISound('error');
      return;
    }
    if (!toggle.disabled) {
      repairEventType(toggle.dataset.event);
    } else {
      void playUISound('error');
    }
  });
  els.solo.addEventListener('click', toggleSolo);
  els.rhythmStart.addEventListener('click', () => restartRhythmRepair(true));

  // Soft plink on mouse hover for enabled buttons and link-style buttons.
  document.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse') return;
    const target = event.target.closest('button, a[href], [role="button"]');
    if (!target || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return;
    if (event.relatedTarget && target.contains(event.relatedTarget)) return;
    void playUISound('plink', 0.05);
  }, true);
});

// MVP: one fixed drum target; onset cues are derived from the decoded stem.
// All timing uses the shared Web Audio song clock, including pause/resume.
const REPAIR_WINDOW = 0.14;
let rhythm = null;
function drumRepairBeats(buffer) {
  const samples = buffer.getChannelData(0), hop = Math.floor(buffer.sampleRate * .01);
  const energies = [];
  for (let i = 0; i < samples.length; i += hop) {
    let energy = 0;
    for (let j = i; j < Math.min(i + hop, samples.length); j++) energy += samples[j] ** 2;
    energies.push(energy / hop);
  }
  const peaks = [];
  // Keep the same short intro exclusion, but find cues across the whole song
  // so calibration can begin wherever the listener currently is.
  for (let i = 500; i < energies.length - 1; i++) {
    const baseline = energies.slice(i - 12, i).reduce((a, b) => a + b, 0) / 12;
    if (energies[i] > Math.max(.00001, baseline * 2) && energies[i] >= energies[i-1] && energies[i] > energies[i+1]) {
      if (!peaks.length || i * .01 - peaks[peaks.length - 1] > .4) peaks.push(i * .01);
    }
  }
  return peaks;
}
function prepareRhythmRepair() {
  const drumBuffer = state.buffers.drums;
  if (!drumBuffer) {
    rhythm = { beats: [], judged: new Set(), hits: 0, stability: 50, active: false, finished: true };
    setRepairFeedback('DRUM STEM NOT READY — CANNOT CALIBRATE');
    updateRhythmPanel();
    return false;
  }

  // Use only beat cues that are still ahead of the current playback position.
  // This lets calibration run without resetting the song to its beginning.
  const currentPosition = currentMasterOffset();
  const beats = drumRepairBeats(drumBuffer)
    .filter(beat => beat > currentPosition + REPAIR_WINDOW * 1.5)
    .slice(0, 16);
  rhythm = { beats, judged: new Set(), hits: 0, stability: 50, active: false, finished: false };
  if (!beats.length) {
    rhythm.finished = true;
    setRepairFeedback('NO USABLE BEAT CUES FOUND — TRY AGAIN');
    updateRhythmPanel();
    return false;
  }

  rhythm.active = true;
  setRepairFeedback('CALIBRATING — PRESS F ON EACH CENTRE HIT');
  renderRepairState();
  updateDialog();
  return true;
}
function setRepairFeedback(message) {
  document.getElementById('repair-feedback').textContent = message;
}
function renderRepairState() {
  if (!rhythm) return;
  document.getElementById('repair-stability').value = rhythm.stability;
  document.getElementById('repair-stability-text').textContent = Math.round(rhythm.stability) + '%';
  document.getElementById('repair-progress').textContent = rhythm.hits + ' / ' + rhythm.beats.length + ' hits landed';
  updateRhythmPanel();
}
function updateRhythmPanel() {
  if (!els.rhythmPanel || !els.rhythmStart) return;
  const stability = rhythm ? rhythm.stability : 50;
  const playingGame = !!(rhythm && rhythm.active && !rhythm.finished);
  document.getElementById('repair-stability').value = stability;
  document.getElementById('repair-stability-text').textContent = Math.round(stability) + '%';
  document.getElementById('repair-progress').textContent = rhythm
    ? rhythm.hits + ' / ' + rhythm.beats.length + ' hits landed'
    : '0 / 0 hits landed';

  if (stability >= 100) {
    setRepairFeedback('100% STABILITY — DRUM REPAIR SWITCHES UNLOCKED');
    els.rhythmStart.hidden = true;
  } else if (playingGame) {
    els.rhythmStart.hidden = true;
  } else {
    els.rhythmStart.hidden = false;
    els.rhythmStart.textContent = rhythm ? 'RETRY RHYTHM CALIBRATION' : 'START RHYTHM CALIBRATION';
  }
}
function updateRhythmRepair() {
  if (!rhythm || !els.dialog?.open || state.selectedTrack !== 'drums' || !rhythm.active) return;
  const position = currentMasterOffset();
  if (state.playing && !rhythm.finished) {
    rhythm.beats.forEach((beat, i) => {
      if (!rhythm.judged.has(i) && position > beat + REPAIR_WINDOW) {
        rhythm.judged.add(i);
        rhythm.stability = Math.max(0, rhythm.stability - 10);
        setRepairFeedback('MISSED HIT — KEEP THE SIGNAL STEADY');
        renderRepairState();
      }
    });
    if (rhythm.beats.length && position > rhythm.beats[rhythm.beats.length - 1] + .5) finishRhythmRepair();
  }
  drawRepairSignal(position);
}
function handleRepairKey(event) {
  if (event.code !== 'KeyF' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!els.dialog?.open || state.selectedTrack !== 'drums' || !rhythm?.active || rhythm.finished || !state.playing) return;
  if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
  event.preventDefault();
  updateRhythmRepair();
  if (rhythm.finished) return;
  const position = currentMasterOffset();
  const index = rhythm.beats.findIndex((beat, i) => !rhythm.judged.has(i) && Math.abs(position - beat) <= REPAIR_WINDOW);
  if (index >= 0) {
    rhythm.judged.add(index);
    rhythm.hits++;
    rhythm.stability = Math.min(100, rhythm.stability + 8);
    setRepairFeedback(rhythm.stability >= 100
      ? '100% STABILITY — DRUM REPAIR SWITCHES UNLOCKED'
      : 'CORRECT HIT — SIGNAL STABILISING');
  } else {
    rhythm.stability = Math.max(0, rhythm.stability - 10);
    setRepairFeedback('MISS — OUTSIDE REPAIR WINDOW');
  }
  renderRepairState();
  updateDialog();
  if (rhythm.stability >= 100) finishRhythmRepair();
}
function finishRhythmRepair() {
  if (!rhythm || rhythm.finished) return;
  rhythm.finished = true;
  rhythm.active = false;
  const unlocked = rhythm.stability >= 100;
  setRepairFeedback(unlocked
    ? '100% STABILITY — DRUM REPAIR SWITCHES UNLOCKED'
    : 'CALIBRATION ENDED — REACH 100% TO UNLOCK THE SWITCHES');
  updateRhythmPanel();
  updateDialog();
}
async function restartRhythmRepair(fromUserAction = false) {
  if (!els.dialog?.open || state.selectedTrack !== 'drums') {
    if (fromUserAction) void playUISound('error');
    return;
  }
  if (!state.loaded || state.loadedSongIndex !== currentSongIndex) {
    const ready = await loadAudio();
    if (!ready || !state.buffers.drums) {
      setRepairFeedback('AUDIO STEMS NOT READY — PLEASE TRY AGAIN');
      if (fromUserAction) void playUISound('error');
      return;
    }
  }
  if (!state.buffers.drums) {
    setRepairFeedback('DRUM STEM NOT READY — CANNOT CALIBRATE');
    if (fromUserAction) void playUISound('error');
    return;
  }

  // Leave an already-playing song alone. If playback is paused, resume from
  // its saved offset rather than forcing every stem back to the beginning.
  const wasPlaying = state.playing;
  const prepared = prepareRhythmRepair();
  if (!prepared) {
    if (fromUserAction) void playUISound('error');
    return;
  }

  if (!wasPlaying) {
    const started = await startPlayback();
    if (!started || !state.playing) {
      if (rhythm) {
        rhythm.active = false;
        setRepairFeedback('PLAYBACK COULD NOT RESUME — TRY CALIBRATION AGAIN');
        updateRhythmPanel();
      }
      if (fromUserAction) void playUISound('error');
      return;
    }
  }
  if (state.playing && fromUserAction) {
    void playUISound('button');
  }
}
function showRepairLockToast(x, y) {
  if (!els.repairLockToast) return;
  els.repairLockToast.textContent = 'Signal stability must reach 100% to repair drums.';
  els.repairLockToast.hidden = false;
  const maxX = Math.max(12, window.innerWidth - 292);
  const maxY = Math.max(12, window.innerHeight - 72);
  els.repairLockToast.style.left = Math.max(12, Math.min((x || 0) + 14, maxX)) + 'px';
  els.repairLockToast.style.top = Math.max(12, Math.min((y || 0) + 14, maxY)) + 'px';
  clearTimeout(state.repairLockToastTimer);
  state.repairLockToastTimer = setTimeout(() => {
    els.repairLockToast.hidden = true;
  }, 1850);
}
function drawRepairSignal(position) {
  const canvas = document.getElementById('repair-signal'), rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.round(120 * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const centre = rect.width / 2, scale = rect.width / 6;
  ctx.fillStyle = 'rgba(127,154,99,.18)';
  ctx.fillRect(centre - REPAIR_WINDOW * scale, 0, REPAIR_WINDOW * scale * 2, 120);
  const buffer = state.buffers.drums, samples = buffer?.getChannelData(0);
  ctx.strokeStyle = '#8e8154'; ctx.beginPath();
  for (let x = 0; x < rect.width; x += 2) {
    const time = position + (x - centre) / scale;
    const sample = samples && time >= 0 ? samples[Math.floor(time * buffer.sampleRate)] || 0 : 0;
    const y = 60 + sample * 48;
    if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  rhythm.beats.forEach((beat, i) => {
    const x = centre + (beat - position) * scale;
    ctx.fillStyle = rhythm.judged.has(i) ? '#6c6757' : '#d7a72d';
    ctx.fillRect(x - 2, 16, 4, 88);
  });
  const cue = state.playing && !rhythm.finished && rhythm.beats.some(beat => Math.abs(position - beat) <= REPAIR_WINDOW);
  ctx.strokeStyle = cue ? '#e4d38c' : '#7f9a63';
  ctx.lineWidth = cue ? 4 : 2; ctx.beginPath(); ctx.moveTo(centre, 0); ctx.lineTo(centre, 120); ctx.stroke();
}
