# Mobile Menu Makeover
The look-and-feel of the version for small screens (mobile, tablet) should be similar to that of modern Android and iOS apps.

# Context
Tabuh Studio has a different screen layout for small screens (mobile phones, tablets). The interface looks clean and modern. However the hamburger menu looks somewhat clumsy.

# Requirements
- Instead of a hamburger menu containing the main options I would like a menu at the bottom of the screen, similar to modern mobile apps. See file `Mobile Bottom Menu example.jpg` in folder `Mobile interface docs` for an example. This is the user interface of the VLC app. It has the main menu on the bottom, with options `Video`, `Audio`, `Browse` etc.
- The Tabuh Studio app should have a similar bottom containing the options `Player`, `Scores`, `Focus` and `Speed`. Each menu option should open a view that fills the entire screen area above the bottom menu.
	- The `Player` option should display the player view.
	- The `Browse` option should present a selection form similar to the recently modified 'Open...' menu item in the MainMenu: a selector for the orchestra and a scrollable list for the scores.
	- The `Focus` option should present the focus options in a scrollable list similar to that of the `Browse` option. When the user select a new focus value the view should switch back to the `Player` option.
	- The `Speed` selection form should be similar to the `Focus` form. Here also the view should switch back to `Player` after a selection.
- In the future it might be necessary to add a `More` item to the menu.

---

# Implementation — as built

## Overview

The small-screen layout (`appAppearance == 'playerOnly'`) is now a three-part column filling
`h-dvh`: a slim **top bar**, a **view area** that fills the space between the bars, and a
**VLC-style bottom navigation**. The old hamburger button + floating `PlaybackMenu` panel
(and its click-outside handler) were removed. `PlaybackMenu` is now **desktop-only**.

Decisions taken during implementation (from the discussion):
- The second tab is named **"Scores"** (not "Browse"); selecting a score returns to Player.
- Focus and Speed also return to Player after a selection.
- The **cursor-style** toggle (Beat/System) lives in the Player view (top-right).
- The top bar shows the **score title** on the left (empty when none) and the **logo** on the
  right (tap → About dialog).
- The **Speed** tab label shows the current value in an accent colour, e.g. `Speed 70%`.

## State

`useUserSelectionStore` gained `mobileTab: 'player' | 'scores' | 'focus' | 'speed'` (+
`setMobileTab`), defaulting to `'player'`. Leaf views call `setMobileTab('player')` after a
selection so they return to the player. Room is left for a future `'more'`.

## New / shared components

- **`components/OptionList.tsx`** — a generic scrollable, single-select list box (rsuite
  `List`, `bordered hover`, highlight on the selected value). Reused by the score, focus and
  speed selectors.
- **`components/ScoreBrowser.tsx`** — the orchestra segmented control (vertical rsuite
  `ButtonGroup`) + a filtered `OptionList` of scores. **Shared** by the desktop "Open…" drawer
  (`MainMenu`) and the mobile Scores view, so both stay identical. Orchestra options are the
  distinct `instrumentgroup`s present among the scores; it defaults to a given orchestra
  (`defaultInstrumentGroup`, e.g. the current score's or `GONG_KEBYAR`).
- **`components/MobileBottomNav.tsx`** — the bottom bar: an icon + label per tab
  (`react-icons/bs`: play / music-note-list / bullseye / speedometer), active tab in the
  accent blue (`#2196f3`), inactive grey. The Speed item appends the current speed in an
  accent orange. Bottom padding respects `env(safe-area-inset-bottom)` (iOS home indicator).
  `role="tablist"` / `role="tab"` / `aria-selected` for accessibility.

## `PlaybackMenu` → desktop-only, presentational

`PlaybackMenu` no longer computes its own menu items or resets focus, and no longer holds the
mobile score selector. It receives `focusMenuItems` and `speedMenuItems` as props and renders
the desktop focus / speed / cursor selectors only. The item lists and the
reset-focus-on-score-change effect were lifted to `MainWindow` (so both the desktop menu and
the mobile views share one source), where:

```ts
const speedMenuItems = useMemo(() => createSpeedMenuItems(speedList), [])
const [focusMenuItems, setFocusMenuItems] = useState([focusDefaultOption])
useEffect(() => {
    if (score) setFocusMenuItems(createFocusMenuItems(score))
    setSelectedFocusOption(focusDefaultOption)
}, [score])
```

## `MainWindow` — the mobile branch

```
<Activity mode={appAppearance == 'playerOnly' ? 'visible' : 'hidden'}>
  <div className="flex flex-col h-dvh min-h-0">
    top bar (score title + logo/About)
    <div className="relative min-h-0 flex-1">     ← view area
      player column (always mounted & visible): cursor toggle + {playerWindow}
      {mobileTab != 'player' && <overlay: Scores | Focus | Speed>}   ← absolute inset-0
    </div>
    <MobileBottomNav active={mobileTab} onChange={setMobileTab} speedValue={…} />
  </div>
</Activity>
```

**Why the player stays mounted + visible and the other views overlay it** (important — this
caused a regression when first built with `<Activity>` tabs): the animation reads focus and
speed through refs (`focusRef`/`pbSpeedRef`) updated by effects inside `PlayerWindow`. React
`<Activity mode="hidden">` **unmounts a component's effects**, so hiding the player froze
those refs and the scheduled playback callback kept reading stale focus/speed. Keeping the
player permanently mounted+visible and overlaying the Scores/Focus/Speed views (absolute
`inset-0 bg-white`, mounted only when their tab is active) keeps the refs live. See
`CLAUDE.virtual-editor.md`-style note; the fix lives in the mobile branch of `MainWindow`.

## Related fixes made alongside this work

- **Live audio speed** (`usePlaybackManager`): the scheduled tempo callback now reads a live
  `playbackSpeedRef` instead of the `pbSpeed` baked into the schedule, so changing speed
  mid-playback sticks (previously the next scheduled tempo event reverted it).
- **Mobile SVG sizing** (`Animation.tsx`): the animation area is a bounded flex column
  (`Animation` root → `Grid` → the SVG `Row` each `flex flex-col flex-1 min-h-0` on mobile),
  and the SVG fills the leftover space with `width/height:100%` +
  `preserveAspectRatio="xMidYMid meet"` (contain). This lets the browser compute the largest
  size that still leaves room for the controls — no fixed height constant — so tall
  instruments (e.g. `SP_JEGOGAN`) scale down instead of pushing the player off-screen.

## Deferred

- A **`More`** tab (bottom nav has room; add an entry to `MobileBottomNav`'s `ITEMS` and the
  `MobileTab` union). Candidate contents: keyboard settings, About, etc.
- Mobile **editing** remains out of scope (the player-only layout has no editor).
