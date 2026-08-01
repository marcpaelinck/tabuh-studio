import type { JSX } from 'react'
import { List } from 'rsuite'
import type { ExtendedOption } from '../typing/interface'

interface OptionListProps<T> {
    data: ExtendedOption<T>[]
    /** Value of the currently selected option (highlighted). */
    selectedValue?: string
    onSelect: (option: ExtendedOption<T>) => void
    className?: string
}

/**
 * A scrollable, single-select list of `ExtendedOption`s rendered as an always-visible list
 * box (rsuite `List`). Clicking a row calls `onSelect`; the selected row is highlighted.
 * Shared by the score, focus and speed selectors.
 */
export function OptionList<T>({ data, selectedValue, onSelect, className }: OptionListProps<T>): JSX.Element {
    return (
        <List bordered hover divider={false} className={className} style={{ overflowY: 'auto' }}>
            {data.map((o) => (
                <List.Item
                    key={o.value}
                    className={`cursor-pointer text-sm ${o.value === selectedValue ? 'bg-blue-100' : ''}`}
                    onClick={() => onSelect(o)}>
                    {o.label}
                </List.Item>
            ))}
        </List>
    )
}
