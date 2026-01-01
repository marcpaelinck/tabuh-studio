import { useContext, useEffect, useMemo, useRef, useState, type HTMLProps } from 'react'
import type { NavigationFunctionsType } from './contexts'
import { useKeyboardListener } from '../../hooks/useKeyboard'
import type { NavigationAction } from '../../config/config'
import { NavigationFunctions } from './contexts'
import { debug } from '../../utils/debugger'
import type { EditorSystemData, JsonSymbol, Measure } from '../../models/types'
import { symbolValidationUtils, parseNotationText, notation2text } from '../../utils/alphabet'

interface NavigationCellProps extends HTMLProps<HTMLTextAreaElement> {
    position: string
    rowId: number
    colId: number
    validSymbols: string[]
    measureData: Measure
    systemData: EditorSystemData
}

// Creates a cell containing one measure: the notation of one beat for a single instrument position.
export function MeasureNode({
    position,
    rowId,
    colId,
    validSymbols,
    measureData,
    systemData,
    ...props
}: NavigationCellProps) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const navFunc: NavigationFunctionsType = useContext(NavigationFunctions)
    const [measure, setMeasure] = useState<Measure>(measureData)
    // Add a keyboard listener for this cell and pass the navigation function that moves the selection
    // from this cell to another cell within the grid (next, prev, up, down, etc.).
    const [keyboardListener] = useKeyboardListener(
        `${props.id}`,
        ref,
        validSymbols,
        (action: NavigationAction) => navFunc.navigate(action, rowId, colId),
        updateNotation
    )
    const { validRegExpCell } = symbolValidationUtils(validSymbols)

    function updateNotation(notation: JsonSymbol[]) {
        const newMeasure: Measure = { ...measure }
        newMeasure.notation_ = notation
        setMeasure(newMeasure)
    }

    if (false && rowId == 4 && colId == 1)
        debug(`(re-)rendering ${props.id} to ${notation2text(measure.notation_ || measure.notation)}`, MeasureNode.name)

    useEffect(() => {
        debug(`updating data of cell ${rowId},${colId} to ${ref.current?.value}`, MeasureNode.name)
        if (ref.current) {
            ref.current.value = notation2text(measure.notation_ || measure.notation)
            highlightOnChangedContent(ref.current)
        }
    }, [systemData])

    useEffect(() => {
        navFunc.register(rowId, colId, ref)
        // Edits are cached until the user saves their changes.
        // Display the cached value if previous edits have not yet been saved.
        if (measure.notation_ && ref.current) ref.current.value = measure.notation_.map((jSym) => jSym.s).join('')
        highlightOnChangedContent(ref.current)
    }, [])

    // Highlight the cell background if the content has been modified by the user.
    const highlightOnChangedContent = (cell: HTMLTextAreaElement | null, initial: boolean = false) => {
        if (!cell) return
        const changed = measure.notation_ && measure.notation_.map((jSym) => jSym.s).join('') != props.defaultValue
        const classes = ['bg-amber-100']
        classes.forEach((value) => {
            if (changed && !cell.classList.contains(value)) cell.classList.add(value)
            if (!changed && cell.classList.contains(value)) cell.classList.remove(value)
        })
    }

    function storeChanges() {
        if (typeof measure.notation_ != 'undefined') {
            if (!ref.current) return
            debug(`updating ${props.id} to ${notation2text(measure.notation_)}`, MeasureNode.name)
            // measureData.notation = measureData.notation_
            const notationStr: string[] = parseNotationText(ref.current.value, validRegExpCell)
            const notation = notationStr.map((sym) => {
                return { system: systemData.id, section: colId, s: sym, t: 0, d: 1 }
            })
            navFunc.applyRules(notation, rowId, colId, true)
            const newSysData = { ...systemData }
            newSysData.staffs[position][colId] = { ...measure }
            navFunc.updateSystemData(newSysData)
        }
    }

    return (
        <textarea
            ref={ref}
            onChange={(e) => highlightOnChangedContent(e.target as HTMLTextAreaElement)}
            onKeyDown={(e) => {
                keyboardListener(e)
            }}
            defaultValue={
                measureData.notation_ ? notation2text(measureData.notation_) : notation2text(measureData.notation)
            }
            onKeyUp={(e) => {
                keyboardListener(e)
                highlightOnChangedContent(e.target as HTMLTextAreaElement)
            }}
            onBlur={(e) => storeChanges()}
            {...props}
        />
    )
}
