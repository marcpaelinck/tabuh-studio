import { useContext, useEffect, useRef, useState, type HTMLProps } from 'react'
import { useKeyboardListener } from '../../componentlogic/useKeyboardListener'
import type { NavigationAction } from '../../config/config'
import type { EditorMeasure, EditorSystem, Position } from '../../typing/types'
import { notation2text, parseNotationText, symbolValidationUtils } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import type { NavigationFunctionsType, ScoreFunctionsType } from '../contexts'
import { NavigationFunctions, ScoreFunctions } from '../contexts'

interface NavigationCellProps extends HTMLProps<HTMLTextAreaElement> {
    position: Position
    rowId: number
    colId: number
    validSymbols: string[]
    measureData: EditorMeasure
    systemData: EditorSystem
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
    const [measure, setMeasure] = useState<EditorMeasure>(measureData)
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
    const scoreFunc: ScoreFunctionsType = useContext(ScoreFunctions)

    function updateNotation(notation: string[]) {
        const newMeasure: EditorMeasure = { ...measure }
        newMeasure.notation_ = notation
        setMeasure(newMeasure)
    }

    useEffect(() => {
        navFunc.register(rowId, colId, ref)
        // Edits are cached until the user saves their changes.
        // Display the cached value if previous edits have not yet been saved.
        if (measure.notation_ && ref.current) ref.current.value = measure.notation_.join('')
        highlightOnChangedContent(ref.current)
    }, [])

    useEffect(() => {
        debug(`updating data of cell ${rowId},${colId} to ${ref.current?.value}`)
        if (ref.current) {
            ref.current.value = notation2text(measure.notation_ || measure.notation)
            highlightOnChangedContent(ref.current)
        }
    }, [systemData])

    // Highlight the cell background if the content has been modified by the user.
    const highlightOnChangedContent = (cell: HTMLTextAreaElement | null) => {
        if (!cell) return
        // const changed = measure.notation_ && measure.notation_.join('') != measure.notation.join('')
        const changed = cell.value != measure.notation.join('')
        const classes = ['bg-amber-100']
        classes.forEach((value) => {
            if (changed && !cell.classList.contains(value)) cell.classList.add(value)
            if (!changed && cell.classList.contains(value)) cell.classList.remove(value)
        })
    }

    function cacheChanges() {
        // Store the new notation value in the variable notation_
        debug(
            `check update for ${props.id} to ${measure.notation_} original=${measure.notation} current=${ref.current?.value}`,
            false,
            'MeasureNode'
        )
        if (!ref.current) return
        debug(`updating!`, false, 'MeasureNode')
        const newMeasure = { ...measure }
        newMeasure.notation_ = parseNotationText(ref.current.value, validRegExpCell)
        navFunc.applyRules(newMeasure.notation_, rowId, colId, true)
        const newSysData = { ...systemData }
        newSysData.staffs[position][colId] = { ...newMeasure }
        console.log(newSysData)
        scoreFunc.updateSystem(newSysData)
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
            onBlur={() => cacheChanges()}
            {...props}
        />
    )
}
