import { useState, type ReactElement, type ReactNode, type RefObject } from 'react'

type KeyType = 'ArrowUp' | 'ArrowDown' | 'Shift' | 'Ctrl' | 'Alt'
type Action = ['pop-left', number] | ['pop-right', number] | ['insert', string] | ['ignore'] | ['cellup'] | ['celldown']
type ActionRecord = {
    keys: KeyType[]
    left: RegExp | null // regex describing the character(s) left of the cursor
    right: RegExp | null // regex describing the character(s) right of the cursor
    action: Action
}

// Definition of keyboard codes that should be intercepted + action to perform.
// keys: key combination.
// left, right: regex to match the strings to the left and right of the cursor (null = don't care).
// action: action code + parameter(s).
// Note1: In general for each key combination, all possible left/right combinations should be accounted for
//        by the regular expressions.
// Note2: For `left`/`right`, the regex ^$ detects that the cursor is at the beginning/end of the field.
const keyActions: ActionRecord[] = [
    { keys: ['ArrowUp', 'Ctrl'], left: /[aeiours],$/, right: null, action: ['pop-left', 1] },
    { keys: ['ArrowUp', 'Ctrl'], left: /[aeiours]$/, right: null, action: ['insert', '<'] },
    { keys: ['ArrowUp', 'Ctrl'], left: /[^aeiours,]$|^$/, right: null, action: ['ignore'] },
    { keys: ['ArrowDown', 'Ctrl'], left: /[aeiours]<$/, right: null, action: ['pop-left', 1] },
    { keys: ['ArrowDown', 'Ctrl'], left: /[aeiours]$/, right: null, action: ['insert', ','] },
    { keys: ['ArrowDown', 'Ctrl'], left: /[^aeiours<]$|^$/, right: null, action: ['ignore'] }
    // { keys: ['ArrowUp'], left: null, right: null, action: ['cellup'] },
    // { keys: ['ArrowDown'], left: null, right: null, action: ['celldown'] }
]

const match = (eventVal: boolean | string | string[], actionVal: boolean | string | string[] | RegExp | null) => {
    const returnValue: boolean =
        actionVal == null ||
        // `key` value
        (actionVal instanceof RegExp && typeof eventVal == 'string' && actionVal.test(eventVal)) ||
        // `sca` values
        (Array.isArray(eventVal) &&
            Array.isArray(actionVal) &&
            eventVal.length == actionVal.length &&
            new Set(eventVal).difference(new Set(actionVal)).size == 0) ||
        // Not used currently
        (typeof actionVal == 'boolean' && eventVal == actionVal)
    // console.log(`key=${eventVal} a=${actionVal} match=${returnValue}`)
    return returnValue
}

export const useKeyboardListener = (
    ref: RefObject<HTMLTextAreaElement | null>,
    acceptOnly: string[],
    getUp: CallableFunction,
    getDown: CallableFunction
) => {
    // Defined as hook in order to be able to use states, e.g. 'octavation on' which could work similarly to caps lock

    function keyboardListener(event: KeyboardEvent) {
        // console.log(`${event.code} ${event.ctrlKey} ${target.selectionEnd}`)
        if (!ref.current || event.target !== ref.current) return
        const target = ref.current

        // Block all invalid keystrokes
        if (event.key.length == 1 && !acceptOnly.includes(event.key)) {
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
        for (const a of keyActions) {
            if (match(eventKeys, a.keys) && match(left, a.left) && match(right, a.right)) {
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
                if (a.action[0] == 'cellup') {
                    console.log('UP')
                    const element: HTMLTextAreaElement = getUp()
                    element.focus()
                    break
                }
            }
        }
    }
    return [keyboardListener]
}
