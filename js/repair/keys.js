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
  label.className = 'keys-hit-label keys-error-label' +
    (variant === 'early' ? ' keys-early-label' : ' repair-empty-notice');
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
  // A mistimed arrow bursts red, so accompany that actual explosion too.
  void playUISound('explode');
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
  void playUISound('explode');
  showKeysHitLabel(note, y);
  playSwitchSound('off');
  playRepairSuccess();
  addLog('KEYS repaired: ' + note.name + '.', 'repair');
  document.getElementById('keys-feedback').textContent =
    note.name + ' REPAIRED — KEYS SIGNAL RESTORED';
  updateUI();
  updateDialog();
  updateKeysRepair(now);
  closeRepairedDialog('keys');
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
  // A successful final arrow closes the dialog in completeKeysTarget().
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
    ctx.font=width<480?'8px "Share Tech Mono", monospace':'9px "Share Tech Mono", monospace';
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
