# Technical audit — 28 October 2026

## Completed repository cleanup

- Organized sixty existing media files into named audio and image directories without re-encoding original assets; deleted two confirmed unused placeholders.
- Removed the old Monument Extended font files and standardized typography: PNG title lettering, VT323 for missing text headings, Share Tech Mono for body/interface text.
- Generated sixteen optimized WebP display assets. Original raster art totals approximately 82.5 MB versus approximately 6.9 MB for the equivalent sixteen WebPs (92% reduction in display asset file sizes).
- Reorganized the original stylesheet into ordered foundation, components, About, repair-details, typography and layout CSS files. Removed three overridden keyframe sets and superseded background-gradient rules without changing the final cascade.
- Split the five instrument minigames out of the shared application script into `js/repair/drums.js`, `guitar.js`, `keys.js`, `vocals.js` and `bass.js`. The application retains shared audio/decay/UI code; the separated scripts still share the page's classic-script environment.
- Removed obsolete cover-size JavaScript measurement/ResizeObserver logic. Desktop cover and player height are controlled with CSS and stay matched; instrument card widths no longer stretch on the four-stem Reconcile song.
- Reserved a fixed mobile player height to eliminate a real **12-pixel song-switch layout shift** discovered at 390px.
- Removed decorative borders from the website header/footer, including the About header. Increased amber/red backdrop pulse visibility while keeping flashing colour **behind** controls and supporting reduced-motion preferences.
- Implemented bounded-concurrency stem loading with progress feedback, cancellation on song changes and retries after partial failures; kept the common audio clock and playback-source scheduling.
- Updated obsolete Drum/Keys/Guitar documentation and instructions to describe active-event repair rather than their retired round-based prototypes.

## Automated checks

- `npm test`: JavaScript syntax, local audio/image/CSS/script paths, unique HTML IDs, DOM lookup references, six existing repair regression suites and a separate stem-loader test.
- GitHub Actions: the same no-dependency Node tests on pushes, and a separate Playwright/Chromium run with actual browser layout and dialog checks.
- Browser checks: four songs across 1440×900, 1100×800, 900×800, 768×1024 and 390×844. They assert stable cover/player/title/card dimensions when changing songs, fixed responsive grid columns, no horizontal overflow, all five instrument dialogs fitting on screen, stronger warning-flash styles and borderless header/footer/About presentation.
- All these checks passed after the CSS refactor. See the **Validate repair/decay** and **Browser layout smoke test** workflows.

## Remaining risks and suggestions

1. **Real audio synchronization:** Headless layout tests disable the AudioContext, and the Node tests mock the Web Audio engine. Listen on the actual installation machine, especially after pause/resume, each decay repair, and automatic song advances.
2. **Safari and mobile testing:** Check iOS/macOS playback gestures, fullscreen dialogs, text scaling, and performance on the browsers visitors will actually use.
3. **Accessibility:** Have a keyboard-only visitor try every minigame and modal. Review focus management, contrast and users who prefer reduced motion.
4. **RAM and load-time profiling:** Audio stems remain fully decoded and stored as buffers per selected song. Measure memory and CPU on the intended laptop before attempting audio compression or further parallelism.
5. **CSS cleanup:** Preserve the now-tested stylesheet order; further selector consolidation should use before/after screenshots because several historical rules share specificity.
6. **Song-title artwork:** Create a corrected custom PNG that actually reads **There Is Love** if consistency across all four song headings is important.

The application has been statically checked and exercised in real Chromium for layout, but there has **not** been a complete end-to-end listening or visual art-direction review on the exhibition hardware.
