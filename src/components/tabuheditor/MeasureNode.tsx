import { useContext, useEffect, useRef, type ChangeEvent, type KeyboardEvent, type HTMLProps } from 'react'
import type { ElementWithValueTracker, NavigationFunctionsType } from './_types'
import { useKeyboardListener } from '../../hooks/useKeyboard'
import type { NavigationAction } from '../../config/config'
import { NavigationFunctions } from './contexts'
import { debug } from '../../utils/debugger'

interface NavigationCellProps extends HTMLProps<HTMLTextAreaElement> {
    rowId: number
    colId: number
    validSymbols: string[]
}

// Creates a cell containing one measure: the notation of one beat for a single instrument position.
export function MeasureNode({ rowId, colId, validSymbols, ...props }: NavigationCellProps) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const navFunc: NavigationFunctionsType = useContext(NavigationFunctions)
    // Add a keyboard listener for this cell and pass the navigation function that moves the selection
    // from this cell to another cell within the grid (next, prev, up, down, etc.).
    const [keyboardListener] = useKeyboardListener(ref, validSymbols, (action: NavigationAction) =>
        navFunc.navigate(action, rowId, colId)
    )

    if (rowId == 5 && colId == 5) debug(`(re-)rendering measure ${rowId} ${colId}`, MeasureNode.name)

    useEffect(() => {
        navFunc.register(rowId, colId, ref)
    }, [])

    // Highlight the cell background if the content has been modified by the user.
    const highlightOnChangedContent = (
        event: ChangeEvent<HTMLTextAreaElement> | KeyboardEvent<HTMLTextAreaElement>
    ) => {
        const cell = event.target as HTMLTextAreaElement & ElementWithValueTracker
        const changed = cell._valueTracker.getValue() != props.defaultValue
        const classes = ['bg-amber-100']
        classes.forEach((value) => {
            if (changed && !cell.classList.contains(value)) cell.classList.add(value)
            if (!changed && cell.classList.contains(value)) cell.classList.remove(value)
        })
    }

    return (
        <textarea
            ref={ref}
            onChange={highlightOnChangedContent}
            onKeyDown={(e) => {
                keyboardListener(e)
                highlightOnChangedContent(e)
            }}
            {...props}
        />
    )
}
