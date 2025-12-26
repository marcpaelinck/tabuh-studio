import {
    useContext,
    useEffect,
    useRef,
    type ChangeEvent,
    type KeyboardEvent,
    type HTMLProps,
    type ReactEventHandler
} from 'react'
import type { ElementWithValueTracker, NavigationFunctionsType } from './_types'
import { useKeyboardListener } from '../../hooks/useKeyboard'
import type { NavigationAction } from '../../config/config'
import { NavigationFunctions } from './contexts'
import { debug } from '../../utils/debugger'
import type { JsonSymbol, Measure } from '../../models/types'

interface NavigationCellProps extends HTMLProps<HTMLTextAreaElement> {
    rowId: number
    colId: number
    validSymbols: string[]
    measureData: Measure
}

// Creates a cell containing one measure: the notation of one beat for a single instrument position.
export function MeasureNode({ rowId, colId, validSymbols, measureData, ...props }: NavigationCellProps) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const navFunc: NavigationFunctionsType = useContext(NavigationFunctions)
    // Add a keyboard listener for this cell and pass the navigation function that moves the selection
    // from this cell to another cell within the grid (next, prev, up, down, etc.).
    const [keyboardListener] = useKeyboardListener(
        ref,
        validSymbols,
        (action: NavigationAction) => navFunc.navigate(action, rowId, colId),
        updateNotation
    )

    function updateNotation(notation: JsonSymbol[]) {
        measureData.notation_ = notation
    }

    if (rowId == 5 && colId == 5) debug(`(re-)rendering measure ${rowId} ${colId}`, MeasureNode.name)

    useEffect(() => {
        navFunc.register(rowId, colId, ref)
        // Display the buffered edited value if previous edits have not yet been saved.
        // This initialization is necessary because collapsing an harmonica panel removes the entire system grid.
        if (measureData.notation_ && ref.current)
            ref.current.value = measureData.notation_.map((jSym) => jSym.s).join('')
        highlightOnChangedContent(ref.current)
    }, [])

    type EventsForHighlight = ChangeEvent | KeyboardEvent | ReactEventHandler
    // Highlight the cell background if the content has been modified by the user.
    const highlightOnChangedContent = (cell: HTMLTextAreaElement | null, initial: boolean = false) => {
        if (!cell) return
        const changed =
            measureData.notation_ && measureData.notation_.map((jSym) => jSym.s).join('') != props.defaultValue
        const classes = ['bg-amber-100']
        classes.forEach((value) => {
            if (changed && !cell.classList.contains(value)) cell.classList.add(value)
            if (!changed && cell.classList.contains(value)) cell.classList.remove(value)
        })
    }

    return (
        <textarea
            ref={ref}
            onChange={(e) => highlightOnChangedContent(e.target as HTMLTextAreaElement)}
            onKeyDown={(e) => {
                keyboardListener(e)
            }}
            onKeyUp={(e) => {
                keyboardListener(e)
                highlightOnChangedContent(e.target as HTMLTextAreaElement)
            }}
            // onBlur={(e) => storeChanges()}
            {...props}
        />
    )
}
