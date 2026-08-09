# User settings

## Context
Users with an account should be able to set their preferred app settings, applied on login. The
app is used by musicians from different music groups; each group has its own repertoire. `admin`
users maintain the repertoire of music groups by assigning scores to them. Users can subscribe to
one or more groups and filter the score list by a group's repertoire.

This document covers three separable concerns, delivered as phases:
1. **User preferences** — per-account defaults stored server-side (JSON on `users`), applied on login.
2. **Music groups** — a new entity with repertoire, per-editor management rights, subscriptions, and score-list filtering.
3. **Local session persistence** — the current UI selections persisted in IndexedDB next to the recovery score, independent of authentication.

## Requirements (as agreed)
- The `admin`-only `Manage users...` item moves from the profile/login popover to the `Settings`
  `MainMenu` item.
- When a user is logged in, the `Settings` `MainMenu` item is enabled and shows a `Preferences...`
  sub-item for any role, plus `Manage users...` for `admin` only.
- A new concept **music group** is introduced: name, location (city, country), contact (name,
  email, website).
- The app has a maintainable list of music groups. `admin` users can add/edit/delete groups.
- Each `editor` is assigned a list of groups they may **manage** (this assignment is admin-only).
  An editor who manages a group may add/remove **any** score to/from that group — there is no
  ownership relation between editors and scores, and none is introduced.
- Any role can set these preferences:
  - **Default score filter** — see below.
  - Default **focus** value applied when a score is opened.
  - Whether the **Notation** component (in the Animation component) is visible by default.
  - Default **cursor style**.
  - Default **Keyboard** setting (`'regular' | 'laras'`).
  - **Subscriptions** to one or more music groups (phase 2).
- In the `Notation - Open...` browser the score list can be filtered by a single **filter
  dimension**. Phase 1: orchestras only (as today). Phase 2: the user's subscribed groups are
  added to the same filter control.

## Design decisions (agreed)
- **Phasing** as above; phase 3 (local session persistence) is independent and can ship anytime.
- Preferences are stored as a **JSON** structure on `users` (not typed columns).
- The "Keyboard" preference is the existing `keyboard: 'regular' | 'laras'` toggle — **not**
  `selectedKeyMapId` and not the KeyMap editor.
- **Default score filter**:
  - Applies only to the **Open** drawer's pre-selected filter (replacing the hardcoded
    `DEFAULT_ORCHESTRA = 'GONG_KEBYAR'` in `MainMenu`). A **New** score starts with the orchestra
    **deselected**.
  - Phase 1 it can only be an orchestra. Phase 2 it broadens to **either an orchestra or a
    subscribed group** — never both at once (single value; mutual exclusivity is intended).
- The score-list payload gains `groups: number[]` per score (the ids of the groups whose
  repertoire includes it), so the Open filter can match client-side.
- Preferences seed **defaults**; the user still changes live values per session. See the
  precedence rule under phase 3.

## Data model (target)
- `users.preferences JSON NULL` — the preference blob (phase 1).
- `music_groups(id, name UNIQUE, city, country, contact_name, contact_email, website,
  created_at, updated_at)` (phase 2).
- `group_scores(group_id, score_id, PK(group_id, score_id))` — repertoire, both FKs `ON DELETE
  CASCADE` (phase 2).
- `group_managers(group_id, user_id, PK(group_id, user_id))` — which editors may manage a group;
  admins manage all implicitly (phase 2).
- `user_group_subscriptions(user_id, group_id, PK(user_id, group_id))` — subscriptions, FKs
  cascade (phase 2).

Preference blob shape (all keys optional; values are plain identifiers, not UI option objects):
```jsonc
{
  "defaultScoreFilter": { "type": "orchestra", "value": "GONG_KEBYAR" },
  // phase 2 also allows: { "type": "group", "value": 42 }
  "defaultFocusByOrchestra": { "GONG_KEBYAR": "<focus option value>" },
  "notationVisibleByDefault": true,
  "defaultCursorStyle": "Beat",
  "defaultKeyboard": "regular"
  // subscriptions live in user_group_subscriptions, not here
}
```

