// Protect the JavaScript/HTML contract: no duplicate IDs, no missing referenced IDs.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
const about = fs.readFileSync('about.html', 'utf8');
const js = ['js/app.js','js/repair/drums.js','js/repair/guitar.js','js/repair/keys.js','js/repair/vocals.js','js/repair/bass.js'].map(path => fs.readFileSync(path, 'utf8')).join('\n');
const ids = text => Array.from(text.matchAll(/\bid=["']([^"']+)["']/g), match => match[1]);
for (const [page, source] of [['index.html',html],['about.html',about]]) {
  const all = ids(source);
  assert.equal(new Set(all).size, all.length, 'Duplicate HTML id in ' + page);
}
const present = new Set(ids(html));
const referenced = Array.from(js.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g), m=>m[1]);
for (const id of referenced) {
  assert.ok(present.has(id), 'JS references missing HTML element: #' + id);
}
for (const m of html.matchAll(/aria-controls=["']([^"']+)["']/g)) {
  assert.ok(present.has(m[1]), 'Missing aria-controls target: #' + m[1]);
}
console.log('PASS: ' + referenced.length + ' JS ID references, unique IDs and aria-controls targets');
