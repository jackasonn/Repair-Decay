// ───────────────────────────────────────────────
// TRACKS + DECAY EVENT DEFINITIONS
// ───────────────────────────────────────────────
const TRACKS=[ {
  id:'drums',name:'DRUMS',file:'assets/on-time-drums.mp3'
}
, {
  id:'bass',name:'BASS',file:'assets/on-time-bass.mp3'
}
, {
  id:'guitars',name:'GUITARS',file:'assets/on-time-guitars.mp3'
}
, {
  id:'keys',name:'KEYS',file:'assets/on-time-keys.mp3'
}
, {
  id:'vocals',name:'VOCALS',file:'assets/on-time-vocals.mp3'
}
];
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
  ,analyser:null,masterGain:null,loaded:false,loading:false,demoMode:false,noiseBuffer:null,pitchReady:false
}
;
const trackState=Object.fromEntries(TRACKS.map(t=>[t.id, {
  events:[],detune:0,highpass:20,lowpass:20000,bitDepth:16,phaseDepth:0,warpDepth:0,stutterDepth:0,crackleDepth:0
}
]));
const els= {
}
;
// Cached DOM elements used throughout the interface.
// Cache the page elements once the DOM has loaded.
function cacheElements() {
  els.grid=document.getElementById('track-grid');
  els.play=document.getElementById('play-button');
  els.waveform=document.getElementById('waveform');
  els.playbackState=document.getElementById('playback-state');
  els.playbackTime=document.getElementById('playback-time');
  els.maintenance=document.getElementById('maintenance-log');
  els.decayNumber=document.getElementById('decay-number');
  els.decayMeter=document.getElementById('overall-decay-meter');
  els.decayCode=document.getElementById('decay-code');
  els.decayCaption=document.getElementById('decay-caption');
  els.systemDot=document.getElementById('system-dot');
  els.systemStatus=document.getElementById('system-status');
  els.dialog=document.getElementById('track-dialog');
  els.closeDialog=document.getElementById('close-dialog');
  els.dialogTitle=document.getElementById('dialog-title');
  els.dialogCode=document.getElementById('dialog-track-code');
  els.dialogStatus=document.getElementById('dialog-status');
  els.dialogDecay=document.getElementById('dialog-decay');
  els.dialogCount=document.getElementById('dialog-event-count');
  els.dialogSignal=document.getElementById('dialog-signal');
  els.dialogEvents=document.getElementById('dialog-events');
  els.solo=document.getElementById('solo-button');
  els.knob=document.getElementById('repair-knob');
  els.knobVisual=document.getElementById('repair-knob-visual')
}
// Build the five instrument cards.
function renderTracks() {
  els.grid.innerHTML=TRACKS.map((t,i)=>'<button class="track-card" type="button" data-track="'+t.id+'" aria-label="Open '+t.name+' track diagnostics"><div class="track-visual"></div><span class="track-index">0'+(i+1)+'</span><span class="track-name">'+t.name+'</span><span class="track-status" data-status="'+t.id+'">NORMAL</span><span class="track-meter"><span data-meter="'+t.id+'"></span></span><span class="track-event-count" data-count="'+t.id+'">NO ACTIVE EVENTS</span></button>').join('');
  els.grid.querySelectorAll('.track-card').forEach(c=>c.addEventListener('click',()=>openTrackDialog(c.dataset.track)))
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
  let total=0;
  TRACKS.forEach(t=> {
    const d=severityFor(t.id),st=statusFor(d),card=els.grid.querySelector('[data-track="'+t.id+'"]'),se=els.grid.querySelector('[data-status="'+t.id+'"]'),m=els.grid.querySelector('[data-meter="'+t.id+'"]'),c=els.grid.querySelector('[data-count="'+t.id+'"]');
    total+=d;
    card.classList.toggle('decaying',d>=30&&d<70);
    card.classList.toggle('critical',d>=70);
    se.textContent=st.text;
    se.className='track-status '+st.className;
    m.style.width=d+'%';
    m.className=st.className;
    c.textContent=trackState[t.id].events.length?trackState[t.id].events.length+' ACTIVE EVENT'+(trackState[t.id].events.length===1?'':'S'):'NO ACTIVE EVENTS'
  }
  );
  state.overallDecay=Math.round(total/TRACKS.length);
  const st=statusFor(state.overallDecay);
  els.decayNumber.textContent=state.overallDecay+'%';
  els.decayNumber.className='decay-number '+st.className;
  els.decayMeter.style.width=state.overallDecay+'%';
  els.decayMeter.className=st.className;
  els.decayCode.textContent=String(state.overallDecay).padStart(3,'0');
  els.decayCaption.textContent=state.overallDecay===0?'SYSTEM INTACT — NO REPAIRS REQUIRED':state.overallDecay<30?'MINOR INSTABILITY — MONITOR THE SIGNAL':state.overallDecay<70?'SYSTEM DEGRADED — MAINTENANCE RECOMMENDED':'CRITICAL FAILURE — IMMEDIATE REPAIR REQUIRED';
  els.systemDot.className='status-dot '+st.className;
  els.systemStatus.textContent=state.demoMode?'AUDIO FILES NOT INSTALLED':state.playing?'SYSTEM ACTIVE':'SYSTEM READY'
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
// Return the current position on the drum timeline, including any paused offset.
function currentMasterOffset() {
  const duration=state.buffers.drums?.duration||1;
  const base=state.offsets.drums||0;
  const elapsed=state.playing&&state.audio?Math.max(0,state.audio.currentTime-state.startedAt):0;
  return (base+elapsed)%duration
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
  if(state.loading) {
    while(state.loading)await new Promise(resolve=>setTimeout(resolve,50));
    return state.loaded
  }
  state.loading=true;
  try {
    await initialiseAudio();
    if(!state.audio) {
      els.playbackState.textContent='AUDIO NOT SUPPORTED';
      return false
    }
    els.playbackState.textContent='LOADING TRACKS…';
    let loaded=0;
    for(const t of TRACKS) {
      try {
        const r=await fetch(t.file);
        if(!r.ok)throw Error(r.status);
        state.buffers[t.id]=await state.audio.decodeAudioData(await r.arrayBuffer());
        state.offsets[t.id]=0;
        loaded++
      }
      catch(e) {
        console.warn('Could not load '+t.file,e)
      }
    }
    if(loaded===TRACKS.length) {
      state.loaded=true;
      state.demoMode=false;
      els.playbackState.textContent='READY TO PLAY';
      addLog('All five track stems loaded successfully.','repair')
    }
    else {
      state.demoMode=true;
      els.playbackState.textContent='ADD STEMS TO BEGIN';
      addLog('Audio setup waiting: '+loaded+'/5 track stems found.','event')
    }
    updateUI();
    return state.loaded
  }
  catch(e) {
    console.error('Audio initialisation failed.',e);
    els.playbackState.textContent='AUDIO ERROR — SEE CONSOLE';
    addLog('Audio initialisation failed.','event');
    return false
  }
  finally {
    state.loading=false
  }
}
// Build the audio effects chain for one stem.
function makeTrackChain(id,source) {
  const s=trackState[id],hp=state.audio.createBiquadFilter(),lp=state.audio.createBiquadFilter(),gain=state.audio.createGain(),artifactGain=state.audio.createGain(),lfo=state.audio.createOscillator(),lfoDepth=state.audio.createGain(),phase=state.audio.createStereoPanner(),phaseLfo=state.audio.createOscillator(),phaseDepth=state.audio.createGain(),warp=state.audio.createOscillator(),warpDepth=state.audio.createGain(),crush=state.audio.createWaveShaper(),pitchShift=state.pitchReady?new AudioWorkletNode(state.audio,'pitch-shifter',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],parameterData:{pitchCents:s.detune}}):null;
  hp.type='highpass';
  lp.type='lowpass';
  hp.frequency.value=s.highpass;
  lp.frequency.value=s.lowpass;
  gain.gain.value=state.soloTrack&&state.soloTrack!==id?0:1;
  artifactGain.gain.value=1;
  lfo.type='sine';
  lfo.frequency.value=.08;
  lfoDepth.gain.value=0;
  lfo.start();
  phaseLfo.type='sine';
  phaseLfo.frequency.value=.17;
  phaseDepth.gain.value=0;
  phaseLfo.connect(phaseDepth);
  phaseDepth.connect(phase.pan);
  phaseLfo.start();
  warp.type='sine';
  warp.frequency.value=.23;
  warpDepth.gain.value=0;
  warp.connect(warpDepth);
  if(pitchShift) {
    const pitchParam=pitchShift.parameters.get('pitchCents');
    if(pitchParam)warpDepth.connect(pitchParam)
  }
  warp.start();
  crush.curve=makeBitCurve(16);
  crush.oversample='none';
  if(pitchShift) {
    source.connect(pitchShift);
    pitchShift.connect(crush)
  }
  else source.connect(crush);
  crush.connect(hp);
  hp.connect(lp);
  artifactGain.connect(hp);
  lp.connect(phase);
  phase.connect(gain);
  gain.connect(state.masterGain);
  return {
    source,highpass:hp,lowpass:lp,gain,artifactGain,lfo,lfoDepth,phase,phaseLfo,phaseDepth,warp,warpDepth,crush,pitchShift
  }
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
// Start every stem from its stored timeline offset.
function startSources() {
  Object.values(state.sources).forEach(d=> {
    try {
      d.source.onended=null
    }
    catch(_) {
    }
    ;
    [d.lfo,d.phaseLfo,d.warp].forEach(o=> {
      try {
        o.stop()
      }
      catch(_) {
      }
    }
    );
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
    const b=state.buffers[t.id];
    if(!b)return;
    const s=state.audio.createBufferSource(),st=trackState[t.id];
    s.buffer=b;
    state.sources[t.id]=makeTrackChain(t.id,s);
    const pitchParam=state.sources[t.id].pitchShift?.parameters.get('pitchCents');
    if(pitchParam)pitchParam.setValueAtTime(st.detune,state.audio.currentTime);
    s.start(0,state.offsets[t.id]||0)
  }
  );
  const first=state.sources[TRACKS[0].id];
  if(first)first.source.onended=()=> {
    if(state.playing)loopPlayback()
  }
  ;
  state.startedAt=state.audio.currentTime
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
function stopPlayback(finished=false) {
  if(!state.audio)return;
  const masterOffset=currentMasterOffset();
  state.playing=false;
  state.nextEventAt=0;
  const drumDuration=state.buffers.drums?.duration||1;
  TRACKS.forEach(t=> {
    const d=state.sources[t.id];
    state.offsets[t.id]=masterOffset%(state.buffers[t.id]?.duration||drumDuration);
    if(d) {
      try {
        d.source.onended=null
      }
      catch(_) {
      }
      ;
      [d.lfo,d.phaseLfo,d.warp].forEach(o=> {
        try {
          o.stop()
        }
        catch(_) {
        }
      }
      );
      try {
        d.source.stop()
      }
      catch(_) {
      }
    }
  }
  );
  state.sources= {
  }
  ;
  els.play.classList.remove('playing');
  els.play.setAttribute('aria-label','Play song');
  els.playbackState.textContent=finished?'SONG COMPLETE':'PAUSED';
  if(!finished)addLog('Playback paused. All tracks resynchronised to the drum timeline.','repair');
  updateUI()
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
  const c=els.waveform,r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;
  c.width=Math.max(1,Math.floor(r.width*d));
  c.height=Math.max(1,Math.floor(r.height*d));
  const x=c.getContext('2d');
  x.setTransform(d,0,0,d,0,0);
  x.clearRect(0,0,r.width,r.height);
  let data;
  if(state.analyser&&state.playing) {
    data=new Uint8Array(state.analyser.frequencyBinCount);
    state.analyser.getByteFrequencyData(data)
  }
  for(let i=0;
  i<Math.floor(r.width/5);
  i++) {
    const source=data?data[Math.floor(i/(r.width/5)*data.length)]/255:.12+.08*Math.sin(i*.45),h=Math.max(2,source*r.height*.65);
    x.fillStyle=state.playing?'rgba(215,167,45,.72)':'rgba(228,211,140,.24)';
    x.fillRect(i*5,(r.height-h)/2,2,h)
  }
  requestAnimationFrame(drawWaveform)
}
function updatePlaybackClock() {
  if(state.playing&&state.audio) {
    const elapsed=Math.max(0,state.audio.currentTime-state.startedAt),sec=Math.floor(elapsed),mins=String(Math.floor(sec/60)).padStart(2,'0'),secs=String(sec%60).padStart(2,'0');
    els.playbackTime.textContent=mins+':'+secs+' / TRACKED LIVE';
    if(state.playing&&state.nextEventAt&&performance.now()>=state.nextEventAt)applyEvent()
  }
  requestAnimationFrame(updatePlaybackClock)
}
// Initialise the interface and audio system.
document.addEventListener('DOMContentLoaded',()=> {
  cacheElements();
  renderTracks();
  addLog('Maintenance system initialised.','repair');
  addLog('Waiting for five individual audio stems.','event');
  updateUI();
  drawWaveform();
  updatePlaybackClock();
  loadAudio();
  els.play.addEventListener('click',()=>state.playing?stopPlayback():startPlayback());
  els.closeDialog.addEventListener('click',closeTrackDialog);
  els.dialog.addEventListener('click',e=> {
    if(e.target===els.dialog&&!state.knobInteracting)closeTrackDialog()
  }
  );
  els.knob.addEventListener('pointerdown',()=>{
    state.knobInteracting=true
  });
  const releaseKnob=()=>{
    setTimeout(()=>{
      state.knobInteracting=false
    },0)
  };
  els.knob.addEventListener('pointerup',releaseKnob);
  els.knob.addEventListener('pointercancel',releaseKnob);
  els.knob.addEventListener('input',updateKnob);
  els.solo.addEventListener('click',toggleSolo)
}
);
