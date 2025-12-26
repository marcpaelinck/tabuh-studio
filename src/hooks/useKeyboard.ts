import { type Dispatch, type RefObject } from 'react'
import { type NavigationAction } from '../config/config'
import _ from 'lodash'
import { debug } from '../utils/debugger'
import { type KeyboardEvent } from 'react'
import type { ElementWithValueTracker } from '../components/tabuheditor/_types'
import type { JsonSymbol } from '../models/types'

type KeyType =
    | 'ArrowUp'
    | 'ArrowDown'
    | 'ArrowLeft'
    | 'ArrowRight'
    | 'Shift'
    | 'Ctrl'
    | 'Alt'
    | 'Home'
    | 'End'
    | 'PgUp'
    | 'PgDn'
type Action =
    | ['pop-left', number]
    | ['pop-right', number]
    | ['insert', string]
    | ['cursorleft']
    | ['cursorright']
    | ['cellup']
    | ['celldown']
    | ['cellleft']
    | ['cellright']
    | ['rowstart']
    | ['rowend']
    | ['firstrow']
    | ['lastrow']
    | ['ignore']
type ActionRecord = {
    keys: KeyType[]
    left: RegExp | null // regex describing the character(s) left of the cursor
    right: RegExp | null // regex describing the character(s) right of the cursor
    action: Action
}
// Used to find a match with an ActionRecord elements
type SearchRecord = { keys: KeyType[]; left: string; right: string }

// Definition of keyboard codes that should be intercepted + action to perform.
// keys: key combination.
// left, right: regex to match the strings to the left and right of the cursor (null = don't care).
// action: action code + parameter(s).
const keyActions: ActionRecord[] = [
    // TYPING
    // octavate upward
    { keys: ['ArrowUp', 'Alt'], left: /[aeiours],$/, right: null, action: ['pop-left', 1] },
    { keys: ['ArrowUp', 'Alt'], left: /[aeiours]$/, right: null, action: ['insert', '<'] },
    { keys: ['ArrowUp', 'Alt'], left: /[^aeiours,]$|^$/, right: null, action: ['ignore'] },
    // octavate downward
    { keys: ['ArrowDown', 'Alt'], left: /[aeiours]<$/, right: null, action: ['pop-left', 1] },
    { keys: ['ArrowDown', 'Alt'], left: /[aeiours]$/, right: null, action: ['insert', ','] },
    { keys: ['ArrowDown', 'Alt'], left: /[^aeiours<]$|^$/, right: null, action: ['ignore'] },

    // NAVIGATION
    // navigate within a cell: ensure that cursor skips entire (compound) symbols
    { keys: ['ArrowLeft'], left: /.+$/, right: null, action: ['cursorleft'] },
    { keys: ['ArrowRight'], left: null, right: /.+$/, action: ['cursorright'] },
    // move cell selection left or right
    { keys: ['ArrowLeft'], left: /^$/, right: null, action: ['cellleft'] },
    { keys: ['ArrowLeft', 'Ctrl'], left: null, right: null, action: ['cellleft'] },
    { keys: ['ArrowRight'], left: null, right: /^$/, action: ['cellright'] },
    { keys: ['ArrowRight', 'Ctrl'], left: null, right: null, action: ['cellright'] },
    // move cell selection up or down
    { keys: ['ArrowUp'], left: null, right: null, action: ['cellup'] },
    { keys: ['ArrowDown'], left: null, right: null, action: ['celldown'] },
    // move cell selection to top or bottom of column / start or end of row
    { keys: ['ArrowUp', 'Ctrl'], left: null, right: null, action: ['firstrow'] },
    { keys: ['ArrowDown', 'Ctrl'], left: null, right: null, action: ['lastrow'] },
    { keys: ['Home', 'Ctrl'], left: null, right: null, action: ['rowstart'] },
    { keys: ['End', 'Ctrl'], left: null, right: null, action: ['rowend'] }
]

