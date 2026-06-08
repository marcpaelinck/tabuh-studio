# Tabuh Studio — Project Summary for Claude

## What is Tabuh Studio?

Tabuh Studio is a web application for editing and playing back Balinese gamelan music notation. It has two main views:

- **Player view** — plays back a score with synchronised audio (Tone.js), animation (SVG instrument visualisation) and notation cursor highlighting
- **Editor view** — displays and edits the notation of a score

The app is live at `https://dev.tabuh.studio` (development) and will move to `https://tabuh.studio` when ready for public release.

---

## Technology Stack

### Frontend
- **React** with **TypeScript**, bundled with **Vite**
- **RSuite** component library
- **Tone.js** for audio playback
- **BaliMusic font** — a custom font for Balinese gamelan notation (see Font section below)
- State management via React hooks and context

### Backend
- **Node.js** with **Express**
- **TypeScript**, compiled with `tsc`
- **mysql2** for database access (parameterised queries, no ORM)
- **JWT** authentication via httpOnly cookies (access token 15min, refresh token 7 days)
- **Zod** for request validation
- **bcrypt** for password hashing
- **helmet**, **cors**, **express-rate-limit** for security

### Database
- **MySQL** (shared hosting via cPanel)
- Four tables: `users`, `scores`, `score_permissions`, `instrument_sets`

### Hosting
- Shared hosting (CloudLinux, LiteSpeed, Passenger/cPanel Node.js)
- Domain: `tabuh.studio`
- SSH on port 26: `ssh -p 26 xc113049@tabuh.studio`
- Virtual environment: `source ~/nodevenv/tabuh-studio/backend/20/bin/activate`

---

## Monorepo Structure

```
tabuh-studio/
  frontend/           ← Vite + TypeScript + React
  backend/            ← Node.js + Express
  shared/             ← shared TypeScript types
  frontend-dist/      ← built React app (uploaded via rsync, not in git)
  deployment-scripts/
    local-deploy.sh   ← run locally to build and deploy
    server-deploy.sh  ← run on server to pull and build backend
```

---

## User Roles

| Role | Capabilities |
|---|---|
| Public (no account) | Full playback and animation access, read-only score browsing, local file save/load |
| Editor | All public capabilities + save scores to database |
| Admin | All editor capabilities + manage users |

Authentication state is managed via `AuthContext` (`frontend/src/context/AuthContext.tsx`). The `user` state variable is `null` when unauthenticated.

---

## Score Data Model

### Key types (`frontend/src/typing/score.ts`)

```typescript
type NoteSymbol = string   // one font character, e.g. 'u', ',', '<', '/'

interface Staff {
    notation: NoteSymbol[]
    notation_?: NoteSymbol[] // cache used to keep user edits that have not been saved yet. Enables to revert changes.
}

type Staffs = Partial<Record<Position, Staff>>  // one Staff per instrument position

type System = {
    uuid: UUID
    id: number
    index: number
    staffs: Staffs
    staffs_?: Staffs       // pending edits cache (not yet saved)
    kempli: KempliSetting
    label?: string
    execution?: ExecutionItem[]
}

type Score = {
    uuid: UUID
    title: string
    composer: string
    instrumenttype: InstrumentType   // e.g. 'GONG_KEBYAR', 'SEMAR_PAGULINGAN'
    parts: Record<string, UUID[]>    // named sections → system UUIDs
    positions: Position[]            // ordered list of instrument positions
    systems: System[]
}
```

**Important:** The data model was recently refactored. The old model had `Measure[]` per position (one `Measure` per beat group). This has been flattened to `NoteSymbol[]` (a single flat array per position). The `colWidths` field has also been removed. The migration script flattens old-format JSON files on import.

### Kempli (beat) settings

```typescript
type KempliSetting = {
    state: 'on' | 'off' | 'notation'
    frequency?: number   // used when state === 'on'
    beatAtEnd?: boolean  // reserved for future use
}
```

When `state === 'notation'`, the kempli staff is included in `staffs['KEMPLI']` and beat positions are derived from the positions of `'x?'` characters. When `state === 'on'`, beats are evenly spaced at `frequency` characters.

---

## The BaliMusic Font

A custom font for Balinese gamelan cipher notation. Uses **negative spacing** on modifier characters so they visually combine with the preceding pitch character (displayed as diacritics).

### Character categories

| Category | Characters | Notes |
|---|---|---|
| Pitch (middle octave) | `a e i o u r s t b x G P T ( ) * 0 8 9` | open stroke |
| Grace note modifier | `A E I O U S B X` | BEFORE pitch character |
| Octave modifier | `,` (octave 0) `<` (octave 2) | AFTER pitch char |
| Stroke modifiers | `/` (damped) `?` (mute) `;` (tremolo) `:` (tremolo accel) `[` (left rake) `]` (right rake)  | AFTER pitch char |
| Pattern modifiers | `n` (norot) | AFTER pitch char |
| Duration | `-` (extension) `.` (silence) | standalone |

Pitches can be classified as follows.
| Category | Characters | Notes |
| Melodic | `a e i o u r s t` |  |
| Reyong special | `b` (byong) `x` (strike with one stick) `y` (strike with two sticks) | |
| Kempli | `x?` | the kempli stroke is always muted, hence the additional `?`
| Gong | `G` (gir) `P` (pur) `T` (tong) | |
| Kendang | `( ) * 0 8 9` | tut, kung, pak, cung, ka, dé |

