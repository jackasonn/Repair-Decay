# repair/decay

An interactive music album and Upkeep installation. As individual Web Audio stems decay, visitors repair the sound through instrument-specific minigames or global switches.

## Project structure

| Directory | Purpose |
| --- | --- |
| `index.html`, `about.html` | GitHub Pages website and credits |
| `css/style.css` | Share Tech Mono typography, layout, visuals and responsive design |
| `js/app.js` | Player, decay scheduling, Web Audio and minigame code |
| `js/audio/pitch-shifter.js` | Pitch-shifting AudioWorklet |
| `js/lyrics/` | On Time / There Is Love keyword timing tables |
| `assets/audio/stems/` | Audio stems for all four songs |
| `assets/audio/ui/` | Button, switch, error and repair-success sounds |
| `assets/audio/guitar-strings/` | Six guitar pluck sounds |
| `assets/images/covers/` | Song and SoundCloud cover artwork |
| `assets/images/backgrounds/` | Per-song monochrome/colour backgrounds |
| `assets/images/lettering/` | Supplied custom PNG typography |
| `assets/images/instruments/` | Instrument artwork, Bass headstock and tuner frames |
| `assets/images/ui/` | Navigation image |
| `docs/` | Current minigame documentation and audit notes |
| `tests/` | Regression tests |
| `tools/` | Static asset-reference verifier |

## Running locally

Start a local HTTP server from the repository root, for example `python3 -m http.server 8000`, then open `http://localhost:8000`. Opening `index.html` directly as a `file://` page may break `fetch` and AudioWorklet operations.

Run `npm test` using Node.js 20 or later. This checks JavaScript syntax, static asset references and six repair behavior suites; it requires no third-party packages. The same checks are configured in GitHub Actions.

## Maintenance conventions

- Asset URLs in HTML and `js/app.js` resolve relative to the **HTML document**, not the JavaScript file location.
- CSS fallback images use `../assets/` because the stylesheet lives in `css/`.
- Song-specific CSS background URLs are created with `new URL(path, document.baseURI)` to work in a GitHub Pages project subfolder.
- Custom PNGs are used for supplied song/instrument titles; Share Tech Mono handles the rest. **There Is Love** stays text because the removed old PNG spelled **This Is Love**.
- Drum, Guitar and Keys now use decay-event-linked targets, not the superseded fixed-round minigames.
- Audio files and original artwork were moved without re-encoding. Full audio stems are still decoded when each song loads.
- The extensive stylesheet includes historical overrides. Aggressive rule removal requires real browser screenshots across viewports.

## Manual release checklist

Verify the four songs, synchronized pause/play, navigation, each repair minigame, global switches, error/success sounds, About page, mobile viewport and actual exhibition audio setup. Automated tests do **not** substitute for browser playback or listening tests.
