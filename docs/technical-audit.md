# Repository audit — 28 October 2026

## Work completed

- Reorganised sixty original asset files into descriptive audio/image directories **without changing the underlying file contents**.
- Removed the unused `This is love fonts.png` (its text was wrong for `There Is Love`) and a placeholder text file.
- Moved app, CSS, worklet and lyric tables into logical source folders; updated HTML and tests.
- Corrected the song background URL handling for CSS moved into `css/` and the GitHub Pages project subpath.
- Eliminated redundant track visualiser + playback clock updates that were executing every animation frame; the clock text refreshes at 250 ms and visual bars at 100 ms while game timing stays high-resolution.
- Removed an unused wordmark-image CSS declaration, but retained CSS override layers that may still affect layout.
- Replaced outdated game documentation for Drum, Keys and Guitar; removed a test targeting retired Drum functions.
- Introduced a no-dependency path validator and Node regression test script, configured for GitHub Actions.

## Outstanding opportunities and risks

1. **Browser/audio validation:** Verify instrument timing, Web Audio worklet and repair/game states in Chrome/Safari and on the exhibition machine.
2. **Audio load performance:** Files are fetched and decoded sequentially per song, and full-length decoded stems can consume substantial RAM. Measure memory first; then consider limited-concurrency loading or audio-asset optimisation without compromising stem synchronisation.
3. **Image optimisation:** Original cover art and backgrounds are large raster files. Create smaller responsive WebP/AVIF derivatives *after* visually comparing them to originals.
4. **CSS technical debt:** Many selector overrides are repeated. A cautious viewport-by-viewport visual regression pass is needed before deeper consolidation.
5. **Test gaps:** Node's VM tests mock Web Audio/DOM; they do not prove live browser rendering, autoplay gesture behavior, low-memory playback or audio latency. Add browser E2E/smoke tests when browser automation is available.
6. **Accessibility:** Test keyboard focus in modals and mini-games, motion preferences and contrast in all decay states.
7. **User-facing load feedback:** Consider a per-song loading progress indicator and retry for failed stem requests.
8. **Content:** Consider replacing the text `There Is Love` title with updated artwork that actually spells the final title, matching the other three song-title PNGs.

## Testing

Use `npm test` after installing Node 20+ (no npm dependencies required). The GitHub Actions workflow checks the same steps. Browser and hardware listening checks remain manual.

## Follow-up improvements (28 October 2026)

- Restored VT323 only for text-based display titles using a separate `css/typography.css`; Share Tech Mono remains the body/UI font. Custom PNG lettering is unchanged.
- Extracted a bounded two-worker stem loading helper to `js/audio/stem-loader.js`, with loading progress, user retries, song-switch cancellation and dedicated Node regression tests.
- Generated sixteen browser-sized WebP variants and switched runtime image paths to use them. Original art files remain in place. Image-generation source: `tools/optimise_images.py`.
- Removed confirmed abandoned CSS selectors for old rhythm stability/retry and Keys retry widgets, and corrected obsolete on-screen Drum instructions.
- Added a static HTML/JS element-ID validator, run with the other checks in GitHub Actions.

Remaining high-value tasks are a browser-based smoke test, hardware audio latency checks, cautious CSS consolidation with screenshots, and possibly further division of the large player JavaScript into independent game modules. These require more extensive verification than simple static checks.