The grace note prefix is a note that is played briefly, immediately before the 'main' note. The pitch of the grace note is given as an upper case letter and is equal to its lower case equivalent. The grace note is the only stroke modifier that has its own pitch.

Stroke modifiers denote a striking technique or a motif (a sequence of strokes with a specific rythmic pattern).
Pattern modifiers are a shorthand notation for a fixed sequence of notes.

### Symbol definition

A **symbol** is the visual unit of one pitch character plus any modifier characters that belong to it. Modifiers have negative spacing so the cursor does not advance past them visually. This causes complexity in the editor (cursor positioning, backspace behaviour).

### NoteObject layer

A `NoteObject` representation is planned as a second refactoring step (currently being implemented):

```typescript
interface NoteObject {
    pitch: PitchName
    octave: 0 | 1 | 2
    noteValue: 0 | 0.25 | 1
    graceNote?: PitchName
    modifiers: NoteModifier[]
    fontChar: string   // original source string for round-trip fidelity
}
```
See CLAUDE.NoteObject.md in the project's root folder for more information.

---

## Editor Architecture

### Current state
- Each `System` is rendered as a single `<textarea>` element (one per system, containing all instrument staves separated by newlines)
- The textarea is read-only; a keyboard hook intercepts keystrokes
- The keyboard hook approach is fragile and is being replaced

### Planned: Virtual cursor editor
The textarea approach will be replaced with a virtual cursor system:

- State is an array of `EditorSymbol` objects (not a raw string)
- A custom cursor (blinking line) is rendered as a React state index into the symbol array
- All keyboard input is intercepted — the browser never manages cursor position
- Cursor can only sit between complete symbols, never inside a multi-character symbol
- An input state machine decides whether a typed character opens a new symbol (pitch char) or attaches to the previous one (modifier char)

---

## API Routes

### Auth
| Method | Route | Auth required | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login, sets httpOnly cookies |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | No | Clear cookies |

### Scores
| Method | Route | Auth required | Description |
|---|---|---|---|
| GET | `/api/scores` | No | List all scores (metadata only) |
| GET | `/api/scores/:id` | No | Get full score including content |
| POST | `/api/scores` | Editor | Create new score |
| PATCH | `/api/scores/:id` | Editor + ownership | Update score |
| DELETE | `/api/scores/:id` | Editor + owner only | Delete score |

### Health
| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Returns `{"status":"ok"}` |

---

## Key Frontend Files

| File | Purpose |
|---|---|
| `frontend/src/context/AuthContext.tsx` | Auth state, login/logout functions |
| `frontend/src/services/apiService.ts` | All backend API calls |
| `frontend/src/typing/score.ts` | Core Score/System/Staff type definitions |
| `frontend/src/components/SystemNode.tsx` | Renders one system (textarea + toolbar) |
| `frontend/src/hooks/useScoreManager.ts` | Score state management, `updateSystem()` |
| `frontend/src/hooks/useplaybackReducer.ts` | Playback state management, `playbackReducer()` |
| `frontend/src/hooks/usePlaybackManager.ts` | Playback scheduler, `createTimelineFromScore()` |
| `frontend/src/hooks/executionManager.ts` | Determines the playback sequence of a score (flow), `nextStepInFlow()` |

---

## Key Backend Files

| File | Purpose |
|---|---|
| `backend/src/index.ts` | Express app, middleware, static file serving |
| `backend/src/db/pool.ts` | MySQL connection pool (mysql2) |
| `backend/src/routes/scores.ts` | Score CRUD routes |
| `backend/src/routes/auth.ts` | Auth routes |
| `backend/src/middleware/auth.ts` | `requireAuth`, `requireRole` middleware |
| `backend/src/middleware/validate.ts` | Zod validation middleware |
| `backend/src/seed/createAdminUser.ts` | One-time admin user seed script |
| `backend/src/seed/migrateScores.ts` | Import/update JSON score files to database |

---

## Deployment

See `docs/DEPLOYMENT.md` for the full guide. Key points:

- Frontend is built locally and uploaded via rsync: `rsync -avz --delete -e "ssh -p 26" frontend/dist/ xc113049@tabuh.studio:~/tabuh-studio/frontend-dist/`
- Backend is built on the server after `git pull`
- Always use `npm install --include=dev` on the server (CloudLinux requires it)
- Never run `npm prune` — it conflicts with CloudLinux's virtual environment
- Restart Passenger: `touch ~/tabuh-studio/backend/tmp/restart.txt`
- Clear LiteSpeed cache if changes don't appear: `rm -rf ~/lscache/* && mkdir ~/lscache`

---

## Known Issues / Work In Progress

- **Editor refactoring in progress**: Mostly done. A staff notation used to be represented as an array of strings instead of a single string. The strings in that array were called `measure` and corresponded with a kempli beat. The `Measure` layer has been removed, but the word `measure` still can be found in the code. The object model now keeps kempli beat information separately, either in attribute `kempli` of the Score object, or as a separate entry in the `staffs` attribute of a System. The term `measure` should be replaced by the term `beat`.
- **Virtual cursor editor**: not yet implemented, design is agreed (see Editor Architecture above and CLAUDE.virtual-editor.md in the project's root folder)
- **Undo functionality**: not yet implemented. `staffs_` on `System` is reserved for this purpose (pending edits cache)
- **Score permissions UI**: `score_permissions` table exists in the database but UI for managing per-score edit permissions is not yet built
- **`parts` field**: currently used for visual grouping of systems only. Future use: selective playback of score sections