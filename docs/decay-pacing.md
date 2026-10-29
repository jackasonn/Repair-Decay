# Automatic decay pacing

Decay events now occur at a randomized interval of **20–35 seconds** of active playback, rather than every **4–7 seconds**. This is approximately five times less frequent, leaving more time for listeners to notice and repair each change.

The timer is independent of visual rendering, is cancelled on pause, and restarts on playback. Each event still selects one eligible stem and decay effect using the existing logic. Decay strength, repair interactions and song synchronization remain unchanged.

Source: `js/app.js`, `scheduleNextEvent`. Regression test: `tests/decay-pacing.cjs`.
