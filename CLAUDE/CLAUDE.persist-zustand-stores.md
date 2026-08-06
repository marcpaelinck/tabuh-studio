# Persist Zustand stores
The application should have a mechanism that enables a user to retrieve work in progress if they inadvertently close the application's browser window or after a fatal application error.

# Context
Currently the application stores the `score` state variable in an indexed database using the browser's IDB API (useScoreManager, lines 78-103 and 124-139). There is no functionality yet to recover the stored value.
I recently started using the Zustand package. The package has its own persist functionality. I am considering using this functionality to replace the current functionality. We will also need to develop functionality to recover a persisted score object. In the future I might want to persist more state variables.

# Request for advice
Information about the Zustand `persist` functionality can be found at https://zustand.docs.pmnd.rs/reference/middlewares/persist. Please advise me if using this functionality would be a better option than the current one.

# Requirements for the persistance functionality
- The `currentScore` state (useScoreStore.tsx) should be persisted whenever a new score is loaded and after each modification by the user.
- The persist function should be debounced if necessary to maintain the app's responsiveness.
- If the user restarts the application after the browser window was closed with unsaved changes, the user should get a notification and have the possibility to resume editing the unsaved (but persisted) version of the `score`. A score should be considered saved if the most recent version was either saved to the database or exported to a file.

# As built

Uses zustand `persist` backed by IndexedDB (not localStorage — scores are large and localStorage
is synchronous/~5 MB). Requires `idb-keyval` (added to `frontend/package.json` → run `npm install`).

Files:
- `stores/idbStorage.ts` — a zustand `StateStorage` over `idb-keyval` (DB `tabuh-studio`, store
  `recovery`).
- `stores/useRecoveryStore.ts` — a **separate** persisted store holding one `snapshot`
  `{ score, title, scoreUuid, savedAt, dirty }`. Kept separate from the live `useScoreStore` on
  purpose: persisting the live store would auto-rehydrate stale data into the editor on every
  normal reload. Exposes `buildSnapshotScore` (deep-clones and strips the derived object-notation
  caches / edit buffers — i.e. the same canonical shape a DB save stores) and
  `captureRecoverySnapshot`. `hydrated` gates the boot check until the async IDB read resolves.
- `stores/useScoreStore.tsx` — added a `dirty` flag: `setCurrentScore` (load/new) clears it,
  `updateCurrentScore` (every edit path) sets it, `markSaved()` clears it.
- `componentlogic/useScoreManager.tsx` — the old hand-rolled IndexedDB open/`deleteDatabase`
  code is **removed** (it wiped the recovery DB on every startup, so it never actually
  recovered). The debounced (800 ms) effect now calls `captureRecoverySnapshot(score, dirty)`.
- `componentlogic/useScoreReader.ts` — on a successful save to `database` or `jsonfile`, calls
  `markSaved()` + `useRecoveryStore.clear()` (MIDI/PDF exports do **not** count as saved, per
  decision). Adds `recoverScore(score)` which re-derives object notation (`postprocessScore`),
  loads it via `setScoreStates`, and marks it dirty (recovered work is unsaved).
- `components/ScoreRecoveryPrompt.tsx` — mounted in `MainWindow`; once IDB has hydrated, if the
  snapshot is `dirty` it shows a modal offering **Resume** (`recoverScore`) or **Discard**
  (`clear`).

Decisions honoured: only a database save or a Tabuh Studio `.json` export marks the score saved;
`idb-keyval` used for storage. Debounce trade-off unchanged from before: a crash within the
800 ms window loses at most the last ≈0.8 s of edits.

Manual step: `cd frontend && npm install` (idb-keyval), then rebuild. Adding more persisted
variables later = widen the `snapshot` shape in `useRecoveryStore`.