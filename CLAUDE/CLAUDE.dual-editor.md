# Dual Editor — Requirements for a new feature

This document discusses the requirement for an editor with two different views on the same `Score`. 

## Context

I have conceived a way to reduce the amount of typing by introducing two types of shortcuts:
1. Aggregation of positions: the possibility to write notation that applies to multiple positions.
2. Shorthand symbols: symbols that stand for a sequence of symbols.

I have implemented these in a text file format which I call the Tabuh format. You can find an example of an entire Tabuh notation file in file `frontend/CLAUDE/Tabuh notation example.tsv` and a screenshot of the same file in `frontend/CLAUDE/Tabuh notation example.png`, displaying the file with the BaliMusic font.

### Position aggregation

If there is no ambiguity, the Tabuh notation format allows the notation for multiple positions to be aggregated in one notation line. In that case the label at the start of the line stands for a group of positions. In the tabuh notation example file, the abbreviation `ga/ugal` stands for 'gangsa and ugal', where 'ugal' stands for position `UGAL` and 'gangsa' stands for positions `PEMADE_POLOS`, `PEMADE_SANGSIH`, `KANTILAN_POLOS` and `KANTILAN_SANGSIH`. Label `reyong13` stands for the positions `REYONG_1` and `REYONG_3`. In general, most of the `melodic` instruments can be combined in any possible way. 

### Shorthand notation

Some symbol modifiers can be used to create shorthand symbols. Currently only the modifier `n` is being used in this context. `n` stands for `norot` which is a specific note pattern in Balinese music. I added an extract of a notation file `frontend/CLAUDE/Norot example.tsv` and corresponding screenshot `frontend/CLAUDE/Norot example.png`. The symbols `in` and `un` in this example stand for a fixed pattern of four symbols which can be different for each position and can also differ per beat.
 
### Current implementation

The Tabuh Parser `frontend/src/scoreparsers/tabuhParser.ts` is currently the only part of the code that can handle the aggregation and shorthand notation. It uses two agents for this.
- The Casting Rules Manager `frontend/src/componentlogic/castingRulesManager.ts` takes care of expanding aggregated notation into individual notations for each position.
- The Pattern Manager `frontend/src/componentlogic/patternManager.ts` expands each shortcut symbol into a sequence of symbols ('pattern').

The Tabuh Parser returns a complete `Score` object with all shorthand symbols and aggregated notations resolved.

Next to this, the `System` type already has a `notationGroups` attribute of type `GroupedNotation`. This attribute contains the compact version of the notation. See `frontend/src/typing/score.ts`.

## Functionality of the new feature

I want the editor to enable the use of aggregated notation and the use of shorthand symbols. The concept that I have in mind is to have two views: the 'compact' view and the 'expanded' view.

- The compact view should enable to write aggregated notation and to use shorthand symbols.
- The expanded view should display the notation as it currently does: explicit notation for each position and no use of shorthand symbols.

Ideally, both views should be editable. However this introduces a certain complexity because they need to remain in sync at all times. I need your advice on how to handle this. There are a couple of problematic use cases that I can think of, but there might be more.

### Use cases for the expanded view

- Positions that are part of an aggregation group should be clearly marked as such, for instance using group numbers, colors or braces.
- Positions that are part of an aggregation group should be locked for editing. However it should be possible to enable ('unlock') editing for such a position.
- If the user edits the notation of an unlocked position that is part of a group, the position should be removed from the group. This should immediately be visible.
- The use of shorthand notation should not be possible in the expanded view.

### use cases for the compact view

- The label preceding a grouped notation should be comprehensive but compact. Instead of displaying all the positions of the group at the beginning of a notation line, we could perhaps use shortcuts and display the full list of positions as a tooltip.
- It should only be possible to create 'valid' groups. I can provide a list of valid combinations.
- Positions for which the notation is not aggregated should be displayed on a separate line, perhaps as a group containing a single instrument.
- The user should be able to add an instrument to an existing group, even if that instrument already has a separate notation. In that case the application should give a warning that the notation of the individual instrument will be modified if the position is added to the group.

### use cases for both views

- Typing an invalid note (a symbol that is not allowed for the specific position of position group) should cause that note to be highlighted. My suggestion would be to use the `Lezer` parser for this. This parser is already being used by the Tabuh Parser.
- It should not be possible to save a notation to the database if it contains invalid symbols. However it should still be possible to save such a notation to file (JSON).

### specific concern

The grouped notation and expanded notation are currently stored in different places in the `System` object (`staffs` and `groupedNotation` attributes). Considering that we want to keep both views in sync, it might be a better idea to have a 'single source of truth' for both. However I don't have a good idea yet if this is possible and if so how to achieve this.