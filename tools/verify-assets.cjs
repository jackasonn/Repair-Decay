// Validate local HTML, CSS and JS asset references. No dependencies.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
let verified = 0;
function check(reference, from, base = root) {
  if (!reference || /^(?:https?:|mailto:|data:|#)/i.test(reference)) return;
  const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
  const resolved = path.resolve(base, clean);
  assert.ok(resolved.startsWith(root + path.sep), 'Path escapes repository in ' + from + ': ' + reference);
  assert.ok(fs.existsSync(resolved), 'Missing path in ' + from + ': ' + reference);
  verified++;
}
for (const name of ['index.html', 'about.html']) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  for (const m of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) check(m[1], name);
}
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) check(m[1], 'css/style.css', path.join(root, 'css'));
for (const scriptName of ['js/app.js','js/repair/drums.js','js/repair/guitar.js','js/repair/keys.js','js/repair/vocals.js','js/repair/bass.js']) {
  const source = fs.readFileSync(path.join(root, scriptName), 'utf8');
  for (const match of source.matchAll(/assets\/[\w./% -]+?\.(?:png|jpg|jpeg|webp|mp3)/g)) check(match[0], scriptName);
}
// Also check paths assembled by JavaScript rather than stored as complete literals.
for (const name of ['drums', 'bass', 'guitars', 'keys', 'vocal', 'bass-headstock']) check('assets/images/optimized/instruments/' + name + '.webp', 'instrument lookup');
for (const angle of [0, 30, 70, 90]) check('assets/images/instruments/bass-tuner-' + angle + '.png', 'bass animation');
for (const name of ['js/app.js', 'js/audio/pitch-shifter.js', 'js/lyrics/on-time.js', 'js/lyrics/there-is-love.js']) check(name, 'runtime script');
console.log('PASS: ' + verified + ' local image, audio, CSS and script references resolve');
