# Decay effect and repair audit — October 2026

Four songs: On Time (5 stems), Reconcile (4, no vocals), Rainy Night (5), There Is Love (5). The eight decay types are DETUNE, HIGH PASS, LOW PASS, BIT DEGRADATION, PHASE DRIFT, WARP, DELAY and CRACKLE. WARP is intentionally unavailable for drums; DETUNE and WARP require the pitch-shifting AudioWorklet.

## Corrections

1. **Single copy per effect per stem.** Random decay can no longer stack the same effect on one instrument. In particular, a one-word Vocal repair now always removes a type of audible effect instead of merely decrementing a duplicate event counter. A defensive attenuation path handles any legacy duplicate objects.
2. **Persistent Crackle.** Previously, crackle appeared as an active event but only played a few one-off noise bursts; delayed bursts could fire after the repair. Crackle now loops a sparse vinyl-like noise pattern as long as its stem has an active Crackle event. Its gain fades to zero in approximately 80 ms after repair, and its source is stopped and disconnected. Switching songs or pausing also stops the loop.
3. **Fast audible resets.** DETUNE, HIGH PASS, LOW PASS, PHASE and WARP now restore using a roughly 25-ms AudioParam smoothing time constant, rather than 120 ms (about 5× faster). DELAY's three echo gains fade at an 18-ms time constant on repair, instead of 60 ms. The AudioWorklet's own delay is roughly 70 ms; this is inherent in the effects graph and shared among stems.
4. **No resynchronization interruption.** The unused legacy whole-track repair path previously restarted every stem; it now resets effect parameters on the live graph without interrupting or repositioning playback.

## Matrix / expectations

| Effect | Active behaviour | Repair result |
|---|---|---|
| DETUNE | Static pitch offset through AudioWorklet | Pitch offset returns to zero; independent WARP remains active |
| HIGH PASS | Cuts low frequencies | Cutoff returns to 20 Hz |
| LOW PASS | Cuts high frequencies | Cutoff returns to 20 kHz |
| BIT DEGRADATION | Reduced WaveShaper depth | 16-bit curve restored |
| PHASE DRIFT | Sine-modulated stereo pan | Pan modulation gain returns to zero |
| WARP | 1.65 Hz pitch wobble and 5.2 Hz flutter | Both modulation gains return to zero; DETUNE remains active |
| DELAY | Three taps at 0.32, 0.64 and 0.96 seconds | All three echo gains fade rapidly to zero, dry signal continues |
| CRACKLE | Persistent sparse noise pops | Crackle loop stops and disconnects |

Guitar, Drum, Keys and Bass games repair effects by type; Vocal typing clears one active event per correct word; global switches repair the selected effect on all stems. Each real repair must clear its event and restore the corresponding sound parameter.

Automated tests: `tests/decay-repair-matrix.cjs`, `tests/repair-dialogs.cjs`, `tests/warp.cjs`, plus Chromium layout, pitch-shift and audio checks. Real listening on the installation computer remains important for subjective audible balance and device-specific performance.
