# Automatic decay pacing

Decay events occur at a random interval of **10–20 seconds**, averaging **15 seconds** between events during active playback (uniform distribution). This replaces the previous 20–35-second interval.

The timer operates independently of visual rendering, cancels when music is paused, and starts a new interval when music resumes. Each event still affects one eligible stem and effect. Decay severity, minigames, repair interactions, and audio synchronization are unchanged.

Source: `js/app.js` (`scheduleNextEvent`). Regression test: `tests/decay-pacing.cjs`.
