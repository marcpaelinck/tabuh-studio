import { useContext, useEffect, useRef, type ChangeEvent, type HTMLProps } from 'react'
import type { NavigationFunctionsType } from './_types'
import { useKeyboardListener } from '../../hooks/useKeyboard'
import type { NavigationAction } from '../../config/config'
import { NavigationFunctions } from './contexts'
import { debug } from '../../utils/debugger'

interface NavigationCellProps extends HTMLProps<HTMLTextAreaElement> {
    rowId: number
    colId: number
    validSymbols: string[]
}

export function NavigationCell({ rowId, colId, validSymbols, ...props }: NavigationCellProps) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const navFunc: NavigationFunctionsType = useContext(NavigationFunctions)
    const [keyboardListener] = useKeyboardListener(ref, validSymbols, (action: NavigationAction) =>
        navFunc.navigate(action, rowId, colId)
    )

    useEffect(() => {
        navFunc.register(rowId, colId, ref)
    }, [])

    function onFocus(on: boolean) {
        if (on) ref.current?.addEventListener('keydown', keyboardListener)
        else ref.current?.removeEventListener('keydown', keyboardListener)
    }

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        debug('changed', NavigationCell.name)
    }

    return (
        <textarea
            ref={ref}
            onChange={(e) => handleChange(e)}
            onFocus={() => onFocus(true)}
            onBlur={() => onFocus(false)}
            // className={highlight ? 'border-solid boder-red-500' : ''}
            {...props}
        />
    )
}
