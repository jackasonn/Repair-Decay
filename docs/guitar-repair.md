# Guitar string repair — current event-linked version

The current Guitar game creates one glowing clickable target per active decay effect type on its six-string interface. Targets appear in a staggered sequence and do **not** require completion of a fixed eight-target, 18-second round. A valid target click immediately clears that effect type, triggers guitar-string vibration/pluck, and plays repair confirmation. Duplicate or hidden-target clicks cannot clear an event twice. The panel remains open for the visual repair result.

Source: `js/app.js` (`startGuitarRepair`, `syncGuitarTargets`, `handleGuitarTarget`). Test: `tests/guitar-repair.cjs`.
