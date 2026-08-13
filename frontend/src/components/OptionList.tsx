import type { JSX } from 'react'
import { List } from 'rsuite'
import type { ExtendedOption } from '../typing/interface'

interface OptionListProps<T> {
    data: ExtendedOption<T>[]
    /** Value of the currently selected option (highlighted). */
    selectedValue?: string
    onSelect: (option: ExtendedOption<T>) => void
    className?: string
    /** Adds `data-tour="<name>"` to the row whose value/label matches (used to anchor a tour step). */
    dataTour?: { value: string; name: string } | { label: string; name: string }
}

/**
 * A scrollable, single-select list of `ExtendedOption`s rendered as an always-visible list
 * box (rsuite `List`). Clicking a row calls `onSelect`; the selected row is highlighted.
 * Shared by the score, focus and speed selectors.
 */
export function OptionList<T>({ data, selectedValue, onSelect, className, dataTour }: OptionListProps<T>): JSX.Element {
    return (
        <List bordered hover divider={false} className={className} style={{ overflowY: 'auto' }}>
            {data.map((o) => (
                <List.Item
                    key={o.value}
                    data-option-label={String(o.label)}
                    className={`cursor-pointer text-sm ${o.value === selectedValue ? 'bg-blue-100' : ''}`}
                    onClick={() => onSelect(o)}
                    data-tour={
                        dataTour
                            ? 'value' in dataTour
                                ? o.value == dataTour.value
                                    ? dataTour.name
                                    : ''
                                : 'label' in dataTour
                                  ? o.label == dataTour.label
                                      ? dataTour.name
                                      : ''
                                  : ''
                            : ''
                    }>
                    {o.label}
                </List.Item>
            ))}
        </List>
    )
}
