import { useContext, useEffect, useRef, type ChangeEvent } from 'react'
import type { NavigationCellProps, NavigationFunctionsType } from './types'
import { NavigationFunctions } from './constants'
import { useKeyboardListener } from '../../hooks/useKeyboard'
import type { NavigationAction } from '../../config/config'

export function NavigationCell({ posId, secId, validSymbols, ...props }: NavigationCellProps) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const navFunc: NavigationFunctionsType = useContext(NavigationFunctions)
    const [keyboardListener] = useKeyboardListener(ref, validSymbols, (action: NavigationAction) =>
        navFunc.navigate(action, posId, secId)
    )

    useEffect(() => {
        navFunc.register(posId, secId, ref)
    }, [])

    function onFocus(on: boolean) {
        if (on) ref.current?.addEventListener('keydown', keyboardListener)
        else ref.current?.removeEventListener('keydown', keyboardListener)
    }

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        console.log('changed')
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
