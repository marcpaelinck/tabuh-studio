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
This phase is meant to try out one or more steps of the tour where the tour guide should have situational awareness (know the state of the app). The tour guide should invite the user to perform actions and should be able to disable options that the user should not select. I will add specifications when we get here.

## Phase 4: Expand the tour to multiple aspects.
I expect to have a clear concept of the final product once we land here. This phase will expand the concept to the entire app.
