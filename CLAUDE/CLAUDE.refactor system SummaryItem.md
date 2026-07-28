# Refactor the new-copy-delete functionality of the system's SummaryItem toolbar.

## Context

The SummaryItem contains a group of buttons to create, copy and delete a system. The way these functionalities are presented can be confusing for the user.

## New requirements

The three SummaryItems `new`, `copy` and `delete` should be replaced with a hamburger menu. The image below shows the current and required lay-out for the SymmaryItem.

![image](./System%20menu.png)

### Functionality of the new menu items

Each menu item should present the user with one or more options as described below.

** new... **
Adds a new empty system.
options:
- `before` or `after` the current system

** copy from... **
Adds a copy of a system.
options:
- `system`: a list of systems from which the user can select the copy source.
- `before` or `after` the current system.
- `copy what`:
	- `entire system`: copy all attributes except `label`. uuid should be assigned a unique value.
	- `staffs`: does not copy execution items.
	- `positions`: copies the position groups and staffs and clears the notation.

** move... **
Moves the current system within the list of systems.
options:
- `before` or `after`: indicates where to move the current system relative to the target system.
- `system`: a list of systems from which the user can select the target system.

** delete... **
Removes the current system.
options:
- `are you sure?`: Yes or Cancel

#### Additional remarks
- Function `systemSelectorOptions` can be used to create a user-friendly list of all systems. The list displays system labels if available.
- To execute the actions, use function `executeItemAction`. This is a property of `SystemNode` which points to function `updateScoreFromItemAction` of the `useScoreManager` hook. This hook will also take care of re-assigning the `id` and `index` properties of all systems after the update.

## Implementation

Two related menus were built: the **system hamburger menu** in the system header, and the **position label menu** in the compact editor. Both replace older inline button clusters and both rely on portaled overlays so they are never painted over by neighbouring systems.

### System hamburger menu (`components/editor/SystemMenu.tsx`)

`SystemMenu` renders an rsuite `Dropdown` whose toggle is a hamburger `IconButton` (`FaBars`). It exposes four items — **New…**, **Copy from…**, **Move…**, **Delete…** — each of which opens a small rsuite `Modal` (`size="xs"`) to collect its options and then dispatches the action through the `onAction(kind, value)` prop. The modal is deliberately nudged toward the left (`style={{ marginLeft: '6rem', marginRight: 'auto' }}`) so it appears near the menu and minimizes cursor travel.

Props: `systemData`, `isGotoTarget`, `copyOptions`, `moveOptions`, `sourceGroupTags`, `onAction`, `disabled`.

Per-dialog contents:

- **New…** — a `PositionField` (above / below the current system).
- **Copy from…** — a `SelectPicker` source (`copyOptions`, which includes "&lt;this system&gt;"); a `PositionField`; a **Toggle "Include execution items"** (`copyExecutionItems` state, mapped at dispatch to `mode: 'entire' | 'staffs'`); and a set of **per-group notation tags** derived from `sourceGroupTags(copySource)`. The tags carry a *Select all / Deselect all* toggle and per-group buttons (blue = kept, muted = omitted). Selection is tracked as the set of **deselected** ids (`deselectedGroupIds`), so a freshly picked source starts fully selected with no reset effect or flash. On confirm, the deselected groups' positions are collected into `omitPositions`.
- **Move…** — a `PositionField` plus a `SelectPicker` target (`moveOptions`, which excludes the current system).
- **Delete…** — a confirm dialog; blocked (`confirmDisabled`) when `isGotoTarget` is true.

Wiring in `SystemNode`:

