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
        '%;--dot-y:' + guitarStringCentrePercent(target.string) + '%;--target-colour:' + colour + '">' +
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
  // A successful final target closes the dialog in handleGuitarTarget().
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
// Read the actual rendered line geometry (including pixel thickness) rather than
// approximating string centres with fixed percentages.
function guitarStringCentrePercent(index) {
  const string = els.guitarStrings?.querySelectorAll('span')[index];
  const stringLayer = els.guitarStrings;
  if (string && stringLayer && typeof getComputedStyle === 'function') {
    const layerRect = stringLayer.getBoundingClientRect();
    const lineStyle = getComputedStyle(string);
    const top = parseFloat(lineStyle.top);
    const height = parseFloat(lineStyle.height);
    if (layerRect.height > 0 && Number.isFinite(top) && Number.isFinite(height)) {
      return (top + height / 2) / layerRect.height * 100;
    }
  }
  return [12.8, 27.7, 42.5, 57.5, 72.3, 87.3][index] ?? 50;
}
function guitarStringIndexAtPoint(clientX, clientY) {
  if (!els.guitarBoard) return -1;
  const boardRect = els.guitarBoard.getBoundingClientRect();
  if (clientX < boardRect.left || clientX > boardRect.right ||
      clientY < boardRect.top || clientY > boardRect.bottom) return -1;
  const hitHeight = 30;
  let bestIndex = -1;
  let bestDistance = Infinity;
  const strings = els.guitarStrings?.querySelectorAll('span') || [];
  strings.forEach((string, index) => {
    const lineRect = string.getBoundingClientRect();
    const centreY = lineRect.top + lineRect.height / 2;
    const distance = Math.abs(clientY - centreY);
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
  notice.className = 'guitar-hit-label guitar-empty-notice repair-empty-notice';
  notice.textContent = 'NO DECAY EVENT TO FIX';
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
  // This target has just entered its exploding visual state.
  void playUISound('explode');
  vibrateGuitarString(target.string, true);
  playSwitchSound('off');
  playRepairSuccess();
  addLog('GUITARS repaired: ' + target.name + '.', 'repair');
  document.getElementById('guitar-feedback').textContent =
    target.name + ' REPAIRED — GUITAR SIGNAL RESTORED';
  updateUI();
  updateDialog();
  renderGuitarTargets();
  updateGuitarRepair(now);
  closeRepairedDialog('guitars');
}
