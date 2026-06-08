# Virtual Editor — Conversation Summary

## Context

This document summarises a design decision made for the Tabuh Studio application regarding the interactive editor. See `Claude.md` for full project context.

Symbols consist of a pitch character and one or more modifier characters. In the Editor view, each symbol is displayed with the BaliMusic font as a single glyph. This is due to the negative spacing of the modifier characters of a symbol. The problem is to design an intuitive editor using these combining characters.
 
---

## The Problem

The developer wants want the editor to be simple and intuitive to use. There are two main aspects that should be tackled:
1. The editor cursor should always be positioned BETWEEN two symbols, whatever the keyboard or mouse input might be. The fact that a symbol consists of multiple characters should be transparent to the user.
2. The editor should enable the user to input symbols. It is currently not clear what interface would be the most suited for this.

---

Summary of what this gives you

## The Solution
An input state machine handles the distinction between pitch characters (which open a new symbol) and modifiers (which attach to the previous one). A keyboard and mouse handler process the user input. 

- The state is an array of NoteObject objects. Each NoteObject represents one (combined) symbol in the BaliMusic font.s
- A React component renders that array into a visual representation using the BaliMusic font.
- A custom cursor (a blinking line rendered between symbols) is defined as a React state variable — just an index into the symbol array.
- All keyboard input is intercepted and handled by specific logic, never by the browser's native text editing.

## The core of the solution

Here is how the core of it works:
```typescript
// shared/index.ts — symbol as the editor's atomic unit
export interface EditorSymbol {
  chars: string          // the raw font characters e.g. "u,/" 
  noteObject: NoteObject // the parsed representation
}

export interface EditorState {
  symbols: EditorSymbol[]
  cursorIndex: number    // cursor is BETWEEN symbols
                         // 0 = before first, symbols.length = after last
}
```
## The cursor index

The cursor index sits between symbols, exactly like a text cursor sits between characters. Index 0 is before the first symbol, symbols.length is after the last one.
The React component looks roughly like this:

```tsx
export function NotationEditor({
  symbols,
  cursorIndex,
  onKeyDown,
}: {
  symbols: EditorSymbol[]
  cursorIndex: number
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep focus on the container so keydown events are captured
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ fontFamily: 'BaliMusic', outline: 'none', whiteSpace: 'pre' }}
    >
      {symbols.map((sym, index) => (
        <span key={index}>
          {index === cursorIndex && <Cursor />}
          <span>{sym.chars}</span>
        </span>
      ))}
      {cursorIndex === symbols.length && <Cursor />}
    </div>
  )
}

function Cursor() {
  return (
    <span style={{
      display: 'inline-block',
      width: '2px',
      height: '1em',
      background: 'black',
      animation: 'blink 1s step-end infinite',
      verticalAlign: 'text-bottom',
      marginLeft: '-1px',
    }} />
  )
}
```

## The keyboard handler

The keyboard handler is where all the logic lives:

```typescript
function useEditorKeyboard(
  state: EditorState,
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
  inputStateMachine: (char: string, current: EditorSymbol[]) => EditorSymbol[]
) {
  function handleKeyDown(e: React.KeyboardEvent) {
    e.preventDefault() // suppress ALL native browser editing behaviour

    const { symbols, cursorIndex } = state

    switch (e.key) {
      case 'ArrowLeft':
        setState(s => ({
          ...s,
          cursorIndex: Math.max(0, s.cursorIndex - 1)
        }))
        break

      case 'ArrowRight':
        setState(s => ({
          ...s,
          cursorIndex: Math.min(s.symbols.length, s.cursorIndex + 1)
        }))
        break

      case 'Backspace': {
        if (cursorIndex === 0) break
        // Remove the symbol to the LEFT of the cursor
        const newSymbols = [
          ...symbols.slice(0, cursorIndex - 1),
          ...symbols.slice(cursorIndex)
        ]
        setState({ symbols: newSymbols, cursorIndex: cursorIndex - 1 })
        break
      }

      case 'Delete': {
        if (cursorIndex === symbols.length) break
        // Remove the symbol to the RIGHT of the cursor
        const newSymbols = [
          ...symbols.slice(0, cursorIndex),
          ...symbols.slice(cursorIndex + 1)
        ]
        setState({ symbols: newSymbols, cursorIndex })
        break
      }

      default: {
        // A printable character was typed — pass to the input state machine
        if (e.key.length === 1) {
          const newSymbols = inputStateMachine(e.key, symbols)
          setState({ symbols: newSymbols, cursorIndex: cursorIndex + 1 })
        }
        break
      }
    }
  }

  return handleKeyDown
}
```

