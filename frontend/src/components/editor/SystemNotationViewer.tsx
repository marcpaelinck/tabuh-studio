/**
 * SystemNotationViewer — multiline per-position view of one system.
 *
 * Renders every staff of a system as its own line (via {@link StaffGrid}) and, when
 * not read-only, routes keyboard / paste input through {@link useSystemEditor}. It is
 * layered ON TOP of the playback textarea: transparent background, matched font / line
 * metrics, so the textarea behind it keeps carrying the playback highlight while this
 * element supplies the glyphs (and, when editable, the cursor).
 *
 * In read-only mode it renders straight from `initialStaves` on every render, so it
 * reflects external updates (e.g. compact-view edits flowing through expandSystem).
 */

import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { CSSProperties, RefObject } from 'react'
import type { KeyMap } from '../../componentlogic/editor/keyMap'
import { useSystemEditor, type EditorStaff } from '../../componentlogic/editor/useSystemEditor'
import { StaffGrid, type StaffGridRow } from './StaffGrid'

export interface SystemNotationViewerProps {
    ref: RefObject<HTMLDivElement | null>
    /** Staves in display order (one per instrument position). */
    initialStaves: EditorStaff[]
    /** Width of the staves (in number of notes) */
    notationWidth: number
    /** Called with the updated staves whenever an edit changes the notation. */
    onChange?: (staves: EditorStaff[]) => void
    keyMap?: KeyMap
    className?: string
    style?: CSSProperties
    /** Non-interactive, reactive read-only display (renders from `initialStaves`, no cursor/input). */
    readOnly?: boolean
}

export function SystemNotationViewer({
    ref,
    initialStaves,
    notationWidth,
    onChange,
    keyMap,
    className,
    style,
    readOnly
}: SystemNotationViewerProps) {
    const controller = useSystemEditor({ initialStaves, keyMap, onChange })

    // In read-only mode ignore the controller's mount-seeded state and render from the
    // live prop, so the view tracks external changes.
    const staves = readOnly ? initialStaves : controller.staves
    const showCursor = !readOnly && controller.focused

    const rows: StaffGridRow[] = staves.map((staff, staffIdx) => ({
        key: staff.position,
        label: <div className="shrink-0 w-36 pr-2 truncate text-blue-600">{positionConfigs[staff.position].name}</div>,
        symbols: staff.symbols,
        cursorIndex: showCursor && controller.cursor.staff === staffIdx ? controller.cursor.index : null,
        onSymbolClick: readOnly ? () => {} : (index) => controller.setCursor(staffIdx, index),
        onTrailingClick: readOnly ? () => {} : () => controller.setCursor(staffIdx, staff.symbols.length)
    }))

    return (
        <StaffGrid
            // ref={ref}
            grid={{ ref, left: '9rem', widthCh: notationWidth }}
            rows={rows}
            readOnly={readOnly}
            onKeyDown={readOnly ? undefined : controller.onKeyDown}
            onPaste={readOnly ? undefined : controller.onPaste}
            onFocus={readOnly ? undefined : controller.onFocus}
            onBlur={readOnly ? undefined : controller.onBlur}
            className={className}
            style={style}
        />
    )
}
