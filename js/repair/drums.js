// Event-driven Drum repair: every moving line represents a real active decay effect.
const DRUM_HIT_WINDOW_MS = 260;
const DRUM_TRAVEL_MS = 1850;
const DRUM_EVENT_SPACING_MS = 1450;
const DRUM_RETRY_DELAY_MS = 650;
const DRUM_HIT_VISUAL_MS = 720;
const DRUM_COLOURS = ['#e69bd5', '#67dce6', '#9fda72', '#ed8c7e'];
let rhythm = null;
let drumSpaceHeld = false;

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
  label.className = 'keys-hit-label drum-hit-label ' + labelClass +
    (variant === 'empty' ? ' repair-empty-notice' : '');
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
  // Only a real line bursting triggers the explosion; empty canvas presses do not.
  void playUISound('explode');
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
    rhythm.emptyNoticeUntil = performance.now() + 1100;
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
  playRepairSuccess();
  addLog('DRUMS repaired: ' + note.name + '.', 'repair');
  setRepairFeedback(note.name + ' REPAIRED — DRUM SIGNAL RESTORED', 'success');
  updateRhythmPanel();
  updateUI();
  updateDialog();
  closeRepairedDialog('drums');
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
  if (!activeCount && game.repairedCount === 0 && now >= (game.emptyNoticeUntil || 0) && !game.targets.some(note => note.status === 'active')) {
    setRepairFeedback('DRUM SIGNAL INTACT — WAITING FOR DECAY EVENTS');
  }
  drawRepairSignal(elapsed);
}
function handleRepairKey(event) {
  if (event.code !== 'Space' || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!drumSpaceHeld && !currentRhythmRepair()) return;
  if (/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName) || event.target?.isContentEditable) return;
  // A dialog initially focuses Close. Space belongs to the game even there.
  // Cancel held repeats too, including when the final hit has closed the panel.
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat || drumSpaceHeld) return;
  drumSpaceHeld = true;
  judgeDrumPress(null, null);
}
function handleRepairKeyUp(event) {
  if (event.code !== 'Space' || !drumSpaceHeld) return;
  // Keep ownership through release: focus may have moved after a successful hit.
  event.preventDefault();
  event.stopPropagation();
  drumSpaceHeld = false;
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
    ctx.fillStyle = note.colour; ctx.font = width < 440 ? '8px "Share Tech Mono", monospace' : '10px "Share Tech Mono", monospace';
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
