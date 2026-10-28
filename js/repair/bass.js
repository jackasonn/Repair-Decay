// Bass: four physical pegs share a queue of the stem's actual decay effects.
const BASS_TURN_MS = 600;
const BASS_FEEDBACK_MS = 900;
const BASS_PEG_POSITIONS = [[50.9,22.9],[43.6,39.1],[37.4,54.7],[31.2,71.2]];
// Crop transparent margins in SVG, leaving the supplied PNGs untouched.
// Each viewBox aligns the shaft end to the same point as its angle changes.
const BASS_TUNER_FRAMES = [
  {angle:0, box:'610 150 440 360'},
  {angle:30, box:'520 520 440 360'},
  {angle:70, box:'425 820 440 360'},
  {angle:90, box:'350 1070 440 360'}
];
let bassRepair = null;
function currentBassRepair() {
  return !!bassRepair && els.dialog?.open && !state.overallDialog &&
    state.selectedTrack === 'bass' && bassRepair.song === currentSongIndex &&
    bassRepair.generation === state.songGeneration;
}
function startBassRepair() {
  bassRepair = {song:currentSongIndex, generation:state.songGeneration,
    repairedCount:0, hadDecay:false, signature:'', slots:Array.from({length:4},()=>({status:'idle',type:null,frame:0}))};
  els.bassTuners.innerHTML = BASS_PEG_POSITIONS.map(([x,y],index) =>
    '<div class="bass-peg" style="--peg-x:'+x+'%;--peg-y:'+y+'%">'+
      '<button class="bass-tuner" type="button" data-bass-peg="'+index+'" disabled>'+
        BASS_TUNER_FRAMES.map((frame,i)=>'<svg data-bass-frame="'+i+'" viewBox="'+frame.box+'" aria-hidden="true"'+(i===0?'':' hidden')+'><image href="assets/images/instruments/bass-tuner-'+frame.angle+'.png" width="2048" height="2048" /></svg>').join('')+
      '</button><span class="bass-effect-name"></span><span class="bass-hit-label" role="status"></span></div>'
  ).join('');
  document.getElementById('bass-feedback').textContent = 'CLICK A RED GLOWING PEG TO TUNE';
  updateBassRepair();
}
function updateBassRepair(now = performance.now()) {
  if (!currentBassRepair()) return;
  const game = bassRepair;
  game.slots.forEach(slot => {
    if (slot.status !== 'turning') return;
    const progress = Math.max(0, now - slot.startedAt) / BASS_TURN_MS;
    slot.frame = Math.max(0, 3 - Math.floor(progress * 4));
    if (progress < 1) return;
    const removed = repairTrackEventType('bass', slot.type);
    slot.status = removed ? 'repaired' : 'idle';
    slot.until = now + BASS_FEEDBACK_MS;
    slot.frame = 0;
    if (removed) {
      game.repairedCount++;
      const name = EVENT_TYPES.find(event => event.id === slot.type).name;
      slot.message = name + ' REPAIRED';
      document.getElementById('bass-feedback').textContent = slot.message + (trackState.bass.events.length ? ' — TUNE THE REMAINING GLOWING PEGS' : ' — BASS SIGNAL RESTORED');
      playSwitchSound('off');
      playRepairSuccess();
      addLog('BASS repaired: ' + name + '.', 'repair');
      updateUI();
      updateDialog();
    }
  });
  const active = EVENT_TYPES.filter(event => trackState.bass.events.some(item => item.type === event.id));
  if (active.length) game.hadDecay = true;
  game.slots.forEach(slot => {
    if ((slot.status === 'active' && !active.some(event => event.id === slot.type)) ||
        (slot.status === 'repaired' && now >= slot.until)) {
      slot.status = 'idle'; slot.type = null;
    }
  });
  const assigned = new Set(game.slots.filter(slot => slot.status !== 'idle').map(slot => slot.type));
  for (const effect of active) {
    if (assigned.has(effect.id)) continue;
    const slot = game.slots.find(item => item.status === 'idle');
    if (!slot) break;
    Object.assign(slot, {type:effect.id, status:'active', frame:3, message:''});
    assigned.add(effect.id);
  }
  renderBassRepair(game, active.length);
  // Let the final rotation and success label finish before automatically closing.
  if (game.hadDecay && !active.length && game.slots.every(slot => slot.status === 'idle')) {
    closeRepairedDialog('bass');
  }
}
function renderBassRepair(game, activeCount) {
  const signature = JSON.stringify([activeCount,game.repairedCount,game.slots]);
  if (signature === game.signature) return;
  game.signature = signature;
  const pegs = els.bassTuners.querySelectorAll('.bass-peg');
  game.slots.forEach((slot,index) => {
    const peg = pegs[index];
    if (!peg) return;
    const button = peg.querySelector('button');
    const definition = EVENT_TYPES.find(event => event.id === slot.type);
    const name = definition ? definition.name : 'Bass tuning peg';
    peg.dataset.status = slot.status;
    button.disabled = slot.status === 'turning' || slot.status === 'repaired';
    button.setAttribute('aria-label', slot.status === 'active' ? 'Tune bass peg to repair '+name
      : slot.status === 'idle' ? 'Bass tuning peg — no active decay' : name);
    button.querySelectorAll('[data-bass-frame]').forEach((frame,i)=>{frame.toggleAttribute('hidden', i !== slot.frame);});
    peg.querySelector('.bass-effect-name').textContent = slot.status === 'idle' ? '' : name;
    peg.querySelector('.bass-hit-label').textContent = slot.status === 'repaired' ? slot.message : '';
  });
  document.getElementById('bass-active-count').textContent = activeCount+' ACTIVE';
  document.getElementById('bass-progress').textContent = game.repairedCount+' REPAIRED';
  if (!activeCount && !game.hadDecay) document.getElementById('bass-feedback').textContent = 'BASS SIGNAL INTACT — WAITING FOR DECAY';
  if (activeCount && !game.slots.some(slot => slot.status === 'repaired')) {
    document.getElementById('bass-feedback').textContent = game.slots.some(slot => slot.status === 'turning')
      ? 'TUNING — RESTORING THE BASS EFFECT' : 'CLICK A RED GLOWING PEG TO TUNE';
  }
}
function handleBassTuner(event) {
  if (!currentBassRepair()) return;
  const button = event.target.closest('[data-bass-peg]');
  if (!button || !els.bassTuners.contains(button)) return;
  const slot = bassRepair.slots[Number(button.dataset.bassPeg)];
  if (!slot || slot.status === 'turning' || slot.status === 'repaired') return;
  if (slot.status === 'idle') { showBassNoTarget(Number(button.dataset.bassPeg)); return; }
  if (!trackState.bass.events.some(item => item.type === slot.type)) { updateBassRepair(); return; }
  slot.status = 'turning';
  slot.startedAt = performance.now();
  slot.frame = 3;
  void playUISound('button');
  updateBassRepair(slot.startedAt);
}

function showBassNoTarget(index) {
  const peg = els.bassTuners.querySelectorAll('.bass-peg')[index];
  if (!peg) return;
  const label = document.createElement('span');
  label.className = 'guitar-hit-label bass-empty-notice repair-empty-notice';
  label.textContent = 'NO DECAY EVENT TO FIX';
  peg.appendChild(label);
  label.addEventListener('animationend', () => label.remove(), {once:true});
  document.getElementById('bass-feedback').textContent = 'NO DECAY EVENT TO FIX';
  void playUISound('error');
}
