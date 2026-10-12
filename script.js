// ───────────────────────────────────────────────
// TRACKS + DECAY EVENT DEFINITIONS
// ───────────────────────────────────────────────
const SONGS = [
  {
    id: 'on-time',
    title: 'ON TIME',
    album: 'ALBUM NAME',
    artist: 'TAYLA KANE / JACKSON MOORE',
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
    album: 'ALBUM NAME',
    artist: 'TAYLA KANE / JACKSON MOORE',
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
  ,analyser:null,masterGain:null,loaded:false,loadedSongIndex:null,loading:false,loadingPromise:null,songGeneration:0,demoMode:false,noiseBuffer:null,pitchReady:false
}
;
function createTrackState(tracks) {
  return Object.fromEntries(tracks.map(t => [t.id, {
    events: [], detune: 0, highpass: 20, lowpass: 20000, bitDepth: 16,
    phaseDepth: 0, warpDepth: 0, stutterDepth: 0, crackleDepth: 0
  }]));
}
let trackState = createTrackState(TRACKS);
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
  els.albumName = document.getElementById('album-name');
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
// Return the current position on the song timeline, including any paused offset.
function currentMasterOffset() {
  const masterTrack = TRACKS.find(t => t.id === 'drums') || TRACKS[0];
  if (!masterTrack) return 0;
  const duration = state.buffers[masterTrack.id] ? state.buffers[masterTrack.id].duration : 1;
  const base = state.offsets[masterTrack.id] || 0;
  const elapsed = state.playing && state.audio ? Math.max(0, state.audio.currentTime - state.startedAt) : 0;
  return (base + elapsed) % Math.max(0.01, duration);
}
// Create the Web Audio graph and a reusable noise buffer for crackle events.
async function initialiseAudio() {
  if(state.audio)return;
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C) {
    state.demoMode=true;
    updateUI();
    return
  }
  const ctx=new C(),master=ctx.createGain(),analyser=ctx.createAnalyser();
  master.gain.value=.9;
  analyser.fftSize=512;
  analyser.smoothingTimeConstant=.82;
  master.connect(analyser);
  analyser.connect(ctx.destination);
  state.audio=ctx;
  state.masterGain=master;
  state.analyser=analyser;
  const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
  const data=noise.getChannelData(0);
  for(let i=0;
  i<data.length;
  i++)data[i]=Math.random()*2-1;
  state.noiseBuffer=noise;
  if(ctx.audioWorklet) {
    ctx.audioWorklet.addModule('pitch-shifter.js').then(()=>{
      state.pitchReady=true
    }).catch(e=>{
      console.warn('Pitch shifter worklet could not load.',e)
    })
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
  const lfo = state.audio.createOscillator();
  const lfoDepth = state.audio.createGain();
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
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  lfoDepth.gain.value = 0;
  lfo.start();

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
    source, highpass: hp, lowpass: lp, gain, artifactGain, lfo, lfoDepth,
    phase, phaseLfo, phaseDepth, warp, warpDepth, crush, pitchShift, analyser
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
// Start every stem for the selected song from its stored timeline offset.
function startSources() {
  Object.values(state.sources).forEach(d => {
    try { d.source.onended = null; } catch (_) {}
    [d.lfo, d.phaseLfo, d.warp].forEach(oscillator => {
      try { oscillator.stop(); } catch (_) {}
    });
    try { d.source.stop(); } catch (_) {}
  });
  state.sources = {};

  TRACKS.forEach(track => {
    const buffer = state.buffers[track.id];
    if (!buffer) return;
    const source = state.audio.createBufferSource();
    source.buffer = buffer;
    state.sources[track.id] = makeTrackChain(track.id, source);
    const pitchParam = state.sources[track.id].pitchShift && state.sources[track.id].pitchShift.parameters.get('pitchCents');
    if (pitchParam) pitchParam.setValueAtTime(trackState[track.id].detune, state.audio.currentTime);
    source.start(0, state.offsets[track.id] || 0);
  });

  const masterTrack = TRACKS.find(t => t.id === 'drums') || TRACKS[0];
  const masterSource = masterTrack && state.sources[masterTrack.id];
  if (masterSource) {
    masterSource.source.onended = () => {
      if (state.playing) loopPlayback();
    };
  }
  state.startedAt = state.audio.currentTime;
}
// Restart the song from the beginning with every stem aligned.
function loopPlayback() {
  if(!state.audio||!state.playing)return;
  state.playing=false;
  Object.values(state.sources).forEach(d=> {
    try {
      d.source.onended=null
    }
    catch(_) {
    }
    try {
      d.source.stop()
    }
    catch(_) {
    }
  }
  );
  state.sources= {
  }
  ;
  TRACKS.forEach(t=> {
    state.offsets[t.id]=0
  }
  );
  state.playing=true;
  startSources();
  els.playbackState.textContent='PLAYING / DECAY ACTIVE';
  addLog('Song looped. All tracks resynchronised from the beginning.','repair');
  updateUI()
}
async function startPlayback() {
  try {
    if(!state.loaded) {
      const ready=await loadAudio();
      if(!ready)return
    }
    await initialiseAudio();
    if(!state.audio)return;
    if(state.audio.state==='suspended')await state.audio.resume();
    startSources();
    state.playing=true;
    els.play.classList.add('playing');
    els.play.setAttribute('aria-label','Pause song');
    els.playbackState.textContent='PLAYING / DECAY ACTIVE';
    scheduleNextEvent();
    addLog('Playback started. Decay engine armed.','repair');
    updateUI()
  }
  catch(e) {
    state.playing=false;
    console.error('Playback failed:',e);
    els.play.classList.remove('playing');
    els.play.setAttribute('aria-label','Play song');
    els.playbackState.textContent='PLAYBACK ERROR — SEE CONSOLE';
    addLog('Playback failed: '+(e?.message||e),'event');
    updateUI()
  }
}
function stopPlayback(finished = false) {
  if (!state.audio) {
    state.playing = false;
    return;
  }
  const masterOffset = currentMasterOffset();
  state.playing = false;
  state.nextEventAt = 0;
  const masterTrack = TRACKS.find(t => t.id === 'drums') || TRACKS[0];
  const masterDuration = masterTrack && state.buffers[masterTrack.id] ? state.buffers[masterTrack.id].duration : 1;

  TRACKS.forEach(track => {
    const chain = state.sources[track.id];
    const duration = state.buffers[track.id] ? state.buffers[track.id].duration : masterDuration;
    state.offsets[track.id] = masterOffset % Math.max(0.01, duration);
    if (!chain) return;
    try { chain.source.onended = null; } catch (_) {}
    [chain.lfo, chain.phaseLfo, chain.warp].forEach(oscillator => {
      try { oscillator.stop(); } catch (_) {}
    });
    try { chain.source.stop(); } catch (_) {}
  });
  state.sources = {};
  els.play.classList.remove('playing');
  els.play.setAttribute('aria-label', 'Play song');
  els.playbackState.textContent = finished ? 'SONG COMPLETE' : 'PAUSED';
  if (!finished) addLog('Playback paused. All tracks resynchronised to the song timeline.', 'repair');
  updateUI();
  updateTrackAudioVisuals();
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
      try {
        old.stop(now+.01)
      }
      catch(_) {
      }
      const ns=state.audio.createBufferSource();
      ns.buffer=state.buffers[t.id];
      const nd=makeTrackChain(t.id,ns);
      nd.gain.gain.value=state.soloTrack&&state.soloTrack!==t.id?0:1;
      ns.start(now+.01,repeatStart);
      ns.stop(now+.01+repeat);
      state.sources[t.id]=nd;
      setTimeout(()=> {
        if(state.playing&&state.sources[t.id]===nd) {
          try {
            nd.source.onended=null
          }
          catch(_) {
          }
          try {
            nd.source.stop()
          }
          catch(_) {
          }
          const cs=state.audio.createBufferSource();
          cs.buffer=state.buffers[t.id];
          const cd=makeTrackChain(t.id,cs);
          cd.gain.gain.value=state.soloTrack&&state.soloTrack!==t.id?0:1;
          state.sources[t.id]=cd;
          if(t.id==='drums')cd.source.onended=()=>{if(state.playing)loopPlayback()};
          cs.start(0,Math.min(duration,offset));
        }
      }
      ,Math.round((repeat+.02)*1000))
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
        n.start(when);
        n.stop(when+.05)
      }
    }
  }
  s.events.push(e);
  addLog(t.name+': '+et.name+(e.detail?' / '+e.detail:''),'event');
  updateUI();
  scheduleNextEvent()
}
// Clear every active fault on a stem and resynchronise it to the drum timeline.
function repairTrack(id) {
  const s=trackState[id];
  if(!s.events.length)return;
  const n=s.events.length;
  const syncOffset=currentMasterOffset();
  s.events=[];
  s.detune=0;
  s.highpass=20;
  s.lowpass=20000;
  s.bitDepth=16;
  s.phaseDepth=0;
  s.warpDepth=0;
  s.stutterDepth=0;
  s.crackleDepth=0;
  if(state.sources[id]) {
    const d=state.sources[id];
    const pitchParam=d.pitchShift?.parameters.get('pitchCents');
    if(pitchParam)pitchParam.setTargetAtTime(0,state.audio.currentTime,.12);
    d.highpass.frequency.setTargetAtTime(20,state.audio.currentTime,.12);
    d.lowpass.frequency.setTargetAtTime(20000,state.audio.currentTime,.12);
    d.phaseDepth.gain.setTargetAtTime(0,state.audio.currentTime,.12);
    d.warpDepth.gain.setTargetAtTime(0,state.audio.currentTime,.12);
    d.crush.curve=makeBitCurve(16)
  }
  state.offsets[id]=syncOffset;
  if(state.playing) {
    Object.values(state.sources).forEach(d=> {
      try {
        d.source.onended=null
      }
      catch(_) {
      }
      try {
        d.source.stop()
      }
      catch(_) {
      }
    }
    );
    state.sources= {
    }
    ;
    startSources()
  }
  addLog(TRACKS.find(t=>t.id===id).name+' repaired by visitor / '+n+' event'+(n===1?'':'s')+' cleared. Track resynchronised.','repair');
  updateUI();
  if(state.selectedTrack===id)updateDialog()
}
// Open the diagnostic window for an instrument.
function openTrackDialog(id) {
  state.selectedTrack=id;
  els.knob.value=0;
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
// Draw the live analyser waveform.
function drawWaveform() {
  const canvas = els.waveform;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  let data;
  if (state.analyser && state.playing) {
    data = new Uint8Array(state.analyser.frequencyBinCount);
    state.analyser.getByteFrequencyData(data);
  }
  for (let i = 0; i < Math.floor(rect.width / 5); i++) {
    const source = data ? data[Math.floor(i / (rect.width / 5) * data.length)] / 255 : 0.12 + 0.08 * Math.sin(i * 0.45);
    const height = Math.max(2, source * rect.height * 0.65);
    context.fillStyle = state.playing ? 'rgba(127,154,99,.82)' : 'rgba(228,211,140,.24)';
    context.fillRect(i * 5, (rect.height - height) / 2, 2, height);
  }
  requestAnimationFrame(drawWaveform);
}
function updateTrackAudioVisuals() {
  TRACKS.forEach(track => {
    const card = els.grid.querySelector('[data-track="' + track.id + '"]');
    if (!card) return;
    const chain = state.sources[track.id];
    const bars = card.querySelectorAll('.signal-bars span');
    const level = card.querySelector('[data-level="' + track.id + '"]');
    const data = new Uint8Array(chain && chain.analyser ? chain.analyser.frequencyBinCount : 0);
    if (chain && chain.analyser && state.playing) chain.analyser.getByteFrequencyData(data);

    bars.forEach((bar, index) => {
      const value = data.length && state.playing ? data[Math.min(data.length - 1, Math.floor(index / bars.length * data.length))] / 255 : 0;
      const height = state.playing && chain ? 4 + value * 32 : 4;
      bar.style.height = height.toFixed(1) + 'px';
    });
    card.classList.toggle('signal-playing', !!(chain && state.playing));
    if (level) level.textContent = state.playing && chain ? 'LIVE SIGNAL' : state.loaded ? 'STANDBY' : 'OFFLINE';
  });
}
function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}
function updatePlaybackClock() {
  if (state.audio) {
    const position = currentMasterOffset();
    const masterTrack = TRACKS.find(t => t.id === 'drums') || TRACKS[0];
    const duration = masterTrack && state.buffers[masterTrack.id] ? state.buffers[masterTrack.id].duration : 0;
    els.playbackTime.textContent = formatTime(position) + ' / ' + (duration ? formatTime(duration) : '--:--');
    if (state.playing && state.nextEventAt && performance.now() >= state.nextEventAt) applyEvent();
    updateTrackAudioVisuals();
  }
  requestAnimationFrame(updatePlaybackClock);
}
function renderCurrentSong() {
  const song = SONGS[currentSongIndex];
  els.songTitle.textContent = song.title;
  els.albumName.textContent = song.album;
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
async function switchSong(nextIndex) {
  if (nextIndex < 0 || nextIndex >= SONGS.length || nextIndex === currentSongIndex) return;

  if (els.dialog && els.dialog.open) closeTrackDialog();
  if (state.playing) stopPlayback();
  state.songGeneration++;
  currentSongIndex = nextIndex;
  TRACKS = SONGS[currentSongIndex].tracks;
  trackState = createTrackState(TRACKS);
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
  await loadAudio();
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

  els.play.addEventListener('click', () => state.playing ? stopPlayback() : startPlayback());
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
