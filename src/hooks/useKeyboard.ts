import { type RefObject } from 'react'
import { instrumentConfigs, positionConfigs, type NavigationAction } from '../config/config'
import _ from 'lodash'

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

const len1Symbol: RegExp = /(?!=[AEIOURS])[a-z890*()]$/
const len2Symbol: RegExp = /([AEIOURS][a-z890*()])|((?!=[AEIOURS])[a-z890*()][,\</\?\[\]_=])$/
const len3Symbol: RegExp = /([AEIOURS][a-z890*()])|((?!=[AEIOURS])[a-z890*()][,\</\?\[\]_=])$/
// Definition of keyboard codes that should be intercepted + action to perform.
// keys: key combination.
// left, right: regex to match the strings to the left and right of the cursor (null = don't care).
// action: action code + parameter(s).
// Note1: In general for each key combination, all possible left/right combinations should be accounted for
//        by the regular expressions.
// Note2: For `left`/`right`, the regex ^$ detects that the cursor is at the beginning/end of the field.
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

type RegExpDict = Record<string, string>
// Return values:
// regExp: regular expression for all valid symbols
// regExpByLength: regular expressions for valid symbols, grouped by symbol length
// keystrokes: list of unique individual chars occurring in valid symbols
function getValids(validSymbols: string[]): [RegExp, RegExpDict, string[]] {
    const lengths = [...new Set(validSymbols.map((sym) => sym.length))]
    const regexpEntries: [number, string][] = lengths.map((len) => [
        len,
        validSymbols
            .filter((sym) => sym.length == len || len == 0)
            .map((sym) => _.escapeRegExp(sym))
            .join('|')
    ])
    const regExpByLength: RegExpDict = Object.fromEntries(regexpEntries.filter(([key, _]) => key > 0))
    const regExp: RegExp = RegExp(validSymbols.map((sym) => _.escapeRegExp(sym)).join('|'))
    const keystrokes = [...new Set(validSymbols.join(''))] // set of unique characters
    return [regExp, regExpByLength, keystrokes]
}

const match = (eventVal: boolean | string | string[], actionVal: boolean | string | string[] | RegExp | null) => {
    const returnValue: boolean =
        actionVal == null ||
        // `key` value
        (actionVal instanceof RegExp && typeof eventVal == 'string' && actionVal.test(eventVal)) ||
        // `sca` values
        (Array.isArray(eventVal) &&
            Array.isArray(actionVal) &&
            new Set(eventVal).size == new Set(actionVal).size &&
            new Set(eventVal).difference(new Set(actionVal)).size == 0 &&
            new Set(actionVal).difference(new Set(eventVal)).size == 0) ||
        // Not used currently
        (typeof actionVal == 'boolean' && eventVal == actionVal)
    // console.log(`key=${eventVal} a=${actionVal} match=${returnValue}`)
    return returnValue
}

export const useKeyboardListener = (
    ref: RefObject<HTMLTextAreaElement | null>,
    validSymbols: string[],
    navigate: (action: NavigationAction) => RefObject<HTMLTextAreaElement | null>
) => {
    // Defined as hook in order to be able to use states, e.g. 'octavation on' which could work similarly to caps lock
    const [validRegExp, validRegExpByLength, validKeystrokes] = getValids(validSymbols)

    function keyboardListener(event: KeyboardEvent) {
        // console.log(`${event.code} ${event.ctrlKey} ${target.selectionEnd}`)
        if (!ref.current || event.target !== ref.current) return
        const target = ref.current

        // Block all invalid keystrokes
        if (event.key.length == 1 && !validKeystrokes.includes(event.key)) {
            event.preventDefault()
            return
        }
        const left = target.value.slice(0, target.selectionEnd)
        const right = target.value.slice(target.selectionEnd)
        const eventKeys: string[] = [
            event.key,
            event.shiftKey ? 'Shift' : null,
            event.ctrlKey ? 'Ctrl' : null,
            event.altKey ? 'Alt' : null
        ].filter((v) => v != null)
        // Find a match with a keyAction
        console.log(event.key)
        for (const a of keyActions) {
            if (match(eventKeys, a.keys) && match(left, a.left) && match(right, a.right)) {
                console.log('pass')
                event.preventDefault()

                if (a.action[0] == 'insert') {
                    if (a.action.length > 1 && a.action[1] != null) {
                        target.setRangeText(a.action[1])
                        target.selectionStart += 1
                        target.selectionEnd = target.selectionStart
                        console.log(`INSERT ${a.action[1]}`)
                    } else console.log('unexpected null keyAction value(s)')
                    break
                }
                if (a.action[0] == 'pop-left') {
                    if (a.action.length > 1 && a.action[1] != null) {
                        target.selectionStart -= a.action[1]
                        console.log(`REMOVE LEFT ${target.value.slice(target.selectionStart, target.selectionEnd)}`)
                        target.setRangeText('')
                    } else console.log('unexpected null keyAction value(s)')
                    break
                }
                if (a.action[0] == 'ignore') {
                    console.log('IGNORE')
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
                    ].includes(a.action[0])
                ) {
                    console.log(a.action[0])
                    const elementRef: RefObject<HTMLTextAreaElement | null> = navigate(a.action[0] as NavigationAction)
                    if (elementRef.current) {
                        elementRef.current?.focus()
                        elementRef.current.selectionStart = 0
                        elementRef.current.selectionEnd = 0
                    }
                    break
                }
                if (['cursorleft', 'cursorright'].includes(a.action[0])) {
                    const direction = a.action[0] == 'cursorleft' ? -1 : 1
                    const compare = a.action[0] == 'cursorleft' ? left : right
                    for (const length of Object.keys(validRegExpByLength).sort().reverse()) {
                        const regExp = RegExp(
                            (a.action[0] == 'cursorright' ? '^' : '') +
                                '(' +
                                validRegExpByLength[length] +
                                ')' +
                                (a.action[0] == 'cursorleft' ? '$' : '')
                        )
                        if (match(compare, regExp)) {
                            target.selectionStart += direction * Number(length)
                            target.selectionEnd = target.selectionStart
                            break
                        }
                    }
                    break
                }
            }
        }
    }

    return [keyboardListener]
}
