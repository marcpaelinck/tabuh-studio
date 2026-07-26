/**
 * SystemNotationViewer — multiline per-position, READ-ONLY view of one system.
 *
 * The grouped/compact notation is the single source of truth, so the expanded
 * per-position view is never editable: it renders straight from `staves` on every
 * render and reflects external updates (e.g. compact-view edits flowing through
 * expandSystem). It is layered ON TOP of the playback textarea: transparent
 * background, matched font / line metrics, so the textarea behind it keeps carrying
 * the playback highlight while this element supplies the glyphs.
 */

import type { NoteObject, Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { CSSProperties, RefObject } from 'react'
import { StaffGrid, type StaffGridRow } from './StaffGrid'

/** One staff in the expanded view: an instrument position and its notation. */
export interface EditorStaff {
    position: Position
    symbols: NoteObject[]
}

const noop = () => {}

export interface SystemNotationViewerProps {
    ref: RefObject<HTMLDivElement | null>
    /** Staves in display order (one per instrument position). */
    staves: EditorStaff[]
    /** Width of the staves (in number of notes) */
    notationWidth: number
    className?: string
    style?: CSSProperties
}

export function SystemNotationViewer({ ref, staves, notationWidth, className, style }: SystemNotationViewerProps) {
    const rows: StaffGridRow[] = staves.map((staff) => ({
        key: staff.position,
        label: <div className="shrink-0 w-36 pr-2 truncate text-blue-600">{positionConfigs[staff.position].name}</div>,
        symbols: staff.symbols,
        cursorIndex: null,
        onSymbolClick: noop,
        onTrailingClick: noop
    }))

    return (
        <StaffGrid
            grid={{ ref, left: '9rem', widthCh: notationWidth }}
            rows={rows}
            readOnly
            className={className}
            style={style}
        />
    )
}
