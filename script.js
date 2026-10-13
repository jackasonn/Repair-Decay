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
  id:'stutter',name:'STUTTER',description:'Small sections repeating or catching',severity:[8,22]
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
  ,analyser:null,masterGain:null,loaded:false,loadedSongIndex:null,loading:false,loadingPromise:null,songGeneration:0,demoMode:false,noiseBuffer:null,pitchReady:false,waveformCtx:null,waveformData:null,waveformPixelWidth:0,waveformPixelHeight:0,waveformDrawAt:0,lastTrackVisualAt:0,lastClockTextAt:0,waveformColour:'#7f9a63'
}
;
function createTrackState(tracks) {
  return Object.fromEntries(tracks.map(t => [t.id, {
    events: [], detune: 0, highpass: 20, lowpass: 20000, bitDepth: 16,
    phaseDepth: 0, warpDepth: 0, stutterDepth: 0, crackleDepth: 0
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
  els.dialogCode = document.getElementById('dialog-track-code');
  els.dialogStatus = document.getElementById('dialog-status');
  els.dialogDecay = document.getElementById('dialog-decay');
  els.dialogCount = document.getElementById('dialog-event-count');
  els.dialogSignal = document.getElementById('dialog-signal');
  els.dialogEvents = document.getElementById('dialog-events');
  els.solo = document.getElementById('solo-button');
  els.knob = document.getElementById('repair-knob');
  els.knobVisual = document.getElementById('repair-knob-visual');
  els.previousSong = document.getElementById('previous-song');
  els.nextSong = document.getElementById('next-song');
  els.songTitle = document.getElementById('song-title');
  els.songNumber = document.getElementById('song-number');
  els.songArtist = document.getElementById('song-artist');
  els.albumArt = document.getElementById('album-art');
  els.artNoise = document.getElementById('art-noise');
}
// Build the instrument cards for the selected song.
function renderTracks() {
  els.grid.innerHTML = TRACKS.map((t, i) => {
    const bars = Array.from({ length: 12 }, () => '<span></span>').join('');
    return '<button class="track-card healthy" type="button" data-track="' + t.id + '" aria-label="Open ' + t.name + ' track diagnostics">' +
      '<div class="track-visual" aria-hidden="true"></div>' +
      '<span class="track-index">0' + (i + 1) + '</span>' +
      '<div class="track-signal" aria-hidden="true">' +
        '<div class="signal-heading"><span class="signal-label">AUDIO SIGNAL</span><span class="signal-light"></span></div>' +
        '<div class="signal-bars">' + bars + '</div>' +
        '<span class="signal-reading" data-level="' + t.id + '">STANDBY</span>' +
      '</div>' +
      '<span class="track-name">' + t.name + '</span>' +
      '<span class="track-status" data-status="' + t.id + '">NORMAL</span>' +
      '<span class="track-meter"><span data-meter="' + t.id + '"></span></span>' +
      '<span class="track-event-count" data-count="' + t.id + '">NO ACTIVE EVENTS</span>' +
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
function scheduleNextEvent() {
  state.nextEventAt=performance.now()+8000+Math.random()*10000
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
    chain.warp, chain.warpDepth
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
  gain.gain.value = state.soloTrack && state.soloTrack !== id ? 0 : 1;
  analyser.fftSize = 64;
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
  phase.connect(gain);
  gain.connect(analyser);
  analyser.connect(state.masterGain);

  return {
    source, highpass: hp, lowpass: lp, gain, artifactGain,
    phase, phaseLfo, phaseDepth, warp, warpDepth, crush, pitchShift, analyser,
    analyserData: new Uint8Array(analyser.frequencyBinCount)
  };
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
  if (rhythm && !rhythm.finished) finishRhythmRepair();
  stopPlayback(true);
  alignAllOffsets(0);
  els.playbackState.textContent = 'SONG COMPLETE / PLAY TO RESTART';

}

async function startPlayback() {
  if (state.starting || state.playing) return;
  state.starting = true;
  const generation = state.songGeneration;
  try {
    if (!state.loaded || state.loadedSongIndex !== currentSongIndex) {
      const ready = await loadAudio();
      if (!ready || state.loadedSongIndex !== currentSongIndex) return;
    }
    await initialiseAudio();
    if (!state.audio || generation !== state.songGeneration) return;
    if (state.audio.state === 'suspended') await state.audio.resume();

    state.playing = true;
    startSources();
    els.play.classList.add('playing');
    els.play.setAttribute('aria-label', 'Pause song');
    els.playbackState.textContent = 'PLAYING / DECAY ACTIVE';
    if (!rhythm || (rhythm.finished && (state.offsets.drums || 0) === 0)) prepareRhythmRepair();
    addLog('Playback started. Drums rhythm test armed.', 'repair');
    updateUI();
    updateTrackAudioVisuals();
    drawWaveform();
  } catch (error) {
    state.playing = false;
    console.error('Playback failed:', error);
    els.play.classList.remove('playing');
    els.play.setAttribute('aria-label', 'Play song');
    els.playbackState.textContent = 'PLAYBACK ERROR — SEE CONSOLE';
    addLog('Playback failed: ' + (error && error.message ? error.message : error), 'event');
    updateUI();
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
  if(et.id==='stutter') {
    s.stutterDepth=Math.min(1,s.stutterDepth+.22+Math.random()*.18);
    e.detail='CATCH / REPEAT';
    if(d) {
      const now=state.audio.currentTime,duration=state.buffers[t.id]?.duration||1,offset=Math.min(duration-.05,Math.max(.05,currentMasterOffset()%(duration))),repeat=.055+s.stutterDepth*.07,repeatStart=Math.max(0,offset-repeat),old=d.source;
      try {
        old.onended=null
      }
      catch(_) {
      }
      old.onended = () => disposeTrackChain(d, false);
      try { old.stop(now + .01); } catch (_) {}
      const ns=state.audio.createBufferSource();
      ns.buffer=state.buffers[t.id];
      const nd=makeTrackChain(t.id,ns);
      nd.gain.gain.value=state.soloTrack&&state.soloTrack!==t.id?0:1;
      ns.start(now+.01,repeatStart);
      ns.stop(now+.01+repeat);
      state.sources[t.id]=nd;
      setTimeout(() => {
        if (state.playing && state.sources[t.id] === nd) {
          disposeTrackChain(nd);

          // After the brief repeat, rejoin at the live master-clock position.
          const resumePosition = currentMasterOffset();
          const cs = state.audio.createBufferSource();
          cs.buffer = state.buffers[t.id];
          const cd = makeTrackChain(t.id, cs);
          state.sources[t.id] = cd;
          attachTrackEndHandler(t.id, cd, state.songGeneration);
          const resumeAt = state.audio.currentTime + 0.015;
          const resumeOffset = Math.max(0, Math.min(resumePosition, Math.max(0, duration - 0.01)));
          cs.start(resumeAt, resumeOffset);
        }
      }, Math.round((repeat + .02) * 1000))
    }
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
  s.stutterDepth = 0;
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
// Open the diagnostic window for an instrument.
function openTrackDialog(id) {
  state.selectedTrack=id;
  els.knob.value=0;
  els.knob.disabled = id === 'drums' && !!rhythm;
  document.querySelector('.repair-copy p:last-child').textContent = els.knob.disabled
    ? 'Use F in the rhythm lane on the main page to repair drums.'
    : 'Turn the control to restore this track. Full rotation clears all active decay events.';
  updateDialog();
  els.dialog.showModal()
}
function closeTrackDialog() {
  state.soloTrack=null;
  TRACKS.forEach(t=> {
    const d=state.sources[t.id];
    if(d)d.gain.gain.setTargetAtTime(1,state.audio?.currentTime||0,.08)
  }
  );
  els.dialog.close();
  updateDialog()
}
function updateDialog() {
  const t=TRACKS.find(x=>x.id===state.selectedTrack);
  if(!t)return;
  const s=trackState[t.id],d=severityFor(t.id),st=statusFor(d);
  els.dialogTitle.textContent=t.name;
  els.dialogCode.textContent='TRACK_'+String(TRACKS.indexOf(t)+1).padStart(2,'0');
  els.dialogStatus.textContent=st.text;
  els.dialogStatus.className='dialog-status '+st.className;
  els.dialogDecay.textContent=d+'%';
  els.dialogCount.textContent=s.events.length;
  els.dialogSignal.textContent=s.events.length?'UNSTABLE':'STABLE';
  els.dialogEvents.innerHTML=s.events.length?s.events.slice().reverse().map(e=>'<li><strong>'+e.name+'</strong> — '+e.description+(e.detail?' / '+e.detail:'')+'</li>').join(''):'<li class="empty">NO DECAY EVENTS RECORDED.</li>';
  els.solo.textContent=state.soloTrack===t.id?'UNSOLO TRACK':'SOLO TRACK';
  els.solo.classList.toggle('active',state.soloTrack===t.id)
}
function updateKnob() {
  if (state.selectedTrack === 'drums' && rhythm) return;
  const v=Number(els.knob.value),a=-135+v/100*270;
  els.knobVisual.style.transform='rotate('+a+'deg)';
  if(v>=100&&state.selectedTrack) {
    repairTrack(state.selectedTrack);
    els.knob.value=0;
    els.knobVisual.style.transform='rotate(-135deg)'
  }
}
// Solo only the currently selected instrument.
function toggleSolo() {
  if(!state.selectedTrack)return;
  state.soloTrack=state.soloTrack===state.selectedTrack?null:state.selectedTrack;
  TRACKS.forEach(t=> {
    const d=state.sources[t.id];
    if(d)d.gain.gain.setTargetAtTime(state.soloTrack&&state.soloTrack!==t.id?0:1,state.audio.currentTime,.08)
  }
  );
  updateDialog()
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
    updateRhythmRepair();
    updateTrackAudioVisuals();
    if (now - state.lastClockTextAt >= 250) {
      const position = currentMasterOffset();
      const masterTrack = masterTrackForSong();
      const duration = masterTrack && state.buffers[masterTrack.id] ? state.buffers[masterTrack.id].duration : 0;
      els.playbackTime.textContent = formatTime(position) + ' / ' + (duration ? formatTime(duration) : '--:--');
      state.lastClockTextAt = now;
    }
    if (state.playing && state.nextEventAt && now >= state.nextEventAt) applyEvent();
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
  els.albumArt.setAttribute('aria-label', song.title + ' artwork placeholder');
  document.title = 'REPAIR / DECAY — ' + song.title;
}
function updateSongNavigation() {
  els.previousSong.disabled = currentSongIndex <= 0;
  els.nextSong.disabled = currentSongIndex >= SONGS.length - 1;
  els.previousSong.setAttribute('aria-label', currentSongIndex > 0 ? 'Previous song: ' + SONGS[currentSongIndex - 1].title : 'No previous song');
  els.nextSong.setAttribute('aria-label', currentSongIndex < SONGS.length - 1 ? 'Next song: ' + SONGS[currentSongIndex + 1].title : 'No next song');
}
async function switchSong(nextIndex, finishedNaturally = false) {
  if (nextIndex < 0 || nextIndex >= SONGS.length || nextIndex === currentSongIndex) return;

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
// Initialise the interface and audio system.
document.addEventListener('DOMContentLoaded', () => {
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

  els.play.addEventListener('click', () => {
    state.playing ? stopPlayback() : startPlayback();
  });
  document.addEventListener('keydown', handleRepairKey);
  document.getElementById('repair-retry').addEventListener('click', restartRhythmRepair);
  els.previousSong.addEventListener('click', () => switchSong(currentSongIndex - 1));
  els.nextSong.addEventListener('click', () => switchSong(currentSongIndex + 1));
  els.closeDialog.addEventListener('click', closeTrackDialog);
  els.dialog.addEventListener('click', event => {
    if (event.target === els.dialog && !state.knobInteracting) closeTrackDialog();
  });
  els.knob.addEventListener('pointerdown', () => { state.knobInteracting = true; });
  const releaseKnob = () => {
    setTimeout(() => { state.knobInteracting = false; }, 0);
  };
  els.knob.addEventListener('pointerup', releaseKnob);
  els.knob.addEventListener('pointercancel', releaseKnob);
  els.knob.addEventListener('input', updateKnob);
  els.solo.addEventListener('click', toggleSolo);
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
  for (let i = 500; i < Math.min(2000, energies.length - 1); i++) {
    const baseline = energies.slice(i - 12, i).reduce((a, b) => a + b, 0) / 12;
    if (energies[i] > Math.max(.00001, baseline * 2) && energies[i] >= energies[i-1] && energies[i] > energies[i+1]) {
      if (!peaks.length || i * .01 - peaks[peaks.length - 1] > .4) peaks.push(i * .01);
    }
  }
  return peaks.slice(0, 16);
}
function prepareRhythmRepair() {
  const beats = drumRepairBeats(state.buffers.drums);
  rhythm = { beats, judged: new Set(), hits: 0, stability: 50, active: false, finished: false };
  document.getElementById('rhythm-panel').hidden = false;
  document.getElementById('repair-retry').hidden = true;
  setRepairFeedback('LISTEN — DRUM DAMAGE AT 2 SECONDS. PRESS F AT THE CENTRE.');
  renderRepairState();
  if (!beats.length) {
    rhythm.finished = true;
    setRepairFeedback('NO DRUM CUES FOUND — REPAIR TEST UNAVAILABLE');
    document.getElementById('repair-retry').hidden = false;
  }
}
function setRepairFeedback(message) {
  document.getElementById('repair-feedback').textContent = message;
}
function renderRepairState() {
  document.getElementById('repair-stability').value = rhythm.stability;
  document.getElementById('repair-stability-text').textContent = Math.round(rhythm.stability) + '%';
  document.getElementById('repair-progress').textContent = rhythm.hits + ' / ' + rhythm.beats.length + ' beats repaired';
}
function updateRhythmRepair() {
  if (!rhythm) return;
  const position = currentMasterOffset();
  if (state.playing && !rhythm.finished) {
    if (!rhythm.active && position >= 2) {
      rhythm.active = true;
      trackState.drums.events = [{ type:'lowpass', name:'DRUM SIGNAL DAMAGE', description:'Rhythm repair required', severity:40, time:new Date() }];
      trackState.drums.lowpass = 1800;
      state.sources.drums?.lowpass.frequency.setTargetAtTime(1800, state.audio.currentTime, .08);
      addLog('DRUMS damaged. Follow the signal lane and press F.', 'event');
      setRepairFeedback('DRUMS DECAYING — PRESS F AT THE CENTRE MARKER');
      updateUI();
    }
    rhythm.beats.forEach((beat, i) => {
      if (!rhythm.judged.has(i) && position > beat + REPAIR_WINDOW) {
        rhythm.judged.add(i);
        rhythm.stability = Math.max(0, rhythm.stability - 10);
        setRepairFeedback('MISS — BEAT PASSED');
        renderRepairState();
      }
    });
    if (position > rhythm.beats[rhythm.beats.length - 1] + .5) finishRhythmRepair();
  }
  drawRepairSignal(position);
}
function handleRepairKey(event) {
  if (event.code !== 'KeyF' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!rhythm?.active || rhythm.finished || !state.playing || els.dialog.open) return;
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
    setRepairFeedback('CORRECT — SIGNAL STABILISING');
  } else {
    rhythm.stability = Math.max(0, rhythm.stability - 10);
    setRepairFeedback('MISS — OUTSIDE REPAIR WINDOW');
  }
  renderRepairState();
}
function finishRhythmRepair() {
  if (!rhythm || rhythm.finished) return;
  rhythm.finished = true;
  const restored = rhythm.hits >= Math.ceil(rhythm.beats.length * .7) && rhythm.stability >= 50;
  if (restored) repairTrack('drums');
  const result = restored ? 'DRUMS RESTORED' : 'REPAIR FAILED — DRUM SIGNAL STILL DAMAGED';
  setRepairFeedback(result);
  addLog(result, restored ? 'repair' : 'event');
  document.getElementById('repair-retry').hidden = false;
}
function restartRhythmRepair() {
  stopPlayback();
  alignAllOffsets(0);
  repairTrack('drums');
  rhythm = null;
  startPlayback();
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
