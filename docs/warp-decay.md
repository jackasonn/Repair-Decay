# WARP — moving pitch without changing playback speed

WARP modulates the existing fixed-latency AudioWorklet pitch shifter on pitched stems, never drums. Unlike DETUNE (a static pitch offset), WARP continuously moves pitch with two oscillator signals:

- **Wobble:** 1.65 Hz sine, initially ±90–120 cents (about a semitone), growing to ±180 cents after repeated events.
- **Flutter:** a secondary 5.2 Hz sine at 22% of the main wobble depth, giving tape-like instability.
- Both signals control the AudioWorklet's `pitchCents` parameter. The audio buffer's playback rate and shared stem clock are untouched.
- Repairs zero both modulation gains; stopping a source also stops and disconnects both oscillators.
- If a browser can't load the pitch shifter, WARP and DETUNE are excluded from randomly scheduled decay events rather than silently doing nothing.

Source: `js/app.js` and `js/audio/pitch-shifter.js`. Unit test: `tests/warp.cjs`. Listening on the real exhibition speakers is still recommended.
