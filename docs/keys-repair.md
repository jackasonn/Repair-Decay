# Keys arrow repair — current event-linked version

Each current Keys decay effect is represented by an incoming arrow on one of four lanes. Press the corresponding arrow key, or click the moving arrow, when it reaches its receptor to repair that individual effect. Mistimed inputs and misses do not clear events; missed arrows return after a delay. The old six-of-eight/18-second round is no longer the active design. Correct hits display particle and receptor feedback.

Source: `js/app.js` (`startKeysRepair`, `syncKeysTargets`, `completeKeysTarget`). Test: `tests/keys-repair.cjs`.