---

## Phase 1 — User preferences

**Backend**
- Migration: add `preferences JSON NULL` to `users`.
- `GET /auth/me` and `POST /auth/login` include `preferences` (parsed, default `{}`).
- `PUT /auth/preferences` (`requireAuth`): zod-validate an all-optional shape, store the JSON,
  return the saved value.

**Frontend**
- `apiService`: `apiSavePreferences(prefs)`; extend the `ApiUser`/`AuthUser` shape with
  `preferences`.
- `AuthContext`: apply preferences to the live stores **only on an explicit login action** (not on
  silent session-restore, which must not clobber mid-session changes on every refresh). A
  `seedSelectionsFromPreferences(prefs)` bridge sets `useUserSelectionStore` values and the
  `keyboard` setting.
- Enable the `Settings` `Nav.Menu` when logged in; add `Preferences...` (all roles) and relocate
  `Manage users...` here (admin only) — move the `ManageUsersDrawer` trigger out of `NavHeader`.
- `PreferencesDrawer`: controls for the phase-1 preference set; **Default score filter** is an
  orchestra picker for now. Save via `apiSavePreferences`.
- Implementation note: the `keyboard` setting currently lives as `MainWindow` state, not in a
  store. To seed/persist it, move it into `useUserSelectionStore` (needed again in phase 3).
- Confirm which state backs "Notation visible by default" (the NotationArea/player visibility
  toggle) and seed it.

**Manual steps:** apply the `preferences` migration; rebuild + restart.

### Phase 1 — as built
- **DB:** `users.preferences JSON NULL` (seed schema + migration `004_user_preferences.sql`).
- **Backend (`auth.ts`):** `login` and `/me` return `preferences` (via `userView`);
  `PUT /auth/preferences` (`requireAuth`, zod-validated, unknown keys stripped) persists the blob.
- **Types:** `frontend/src/typing/preferences.ts` — `UserPreferences` + `ScoreFilterPref`
  (`{type:'orchestra', value}` for now). Added to `ApiUser`/`AuthUser`.
- **Store:** `keyboard` and `notationVisible` moved into `useUserSelectionStore` (from
  `MainWindow` and `Animation` local state) so they can be seeded/persisted.
- **AuthContext:** `seedSelectionsFromPreferences` applies cursor style / keyboard / notation
  visibility to the store on explicit login **and** on silent restore (phase 1 has no local
  session yet — phase 3 will make silent restore defer to the persisted session).
  `updatePreferences(prefs)` saves, updates the user, and applies immediately.
- **Apply points:** default focus is **per orchestra** (`defaultFocusByOrchestra`), applied in
  `MainWindow`'s score-open effect keyed on `score.instrumenttype` (matched against the score's
  focus options, else "No Focus"); the default-orchestra filter seeds the desktop **Open** drawer
  default in `MainMenu`. A **New** score is unaffected (still starts with the orchestra deselected).
- **UI:** `PreferencesDrawer` (score-filter orchestra / a focus picker per orchestra / notation
  toggle / cursor style / keyboard). Focus options are derived from each orchestra's instruments
  (`createFocusMenuItems(orchestra)`), so **no score needs to be open** to set focus preferences.
  The `Settings` `MainMenu` menu is enabled when logged in and holds **Preferences…** (all roles)
  and **Manage users…** (admin only, moved out of the profile popover).
- **Not run in-sandbox:** the full frontend typecheck (time limit) — confirm with a local build.

## Phase 2 — Music groups (repertoire, management, subscriptions, filter)

**Backend**
- Migration: `music_groups`, `group_scores`, `group_managers`, `user_group_subscriptions`.
- Groups: `GET /groups` (`requireAuth`); `POST/PATCH/DELETE /groups` (`requireRole('admin')`).
- Repertoire: `POST /groups/:id/scores` and `DELETE /groups/:id/scores/:scoreId` — allowed for an
  `admin`, or an `editor` listed in `group_managers` for that group. **Any** score may be added
  (no ownership check).
