# Improved User Help and User Onboarding
The app has become fairly complex and might be daunting for new users. It requires information to guide the user. This can be done in two complementary ways:
- By adding missing tooltips to buttons, pull downs, information fields and menu items.
- By adding a 'guided tour' (user onboarding) as an accessible way for a new user to get acquainted with the app's structure.

## User Onboarding: CLAUDE's advice
I asked CLAUDE to advise me which package to use. This is CLAUDE's conclusion. 

The MIT-licensed, no-strings options are @reactour/tour, react-joyride, and driver.js. How they differ:

@reactour/tour — React-idiomatic: steps as a data array, JSX allowed in tooltip content, a useTour() hook. Nice if you want tour steps wired to your app's state/components.
driver.js — tiny (~5 kB, zero deps), framework-agnostic, imperative API. Dead simple highlight-and-step tours. Works fine in React, just not "component-y."
react-joyride — the most-installed React-specific one, mature and flexible, but historically lagged on peer-deps for new React majors, so confirm it declares React 19 support (or you'll be reaching for overrides).

For your app specifically — React 19 + Vite + TS, a focused editor where a guided "here's the menu, here's the toolbar, here's playback" walkthrough is all you likely need — I'd recommend driver.js for the least friction and smallest footprint, or @reactour/tour if you'd rather keep it fully in React with JSX step content and hooks. Both are MIT and clean on React 19. I'd avoid Intro.js purely on the licensing overhead, not the functionality.

## Refined 'guided tour' specifications following CLAUDE advice
The type of tour that I envision should be interactive and should instruct the user to perform different actions. The guided tour should be able to determine the state of the application and should give state-specific information and instructions. For instance if no score is loaded, the tour should invite the user to load a score, e.g. 'click here to open a score', 'select score <name>'. Here the tour should be able to block any other option, to ensure that the user clicks the correct one. Another example: a different (part of the) tour should be given if the player window is selected or if the editor window is selected.

Is this realistic and does this requirement change your advice about the package to use?

## Phasing
Phase 1 is about adding missing tooltips. This phase is straightforward.
The next phases gradually build a guided tour. I have no experience with building guided tours, and I only have a general idea of how I want it to interact with the user. So I propose to add functionality step by step so that I can evaluate the results of each phase and modify / specify the specs as we go.

## Phase 1: add missing tooltips
Tooltips are missing for the following items:
**General**
- `Player` buttons and slider
- All components of the `PlayerMenu`
- The `player/editor` SegmentedControl in `MainWindow`
- The login icon in the `NavHeader` in `MainWindow` (no need for tooltips for the login menu options)
- The `Nav.Item` components of the `MainMenu`
**Editor View**
- The selectors at the top of the editor window (Compact/Expanded, Expand, Typing)
- The hamburger menu at the top of each system

### Phase 1 — as built
- **Library choice (revised):** use **react-joyride v3** (`^3`) for the tour — it now officially
  supports React 19 (V3 rewrite, Mar 2026) and has the primitives the state-aware tour needs
  (controlled `stepIndex`/`run`, `spotlightClicks`, `callback`). @reactour/tour has an open
  React 19 issue, so it's out. Mobile is out of scope for the tour entirely.
- **Reusable tooltip components** (`components/Tooltipped.tsx`):
  - `Tip` — wraps any single ref-forwarding control in a Whisper + Tooltip.
  - `NavItemTip` — a `Nav.Item` with a hover tooltip. Keeps `Nav.Item` as the direct child of
    `Nav`/`Nav.Menu` (rsuite inspects children by type) and puts the Whisper on the item's inner
    content.
- **Tooltips added:** Player rewind/play/seek; PlaybackMenu focus/speed/cursor; the player↔editor
  `SegmentedControl`; the profile icon (native `title`, since it's already a Whisper trigger); all
  MainMenu leaf items (via `NavItemTip`); the editor Compact/Expanded control (Expand/Typing
  already had `title`s); the per-system hamburger (native `title`, since it's a Dropdown toggle).
- **`data-tour` anchors added** (for Phase 2), so tour targets are decoupled from CSS:
  `main-menu`, `dashboard`, `playback-menu` (`pb-focus`/`pb-speed`/`pb-cursor`), `player`
  (`player-rewind`/`player-play`/`player-seek`), `view-toggle`, `profile-menu`, `editor-view`,
  `system-menu`.
- **Not run in-sandbox:** full frontend typecheck (time limit) — confirm with a local build. One
  thing to eyeball there: `data-tour` on a couple of rsuite components (e.g. `SegmentedControl`,
  `Col`) relies on them passing `data-*` through; the partial typecheck was clean.

## Phase 2: Vanilla 'Guided Tour'

### requirements
- Create the boilerplate that is necessary to develop a 'guided tour'.
- Create a simple guided tour for the initial view of the application (no score loaded) which explains the main menu, the `Dashboard` on the top left, the playback menu and the player.

### Phase 2 — as built
- **Dependency:** `react-joyride@^3.0.2` added to `frontend/package.json` (**run `npm install`**).
- **Boilerplate** (`frontend/src/tour/`):
  - `tourSteps.ts` — `Step[]` definitions targeting the Phase-1 `data-tour` anchors
    (`main-menu` → `dashboard` → `playback-menu` → `player`), each with a title, content and
    placement. All four targets exist in the no-score desktop view.
  - `GuidedTour.tsx` — uses the v3 `useJoyride` hook in **uncontrolled** mode
    (`{ continuous: true, steps, options: { zIndex: 10000, skipBeacon: true } }`); renders a "?"
    launch button (`controls.start()`) + the returned `Tour` element. Uncontrolled mode lets
    Joyride own the step index and Next/Back/Skip; Phase 3 can add per-step `before` hooks for
    situational/action-driven steps (the v3-recommended approach — do **not** drive `stepIndex`
    from a `useEffect`).
- **Trigger/placement:** the "?" button sits in the desktop toolbar next to the player/editor
  toggle; `GuidedTour` is rendered only inside the desktop (`full`) layout, so the tour never
  runs on mobile. No auto-start on first visit yet (easy to add later via a persisted "seen" flag).
- **v3 API notes** (differs from v2, verified against react-joyride.com): named exports
  (`{ useJoyride }`, `{ Joyride }`, `type Step`), appearance/behaviour via the `options` prop,
  `disableBeacon` → `skipBeacon`, callback → `onEvent(data, controls)` (not used here since
  uncontrolled).
- **Not run in-sandbox:** react-joyride isn't installed in the sandbox (and installing there
  risks the workspace symlink again), so no typecheck here — confirm with a local
  `npm install` + `npm run build`.

## Phase 3: Add user instructions
This phase is meant to try out one or more steps of the tour where the tour guide should have situational awareness (know the state of the app). The tour guide should invite the user to perform actions and should be able to disable options that the user should not select.

The question mark icon that was added in phase 2 should now open a menu with two options: 'Brief tour' (which should link to the tour from phase 2) and 'Hands on tour of the Player' (our new tour).

Here is a description of the tour. The tour starts with no score loaded. I realize that the app doesn't have a 'close' option to close any opened score. I will add this to the backlog.
- Open the 'Notation' menu item and highlight the 'Open' sub-item. Request the user to click it.
- Ask the user to select the 'GONG KEBYAR' orchestra if it is not selected, otherwise another orchestra. If another orchestra than 'GONG KEBYAR' is now selected, ask the user to select 'GONG KEBYAR'.
- Request the user to select the 'Cendrawasih' score from the score list. If possible, disable any other score selection.
- Request the user to select the 'PEMADE' focus value.
- Invite the user to switch the 'notation' toggle off and on again.
- Invite the user to start playback by clicking the playback start button.
- Ask the user to change the cursor in the animation window with the 'cursor' option selector.
- Ask the user to try out the different values of the 'animation' selector and dynamically give an explanation of the selected option.
- Ask the user to change the speed value and to then switch it back to 100%.
- Ask the user to move the slider cursor.

### Phase 3 — as built
- **"?" menu:** the icon is now a Whisper+Popover menu (`tour/GuidedTour.tsx`) with **Brief tour**
  (Phase 2) and **Hands-on tour of the Player**. A `tour/useTourStore.ts` holds the active tour +
  the signals below; each tour is a component (`BriefTour`, `HandsOnTour`) that starts itself when
  it becomes active and clears the store on `tour:end`.
- **Mechanism (react-joyride v3, uncontrolled + programmatic advance):** action steps
  (`handsOnSteps.tsx`) block everything but the spotlighted control (`overlayClickAction: false`,
  no Next button — `buttons: ['skip']`) and **auto-advance** via `controls.next()` when the app
  state shows the action was done. A watcher effect in `HandsOnTour` reads the relevant stores +
  the tour signals and evaluates each step's `advanceWhen(snapshot)`. Note: v3 has no
  `spotlightClicks`; gating is the overlay + `overlayClickAction:false` (target stays clickable via
  `blockTargetInteraction:false`, the default).
- **Situational awareness wiring:** the tour drives the UI by asking MainMenu to open the Notation
  submenu (`requestMenu`), and observes user actions through published signals: `scoreBrowserOpen`
  (MainMenu), `browserOrchestra` (ScoreBrowser), `playbackPlaying` (MainWindow); the rest come
  straight from `useScoreStore` / `useUserSelectionStore` (selected score, focus, notation toggle,
  cursor, speed). Stale signals are reset on tour start.
- **In-drawer targeting (resolved):** for controls inside the rsuite Open drawer the `data-tour`
  anchor is placed on the **specific** control that must be clicked — the GONG KEBYAR button and the
  Cendrawasih row (via `OptionList`'s `dataTour` prop) — so the overlay still gates everything else,
  the target stays clickable, and gating is preserved (no `hideOverlay` workaround). Those steps
  set a per-step `zIndex: 100000` (the global `options.zIndex` default was removed) so the tooltip
  renders above the drawer, plus a `before: wait(300)` hook so the step waits for the drawer's open
  animation / list population before highlighting.
- **Steps:** open the score drawer → pick GONG KEBYAR → select *Cendrawasih* → focus PEMADE →
  notation OFF → notation ON → play → change cursor → explore the animation selector (live
  explanation) → change speed → back to 100% → move the slider.
- **Transition-based advance:** steps that could otherwise be "already satisfied" on entry capture
  a baseline in `step:before` (`HandsOnTour`) and advance only on an actual change — the two
  notation toggles (advance on any toggle from the entry value), the speed change, the cursor
  change and the score pick. The `open` step still waits for a real drawer, `orchestra`/`focus`
  advance on reaching the target state (they only auto-skip if a preference already matches).
- **Simplifications this iteration** (flagged for your review): the orchestra step is a single
  "select GONG KEBYAR" (not the switch-then-switch-back demo); "notation" and "speed" are two
  sub-steps each; the animation and slider steps advance with the Next/Done button (the animation
  step shows a live explanation of the selected option).
- **Assumptions (data-dependent):** a score titled **Cendrawasih** exists in the GONG KEBYAR
  repertoire, has a **PEMADE** part (focus value `Pemade`) and a panggul in its SVG (so the
  animation selector shows).
- **Not run in-sandbox:** react-joyride isn't installed here, so no typecheck — confirm with a
  local `npm install` + `npm run build`.

## Phase 4: Expand the tour to multiple aspects.
I expect to have a clear concept of the final product once we land here. This phase will expand the concept to the entire app.