type ValidsReturnValues = {
    validRegExpSymbol: RegExp
    validRegExpCell: RegExp
    validRegExpByLength: Record<string, string>
    validKeystrokes: string[]
}
// Return values:
// regExpSymbol: regular expression for all valid symbols
// regExpCell: regular expression to parse an entire cell into valid symbols
// regExpByLength: regular expressions for valid symbols, grouped by symbol length
// keystrokes: list of unique individual chars occurring in valid symbols
function getValids(validSymbols: string[]): ValidsReturnValues {
    const lengths = [...new Set(validSymbols.map((sym) => sym.length))]
    const regexpEntries: [number, string][] = lengths.map((len) => [
        len,
        validSymbols
            .filter((sym) => sym.length == len || len == 0)
            .map((sym) => _.escapeRegExp(sym))
            .join('|')
    ])
    const validRegExpByLength: Record<string, string> = Object.fromEntries(regexpEntries.filter(([key, _]) => key > 0))
    // RegExp to match any valid symbol. The RegExp will match symbol containing the most characters first.
    const strExpr = validSymbols
        .sort((sym1, sym2) => sym2.length - sym1.length)
        .map((sym) => _.escapeRegExp(sym))
        .join('|')
    const validRegExpSymbol: RegExp = RegExp(strExpr)
    // const validRegExpCell: RegExp = RegExp('^(' + strExpr + ')*$', 'g')
    const validRegExpCell: RegExp = RegExp(strExpr, 'g')
    const validKeystrokes = [...new Set(validSymbols.join(''))] // set of unique characters
    return { validRegExpSymbol, validRegExpCell, validRegExpByLength, validKeystrokes }
}

const match = (event: SearchRecord, action: ActionRecord) => {
    const keysMatch =
        event.keys.length === action.keys.length &&
        event.keys.every((x) => action.keys.includes(x)) &&
        action.keys.every((x) => event.keys.includes(x))
    if (!keysMatch) return false
    const leftMatch = !action.left || action.left.test(event.left)
    if (!leftMatch) return false
    const rightMatch = !action.right || action.right.test(event.right)
    return rightMatch
}

