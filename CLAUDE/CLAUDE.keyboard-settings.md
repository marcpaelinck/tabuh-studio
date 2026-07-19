# Keyboard settings

This document discusses the requirement for an interface that enables the user to define a keyboard mapping.

## Context

Users have their own preference for associating keystrokes with notation symbols. The application should enable users to configure the keyboard according to their own preference.

## Requirements

The application uses a `KeyMap` object to translate key strokes into editor actions. The implementation already takes the possibility of using multiple KeyMap into account.

- The editor actions in a key map should include all possible symbols of the notation alphabet.
- It should be possible to have different keys per instrument or instrument group.
- If a symbol consists of multiple characters it should be possible to either map the entire symbol with a single keystroke or to map each character separately. E.g. for the symbol 'a,' there could either be a mapping with the keystroke 'A' (Shift-a) two mappings: 'a' -> `dang` (tone mapping) and ',' -> `octave -1` (modifier mapping).
- It should be possible have multiple mappings to the same symbol. In other words, it is acceptable that the same symbol can be typed in several ways.
- The key map editor should dynamically check for duplication or ambiguity and should prohibit ambiguous or invalid definitions.
- The current key map actions (cursor movements and octave change) should not be editable.
- The application should provide the possibility to define multiple key maps.
- The user should be able to select a key map.
- The user should be able to modify an existing key map.
- The user should be able to create a new key map.
- The user should be able to save a key map to a local file.
- The user should be able to retrieve a key map from file. The key map should be added to the list of available key maps and should be set als the current one.
- It should be possible to save multiple key maps to the database.
- The initial list of available key maps should be populated from the database.
- A logged in user with administration rights should be able to save a new key map to the database.

## Approach

I suggest the following stepwise approach.

### Step 1 - Mapping definition

1. Design a data structure for a key map.
2. Add the possibility to define multiple key maps and to select a specific key map.
3. Create a default mapping.
I will provide the default mapping once the data structure is available.

### Step 2 - Mapping editor

1. Implement a key map editor. The general layout could look like this:

keyboard definition: | LARAS &#x25bc; |

| symbol | keystroke(s) | instrument(s)  |
| ------ | ------------ | -------------- |
| -      | -            | all            |
| i      | i            | melodic        |
| i,     | I            | melodic        |
| x      | x            | kempli, reyong |
etc.

2. Add the possibility to save a key map to file.

The editor should open in a drawer similar to that of the ExecutionForm.

#### Additional requirements
I created an `alphabet`​ dictionary in `shared/config/alphabet`​ which contains information about each valid character. Based on this definition I also created two functions in `frontend/src/config/alphabet-functions.ts`​. Function `validNoteObjects​` creates a list of all valid `NoteObject​s`. Function `symbolName`​ returns a human-readable name for a symbol which combines the names of each character as defined in the `alphabet`​ dictionary. I added an attribute `name`​ to the `NoteObject`​ class which gets its value from the `symbolName` function.

In the table of the `KeymapEditor` I want the user to select the symbol name from a list of possible symbols **and** possible characters instead of typing it in an `Input` field. Because the list of possible symbols is large, I want to use a filtered dropdown selector. The filtered list should contain all note symbols and characters that have a partial or entire match on either the symbol's `symbolName` or the symbol's string value.

This new requirement makes the validity check of the symbols unnecessary, so it should be removed.


#### Implementation (as built)
- **Editable store.** `useKeyMapStore` (zustand) holds an in-memory clone of the shared built-in `keyMaps` plus mutations (`updateMappings`, `addKeyMap`, `importKeyMap`, `renameKeyMap`, `deleteKeyMap`). The *active* selection stays in `useUserSelectionStore.selectedKeyMapId`. `SystemNode` compiles the selected definition from the store list, so edits take effect live.
- **`KeyMapEditor` drawer** (`components/editor/KeyMapEditor.tsx`) mirrors the `ExecutionForm` drawer (`backdrop={false} enforceFocus={false}`, Cancel/Confirm actions). Header row: a definition `SelectPicker`, a name field (rename), and `New` / `Save to file` / `Load from file`. Body: an editable table `symbol · keystroke · instrument(s)` with add/remove rows. Row edits are staged locally and committed to the store on Confirm.
- **Keystroke capture.** Each keystroke cell is a native read-only input that records the next key pressed while focused (lone modifier presses ignored); it is displayed via `formatKeystroke`. (A read-only rsuite `Input` drops `onKeyDown`, so a native element is used.)
- **Symbol picker.** The symbol cell is a filtered `SelectPicker` (not a free-text input): its options are every valid note symbol (from `validNoteObjects`) plus every alphabet character, labelled by `NoteObject.name` / the character's name. `searchBy` matches the typed keyword against both the name and the symbol/char string. Because only valid symbols are selectable, there is no structural symbol-validity check.
- **Validation** (blocks Confirm): unselected symbol, missing keystroke, and ambiguity — the same keystroke bound to more than one symbol. Many keystrokes → one symbol is allowed. Grouping uses `formatKeystroke`, which folds shift into printable keys the same way the runtime matcher does.
- **File save/load.** Save serialises the current definition to a JSON download; Load parses a JSON file, adds it under a fresh id via `importKeyMap`, and selects it.
- **Trigger.** `Notation`-menu sibling `Keyboard → Edit mappings...` opens the drawer.
- **Instrument scope** is editable (position groups + single positions) but not yet consulted by `compileKeyMap` — see the `TODO(instruments)` there.

### Step 3 - Store default mapping in the database

1. Extend the database schema for the keyboard definitions.
2. Add API routes to store and retrieve keyboard definitions.
3. Add a menu entry for storing keyboard definitions.
Note: all available keyboard definitions should be loaded when the app is initialized and the default definition should be activated.