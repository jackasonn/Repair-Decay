# repair/decay

An interactive music album responding to the theme of *Upkeep*. Individual Web Audio stems gradually develop decay, and visitors repair them using instrument-specific games or global switches.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html`, `about.html` | GitHub Pages website and credits |
| `css/style.css` | Foundation styling, core layout and original UI |
| `css/components.css` | Audio-interface cards, controls and modal refinements |
| `css/about.css` | About page and collaborator sections |
| `css/repair-details.css` | Instrument-specific and later UI rules |
| `css/typography.css` | VT323 pixel-style titles, Share Tech Mono fallback and PNG title styling |
| `css/layout.css` | Stable song/player/card dimensions, backdrop flashes and borderless header/footer |
| `js/app.js` | Shared player, synchronized audio graph, decay scheduler and dialog controls |
| `js/audio/stem-loader.js` | Two-worker stem fetch/decode, cancellation and progress |
| `js/audio/pitch-shifter.js` | Pitch-shift AudioWorklet |
| `js/repair/` | Separate Drum, Guitar, Keys, Vocal and Bass minigame scripts |
| `js/lyrics/` | Timed keyword challenges for On Time and There Is Love |
| `assets/audio/stems/` | Independent stems for all four songs |
| `assets/audio/ui/`, `assets/audio/guitar-strings/` | Interaction sounds |
| `assets/images/optimized/` | Browser-sized WebP display images |
| `assets/images/covers/`, `backgrounds/`, `instruments/`, `lettering/`, `ui/` | Original artwork, preserved |
| `tests/`, `tools/` | Logic and browser regression tests; static path and element-ID checks |
| `docs/` | Instrument design notes and technical audit |

## Run locally

Start an HTTP server from the project root, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Avoid opening the HTML via `file://` because browser security restrictions can prevent stems and AudioWorklets from loading.

With Node.js 20 or newer, run `npm test` to check script syntax, file paths, HTML IDs, stem-loader logic and six instrument/dialog regression suites. The standard checks need no third-party packages. GitHub Actions also runs a **real Chromium browser layout test** across 390, 768, 900, 1100 and 1440-pixel viewports (installing Playwright on the CI runner).

## Maintenance conventions

- Keep the script order in `index.html`: lyrics and audio loader, shared app, then five repair scripts. The scripts use shared browser globals and are deliberately not ES modules yet.
- Asset URLs in JS resolve relative to the **HTML document** rather than the JS file. CSS image URLs resolve relative to the stylesheet in `css/`.
- The CSS files must remain in their published order to preserve the existing cascade while making later consolidation safer.
- Custom PNGs remain the primary song/instrument lettering; other headings use VT323 and body/UI text uses Share Tech Mono. **There Is Love** is text because its old artwork incorrectly read *This Is Love*.
- The browser uses generated WebP artwork from `assets/images/optimized/`. Original PNGs/JPEGs are never overwritten. Run `python3 tools/optimise_images.py` (requires Pillow) to regenerate locally or use the GitHub Actions workflow.
- Song changes cancel stale stem downloads. Two parallel workers fetch/decode the selected song's stems without altering the common audio playback clock.
- Layout uses consistent cover/player dimensions and fixed track-card column counts within each responsive breakpoint. CSS no longer depends on measuring the player panel in JavaScript.
- The generated browser test does **not** verify real speaker latency, audio processing performance or actual live stem synchronisation.

## Release checklist

Run `npm test` and confirm both **Validate repair/decay** and **Browser layout smoke test** pass in GitHub Actions. Then manually check play/pause timing, song transitions, all repair games, success/error feedback, About page and the actual exhibition laptop/speakers in Chrome and Safari.

For detailed findings and follow-ups, see `docs/technical-audit.md`.