- Manager assignment: `PUT /users/:id/managed-groups` (`requireRole('admin')`) sets an editor's
  `group_managers` rows.
- Subscriptions: `GET /me/subscriptions`, `PUT /me/subscriptions` (`requireAuth`).
- Score list: extend the `apiGetScores` payload with `groups: number[]` per score (via a
  `group_scores` join); add `groups` to `ScoreInfo`.
- Preferences: `defaultScoreFilter` now also accepts `{ type: 'group', value: <groupId> }`
  (single value — orchestra **or** group, never both).

**Frontend**
- `ManageGroupsDrawer` (admin): CRUD groups; per group, a managers multi-select (editors) that
  writes `group_managers`.
- **Repertoire editing lives inside `ManageGroupsDrawer`**: for a group the user may manage,
  add/remove scores there (guarded to admins + that group's managers).
- Subscriptions: a groups multi-select in `PreferencesDrawer`.
- **Score details drawer** shows a **read-only** list of the groups whose repertoire includes the
  score (non-editable for all roles). Uses the score's `groups: number[]` mapped to group names
  from `GET /groups`.
- `ScoreBrowser`: add the user's subscribed groups to the filter control alongside the
  orchestras, visually separated (labeled sections / divider) since orchestra is a score
  *property* and group is a *relation*. Selection stays single (one filter at a time). Group
  filtering matches against each score's `groups: number[]`. When logged out, only orchestras
  appear.
- **Default score filter** preference is honored when opening the Open drawer (orchestra or a
  subscribed group).

**Manual steps:** apply the group-tables migration; rebuild + restart.

## Phase 3 — Local session persistence (auth-independent)

Persist the current UI selections next to the recovery score so a reload restores what the user
was doing, regardless of login state.

- Wrap `useUserSelectionStore` with zustand `persist` using the existing `idbStorage` (same IDB
  as the recovery snapshot, separate key, e.g. `userSelections`).
- `partialize` to the UI fields only — focus, speed, panggul, cursor style, main/editor view,
  mobile tab, and the `keyboard` setting (moved into the store in phase 1). **Exclude**
  `selectedScoreOption`: the score itself is restored by the recovery snapshot, not here.
- **Precedence rule** (resolves the phase 1 ↔ phase 3 interaction):
  - On boot, the locally persisted session is restored (works for anonymous and logged-in users).
  - An **explicit login** re-seeds the selections from that account's preferences (the
    "activated on login" requirement), overriding the restored session.
  - A **silent** session-restore (refresh while already logged in) does **not** re-apply
    preferences — the persisted local session wins.

**Manual steps:** none beyond a rebuild (uses the already-added `idb-keyval`).

---

## Other settings worth considering
Grouped by area; each maps to state the app already has or features already built.

- **Playback:** default speed/tempo (`selectedSpeedOption`), loop/repeat default, audible
  kempli/metronome default, count-in, default panggul (mallet) display (`selectedPanggulOption`).
- **Appearance:** light/dark theme (rsuite `CustomProvider` supports it; the Settings menu already
  had a disabled "Color schemes" placeholder), notation zoom/font-size default, a reduce-motion
  option that disables the animated cursor (also an accessibility win).
- **Editor / workflow:** default main view (player vs editor) and editor view (compact vs
  expanded) — both already in the store; auto-fill a New score's composer with the user's name;
  show/hide validation warnings by default.
- **Startup:** reopen the last score on launch, or a pinned "home" score; a lightweight per-user
  **favorites / pinned scores** list (complements group subscriptions and is cheap).
- **Export defaults:** preferred export format, PDF page size, MIDI GM-program set — ties into the
  existing export work.
- **Account / locale:** a user **timezone** (would also let timestamps such as the recovery
  snapshot's `savedAt` display in local time — recall the earlier UTC-vs-local token bug) and, if
  i18n is ever added, UI language.
