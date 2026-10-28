# Repair input and feedback

Successful repairs play `assets/audio/ui/success.mp3`, alongside the existing switch-off sound. Failed and empty actions play the error sound without clearing decay. Bass's idle peg and Drum's empty input show a short floating notice.

Drum Space is handled in the capture phase even if a native dialog button has focus. The handler cancels button activation during the game, filters repeated holds and preserves normal text input behavior. Global switches are accessible independently of the decay percentage. The instrument games generally remain open for successful visual feedback; the global repair dialog can close once all events are cleared.

Source: `js/app.js`. Tests: `tests/repair-input.cjs`, `tests/repair-dialogs.cjs`.