- `copyOptions` / `moveOptions` come from `systemSelectorOptions(systemData, includeSelf, …)`.
- `sourceGroupTags(uuid)` resolves a system's `groups` into `{ id, label, positions }`, where `label = compactGroupLabel(g.positions, getPositionGroups(orchestra)).label`.
- `onAction` → `executeItemAction` → `updateScoreFromItemAction` (in `useScoreManager`). The manager renumbers `id`/`index` via `renumberSystems`, which returns **fresh objects** for renumbered systems so the memoized `SystemNode`s re-render (in-place mutation kept the same refs and the memo skipped the update). The copy branch clears the notation of the `omitPositions` groups and re-derives the staffs with `expandSystem`.

The `disabled` prop must be applied to the `<Dropdown disabled>` itself (not only the `IconButton`), because the toggle is rendered `as="span"` and a span cannot be natively disabled — this is what deactivates the menu in the expanded editor view.

`SystemActionValue` (in `typing/score.ts`) carries `position`, `sourceUuid`, `targetUuid`, `mode` (`CopyMode = 'entire' | 'staffs'`), and `omitPositions`.

> Note: the original spec listed a third **`positions`** copy mode ("copy the groups/staffs but clear the notation"). It was superseded by the more flexible **per-group notation toggles** in the Copy dialog and the **Include execution items** toggle, and was removed.

### Position label menu (`components/editor/CompactSystemEditor.tsx`)

Each staff line's position label (e.g. `ga/ug`, `rey13`) is a click menu with four items: **Add…**, **Modify…**, **Copy from…**, and **Delete &lt;label&gt;**.

It is rendered as an uncontrolled `Whisper trigger="click"` + `Popover` rather than an inline `Dropdown`. An inline dropdown is trapped inside this system's `relative z-10` StaffGrid stacking context and gets painted over by the next system's labels; the `Whisper`/`Popover` is **portaled to `<body>`** (z-index 1060) so it sits above every system. The `Whisper` is kept uncontrolled (no `open`/`onOpen`, which deadlocked); instead a `menuRefs` map of `OverlayTriggerHandle`s lets each item call `menuRefs.current[li].close()` before running its action.

`onMouseDown` with `preventDefault` on the label wrapper stops the click from focusing the `tabIndex=0` StaffGrid container, which would otherwise move the edit cursor and shift the layout.

Item behaviour:

- **Add…** opens `renderStaffDialog` in `new` mode — a multi-staff picker with a positions list, a position-groups list, and a "New staffs" basket (dnd-kit reorderable), plus an above/below placement choice. On create it inserts each basket item as a new line.
- **Modify…** opens the same dialog in `modify` mode to edit that line's positions (add/remove).
- **Copy from…** copies this staff's notation from another system (see below).
- **Delete &lt;label&gt;** removes the line immediately (no confirmation), is disabled when only one line remains, and is shown in red otherwise.

The empty-system "+ Add staff" button reuses the same `renderStaffDialog` (`new` mode) with no reference line, in which case the before/after choice is omitted.

#### Copy from… (copy a staff's notation from another system)

`openCopyDialog(li)` builds a list of the **other** systems (read from `useScoreStore.getState().currentScore`) that contain a group whose position set is **identical** to the current line's (`samePositions` — same length and same members). Restricting to an exact position-set match is what "the same position or group label" reduces to: the compact label is a deterministic function of the positions, so identical positions ⇒ identical label, and you can only copy like-for-like (a *reyong* group from a system that also has *reyong* as one group, a lone *ugal* from another lone *ugal*, etc.).

The dialog is a small `Modal` (nudged left like the other label-menu dialogs) titled **"Copy _‹label›_ notation from:"** (the current staff's label, italicised) with a `SelectPicker` of the matching systems (shown by `System.label`, or `System <id>`); if none match it shows an explanatory message and offers only Cancel. On **Copy**, the chosen source group's `NoteSymbol[]` is converted to `NoteObject[]` and written into the current line via the controller's `replaceLineNotation(lineIndex, notation)`, which **replaces** the existing notation (empty or not), commits through the normal `onChange` → `expandSystem` pipeline, and pushes a single **undo** snapshot (so ⌘/Ctrl+Z restores the previous notation).