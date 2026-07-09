# Remove the use of measures in the compact editor

## Context
A `measure` is a subdivision of a `staff` and consist of an array of notes (`NoteObject[]` or `NoteSymbol[]`). The use of measures is a remnant of a previous concept and has become redundant. Staffs now consist of a flat array of notes instead of an array of measures.
The frontend `compactSystemEditor`​ and `useCompactSystemEditor​` are still using measures, e.g. in the `CompactLine` and `CompactCursor` interfaces. This has no added value and makes the code unnecessarily complex.

## Refactoring decision
The representation of staffs as arrays of `measures`, (`NoteObject[][]` or `NoteSymbol[][]` should be removed from the code in `compactSystemEditor.tsx`​ and `useCompactSystemEditor.ts​`, and in functions in other modules that are exclusively used in these two modules. The interfaces `CompactLine` and `CompactCursor` should be redefined as follows:

```ts
export interface CompactLine {
    id: string
    positions: Position[]
    notation: NoteObject[]
}

export interface CompactCursor {
    line: number
    index: number  // The index of the note in the CompactLine's notation
}
```

The code in both modules should be refactored accordingly.