## The input state machine

It decides whether a typed character opens a new symbol or attaches to the previous one as a modifier:

```typescript
import { MODIFIER_CHARS, PITCH_CHARS } from '../constants/fontChars'

function inputStateMachine(
  char: string,
  symbols: EditorSymbol[],
  cursorIndex: number
): EditorSymbol[] {
  const isPitch    = PITCH_CHARS.has(char)
  const isModifier = MODIFIER_CHARS.has(char)

  if (isPitch) {
    // Always opens a new symbol
    const newSymbol: EditorSymbol = {
      chars: char,
      noteObject: new NoteObject(char),
    }
    return [
      ...symbols.slice(0, cursorIndex),
      newSymbol,
      ...symbols.slice(cursorIndex),
    ]
  }

  if (isModifier && cursorIndex > 0) {
    // Attaches to the symbol immediately to the LEFT of the cursor
    const prev = symbols[cursorIndex - 1]
    const updated: EditorSymbol = {
      chars: prev.chars + char,
      noteObject: new NoteObject(prev.noteObject.symbol + char),
    }
    return [
      ...symbols.slice(0, cursorIndex - 1),
      updated,
      ...symbols.slice(cursorIndex),
    ]
  }

  // Unrecognised character — ignore
  return symbols
}
```

You'll need two small lookup sets: `PITCH_CHARS` and `MODIFIER_CHARS`. These are already available.

```typescript
// shared/noteChars.ts
export const GRACE_NOTE_PREFIXES: ReadonlySet<string> = new Set([
  "A",  "E",  "I",  "O",  "U",  "S",  "B",  "X",]);
export const PITCH_CHARS: ReadonlySet<string> = new Set([
  "a","e","i","o","u","r","s","t","b","x","y","G","P","T","-"," ", ".","(",")","*","0","8","9"
]);
export const OCTAVE_MODIFIERS: ReadonlySet<string> = new Set([',', '<'])
export const STROKE_MODIFIERS: ReadonlySet<string> = new Set([
  "/", "?", ";", ":", "[", "]"
]);
export const PATTERN_MODIFIERS: ReadonlySet<string> = new Set(['n'])
export const AFTER_MODIFIERS: ReadonlySet<string> = new Set([
    ...OCTAVE_MODIFIERS,
    ...STROKE_MODIFIERS,
    ...PATTERN_MODIFIERS
])
export const MODIFIER_CHARS: ReadonlySet<string> = new Set([
    ...GRACE_NOTE_PREFIXES, 
    ...AFTER_MODIFIERS
])
```

## Handling mouse clicks

If a user clicks inside a rendered symbol, you need to snap the cursor to the nearest symbol boundary. Wrap each symbol in a span with a onClick handler that sets cursorIndex to that symbol's index:

```tsx
{symbols.map((sym, index) => (
  <span
    key={index}
    onClick={(e) => {
      e.stopPropagation()
      // Decide whether click is on left or right half of the symbol
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      const mid  = rect.left + rect.width / 2
      setCursorIndex(e.clientX < mid ? index : index + 1)
    }}
  >
    {index === cursorIndex && <Cursor />}
    <span>{sym.chars}</span>
  </span>
))}
```
