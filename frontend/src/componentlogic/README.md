## executionManager

Assists the playbackManager with the creation of a playback schedule.

- Keeps track of the pass and iteration counter of each system/gongan.
- Uses `goto` and `sequence` directives to determines the sequence in which the systems/gongans should be played.
- Uses `tempo` and `dynamics` directives to determines the tempo and dynamics for each individual note. The generic term
  `interpretation` is used for tempo and dynamics.

## interpretationManager

To be discarded, function taken over by executionManager

## playbackManager

Creates the playback schedule for audio, cursor movements and instrument animation. The schedule is set in the Transport
component of the Tone.js library. The schedule synchronizes the audio, animation and cursor movements.

## playbackReducer

Processes user playback actions in the Editor View.

## useAnimation

Generates the panggul CSS animation and the cursor movements in the Player View.

## useEditorScoreManager

Keeps track of all edits performed by the user in the Editor View.

## useInstruments

Creates samplers and converts notation elements (symbols) into sound samples.

## useKeyboard

Keyboard listener, used in the Editor View. Takes care of navigation between and within measures and converts keystrokes
into valid notation symbols.

- Manages the cursor navigation between the staffs of a system and between the measures of a staff.
- Manages cursor movements within a measure: ensures that the cursor is always located between two note symbols, and
  takes into account that symbols may consist of more than one character. Concretely: ensures that when the user presses
  the `left arrow` or `right arrow` keys, the cursor skips entire symbols. Also ensures that when the user clicks in a
  measure field, the cursor appears between two symbols or at the beginning or end of the measure.
- Validates the key strokes and ignores values that are invalid for the current position.

## usePartManager

Manages the creation and editing of parts. A part consists of a group of systems/gongans, e.g. pepeson, pengecet,
pengawak.

## useRules

Manages the conversion of notation for specific instrument positions.

- Acts when the user inputs notation for a group of instrument positions. This hook then converts the user input into
  the notation for each individual position in the group.
- Generates

## useScoreReader

Generates a list of available scores. Reads scores either from the WordPress database or from file (in developer mode).
Saves scores to the database.

## useWordpressApi

Interface to the API of the Tabuh Studio WordPress plugin.

## validationManager

Performs validation on score level. Currently contains only one validation:

- Checks for (infinite) cycles caused by incorrect use of `goto` directives.