export const useKeyboardListener = (
    ref: RefObject<HTMLTextAreaElement | null>,
    validSymbols: string[],
    navigate: (action: NavigationAction) => RefObject<HTMLTextAreaElement | null>,
    updateNotation: Dispatch<JsonSymbol[]>
) => {
    // Defined as hook in order to be able to use states, such as keyboard definitions, 'smart edit' or 'octavation on'.
    const { validRegExpSymbol, validRegExpCell, validRegExpByLength, validKeystrokes } = getValids(validSymbols)

    // Checks for a matching valid symbol at the beginning (direction==1) or end (direction==-1) of a string.
    // Returns the length of the symbol if a match is found, null otherwise.
    function matchValidChar(contentToMatch: string, direction: -1 | 1): number | null {
        const regexStart = direction > 0 ? '^' : ''
        const regexEnd = direction > 0 ? '' : '$'

        for (const length of Object.keys(validRegExpByLength).sort().reverse()) {
            // validRegExpByLength[length] matches all valid symbols of a given length.
            const regExp = RegExp(regexStart + '(' + validRegExpByLength[length] + ')' + regexEnd)
            if (regExp.test(contentToMatch)) return Number(length)
        }
        return null
    }

    function onChanged(target: ElementWithValueTracker) {
        const [selStart, selEnd] = [target.selectionStart, target.selectionEnd]
        target.select()
        const cellValue = document.getSelection()?.toString() || ''
        target._valueTracker.setValue(cellValue)
        target.selectionStart = selStart
        target.selectionEnd = selEnd
        const matches = cellValue ? cellValue.matchAll(validRegExpCell) : []
        const notation = [...matches.map((el) => el[0])]
        if (cellValue && notation.join('') != cellValue)
            // const notation = cellValue ? validRegExpCell.exec(cellValue) : []
            console.error(`invalid cell content: ${cellValue}`)
        if (notation.length == 0) updateNotation([])
        else
            updateNotation(
                notation.map((sym) => {
                    return { system: -1, section: -1, s: sym, t: -1, d: -1 }
                })
            )
        debug(JSON.stringify(notation), useKeyboardListener.name)
        target.dispatchEvent(new Event('change'))
    }

    function keyboardListener(event: KeyboardEvent<HTMLTextAreaElement>) {
        var changed = false
        debug(`key=${event.code} selectionEnd=${ref.current?.selectionEnd}`, useKeyboardListener.name)
        // Check that target exists
        if (!ref.current || event.target !== ref.current) return
        const target: ElementWithValueTracker = ref.current as ElementWithValueTracker

        if (event.key.length == 1 && !event.altKey && !event.ctrlKey) {
            // Character has been typed. Check validity.
            if (!validKeystrokes.includes(event.key)) {
                event.preventDefault()
                return
            } else if (event.type == 'keyup') {
                // Ignore keydown event, target content will only change on keyup.
                event.preventDefault()
                onChanged(target)
            }
        }
        // The following code only considers keydown events
        if (event.type == 'keyup') return

        // Create a search record to search a matching keyAction record
        const eventRecord: SearchRecord = {
            keys: [
                event.key,
                event.shiftKey ? 'Shift' : null,
                event.ctrlKey ? 'Ctrl' : null,
                event.altKey ? 'Alt' : null
            ].filter((v) => v != null) as KeyType[],
            left: target.value.slice(0, target.selectionEnd), // string to the left of the cursor
            right: target.value.slice(target.selectionEnd) // string to the right of the cursor
        }
        // Find a matching keyAction record and perform the corresponding key action if found
        for (const keyAction of keyActions) {
            if (match(eventRecord, keyAction)) {
                debug('pass', useKeyboardListener.name)
                event.preventDefault()

                if (keyAction.action[0] == 'insert') {
                    if (keyAction.action.length > 1 && keyAction.action[1] != null) {
                        // Check that insert results in a valid symbol
                        const isValid =
                            (!keyAction.left || matchValidChar(eventRecord.left + keyAction.action[1], -1)) &&
                            (!keyAction.right || matchValidChar(keyAction.action[1] + eventRecord.right, 1))
                        if (!isValid) break
                        target.setRangeText(keyAction.action[1])
                        target.selectionStart += 1
                        target.selectionEnd = target.selectionStart
                        changed = true
                        debug(`INSERT ${keyAction.action[1]}`, useKeyboardListener.name)
                    } else debug('unexpected null keyAction value(s)', useKeyboardListener.name)
                    break
                }
                if (keyAction.action[0] == 'pop-left') {
                    // Check that pop action results in a valid symbol
                    const leftEnd = eventRecord.left.length - keyAction.action[1]
                    const isValid =
                        !keyAction.left || leftEnd <= 0 || matchValidChar(eventRecord.left.slice(0, leftEnd), -1)
                    if (!isValid) break
                    if (keyAction.action.length > 1 && keyAction.action[1] != null) {
                        target.selectionStart -= keyAction.action[1]
                        debug(
                            `REMOVE LEFT ${target.value.slice(target.selectionStart, target.selectionEnd)}`,
                            useKeyboardListener.name
                        )
                        target.setRangeText('')
                        changed = true
                    } else debug('unexpected null keyAction value(s)', useKeyboardListener.name)
                    break
                }
                if (keyAction.action[0] == 'ignore') {
                    debug('IGNORE', useKeyboardListener.name)
                    break
                }
                if (
                    [
                        'cellup',
                        'celldown',
                        'cellleft',
                        'cellright',
                        'rowstart',
                        'rowend',
                        'firstrow',
                        'lastrow'
                    ].includes(keyAction.action[0])
                ) {
                    const elementRef: RefObject<HTMLTextAreaElement | null> = navigate(
                        keyAction.action[0] as NavigationAction
                    )
                    if (elementRef.current) {
                        elementRef.current?.focus()
                        elementRef.current.selectionStart = 0
                        elementRef.current.selectionEnd = 0
                    }
                    break
                }
                if (['cursorleft', 'cursorright'].includes(keyAction.action[0])) {
                    // Skip an entire symbol, which might consist of multiple characters.
                    const direction = keyAction.action[0] == 'cursorright' ? 1 : -1
                    const contentToMatch = direction > 0 ? eventRecord.right : eventRecord.left
                    const regexStart = direction > 0 ? '^' : ''
                    const regexEnd = direction > 0 ? '' : '$'

                    // Find a match for the previous/next (compound) symbol. Start with longest possible symbol code.
                    for (const length of Object.keys(validRegExpByLength).sort().reverse()) {
                        // validRegExpByLength[length] matches all valid symbols of a given length.
                        const regExp = RegExp(regexStart + '(' + validRegExpByLength[length] + ')' + regexEnd)
                        if (regExp.test(contentToMatch)) {
                            target.selectionStart += direction * Number(length)
                            target.selectionEnd = target.selectionStart
                            break
                        }
                    }
                    break
                }
            }
        }
        if (changed) onChanged(target)
    }

    return [keyboardListener]
}
