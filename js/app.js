// ───────────────────────────────────────────────
// TRACKS + DECAY EVENT DEFINITIONS
// ───────────────────────────────────────────────
const SONGS = [
  {
    id: 'on-time',
    titleImage: 'assets/images/lettering/on-time.png',
    cover: 'assets/images/optimized/covers/on-time.webp',
    title: 'ON TIME',
    number: 1,
    artist: 'TAYLA KANE AND JACKSON MOORE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/audio/stems/on-time-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/audio/stems/on-time-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/audio/stems/on-time-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/audio/stems/on-time-keys.mp3' },
      { id: 'vocals', name: 'VOCALS', file: 'assets/audio/stems/on-time-vocals.mp3' }
    ]
  },
  {
    id: 'reconcile',
    titleImage: 'assets/images/lettering/reconcile.png',
    cover: 'assets/images/optimized/covers/reconcile.webp',
    title: 'RECONCILE',
    number: 2,
    artist: 'JACKSON MOORE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/audio/stems/reconcile-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/audio/stems/reconcile-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/audio/stems/reconcile-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/audio/stems/reconcile-keys.mp3' }
    ]
  },
  {
    id: 'rainy-night',
    titleImage: 'assets/images/lettering/rainy-night.png',
    cover: 'assets/images/optimized/covers/rainy-night.webp',
    title: 'RAINY NIGHT',
    number: 3,
    artist: 'TAYLA KANE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/audio/stems/rainy-night-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/audio/stems/rainy-night-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/audio/stems/rainy-night-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/audio/stems/rainy-night-keys.mp3' },
      { id: 'vocals', name: 'VOCALS', file: 'assets/audio/stems/rainy-night-vocals.mp3' }
    ]
  },
  {
    id: 'there-is-love',
    titleImage: 'assets/images/lettering/there-is-love.png',
    cover: 'assets/images/optimized/covers/there-is-love.webp',
    title: 'THERE IS LOVE',
    number: 4,
    artist: 'JACKSON MOORE',
    tracks: [
      { id: 'drums', name: 'DRUMS', file: 'assets/audio/stems/there-is-love-drums.mp3' },
      { id: 'bass', name: 'BASS', file: 'assets/audio/stems/there-is-love-bass.mp3' },
      { id: 'guitars', name: 'GUITARS', file: 'assets/audio/stems/there-is-love-guitars.mp3' },
      { id: 'keys', name: 'KEYS', file: 'assets/audio/stems/there-is-love-keys.mp3' },
      { id: 'vocals', name: 'VOCALS', file: 'assets/audio/stems/there-is-love-vocals.mp3' }
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
  id:'warp',name:'WARP',description:'Strong moving pitch wobble and flutter without changing playback speed',severity:[12,25]
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
  ,analyser:null,masterGain:null,loaded:false,loadedSongIndex:null,loading:false,loadingPromise:null,stemLoadController:null,stemLoadingGeneration:null,songGeneration:0,demoMode:false,noiseBuffer:null,pitchReady:false,waveformCtx:null,waveformData:null,waveformPixelWidth:0,waveformPixelHeight:0,waveformDrawAt:0,lastTrackVisualAt:0,lastClockTextAt:0,waveformColour:'#7f9a63',particlePulse:0,lastParticlePulseAt:0,repairLockToastTimer:null,decayTimer:null,switchSoundBuffers:{},switchSoundLoadPromise:null,switchSoundAssetsLoaded:false
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
  els.bassPanel = document.getElementById('bass-panel');
  els.bassTuners = document.getElementById('bass-tuners');
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
        '<img class="track-instrument-image" src="assets/images/optimized/instruments/' + (t.id === 'vocals' ? 'vocal' : t.id) + '.webp" alt="" loading="lazy" decoding="async">' +
      '</div>' +
      '<div class="track-signal" aria-hidden="true">' +
        '<div class="signal-bars">' + bars + '</div>' +
      '</div>' +
      '<div class="track-info">' +
        '<span class="track-name"><img class="track-name-art" src="' + encodeURI(({drums:'assets/images/lettering/drums.png',bass:'assets/images/lettering/bass.png',guitars:'assets/images/lettering/guitars.png',keys:'assets/images/lettering/keys.png',vocals:'assets/images/lettering/vocals.png'})[t.id]) + '" alt="' + t.name + '"></span>' +
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
  const decayAccent = state.overallDecay >= 70 ? '#d65d71' : state.overallDecay >= 30 ? '#eab466' : '#69aa77';
  document.body.style.setProperty('--decay-accent', decayAccent);
  state.waveformColour = decayAccent;
  document.body.style.setProperty('--screen-flash-low', (0.14 + state.overallDecay / 100 * 0.18).toFixed(3));
  document.body.style.setProperty('--screen-flash-high', Math.min(0.84, 0.52 + state.overallDecay / 100 * 0.30).toFixed(3));
  document.body.style.setProperty('--screen-flash-duration', (3.2 - state.overallDecay / 100 * 2.0).toFixed(2) + 's');

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
// Decay intervals are randomly 10–20 seconds (15-second average) while playing.
// The scheduler stops during pause and restarts when playback resumes.
const DECAY_INTERVAL_MIN_MS = 10000;
const DECAY_INTERVAL_MAX_MS = 20000;
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
  [chain.phaseLfo, chain.warp, chain.warpFlutter, chain.lfo].forEach(oscillator => {
    if (!oscillator) return;
    try { oscillator.stop(); } catch (_) {}
  });
  [
    chain.source, chain.pitchShift, chain.crush, chain.highpass, chain.lowpass,
    chain.artifactGain, chain.phase, chain.gain, chain.analyser,
    chain.lfo, chain.lfoDepth, chain.phaseLfo, chain.phaseDepth,
    chain.warp, chain.warpDepth, chain.warpFlutter, chain.warpFlutterDepth,
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
      await context.audioWorklet.addModule('js/audio/pitch-shifter.js?v=20261029-true-pitch-shift');
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
    on: 'assets/audio/ui/click-on.mp3',
    off: 'assets/audio/ui/click-off.mp3',
    button: 'assets/audio/ui/button-press.mp3',
    error: 'assets/audio/ui/error.mp3',
    success: 'assets/audio/ui/success.mp3',
    explode: 'assets/audio/ui/explode.mp3',
    plink: 'assets/audio/ui/plink.mp3',
    guitarLowE: 'assets/audio/guitar-strings/low-e.mp3',
    guitarA: 'assets/audio/guitar-strings/a.mp3',
    guitarD: 'assets/audio/guitar-strings/d.mp3',
    guitarG: 'assets/audio/guitar-strings/g.mp3',
    guitarB: 'assets/audio/guitar-strings/b.mp3',
    guitarHighE: 'assets/audio/guitar-strings/high-e.mp3'
  };
  const operation = Promise.all(Object.entries(files).map(async ([name, url]) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      // Guitar plucks and the explosion are quiet recordings. The explosion
      // peaks near 0.31 before normalization and gets masked by song stems and
      // repair clicks; boost its decoded buffer before applying the normal UI gain.
      const targetPeak = name === 'explode' ? 0.96 : (name.startsWith('guitar') ? 0.985 : null);
      if (targetPeak !== null) {
        let peak = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const samples = buffer.getChannelData(channel);
          for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
        }
        if (peak > 0 && peak < targetPeak) {
          const scale = targetPeak / peak;
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const samples = buffer.getChannelData(channel);
            for (let i = 0; i < samples.length; i++) samples[i] *= scale;
          }
        }
      }
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

    const defaultVolumes = { on: 0.62, off: 0.62, button: 0.62, error: 0.72, success: 0.40, explode: 0.35, plink: 0.05 };
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
// One confirmation per completed repair action (including a global repair).
function playRepairSuccess() {
  void playUISound('success');
}
// String sound files are ordered exactly like the six visible strings, top to bottom.
function playGuitarStringSound(stringIndex) {
  const stringSounds = ['guitarLowE', 'guitarA', 'guitarD', 'guitarG', 'guitarB', 'guitarHighE'];
  const sound = stringSounds[stringIndex];
  if (sound) void playUISound(sound, 1.0);
}
async function loadAudio() {
  const requestedSongIndex = currentSongIndex;
  const generation = state.songGeneration;
  const requestedTracks = TRACKS.slice();

  if (state.loaded && state.loadedSongIndex === requestedSongIndex) return true;
  // Share a request within one song; never wait for a cancelled previous song.
  if (state.loadingPromise && state.stemLoadingGeneration === generation) {
    return state.loadingPromise;
  }
  if (generation !== state.songGeneration) return false;

  state.stemLoadController?.abort();
  const controller = new AbortController();
  state.stemLoadController = controller;
  state.stemLoadingGeneration = generation;
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

      els.playbackState.textContent = 'LOADING TRACKS… 0/' + requestedTracks.length;
      // Two concurrent fetch/decode workers give faster loading without running
      // four or five large audio decodes simultaneously on exhibition hardware.
      const { buffers, failed, loaded, aborted } = await loadStemBuffers(requestedTracks, state.audio, {
        signal: controller.signal,
        concurrency: 2,
        onProgress({ loaded, total }) {
          if (generation === state.songGeneration && !controller.signal.aborted) {
            els.playbackState.textContent = 'LOADING TRACKS… ' + loaded + '/' + total;
          }
        }
      });
      if (generation !== state.songGeneration || aborted) return false;
      failed.forEach(({ track, error }) => console.warn('Could not load ' + track.file, error));
      state.buffers = buffers;
      state.offsets = Object.fromEntries(requestedTracks.map(t => [t.id, 0]));
      state.loaded = loaded === requestedTracks.length;
      state.loadedSongIndex = state.loaded ? requestedSongIndex : null;
      state.demoMode = !state.loaded;

      if (state.loaded) {
        els.playbackState.textContent = 'READY TO PLAY';
        addLog('All ' + requestedTracks.length + ' stems for ' + SONGS[requestedSongIndex].title + ' loaded successfully.', 'repair');
      } else {
        els.playbackState.textContent = 'AUDIO LOAD FAILED — PRESS PLAY TO RETRY';
        addLog('Audio loading incomplete: ' + loaded + '/' + requestedTracks.length + ' stems. Press play to retry.', 'event');
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
    if (state.stemLoadController === controller) state.stemLoadController = null;
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
  const warpFlutter = state.audio.createOscillator();
  const warpFlutterDepth = state.audio.createGain();
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

  // Both oscillators modulate the pitch shifter's cents parameter, not the
  // stem's playback rate. Audio timing and shared song clock remain unchanged.
  warp.type = 'sine';
  warp.frequency.value = 1.65;
  warpDepth.gain.value = s.warpDepth; // Store WARP depth directly in cents.
  warp.connect(warpDepth);
  warpFlutter.type = 'sine';
  warpFlutter.frequency.value = 5.2;
  warpFlutterDepth.gain.value = s.warpDepth * 0.22;
  warpFlutter.connect(warpFlutterDepth);
  if (pitchShift) {
    const pitchParam = pitchShift.parameters.get('pitchCents');
    if (pitchParam) {
      warpDepth.connect(pitchParam);
      warpFlutterDepth.connect(pitchParam);
    }
  }
  warp.start();
  warpFlutter.start();

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
    phase, phaseLfo, phaseDepth, warp, warpDepth, warpFlutter, warpFlutterDepth,
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
  // Don't schedule inaudible pitch events if the browser's worklet is unavailable.
  const supportedEvents = state.pitchReady
    ? EVENT_TYPES
    : EVENT_TYPES.filter(event => event.id !== 'detune' && event.id !== 'warp');
  const et = supportedEvents[Math.floor(Math.random() * supportedEvents.length)];
  const eligibleTracks = et.id === 'warp' ? TRACKS.filter(track => track.id !== 'drums') : TRACKS;
  const t = eligibleTracks[Math.floor(Math.random() * eligibleTracks.length)];
  const sev = Math.round(et.severity[0] + Math.random() * (et.severity[1] - et.severity[0]));
  const s=trackState[t.id],e= {
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
    // One event is approximately a semitone of wobble; repeated events
    // increase movement up to ±180 cents plus a gentler secondary flutter.
    s.warpDepth = Math.min(180, s.warpDepth + 90 + Math.random() * 30);
    e.detail = '±' + Math.round(s.warpDepth) + ' CENTS / PITCH WOBBLE';
    if (d) {
      d.warpDepth.gain.setTargetAtTime(s.warpDepth, state.audio.currentTime, .18);
      d.warpFlutterDepth.gain.setTargetAtTime(s.warpDepth * 0.22, state.audio.currentTime, .18);
    }
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

  playRepairSuccess();
  const track = TRACKS.find(item => item.id === id);
  addLog((track ? track.name : id.toUpperCase()) + ' repaired by visitor / ' +
    eventCount + ' event' + (eventCount === 1 ? '' : 's') + ' cleared. All stems remain synchronised.', 'repair');
  updateUI();
  updateTrackAudioVisuals();
  if (state.selectedTrack === id) updateDialog();
  closeRepairedDialog(id);
}
function closeRepairedDialog(expectedTrack = null) {
  if (!els.dialog?.open) return;
  if (expectedTrack && (state.overallDialog || state.selectedTrack !== expectedTrack)) return;
  const selectedIsMiniGame = ['bass', 'drums', 'guitars', 'keys'].includes(state.selectedTrack) ||
    (state.selectedTrack === 'vocals' && vocalTypingAvailable());
  if (expectedTrack && !state.overallDialog && selectedIsMiniGame) return;
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
  if (id === 'bass') startBassRepair();
  if (id === 'guitars') startGuitarRepair();
  if (id === 'drums') startRhythmRepair(true);
  if (id === 'keys') startKeysRepair();
  if (id === 'vocals' && vocalTypingAvailable()) startVocalRepair();
  void playUISound('button');
}
function closeTrackDialog(fromUserAction = false) {
  bassRepair = null;
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
        'background:var(--green);color:var(--green)"></span>';
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
function resetTrackEventEffect(trackId, typeId) {
  const s = trackState[trackId];
  if (!s) return;
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
      if (chain) {
        chain.warpDepth.gain.setTargetAtTime(0, now, .12);
        chain.warpFlutterDepth.gain.setTargetAtTime(0, now, .12);
      }
      break;
    case 'delay':
      s.delayDepth = 0;
      if (chain) setDelayEffect(chain, 0, now);
      break;
    case 'crackle':
      s.crackleDepth = 0;
      break;
  }
}
function repairTrackEventType(trackId, typeId) {
  const s = trackState[trackId];
  if (!s) return 0;
  const activeEvents = s.events.filter(event => event.type === typeId);
  if (!activeEvents.length) return 0;
  s.events = s.events.filter(event => event.type !== typeId);
  resetTrackEventEffect(trackId, typeId);
  return activeEvents.length;
}
function repairSingleTrackEvent(trackId, eventToRemove) {
  const s = trackState[trackId];
  if (!s || !eventToRemove) return null;
  const eventIndex = s.events.indexOf(eventToRemove);
  if (eventIndex < 0) return null;
  s.events.splice(eventIndex, 1);
  if (!s.events.some(event => event.type === eventToRemove.type)) {
    resetTrackEventEffect(trackId, eventToRemove.type);
  }
  return eventToRemove;
}
function repairEventType(typeId) {
  const id = state.selectedTrack;
  if (!id) return;
  const repairedCount = repairTrackEventType(id, typeId);
  if (!repairedCount) return;

  playSwitchSound('off');

  playRepairSuccess();
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
  playRepairSuccess();
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
  els.bassPanel.hidden = true;
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
  const isBass = track.id === 'bass';
  const isDrums = track.id === 'drums';
  const isGuitar = track.id === 'guitars';
  const isKeys = track.id === 'keys';
  const isVocalTyping = track.id === 'vocals' && vocalTypingAvailable();
  const rhythmLocked = isBass || isDrums || isGuitar || isKeys || isVocalTyping;
  els.faultSwitches.hidden = rhythmLocked;
  document.getElementById('decay-switches-heading').hidden = rhythmLocked;
  els.bassPanel.hidden = !isBass;
  els.guitarPanel.hidden = !isGuitar;
  els.keysPanel.hidden = !isKeys;
  els.vocalPanel.hidden = !isVocalTyping;

  els.dialogArtStage.classList.remove('system-decay-art-stage', 'system-decay-critical', 'system-decay-warning');
  els.dialogInstrumentImage.hidden = false;
  els.dialogParticles.hidden = false;
  els.dialogOverallArt.hidden = true;
  els.solo.hidden = false;
  // Use the same custom instrument lettering as the player cards.
  const titleArt = ({drums:'assets/images/lettering/drums.png',bass:'assets/images/lettering/bass.png',guitars:'assets/images/lettering/guitars.png',keys:'assets/images/lettering/keys.png',vocals:'assets/images/lettering/vocals.png'})[track.id];
  els.dialogTitle.innerHTML = titleArt
    ? '<img class="dialog-title-art" src="' + encodeURI(titleArt) + '" alt="' + track.name + '">'
    : track.name;
  els.dialogStatus.textContent = status.text;
  els.dialogStatus.className = 'dialog-status ' + status.className;
  els.dialogDecay.textContent = decay + '%';
  els.dialogCount.textContent = s.events.length;
  els.dialogSignal.textContent = s.events.length ? 'UNSTABLE' : 'STABLE';
  els.rhythmPanel.hidden = !isDrums;
  els.switchesHeadingTitle.textContent = 'DECAY SWITCHES';
  els.switchesHeadingHelp.textContent = 'FLIP ACTIVE SWITCHES OFF TO REPAIR';

  if (els.dialogInstrumentImage.dataset.track !== track.id) {
    els.dialogInstrumentImage.src = 'assets/images/optimized/instruments/' + (track.id === 'vocals' ? 'vocal' : track.id) + '.webp';
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
    // Avoid duplicate playback clock reads and expensive analyser/DOM work per frame.
    updateDialogAudioPulse(now);
    updateRhythmRepair();
    if (now - state.lastClockTextAt >= 250) {
      const position = currentMasterOffset();
      const masterTrack = masterTrackForSong();
      const duration = masterTrack && state.buffers[masterTrack.id] ? state.buffers[masterTrack.id].duration : 0;
      els.playbackTime.textContent = formatTime(position) + ' / ' + (duration ? formatTime(duration) : '--:--');
      state.lastClockTextAt = now;
    }
    if (now - state.lastTrackVisualAt >= 100) {
      updateTrackAudioVisuals();
      state.lastTrackVisualAt = now;
    }
  }
  updateBassRepair(now);
  updateGuitarRepair(now);
  updateKeysRepair(now);
  updateVocalRepair();
  requestAnimationFrame(updatePlaybackClock);
}

function renderCurrentSong() {
  const song = SONGS[currentSongIndex];
  const songBackgrounds = {
    'on-time': 'assets/images/optimized/backgrounds/on-time.webp',
    'reconcile': 'assets/images/optimized/backgrounds/reconcile.webp',
    'rainy-night': 'assets/images/optimized/backgrounds/rainy-night.webp',
    'there-is-love': 'assets/images/optimized/backgrounds/there-is-love.webp'
  };
  document.body.style.setProperty('--song-background', 'url("' + new URL(songBackgrounds[song.id], document.baseURI).href + '")');
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
  // Cancel outstanding downloads before selecting a new song.
  state.stemLoadController?.abort();
  state.stemLoadController = null;
  state.loadingPromise = null;
  state.loading = false;
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

// Initialise the interface and audio system.
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('pointerdown', unlockAudioFromGesture, true);
  document.addEventListener('keydown', unlockAudioFromGesture, true);
  cacheElements();
  renderCurrentSong();
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
  document.addEventListener('keydown', handleRepairKey, true);
  document.addEventListener('keyup', handleRepairKeyUp, true);
  window.addEventListener('blur', () => { drumSpaceHeld = false; });
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
    if (state.selectedTrack === 'bass' || state.selectedTrack === 'guitars' || state.selectedTrack === 'keys' ||
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
  els.bassTuners.addEventListener('click', handleBassTuner);
  els.guitarTargets.addEventListener('click', handleGuitarTarget);
  els.dialog.addEventListener('close', () => { bassRepair = null; guitarRepair = null; keysRepair = null; vocalRepair = null; });
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
