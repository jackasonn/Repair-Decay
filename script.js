// ───────────────────────────────────────────────
// TRACKS + DECAY EVENT DEFINITIONS
// ───────────────────────────────────────────────
const SONGS = [
  {
    id: 'on-time',
    titleImage: 'assets/On time fonts.png',
    cover: 'On time cover.png',
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
    titleImage: 'assets/Reconcile fonts.png',
    cover: 'Reconcile cover.png',
    title: 'RECONCILE',
    number: 2,
    artist: 'JACKSON MOORE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/reconcile-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/reconcile-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/reconcile-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/reconcile-keys.mp3' }
    ]
  },
  {
    id: 'rainy-night',
    titleImage: 'assets/Rainy night fonts.png',
    cover: 'Riany n cover copy.png',
    title: 'RAINY NIGHT',
    number: 3,
    artist: 'TAYLA KANE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/rainy-night-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/rainy-night-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/rainy-night-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/rainy-night-keys.mp3' },
      { id: 'vocals', name: 'VOCALS', file: 'assets/rainy-night-vocals.mp3' }
    ]
  },
  {
    id: 'there-is-love',
    titleImage: 'assets/This is love fonts.png',
    cover: 'love cover copy 2.png',
    title: 'THERE IS LOVE',
    number: 4,
    artist: 'JACKSON MOORE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/there-is-love-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/there-is-love-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/there-is-love-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/there-is-love-keys.mp3' },
      { id: 'vocals', name: 'VOCALS', file: 'assets/there-is-love-vocals.mp3' }
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
  playing:false,startedAt:0,nextEventAt:0,selectedTrack:null,overallDialog:false,soloTrack:null,knobInteracting:false,overallDecay:0,logs:[],audio:null,buffers: {
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
  els.decayPanel = document.getElementById('decay-panel');
  els.dialogOverallArt = document.getElementById('dialog-overall-art');
  els.dialogOverallPercent = document.getElementById('dialog-overall-percent');
  els.dialogOverallMeter = document.getElementById('dialog-overall-meter');
  els.dialogOverallSummary = document.getElementById('dialog-overall-summary');
  els.switchesHeadingTitle = document.getElementById('dialog-switches-heading-title');
  els.switchesHeadingHelp = document.getElementById('dialog-switches-heading-help');
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
  els.guitarPanel = document.getElementById('guitar-panel');
  els.keysPanel = document.getElementById('keys-panel');
  els.vocalPanel = document.getElementById('vocal-panel');
  els.vocalInput = document.getElementById('vocal-input');
  els.vocalPlay = document.getElementById('vocal-play');
  els.guitarTargets = document.getElementById('guitar-targets');
  els.guitarNotices = document.getElementById('guitar-notices');
  els.guitarStrings = document.querySelector('.guitar-strings');
  els.guitarBoard = document.querySelector('.guitar-soundboard');
  els.keysSignal = document.getElementById('keys-signal');
  els.keysTargetLabels = document.getElementById('keys-target-labels');
  els.rhythmCanvas = document.getElementById('repair-signal');
  els.rhythmPanel = document.getElementById('rhythm-panel');
  els.rhythmTargetLabels = document.getElementById('repair-target-labels');
  els.rhythmActiveCount = document.getElementById('repair-active-count');
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

  els.decayPanel.classList.toggle('decay-panel-critical', state.overallDecay >= 70);
  els.decayPanel.setAttribute('aria-label', 'Open overall decay repair controls. Current decay level ' + state.overallDecay + '%.');
  if (els.dialog && els.dialog.open && (state.selectedTrack || state.overallDialog)) updateDialog();
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
  if (state.audio && state.audio.state !== 'closed') return;
  if (state.audio && state.audio.state === 'closed') {
    state.audio = null;
    state.masterGain = null;
    state.analyser = null;
    state.pitchReady = false;
    state.switchSoundBuffers = {};
    state.switchSoundLoadPromise = null;
    state.switchSoundAssetsLoaded = false;
  }
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

// Resume the audio engine directly from the first user gesture. Some browsers
// suspend contexts created during page load and need this immediate gesture-bound call.
function unlockAudioFromGesture() {
  try {
    if (!state.audio || state.audio.state === 'closed') {
      const setupPromise = initialiseAudio();
      const createdContext = state.audio;
      if (createdContext && createdContext.state !== 'running') {
        const resumePromise = createdContext.resume();
        if (resumePromise && typeof resumePromise.catch === 'function') {
          resumePromise.catch(() => {});
        }
      }
      void setupPromise.catch(error => console.warn('Audio engine could not initialise.', error));
      return;
    }
    if (state.audio.state !== 'running') {
      const resumePromise = state.audio.resume();
      if (resumePromise && typeof resumePromise.catch === 'function') {
        resumePromise.catch(() => {});
      }
    }
  } catch (error) {
    console.warn('Audio engine could not resume from user interaction.', error);
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
    plink: 'assets/plink.mp3',
    guitarLowE: 'assets/guitar%20low%20e.mp3',
    guitarA: 'assets/guitar%20a.mp3',
    guitarD: 'assets/guitar%20d.mp3',
    guitarG: 'assets/guitar%20g.mp3',
    guitarB: 'assets/guitar%20b.mp3',
    guitarHighE: 'assets/guitar%20high%20e.mp3'
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
// String sound files are ordered exactly like the six visible strings, top to bottom.
function playGuitarStringSound(stringIndex) {
  const stringSounds = ['guitarLowE', 'guitarA', 'guitarD', 'guitarG', 'guitarB', 'guitarHighE'];
  const sound = stringSounds[stringIndex];
  if (sound) void playUISound(sound, 0.82);
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
  delayTwo.delayTime.value = 0.64;
  delayThree.delayTime.value = 0.96;
  const delayActive = s.delayDepth > 0;
  const delayLevel = delayActive ? 0.24 + Math.min(1, s.delayDepth) * 0.35 : 0;
  delayGainOne.gain.value = delayLevel;
  delayGainTwo.gain.value = delayLevel * 0.55;
  delayGainThree.gain.value = delayLevel * 0.3;
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
  // Keep the dry signal independent. Three parallel taps add distinct echoes
  // at 320 ms, 640 ms and 960 ms, each quieter than the previous repeat.
  phase.connect(gain);
  phase.connect(delayOne);
  delayOne.connect(delayGainOne);
  delayGainOne.connect(gain);
  phase.connect(delayTwo);
  delayTwo.connect(delayGainTwo);
  delayGainTwo.connect(gain);
  phase.connect(delayThree);
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
  const firstEcho = enabled ? 0.24 + amount * 0.35 : 0;
  const levels = [
    [chain.delayGainOne, firstEcho],
    [chain.delayGainTwo, firstEcho * 0.55],
    [chain.delayGainThree, firstEcho * 0.3]
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
  if (state.audio && state.audio.state !== 'running' && state.audio.state !== 'closed') {
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
function closeRepairedDialog() {
  if (!els.dialog?.open) return;
  const repaired = state.overallDialog
    ? TRACKS.every(track => trackState[track.id].events.length === 0)
    : state.selectedTrack && trackState[state.selectedTrack]?.events.length === 0;
  if (repaired) closeTrackDialog();
}
function openTrackDialog(id) {
  state.overallDialog = false;
  state.selectedTrack = id;
  updateDialog();
  els.dialog.showModal();
  if (id === 'guitars') startGuitarRepair();
  if (id === 'drums') startRhythmRepair(true);
  if (id === 'keys') startKeysRepair();
  if (id === 'vocals' && vocalTypingAvailable()) startVocalRepair();
  void playUISound('button');
}
function closeTrackDialog(fromUserAction = false) {
  guitarRepair = null;
  keysRepair = null;
  vocalRepair = null;
  finishGuitarStringDrag();
  const wasOverallDialog = state.overallDialog;
  if (fromUserAction) void playUISound('button');
  state.soloTrack = null;
  if (rhythm && rhythm.active) {
    rhythm.active = false;
    setRepairFeedback('REPAIR PAUSED — OPEN DRUMS AGAIN TO RESTART');
  }
  TRACKS.forEach(track => {
    const chain = state.sources[track.id];
    if (chain && state.audio) chain.gain.gain.setTargetAtTime(1, state.audio.currentTime, .08);
  });
  els.dialog.close();
  state.overallDialog = false;
  if (wasOverallDialog) state.selectedTrack = null;
  updateDialog();
}
function openOverallDecayDialog() {
  if (els.dialog.open) return;
  state.overallDialog = true;
  state.selectedTrack = null;
  state.soloTrack = null;
  updateDialog();
  els.dialog.showModal();
  void playUISound('button');
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
function repairTrackEventType(trackId, typeId) {
  const s = trackState[trackId];
  if (!s) return 0;
  const activeEvents = s.events.filter(event => event.type === typeId);
  if (!activeEvents.length) return 0;

  s.events = s.events.filter(event => event.type !== typeId);
  const chain = state.sources[trackId];
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
  return activeEvents.length;
}
function repairEventType(typeId) {
  const id = state.selectedTrack;
  if (!id) return;
  const repairedCount = repairTrackEventType(id, typeId);
  if (!repairedCount) return;

  playSwitchSound('off');
  const definition = EVENT_TYPES.find(event => event.id === typeId);
  addLog((TRACKS.find(track => track.id === id)?.name || id.toUpperCase()) +
    ' repaired: ' + (definition ? definition.name : typeId.toUpperCase()) + '.', 'repair');
  updateUI();
  updateDialog();
  closeRepairedDialog();
}
function repairGlobalEventType(typeId) {
  const affectedTracks = TRACKS.filter(track =>
    trackState[track.id].events.some(event => event.type === typeId)
  );
  if (!affectedTracks.length) {
    void playUISound('error');
    return;
  }

  let repairedEvents = 0;
  affectedTracks.forEach(track => {
    repairedEvents += repairTrackEventType(track.id, typeId);
  });
  playSwitchSound('off');
  const definition = EVENT_TYPES.find(event => event.id === typeId);
  addLog('GLOBAL REPAIR: ' + (definition ? definition.name : typeId.toUpperCase()) +
    ' cleared from ' + affectedTracks.length + ' instrument' +
    (affectedTracks.length === 1 ? '' : 's') + ' (' + repairedEvents + ' event' +
    (repairedEvents === 1 ? '' : 's') + ').', 'repair');
  updateUI();
  updateDialog();
  closeRepairedDialog();
}
function renderFaultSwitch(event, active, disabled, locked, isGlobal) {
  const classes = 'fault-switch ' + (active ? 'is-on' : 'is-off') +
    (locked ? ' is-locked' : '');
  const ariaLabel = isGlobal
    ? 'Repair ' + event.name + ' across all instruments'
    : active
      ? 'Flick ' + event.name + ' switch off to repair'
      : 'Inactive ' + event.name + ' switch; no repair needed';
  return '<button class="' + classes + '" type="button" role="switch" aria-checked="' + active + '" ' +
    'aria-disabled="' + (disabled || locked) + '" aria-label="' + ariaLabel + '" ' +
    'title="' + event.name + '" data-event="' + event.id + '" ' +
    (disabled ? 'disabled' : '') + '>' +
      '<span class="fault-switch-led" aria-hidden="true"></span>' +
      '<span class="fault-switch-housing" aria-hidden="true">' +
        '<span class="fault-switch-lever"><span class="fault-switch-cap"></span></span>' +
      '</span>' +
      '<span class="fault-switch-label" aria-hidden="true">' + event.name + '</span>' +
  '</button>';
}
function updateOverallDecayDialog() {
  els.faultSwitches.hidden = false;
  document.getElementById('decay-switches-heading').hidden = false;
  const decay = state.overallDecay;
  const status = statusFor(decay);
  const eventCount = TRACKS.reduce((total, track) => total + trackState[track.id].events.length, 0);

  els.dialogTitle.textContent = 'DECAY LEVEL';
  els.dialogStatus.textContent = status.text;
  els.dialogStatus.className = 'dialog-status ' + status.className;
  els.dialogDecay.textContent = decay + '%';
  els.dialogCount.textContent = eventCount;
  els.dialogSignal.textContent = eventCount ? 'GLOBAL REPAIR READY' : 'NO ACTIVE EVENTS';

  els.dialogArtStage.classList.add('system-decay-art-stage');
  els.dialogArtStage.classList.toggle('system-decay-critical', decay >= 70);
  els.dialogArtStage.classList.toggle('system-decay-warning', decay >= 30 && decay < 70);
  els.dialogInstrumentImage.hidden = true;
  els.dialogParticles.hidden = true;
  els.dialogOverallArt.hidden = false;
  els.dialogOverallArt.className = 'dialog-overall-art ' + status.className;
  els.dialogOverallPercent.textContent = decay + '%';
  els.dialogOverallMeter.style.width = decay + '%';
  els.dialogOverallMeter.className = status.className;
  els.dialogOverallSummary.textContent = eventCount
    ? 'SELECT AN ACTIVE SWITCH TO REPAIR THAT EVENT GLOBALLY'
    : 'NO ACTIVE DECAY EVENTS TO REPAIR';
  els.solo.hidden = true;
  els.rhythmPanel.hidden = true;
  els.guitarPanel.hidden = true;
  els.keysPanel.hidden = true;
  els.vocalPanel.hidden = true;
  els.switchesHeadingTitle.textContent = 'GLOBAL REPAIR SWITCHES';
  els.switchesHeadingHelp.textContent = 'FLIP AN ACTIVE SWITCH TO REPAIR THAT EVENT ON EVERY INSTRUMENT';

  els.faultSwitches.innerHTML = EVENT_TYPES.map(event => {
    const active = TRACKS.some(track =>
      trackState[track.id].events.some(item => item.type === event.id)
    );
    // Global repairs are available at every decay level; only events currently
    // active on at least one instrument can be selected for repair.
    const disabled = !active;
    return renderFaultSwitch(event, active, disabled, false, true);
  }).join('');
}
function updateDialog() {
  if (state.overallDialog) {
    updateOverallDecayDialog();
    return;
  }

  const track = TRACKS.find(item => item.id === state.selectedTrack);
  if (!track) return;
  const s = trackState[track.id];
  const decay = severityFor(track.id);
  const status = statusFor(decay);
  const isDrums = track.id === 'drums';
  const isGuitar = track.id === 'guitars';
  const isKeys = track.id === 'keys';
  const isVocalTyping = track.id === 'vocals' && vocalTypingAvailable();
  const rhythmLocked = isDrums || isGuitar || isKeys || isVocalTyping;
  els.faultSwitches.hidden = rhythmLocked;
  document.getElementById('decay-switches-heading').hidden = rhythmLocked;
  els.guitarPanel.hidden = !isGuitar;
  els.keysPanel.hidden = !isKeys;
  els.vocalPanel.hidden = !isVocalTyping;

  els.dialogArtStage.classList.remove('system-decay-art-stage', 'system-decay-critical', 'system-decay-warning');
  els.dialogInstrumentImage.hidden = false;
  els.dialogParticles.hidden = false;
  els.dialogOverallArt.hidden = true;
  els.solo.hidden = false;
  els.dialogTitle.textContent = track.name;
  els.dialogStatus.textContent = status.text;
  els.dialogStatus.className = 'dialog-status ' + status.className;
  els.dialogDecay.textContent = decay + '%';
  els.dialogCount.textContent = s.events.length;
  els.dialogSignal.textContent = s.events.length ? 'UNSTABLE' : 'STABLE';
  els.rhythmPanel.hidden = !isDrums;
  els.switchesHeadingTitle.textContent = 'DECAY SWITCHES';
  els.switchesHeadingHelp.textContent = 'FLIP ACTIVE SWITCHES OFF TO REPAIR';

  if (els.dialogInstrumentImage.dataset.track !== track.id) {
    els.dialogInstrumentImage.src = 'assets/' + (track.id === 'vocals' ? 'vocal' : track.id) + '.png';
    els.dialogInstrumentImage.alt = track.name.toLowerCase() + ' instrument illustration';
    els.dialogInstrumentImage.dataset.track = track.id;
  }

  els.faultSwitches.innerHTML = EVENT_TYPES.map(event => {
    const active = s.events.some(item => item.type === event.id);
    const disabled = !active && !rhythmLocked;
    return renderFaultSwitch(event, active, disabled, rhythmLocked, false);
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
  updateGuitarRepair(now);
  updateKeysRepair(now);
  updateVocalRepair();
  requestAnimationFrame(updatePlaybackClock);
}

function renderCurrentSong() {
  const song = SONGS[currentSongIndex];
  els.songTitle.innerHTML = '<img class="song-title-image" src="' + encodeURI(song.titleImage) + '" alt="' + song.title + '">';
  els.songNumber.textContent = String(song.number).padStart(2, '0') + ' OF ' + String(SONGS.length).padStart(2, '0');
  els.songArtist.textContent = song.artist;
  els.artNoise.textContent = String(currentSongIndex + 1).padStart(3, '0');
  els.albumCoverImage.src = encodeURI(song.cover);
  els.albumCoverImage.alt = song.title + ' cover artwork';
  els.albumArt.classList.toggle('has-cover', Boolean(song.cover));
  els.albumArt.setAttribute('aria-label', song.title + ' cover artwork');
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
  document.addEventListener('pointerdown', unlockAudioFromGesture, true);
  document.addEventListener('keydown', unlockAudioFromGesture, true);
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

  els.decayPanel.addEventListener('click', () => openOverallDecayDialog());
  els.decayPanel.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openOverallDecayDialog();
  });

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
  document.addEventListener('keydown', handleKeysRepairKey);
  els.previousSong.addEventListener('click', () => switchSong(currentSongIndex - 1, false, true));
  els.nextSong.addEventListener('click', () => switchSong(currentSongIndex + 1, false, true));
  els.closeDialog.addEventListener('click', () => closeTrackDialog(true));
  els.dialog.addEventListener('click', event => {
    if (event.target === els.dialog) closeTrackDialog();
  });
  els.faultSwitches.addEventListener('click', event => {
    const toggle = event.target.closest('[data-event]');
    if (!toggle) return;
    if (state.overallDialog) {
      if (!toggle.disabled) {
        repairGlobalEventType(toggle.dataset.event);
      } else {
        void playUISound('error');
      }
      return;
    }
    if (state.selectedTrack === 'guitars' || state.selectedTrack === 'keys' ||
        (state.selectedTrack === 'vocals' && vocalTypingAvailable())) return;
    if (state.selectedTrack === 'drums') {
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
  els.guitarTargets.addEventListener('click', handleGuitarTarget);
  els.dialog.addEventListener('close', () => { guitarRepair = null; keysRepair = null; vocalRepair = null; });
  els.vocalPlay.addEventListener('click', async () => {
    if (!currentVocalRepair()) return;
    await startPlayback(true);
    if (currentVocalRepair()) { updateVocalRepair(); els.vocalInput.focus({preventScroll:true}); }
  });
  els.vocalInput.addEventListener('input', handleVocalInput);
  els.vocalInput.addEventListener('compositionend', handleVocalInput);
  els.guitarBoard.addEventListener('pointerdown', handleGuitarStringPointerDown);
  document.addEventListener('pointermove', handleGuitarStringPointerMove);
  document.addEventListener('pointerup', finishGuitarStringDrag);
  document.addEventListener('pointercancel', finishGuitarStringDrag);
  window.addEventListener('blur', () => finishGuitarStringDrag());
  els.keysSignal.addEventListener('click', handleKeysRepairClick);
  els.solo.addEventListener('click', toggleSolo);
  els.rhythmCanvas.addEventListener('click', handleDrumRepairClick);

  // Soft plink on mouse hover for enabled buttons and link-style buttons.
  document.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse') return;
    const target = event.target.closest('button, a[href], [role="button"]');
    if (!target || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return;
    if (event.relatedTarget && target.contains(event.relatedTarget)) return;
    void playUISound('plink', 0.05);
  }, true);
});

// Event-driven Drum repair: every moving line represents a real active decay effect.
const DRUM_HIT_WINDOW_MS = 260;
const DRUM_TRAVEL_MS = 1850;
const DRUM_EVENT_SPACING_MS = 1450;
const DRUM_RETRY_DELAY_MS = 650;
const DRUM_HIT_VISUAL_MS = 720;
const DRUM_COLOURS = ['#e69bd5', '#67dce6', '#9fda72', '#ed8c7e'];
let rhythm = null;

function audibleSongPosition(trackId) {
  if (!state.playing || !state.audio) return currentMasterOffset();
  const audio = state.audio;
  let outputTime = audio.currentTime - (audio.outputLatency || audio.baseLatency || 0);
  const stamp = audio.getOutputTimestamp?.();
  if (stamp && stamp.contextTime > 0 && stamp.performanceTime > 0) {
    outputTime = Math.min(audio.currentTime, stamp.contextTime + Math.max(0, performance.now() - stamp.performanceTime) / 1000);
  }
  const workletDelay = state.sources[trackId]?.pitchShift ? 2944 / audio.sampleRate : 0;
  return Math.max(0, (state.offsets.drums || 0) + outputTime - state.startedAt - workletDelay);
}
function currentRhythmRepair() {
  return !!rhythm && rhythm.active && els.dialog?.open && !state.overallDialog &&
    state.selectedTrack === 'drums' && rhythm.song === currentSongIndex &&
    rhythm.generation === state.songGeneration;
}
function activeDrumDefinitions() {
  return EVENT_TYPES.filter(definition =>
    trackState.drums?.events.some(event => event.type === definition.id)
  );
}
function startRhythmRepair(autoStartPlayback = true) {
  const now = performance.now();
  rhythm = {
    song: currentSongIndex, generation: state.songGeneration,
    active: true, finished: false, elapsed: 0, lastWallAt: now,
    targets: [], nextTargetId: 0, nextTargetAt: 900,
    repairedCount: 0, missCount: 0, bursts: []
  };
  if (els.rhythmTargetLabels) els.rhythmTargetLabels.innerHTML = '';
  updateRhythmPanel();
  setRepairFeedback(activeDrumDefinitions().length
    ? 'DRUM REPAIR READY — CLICK A GLOWING LINE OR PRESS SPACE AS IT REACHES THE CENTRE'
    : 'DRUM SIGNAL INTACT — WAITING FOR DECAY EVENTS');
  updateRhythmRepair(now);

  // Opening the Drum panel is the gesture that starts both playback and repair.
  if (autoStartPlayback && !state.playing && !state.starting) {
    void startPlayback(true).then(started => {
      if (!currentRhythmRepair()) return;
      if (started) {
        setRepairFeedback(activeDrumDefinitions().length
          ? 'FOLLOW EACH EFFECT LINE — CLICK IT OR PRESS SPACE AT THE CENTRE'
          : 'LISTEN FOR DECAY — A REPAIR LINE WILL APPEAR WHEN AN EFFECT OCCURS');
      } else {
        setRepairFeedback('PLAYBACK COULD NOT START — PRESS PLAY AND TRY AGAIN', 'error');
      }
    });
  }
}
function setRepairFeedback(message, stateName = 'neutral') {
  const feedback = document.getElementById('repair-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.feedbackState = stateName;
}
function updateRhythmPanel() {
  if (!els.rhythmPanel) return;
  const activeCount = activeDrumDefinitions().length;
  if (els.rhythmActiveCount) els.rhythmActiveCount.textContent = activeCount + ' ACTIVE';
  const repaired = rhythm ? rhythm.repairedCount : 0;
  const retries = rhythm ? rhythm.missCount : 0;
  const progress = document.getElementById('repair-progress');
  if (progress) progress.textContent = repaired + ' REPAIRED · ' + retries + ' RETRIES';
  if (!rhythm && !activeCount) setRepairFeedback('DRUM SIGNAL RESTORED — NO ACTIVE DECAY EVENTS');
}
function showDrumFeedbackLabel(message, x, y, variant) {
  if (!els.rhythmTargetLabels || !els.rhythmCanvas) return;
  const rect = els.rhythmCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const label = document.createElement('span');
  const labelClass = variant === 'success' ? 'drum-label-success'
    : variant === 'empty' ? 'drum-label-empty' : 'drum-label-error';
  label.className = 'keys-hit-label drum-hit-label ' + labelClass;
  label.textContent = message;
  label.style.left = Math.max(4, Math.min(96, x / rect.width * 100)) + '%';
  label.style.top = Math.max(12, Math.min(rect.height - 34, y)) + 'px';
  els.rhythmTargetLabels.appendChild(label);
  label.addEventListener('animationend', () => label.remove(), {once:true});
}
function drumTargetX(note, elapsed, width) {
  const centre = width * 0.5;
  const available = Math.max(20, width - centre - 22);
  const until = note.at - elapsed;
  return centre + Math.max(-DRUM_HIT_WINDOW_MS, Math.min(DRUM_TRAVEL_MS, until)) / DRUM_TRAVEL_MS * available;
}
function syncDrumTargets(elapsed) {
  const game = rhythm;
  const activeDefinitions = activeDrumDefinitions();
  const activeTypes = new Set(activeDefinitions.map(definition => definition.id));
  game.targets.forEach(note => {
    if (note.status === 'active' && !activeTypes.has(note.type)) {
      note.status = 'cleared';
    } else if (note.status === 'hit' && elapsed - note.hitAt >= DRUM_HIT_VISUAL_MS) {
      note.status = 'cleared';
    }
  });
  activeDefinitions.forEach(definition => {
    const exists = game.targets.some(note =>
      note.type === definition.id && ['active', 'hit'].includes(note.status)
    );
    if (exists) return;
    const at = Math.max(elapsed + DRUM_TRAVEL_MS, game.nextTargetAt);
    const index = Math.max(0, EVENT_TYPES.findIndex(item => item.id === definition.id));
    game.targets.push({
      id: game.nextTargetId++, type: definition.id, name: definition.name,
      colour: DRUM_COLOURS[index % DRUM_COLOURS.length],
      at, status: 'active', hitAt: 0, misses: 0
    });
    game.nextTargetAt = at + DRUM_EVENT_SPACING_MS;
  });
}
function burstDrumTarget(note, elapsed, x, y, colour, kind) {
  rhythm.bursts.push({at:elapsed, x, y, colour, kind});
  showDrumFeedbackLabel(kind === 'success' ? note.name + ' REPAIRED' : 'TRY AGAIN', x, y - 22, kind);
}
function missDrumTarget(note, elapsed, x, y, message = 'MISSED ' + note.name + ' — TRY AGAIN WHEN ITS LINE RETURNS') {
  if (!currentRhythmRepair() || note.status !== 'active') return;
  note.misses++;
  rhythm.missCount++;
  // Let the red burst replace the line briefly, then send that same effect back around.
  note.at = elapsed + DRUM_TRAVEL_MS + DRUM_RETRY_DELAY_MS;
  const rect = els.rhythmCanvas.getBoundingClientRect();
  const lineX = Number.isFinite(x) ? x : rect.width * 0.5;
  const lineY = Number.isFinite(y) ? y : rect.height * 0.5;
  burstDrumTarget(note, elapsed, lineX, lineY, '#e35b50', 'error');
  setRepairFeedback(message, 'error');
  void playUISound('error');
  updateRhythmPanel();
}
function missDrumPress(elapsed, x, y, message = 'WRONG SPOT — TRY AGAIN AS A LINE REACHES THE CENTRE') {
  if (!currentRhythmRepair()) return;
  const rect = els.rhythmCanvas.getBoundingClientRect();
  const px = Number.isFinite(x) ? x : rect.width * 0.5;
  const py = Number.isFinite(y) ? y : rect.height * 0.5;
  const hasActiveDecay = activeDrumDefinitions().length > 0;
  if (!hasActiveDecay) {
    rhythm.bursts.push({at:elapsed, x:px, y:py, colour:'#e4d38c', kind:'empty'});
    showDrumFeedbackLabel('NO DECAY EVENT TO FIX', px, py - 18, 'empty');
    setRepairFeedback('NO DECAY EVENT TO FIX — WAIT FOR A DECAY EVENT', 'neutral');
  } else {
    rhythm.bursts.push({at:elapsed, x:px, y:py, colour:'#e35b50', kind:'error'});
    showDrumFeedbackLabel('TRY AGAIN', px, py - 18, 'error');
    setRepairFeedback(message, 'error');
  }
  void playUISound('error');
}
function completeDrumTarget(note, elapsed, x, y) {
  if (!currentRhythmRepair() || note.status !== 'active') return false;
  const repaired = repairTrackEventType('drums', note.type);
  if (!repaired) {
    note.status = 'cleared';
    setRepairFeedback('THAT DECAY EVENT IS ALREADY REPAIRED — WAIT FOR THE NEXT LINE');
    updateRhythmPanel();
    return false;
  }
  note.status = 'hit';
  note.hitAt = elapsed;
  rhythm.repairedCount++;
  burstDrumTarget(note, elapsed, x, y, '#9fda72', 'success');
  playSwitchSound('off');
  addLog('DRUMS repaired: ' + note.name + '.', 'repair');
  setRepairFeedback(note.name + ' REPAIRED — DRUM SIGNAL RESTORED', 'success');
  updateRhythmPanel();
  updateUI();
  updateDialog();
  return true;
}
function updateRhythmRepair(now = performance.now()) {
  if (!currentRhythmRepair()) return;
  const game = rhythm;
  const delta = Math.max(0, now - game.lastWallAt);
  if (state.playing) game.elapsed += delta;
  game.lastWallAt = now;
  const elapsed = game.elapsed;

  syncDrumTargets(elapsed);
  const canvasRect = els.rhythmCanvas.getBoundingClientRect();
  const centreX = canvasRect.width * 0.5, centreY = canvasRect.height * 0.5;
  game.targets.forEach(note => {
    if (note.status !== 'active' || elapsed <= note.at + DRUM_HIT_WINDOW_MS) return;
    missDrumTarget(note, elapsed, centreX, centreY, 'MISSED ' + note.name + ' — ITS LINE WILL RETURN');
  });
  game.bursts = game.bursts.filter(burst => elapsed - burst.at < 680);
  const activeCount = activeDrumDefinitions().length;
  if (!activeCount && game.repairedCount === 0 && !game.targets.some(note => note.status === 'active')) {
    setRepairFeedback('DRUM SIGNAL INTACT — WAITING FOR DECAY EVENTS');
  }
  drawRepairSignal(elapsed);
}
function handleRepairKey(event) {
  if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!els.dialog?.open || state.selectedTrack !== 'drums' || !currentRhythmRepair()) return;
  if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName) || event.target.isContentEditable) return;
  event.preventDefault();
  judgeDrumPress(null, null);
}
function handleDrumRepairClick(event) {
  if (!currentRhythmRepair()) return;
  const rect = els.rhythmCanvas.getBoundingClientRect();
  judgeDrumPress(event.clientX - rect.left, event.clientY - rect.top);
}
function judgeDrumPress(clickX, clickY) {
  if (!currentRhythmRepair()) return;
  const now = performance.now();
  updateRhythmRepair(now);
  if (!currentRhythmRepair()) return;
  const game = rhythm, elapsed = game.elapsed;
  const rect = els.rhythmCanvas.getBoundingClientRect();
  const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  const centreX = width * 0.5, centreY = height * 0.5;
  const active = game.targets.filter(note => note.status === 'active' &&
    note.at - elapsed <= DRUM_TRAVEL_MS && note.at - elapsed >= -DRUM_HIT_WINDOW_MS
  );

  if (clickX !== null && clickY !== null) {
    const target = active.map(note => ({note, x:drumTargetX(note, elapsed, width)}))
      .filter(item => Math.abs(clickX - item.x) <= 17 && clickY >= 8 && clickY <= height - 8)
      .sort((a,b) => Math.abs(clickX-a.x)-Math.abs(clickX-b.x))[0];
    if (!target) {
      missDrumPress(elapsed, clickX, clickY);
      return;
    }
    if (Math.abs(elapsed - target.note.at) <= DRUM_HIT_WINDOW_MS) {
      completeDrumTarget(target.note, elapsed, target.x, centreY);
    } else {
      missDrumTarget(target.note, elapsed, target.x, centreY, 'TOO EARLY — TRY AGAIN WHEN THE LINE REACHES THE CENTRE');
    }
    return;
  }

  const timed = active.filter(note => Math.abs(elapsed - note.at) <= DRUM_HIT_WINDOW_MS)
    .sort((a,b) => Math.abs(elapsed-a.at)-Math.abs(elapsed-b.at))[0];
  if (timed) {
    completeDrumTarget(timed, elapsed, drumTargetX(timed, elapsed, width), centreY);
    return;
  }
  const early = active.filter(note => note.at - elapsed > DRUM_HIT_WINDOW_MS)
    .sort((a,b) => (a.at-elapsed)-(b.at-elapsed))[0];
  if (early) {
    missDrumTarget(early, elapsed, drumTargetX(early, elapsed, width), centreY,
      'TOO EARLY — TRY AGAIN WHEN THE LINE REACHES THE CENTRE');
    return;
  }
  const hasActiveDecay = activeDrumDefinitions().length > 0;
  missDrumPress(elapsed, centreX, centreY,
    hasActiveDecay ? 'TOO LATE — WAIT FOR THE NEXT LINE TO RETURN' : 'NO DECAY EVENT TO FIX — WAIT FOR A DECAY EVENT');
}
function drawRepairSignal(elapsed) {
  const canvas = els.rhythmCanvas;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width), height = Math.max(80, rect.height);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const backingWidth = Math.round(width * ratio), backingHeight = Math.round(height * ratio);
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth; canvas.height = backingHeight;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // A quiet waveform ties the repair interface back to the live drum stem.
  const buffer = state.buffers.drums, samples = buffer?.getChannelData(0);
  if (samples && buffer && state.playing) {
    const position = audibleSongPosition('drums');
    ctx.beginPath(); ctx.strokeStyle = 'rgba(228,211,140,.22)'; ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 2) {
      const time = position + (x / width - 0.5) * 2.2;
      const sample = time >= 0 ? samples[Math.floor(time * buffer.sampleRate)] || 0 : 0;
      const y = height * 0.5 + sample * height * 0.28;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const centreX = width * 0.5, centreY = height * 0.5;
  const timingWidth = Math.max(13, DRUM_HIT_WINDOW_MS / DRUM_TRAVEL_MS * (width - centreX - 22));
  const timingGlow = ctx.createLinearGradient(centreX - timingWidth, 0, centreX + timingWidth, 0);
  timingGlow.addColorStop(0, 'rgba(127,154,99,0)');
  timingGlow.addColorStop(0.5, 'rgba(127,154,99,.17)');
  timingGlow.addColorStop(1, 'rgba(127,154,99,0)');
  ctx.fillStyle = timingGlow; ctx.fillRect(centreX - timingWidth, 0, timingWidth * 2, height);
  ctx.save(); ctx.strokeStyle = '#7f9a63'; ctx.lineWidth = 2;
  ctx.shadowColor = '#7f9a63'; ctx.shadowBlur = 11;
  ctx.beginPath(); ctx.moveTo(centreX, 0); ctx.lineTo(centreX, height); ctx.stroke(); ctx.restore();
  ctx.fillStyle = 'rgba(127,154,99,.09)';
  ctx.fillRect(centreX - 5, 7, 10, height - 14);

  rhythm.targets.forEach(note => {
    if (note.status !== 'active') return;
    const until = note.at - elapsed;
    if (until > DRUM_TRAVEL_MS || until < -DRUM_HIT_WINDOW_MS) return;
    const x = drumTargetX(note, elapsed, width);
    ctx.save();
    ctx.strokeStyle = note.colour; ctx.lineWidth = 4;
    ctx.shadowColor = note.colour; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, height - 17); ctx.stroke();
    ctx.lineWidth = 1; ctx.shadowBlur = 9; ctx.beginPath();
    ctx.moveTo(x - 8, 24); ctx.lineTo(x - 8, height - 17); ctx.stroke();
    ctx.fillStyle = note.colour; ctx.font = width < 440 ? '8px monospace' : '10px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.shadowBlur = 10; ctx.fillText(note.name, x, 7, Math.max(28, width * 0.24));
    ctx.restore();
  });
  rhythm.bursts.forEach(burst => {
    const age = Math.max(0, elapsed - burst.at) / 680;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1-age);
    ctx.fillStyle = burst.colour; ctx.shadowColor = burst.colour; ctx.shadowBlur = 13;
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6, distance = 8 + age * 50;
      const px = burst.x + Math.cos(angle) * distance, py = burst.y + Math.sin(angle) * distance;
      ctx.beginPath(); ctx.arc(px, py, Math.max(1, 3.8 * (1-age)), 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

// Guitar targets represent real active decay-effect types on the guitar track.
const GUITAR_HIT_VISUAL_MS = 760;
const GUITAR_TARGET_SPACING_MS = 460;
const GUITAR_TARGET_COLOURS = ['#e69bd5', '#67dce6', '#9fda72', '#ed8c7e'];
let guitarRepair = null;
function shuffleGuitarValues(values) {
  const shuffled = values.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function guitarTargetColour(typeId) {
  const typeIndex = Math.max(0, EVENT_TYPES.findIndex(event => event.id === typeId));
  return GUITAR_TARGET_COLOURS[typeIndex % GUITAR_TARGET_COLOURS.length];
}
function guitarTargetPosition(game) {
  const index = game.targetCounter++;
  const string = index < game.stringOrder.length
    ? game.stringOrder[index]
    : Math.floor(Math.random() * 6);
  const occupied = game.targets
    .filter(target => target.status !== 'cleared' && target.string === string)
    .map(target => target.x);
  const positions = [18, 50, 82].filter(x => occupied.every(previous => Math.abs(x - previous) >= 24));
  const x = positions.length
    ? positions[Math.floor(Math.random() * positions.length)] + (Math.random() * 2 - 1)
    : 15 + Math.random() * 70;
  return {string, x};
}
function startGuitarRepair() {
  guitarRepair = {
    generation: state.songGeneration,
    song: currentSongIndex,
    targets: [],
    repairedCount: 0,
    targetCounter: 0,
    nextTargetId: 0,
    nextTargetAt: performance.now() + 100,
    stringOrder: shuffleGuitarValues([0, 1, 2, 3, 4, 5])
  };
  els.guitarTargets.innerHTML = '';
  els.guitarNotices.innerHTML = '';
  document.getElementById('guitar-progress').textContent = '0 REPAIRED';
  document.getElementById('guitar-active-count').textContent = '0 ACTIVE';
  document.getElementById('guitar-feedback').textContent = trackState.guitars?.events.length
    ? 'CLICK A GLOWING TARGET TO REPAIR ITS EFFECT'
    : 'GUITAR SIGNAL RESTORED — WAITING FOR DECAY';
  updateGuitarRepair();
}
function currentGuitarRepair() {
  return guitarRepair && els.dialog?.open && !state.overallDialog &&
    state.selectedTrack === 'guitars' &&
    guitarRepair.generation === state.songGeneration &&
    guitarRepair.song === currentSongIndex;
}
function renderGuitarTargets() {
  const game = guitarRepair;
  if (!game) {
    els.guitarTargets.innerHTML = '';
    return;
  }
  const sparks = angles => angles.map(angle =>
    '<i style="--spark-angle:' + angle + 'deg"></i>'
  ).join('');
  els.guitarTargets.innerHTML = game.targets
    .filter(target => target.visible && target.status !== 'cleared')
    .map(target => {
      const hit = target.status === 'hit';
      const colour = guitarTargetColour(target.type);
      return '<span class="guitar-target-wrap" style="--dot-x:' + target.x +
        '%;--dot-y:' + (12 + target.string * 15) + '%;--target-colour:' + colour + '">' +
        '<button type="button" class="guitar-dot' + (hit ? ' is-exploding' : '') +
        '" data-guitar-target="' + target.id + '" aria-label="' +
        (hit ? target.name + ' repaired' : 'Repair ' + target.name) +
        ', string ' + (target.string + 1) + '"' + (hit ? ' disabled' : '') + '>' +
        (hit ? '✓' : '') + '</button>' +
        (hit
          ? '<span class="guitar-explosion" aria-hidden="true">' +
              sparks(Array.from({length:12}, (_, i) => i * 30)) +
            '</span><span class="guitar-hit-label" aria-hidden="true">' +
              target.name + ' REPAIRED</span>'
          : '') +
        '</span>';
    }).join('');
}
function syncGuitarTargets(now) {
  const game = guitarRepair;
  const activeDefinitions = EVENT_TYPES.filter(definition =>
    trackState.guitars?.events.some(event => event.type === definition.id)
  );
  const activeTypes = new Set(activeDefinitions.map(definition => definition.id));
  let changed = false;
  activeDefinitions.forEach(definition => {
    const alreadyHasActiveTarget = game.targets.some(target =>
      target.type === definition.id && target.status === 'active'
    );
    if (alreadyHasActiveTarget) return;
    const position = guitarTargetPosition(game);
    const at = Math.max(now + 100, game.nextTargetAt);
    game.targets.push({
      id: game.nextTargetId++, type: definition.id, name: definition.name,
      string: position.string, x: position.x, at, visible: false,
      status: 'active', hitAt: 0
    });
    game.nextTargetAt = at + GUITAR_TARGET_SPACING_MS;
    changed = true;
  });
  game.targets.forEach(target => {
    if (target.status === 'active' && !activeTypes.has(target.type)) {
      target.status = 'cleared';
      changed = true;
    } else if (target.status === 'active' && !target.visible && now >= target.at) {
      target.visible = true;
      changed = true;
    } else if (target.status === 'hit' && now - target.hitAt >= GUITAR_HIT_VISUAL_MS) {
      target.status = 'cleared';
      changed = true;
    }
  });
  return {changed, activeCount: activeTypes.size};
}
function updateGuitarRepair(now = performance.now()) {
  if (!currentGuitarRepair()) return;
  const game = guitarRepair;
  const result = syncGuitarTargets(now);
  if (result.changed) renderGuitarTargets();
  document.getElementById('guitar-active-count').textContent = result.activeCount + ' ACTIVE';
  document.getElementById('guitar-progress').textContent = game.repairedCount + ' REPAIRED';
  if (result.activeCount === 0 && game.repairedCount === 0) {
    document.getElementById('guitar-feedback').textContent =
      'GUITAR SIGNAL RESTORED — WAITING FOR DECAY';
  }
  // Leave the mini-game open after all current Guitar events have been repaired.
}
function vibrateGuitarString(stringIndex, repairing = false) {
  const string = els.guitarPanel.querySelectorAll('.guitar-strings span')[stringIndex];
  if (!string) return;
  string.classList.remove('is-vibrating', 'is-repairing');
  void string.offsetWidth;
  playGuitarStringSound(stringIndex);
  if (repairing) string.classList.add('is-repairing');
  string.classList.add('is-vibrating');
  string.addEventListener('animationend', () => {
    string.classList.remove('is-vibrating', 'is-repairing');
  }, {once:true});
}

let guitarStringDrag = {active:false, pointerId:null, lastStringIndex:-1};
const GUITAR_STRING_POSITIONS = [15, 29, 43, 57, 71, 85];
function guitarStringIndexAtPoint(clientX, clientY) {
  if (!els.guitarBoard) return -1;
  const boardRect = els.guitarBoard.getBoundingClientRect();
  if (clientX < boardRect.left || clientX > boardRect.right ||
      clientY < boardRect.top || clientY > boardRect.bottom) return -1;
  const localY = clientY - boardRect.top;
  const hitHeight = 30;
  let bestIndex = -1;
  let bestDistance = Infinity;
  GUITAR_STRING_POSITIONS.forEach((position, index) => {
    const centreY = boardRect.height * position / 100;
    const distance = Math.abs(localY - centreY);
    if (distance <= hitHeight / 2 && distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}
function showGuitarNoRepairNotice(event) {
  const board = els.guitarBoard;
  const rect = board.getBoundingClientRect();
  const x = Math.max(22, Math.min(78, (event.clientX - rect.left) / rect.width * 100));
  const y = Math.max(12, Math.min(88, (event.clientY - rect.top) / rect.height * 100));
  const notice = document.createElement('span');
  notice.className = 'guitar-hit-label guitar-empty-notice';
  notice.textContent = 'THERE IS NO DECAY EVENT TO FIX UP HERE';
  notice.style.setProperty('--dot-x', x + '%');
  notice.style.setProperty('--dot-y', y + '%');
  els.guitarNotices.appendChild(notice);
  notice.addEventListener('animationend', () => notice.remove(), {once:true});
}
function handleGuitarStringPointerDown(event) {
  if (event.button !== 0 || event.isPrimary === false || !currentGuitarRepair()) return;
  // Don't steal a click that is intended to activate a glowing repair target.
  if (event.target.closest('.guitar-dot')) return;
  event.preventDefault();
  const stringIndex = guitarStringIndexAtPoint(event.clientX, event.clientY);
  guitarStringDrag = {active:true, pointerId:event.pointerId, lastStringIndex:stringIndex};
  if (stringIndex >= 0) {
    vibrateGuitarString(stringIndex);
    showGuitarNoRepairNotice(event);
  }
}
function handleGuitarStringPointerMove(event) {
  if (!guitarStringDrag.active || event.pointerId !== guitarStringDrag.pointerId ||
      !currentGuitarRepair()) return;
  const stringIndex = guitarStringIndexAtPoint(event.clientX, event.clientY);
  if (stringIndex < 0 || stringIndex === guitarStringDrag.lastStringIndex) {
    if (stringIndex < 0) guitarStringDrag.lastStringIndex = -1;
    return;
  }
  guitarStringDrag.lastStringIndex = stringIndex;
  vibrateGuitarString(stringIndex);
}
function finishGuitarStringDrag(event) {
  if (!guitarStringDrag.active) return;
  if (event && event.pointerId !== guitarStringDrag.pointerId) return;
  guitarStringDrag = {active:false, pointerId:null, lastStringIndex:-1};
}
function handleGuitarTarget(event) {
  if (!currentGuitarRepair()) return;
  const button = event.target.closest('[data-guitar-target]');
  if (!button || !els.guitarTargets.contains(button)) return;
  const id = Number(button.dataset.guitarTarget);
  const target = guitarRepair.targets.find(item => item.id === id);
  if (!target || target.status !== 'active' || !target.visible) return;
  const repairedCount = repairTrackEventType('guitars', target.type);
  if (!repairedCount) {
    target.status = 'cleared';
    renderGuitarTargets();
    return;
  }
  const now = performance.now();
  target.status = 'hit';
  target.hitAt = now;
  guitarRepair.repairedCount++;
  vibrateGuitarString(target.string, true);
  playSwitchSound('off');
  addLog('GUITARS repaired: ' + target.name + '.', 'repair');
  document.getElementById('guitar-feedback').textContent =
    target.name + ' REPAIRED — GUITAR SIGNAL RESTORED';
  updateUI();
  updateDialog();
  renderGuitarTargets();
  updateGuitarRepair(now);
}


// Four-lane Keys repair: each moving arrow is linked to a live decay-effect type.
const KEYS_WINDOW_MS = 280;
const KEYS_TRAVEL_MS = 1800;
const KEYS_EVENT_SPACING_MS = 1650;
const KEYS_RETRY_DELAY_MS = 700;
const KEYS_HIT_VISUAL_MS = 760;
const KEYS_CODES = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
const KEYS_COLOURS = ['#e69bd5', '#67dce6', '#9fda72', '#ed8c7e'];
let keysRepair = null;
function keysTargetColour(typeId) {
  const index = Math.max(0, EVENT_TYPES.findIndex(event => event.id === typeId));
  return KEYS_COLOURS[index % KEYS_COLOURS.length];
}
function currentKeysRepair() {
  return keysRepair && els.dialog?.open && !state.overallDialog &&
    state.selectedTrack === 'keys' && keysRepair.song === currentSongIndex &&
    keysRepair.generation === state.songGeneration;
}
function startKeysRepair() {
  keysRepair = {
    song:currentSongIndex, generation:state.songGeneration,
    startedAt:performance.now(), notes:[], nextNoteId:0, nextNoteAt:2500,
    repairedCount:0, missCount:0, bursts:[], finished:false
  };
  els.keysTargetLabels.innerHTML = '';
  document.getElementById('keys-progress').textContent = '0 REPAIRED · 0 RETRIES';
  document.getElementById('keys-active-count').textContent = '0 ACTIVE';
  document.getElementById('keys-feedback').textContent = trackState.keys?.events.length
    ? 'PRESS THE MATCHING KEY AT THE TOP OR CLICK A MOVING ARROW'
    : 'KEYS SIGNAL RESTORED — WAITING FOR DECAY';
  updateKeysRepair();
}
function syncKeysTargets(now, elapsed) {
  const game = keysRepair;
  const activeDefinitions = EVENT_TYPES.filter(definition =>
    trackState.keys?.events.some(event => event.type === definition.id)
  );
  const activeTypes = new Set(activeDefinitions.map(definition => definition.id));
  game.notes.forEach(note => {
    if (note.status === 'active' && !activeTypes.has(note.type)) {
      note.status = 'cleared';
    } else if (note.status === 'hit' && now - note.hitAt >= KEYS_HIT_VISUAL_MS) {
      note.status = 'cleared';
    }
  });
  activeDefinitions.forEach(definition => {
    const exists = game.notes.some(note => note.type === definition.id && note.status === 'active');
    if (exists) return;
    const at = Math.max(elapsed + KEYS_TRAVEL_MS + KEYS_RETRY_DELAY_MS, game.nextNoteAt);
    game.notes.push({
      id:game.nextNoteId++, type:definition.id, name:definition.name,
      colour:keysTargetColour(definition.id), lane:Math.floor(Math.random() * 4),
      at, status:'active', misses:0, hitAt:0
    });
    game.nextNoteAt = at + KEYS_EVENT_SPACING_MS;
  });
  return activeTypes.size;
}
function showKeysFeedbackLabel(text, lane, y, variant = 'empty') {
  const label = document.createElement('span');
  label.className = 'keys-hit-label keys-error-label' + (variant === 'early' ? ' keys-early-label' : '');
  label.textContent = text;
  label.style.left = (((lane + .5) / 4) * 100) + '%';
  label.style.top = Math.max(18, Math.min(260, y)) + 'px';
  label.style.setProperty('--keys-target-colour', '#e35b50');
  els.keysTargetLabels.appendChild(label);
  label.addEventListener('animationend', () => label.remove(), {once:true});
}
function showKeysNoTarget(lane, elapsed) {
  keysRepair.bursts.push({lane, at:elapsed, y:44, colour:'#e35b50', kind:'empty'});
  showKeysFeedbackLabel('NO DECAY EVENT TO FIX', lane, 17, 'empty');
  document.getElementById('keys-feedback').textContent = 'NO DECAY EVENT TO FIX';
  void playUISound('error');
}
function showKeysHitLabel(note, y) {
  const label = document.createElement('span');
  label.className = 'keys-hit-label';
  label.textContent = note.name + ' REPAIRED';
  label.style.left = (((note.lane + .5) / 4) * 100) + '%';
  label.style.top = Math.max(18, Math.min(260, y)) + 'px';
  label.style.setProperty('--keys-target-colour', note.colour);
  els.keysTargetLabels.appendChild(label);
  label.addEventListener('animationend', () => label.remove(), {once:true});
}
function failKeysTargetEarly(note, now, elapsed, y) {
  if (!currentKeysRepair() || note.status !== 'active') return false;
  keysRepair.bursts.push({lane:note.lane, at:elapsed, y, colour:'#e35b50', kind:'early'});
  showKeysFeedbackLabel('TRY AGAIN', note.lane, y - 27, 'early');
  note.misses++;
  keysRepair.missCount++;
  note.at = elapsed + KEYS_TRAVEL_MS + KEYS_RETRY_DELAY_MS;
  keysRepair.nextNoteAt = Math.max(keysRepair.nextNoteAt, note.at + KEYS_EVENT_SPACING_MS);
  document.getElementById('keys-feedback').textContent =
    'TOO EARLY — TRY AGAIN AS THE ARROW REACHES THE TOP';
  void playUISound('error');
  updateKeysRepair(now);
  return true;
}
function completeKeysTarget(note, now, elapsed, y) {
  if (!currentKeysRepair() || note.status !== 'active') return false;
  const repairedCount = repairTrackEventType('keys', note.type);
  if (!repairedCount) {
    note.status = 'cleared';
    updateKeysRepair(now);
    return false;
  }
  note.status = 'hit';
  note.hitAt = now;
  keysRepair.repairedCount++;
  keysRepair.bursts.push({lane:note.lane, at:elapsed, y:y, colour:note.colour, kind:'hit'});
  showKeysHitLabel(note, y);
  playSwitchSound('off');
  addLog('KEYS repaired: ' + note.name + '.', 'repair');
  document.getElementById('keys-feedback').textContent =
    note.name + ' REPAIRED — KEYS SIGNAL RESTORED';
  updateUI();
  updateDialog();
  updateKeysRepair(now);
  return true;
}
function updateKeysRepair(now = performance.now()) {
  if (!currentKeysRepair()) return;
  const game = keysRepair;
  const elapsed = Math.max(0, now - game.startedAt);
  syncKeysTargets(now, elapsed);
  game.notes.forEach(note => {
    if (note.status !== 'active' || elapsed <= note.at + KEYS_WINDOW_MS) return;
    if (!trackState.keys?.events.some(event => event.type === note.type)) {
      note.status = 'cleared';
      return;
    }
    note.misses++;
    game.missCount++;
    note.at = elapsed + KEYS_TRAVEL_MS + KEYS_RETRY_DELAY_MS;
    game.nextNoteAt = Math.max(game.nextNoteAt, note.at + KEYS_EVENT_SPACING_MS);
    document.getElementById('keys-feedback').textContent =
      'MISSED ' + note.name + ' — ITS ARROW WILL COME BACK';
  });
  game.bursts = game.bursts.filter(burst => elapsed - burst.at < 520);
  const activeCount = EVENT_TYPES.filter(definition =>
    trackState.keys?.events.some(event => event.type === definition.id)
  ).length;
  document.getElementById('keys-active-count').textContent = activeCount + ' ACTIVE';
  document.getElementById('keys-progress').textContent =
    game.repairedCount + ' REPAIRED · ' + game.missCount + ' RETRIES';
  if (activeCount === 0 && game.repairedCount === 0) {
    document.getElementById('keys-feedback').textContent = 'KEYS SIGNAL RESTORED — WAITING FOR DECAY';
  }
  drawKeysRepair(elapsed);
  // Keep the Keys mini-game visible after all active effects are repaired.
}
function handleKeysRepairKey(event) {
  const lane = KEYS_CODES.indexOf(event.code);
  if (lane < 0 || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!els.dialog?.open || state.overallDialog || state.selectedTrack !== 'keys') return;
  if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
  event.preventDefault();
  if (!currentKeysRepair()) return;
  const now = performance.now();
  updateKeysRepair(now);
  if (!currentKeysRepair()) return;
  const elapsed = now - keysRepair.startedAt;
  const note = keysRepair.notes.find(item =>
    item.status === 'active' && item.lane === lane &&
    Math.abs(elapsed - item.at) <= KEYS_WINDOW_MS
  );
  if (!note) {
    const earlyTarget = keysRepair.notes
      .filter(item => item.status === 'active' && item.lane === lane)
      .map(item => ({note:item, until:item.at - elapsed}))
      .filter(item => item.until > KEYS_WINDOW_MS && item.until <= KEYS_TRAVEL_MS)
      .sort((a, b) => a.until - b.until)[0];
    if (earlyTarget) {
      const y = 44 + earlyTarget.until / KEYS_TRAVEL_MS * (300 - 44 - 15);
      failKeysTargetEarly(earlyTarget.note, now, elapsed, Math.max(14, Math.min(280, y)));
      return;
    }
    showKeysNoTarget(lane, elapsed);
    return;
  }
  const until = note.at - elapsed;
  const y = 44 + until / KEYS_TRAVEL_MS * (300 - 44 - 15);
  completeKeysTarget(note, now, elapsed, Math.max(14, Math.min(280, y)));
}
function handleKeysRepairClick(event) {
  if (!currentKeysRepair()) return;
  const canvas = els.keysSignal, rect = els.keysSignal.getBoundingClientRect();
  const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const lane = Math.max(0, Math.min(3, Math.floor(x / width * 4)));
  const now = performance.now();
  updateKeysRepair(now);
  if (!currentKeysRepair()) return;
  const elapsed = now - keysRepair.startedAt;
  const size = Math.min(28, width / 11), receptorY = 44;
  const candidates = keysRepair.notes
    .filter(note => note.status === 'active' && note.lane === lane)
    .map(note => {
      const until = note.at - elapsed;
      if (until > KEYS_TRAVEL_MS || until < -KEYS_WINDOW_MS) return null;
      return {note, arrowY:receptorY + until / KEYS_TRAVEL_MS * (height - receptorY - 15)};
    }).filter(Boolean).sort((a,b) => Math.abs(y-a.arrowY) - Math.abs(y-b.arrowY));
  const target = candidates.find(item =>
    Math.abs(x - width * (item.note.lane + .5) / 4) <= size * 1.7 &&
    Math.abs(y - item.arrowY) <= size * 1.7
  );
  if (!target) {
    document.getElementById('keys-feedback').textContent = 'CLICK A MOVING ARROW TO REPAIR ITS EFFECT';
    return;
  }
  completeKeysTarget(target.note, now, elapsed, target.arrowY);
}
function drawKeysRepair(elapsed) {
  const canvas = els.keysSignal;
  const width = Math.max(1, canvas.getBoundingClientRect().width), height = 300;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const receptorY = 44, size = Math.min(28, width / 11);
  const turns = [-Math.PI / 2, Math.PI, 0, Math.PI / 2];
  function arrow(lane, y, colour, filled, shake = 0) {
    const x = width * (lane + .5) / 4;
    ctx.save(); ctx.translate(x + Math.sin(elapsed * .08) * shake, y);
    ctx.rotate(turns[lane]); ctx.beginPath();
    [[0,-size], [size,-2], [size*.4,-2], [size*.4,size], [-size*.4,size], [-size*.4,-2], [-size,-2]]
      .forEach(([px,py], i) => i ? ctx.lineTo(px,py) : ctx.moveTo(px,py));
    ctx.closePath(); ctx.lineWidth = 2.5; ctx.strokeStyle = colour;
    if (filled) { ctx.fillStyle = colour; ctx.shadowColor = colour; ctx.shadowBlur = 13; ctx.fill(); }
    ctx.stroke(); ctx.restore();
  }
  for(let lane=0;lane<4;lane++) {
    ctx.fillStyle = lane%2 ? 'rgba(228,211,140,.025)' : 'rgba(228,211,140,.055)';
    ctx.fillRect(width*lane/4,0,width/4,height);
    const burst=keysRepair?.bursts.slice().reverse().find(item=>
      item.lane===lane && elapsed-item.at<260 && (item.kind==='hit' || item.kind==='empty')
    );
    const shake = burst ? (burst.kind === 'empty' ? 7 : 4) : 0;
    arrow(lane,receptorY,burst?burst.colour:'#8e917f',Boolean(burst),shake);
  }
  if(!keysRepair)return;
  keysRepair.notes.forEach(note=>{
    if(note.status!=='active')return;
    const until=note.at-elapsed;
    if(until>KEYS_TRAVEL_MS||until<-KEYS_WINDOW_MS)return;
    const y=receptorY+until/KEYS_TRAVEL_MS*(height-receptorY-15);
    arrow(note.lane,y,note.colour,true);
    ctx.save();
    ctx.font=width<480?'8px monospace':'9px monospace';
    ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillStyle=note.colour;ctx.shadowColor=note.colour;ctx.shadowBlur=6;
    ctx.fillText(note.name,width*(note.lane+.5)/4,y-size-5,width/4-8);
    ctx.restore();
  });
  keysRepair.bursts.forEach(burst=>{
    if (burst.kind === 'empty') return;
    const age=Math.max(0,elapsed-burst.at)/520;
    const x=width*(burst.lane+.5)/4;
    const burstY=Number.isFinite(burst.y)?burst.y:receptorY;
    ctx.globalAlpha=1-age;ctx.fillStyle=burst.colour||KEYS_COLOURS[burst.lane];
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6,distance=15+age*45;
      ctx.beginPath();ctx.arc(x+Math.cos(angle)*distance,burstY+Math.sin(angle)*distance,3*(1-age)+1,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  });
}


// Pilot: There Is Love only. Lyrics follow the shared audible song position;
// character highlighting follows the visitor's own correctly typed prefix.
const VOCAL_LINES_REQUIRED = 2;
let vocalRepair = null;
function vocalTypingAvailable() { return SONGS[currentSongIndex].id === 'there-is-love'; }
function vocalLetters(text) { return text.toLowerCase().replace(/[^a-z]/g, ''); }
function vocalLyricAt(position) {
  return THERE_IS_LOVE_LYRICS.findIndex(line => position >= line.start && position < line.end);
}
function currentVocalRepair() {
  return vocalRepair && !vocalRepair.finished && els.dialog?.open && !state.overallDialog &&
    state.selectedTrack === 'vocals' && vocalTypingAvailable() &&
    vocalRepair.generation === state.songGeneration && vocalRepair.song === currentSongIndex;
}
function startVocalRepair() {
  vocalRepair = null;
  els.vocalPlay.hidden = state.playing;
  els.vocalInput.value = '';
  if (!trackState.vocals?.events.length) {
    document.getElementById('vocal-lyric').textContent = 'VOCAL SIGNAL RESTORED';
    document.getElementById('vocal-feedback').textContent = 'NO REPAIR NEEDED';
    document.getElementById('vocal-progress').textContent = '0 / 2 LINES RESTORED';
    els.vocalInput.disabled = true;
    return;
  }
  vocalRepair = {song:currentSongIndex, generation:state.songGeneration, line:-2,
    completed:new Set(), correct:0, finished:false};
  updateVocalRepair();
  els.vocalInput.focus({preventScroll:true});
}
function renderVocalLetters(line, correct) {
  const display = document.getElementById('vocal-lyric');
  display.replaceChildren();
  let letter = 0;
  for (const char of line.text) {
    const span = document.createElement('span');
    const isLetter = /[a-z]/i.test(char);
    const lit = isLetter ? letter < correct : letter > 0 && letter <= correct;
    if (isLetter) letter++;
    span.className = lit ? 'vocal-letter is-typed' : 'vocal-letter';
    span.textContent = char;
    display.appendChild(span);
  }
}
function updateVocalRepair() {
  if (!currentVocalRepair()) return;
  const game = vocalRepair;
  const position = audibleSongPosition('vocals');
  const index = vocalLyricAt(position);
  const changed = game.line !== index;
  if (changed) {
    game.line = index;
    game.correct = 0;
    els.vocalInput.value = '';
    els.vocalInput.setAttribute('aria-invalid', 'false');
    if (index >= 0) {
      renderVocalLetters(THERE_IS_LOVE_LYRICS[index], 0);
      document.getElementById('vocal-section').textContent = THERE_IS_LOVE_LYRICS[index].section;
    } else {
      document.getElementById('vocal-lyric').textContent = 'LISTEN FOR THE NEXT VOCAL LINE…';
      document.getElementById('vocal-section').textContent = 'INSTRUMENTAL / BETWEEN LINES';
    }
  }
  const done = game.completed.has(index);
  els.vocalPlay.hidden = state.playing;
  els.vocalInput.disabled = !state.playing || index < 0 || done;
  if (changed && !els.vocalInput.disabled) els.vocalInput.focus({preventScroll:true});
  document.getElementById('vocal-progress').textContent = game.completed.size + ' / 2 LINES RESTORED';
  if (!state.playing) document.getElementById('vocal-feedback').textContent = 'RESUME THE SONG TO FOLLOW THE LYRICS';
  else if (index < 0) document.getElementById('vocal-feedback').textContent = position >= THERE_IS_LOVE_LYRICS[THERE_IS_LOVE_LYRICS.length-1].end
    ? 'VOCALS FINISHED — REPLAY THE SONG TO CONTINUE REPAIR' : 'WAITING FOR THE NEXT SUNG LINE';
  else if (done) document.getElementById('vocal-feedback').textContent = 'LINE RESTORED — WAIT FOR THE NEXT LYRIC';
  else if (changed) document.getElementById('vocal-feedback').textContent = 'TYPE THIS LINE — PUNCTUATION AND CAPITALS ARE OPTIONAL';
}
function handleVocalInput(event) {
  if (event?.isComposing || !currentVocalRepair()) return;
  const previousLine = vocalRepair.line;
  updateVocalRepair();
  if (!currentVocalRepair() || previousLine !== vocalRepair.line || els.vocalInput.disabled) return;
  const game = vocalRepair;
  const line = THERE_IS_LOVE_LYRICS[game.line];
  const expected = vocalLetters(line.text), typed = vocalLetters(els.vocalInput.value);
  let correct = 0;
  while (correct < expected.length && correct < typed.length && expected[correct] === typed[correct]) correct++;
  game.correct = correct;
  renderVocalLetters(line, correct);
  const wrong = correct < typed.length;
  document.getElementById('vocal-feedback').textContent = wrong
    ? 'CHECK THE NEXT LETTER — BACKSPACE TO CORRECT IT' : 'KEEP TYPING — FOLLOW THE HIGHLIGHTED LETTERS';
  els.vocalInput.setAttribute('aria-invalid', wrong ? 'true' : 'false');
  if (correct === expected.length && !wrong) {
    game.completed.add(game.line);
    if (game.completed.size >= VOCAL_LINES_REQUIRED) {
      game.finished = true;
      document.getElementById('vocal-feedback').textContent = 'VOCAL REPAIR COMPLETE — SIGNAL RESTORED';
      repairTrack('vocals');
    } else updateVocalRepair();
  }
}
