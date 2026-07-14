/**
 * KeyMapEditor — the keyboard-mapping editor (Step 2).
 *
 * Opens in a Drawer (like the ExecutionForm). It lets the user pick a keyboard
 * definition, edit its rows (symbol · keystroke · instrument scope), create a new
 * definition, and save/load a definition to/from a local JSON file. Only the
 * "translate a keystroke to a notation string" part is editable — navigation and
 * octave keys are fixed (see compileKeyMap).
 *
 * Edits to the rows are staged locally and committed to the store on Confirm; the
 * structural actions (New / Load / select a different map) act on the store
 * immediately and re-seed the staged rows.
 */

import {
    NoteObject,
    type EditableKeyMapping,
    type KeyMapDefinition,
    type Keystroke,
    type Position,
    type PositionGroup
} from '@tabuhstudio/shared'
import { positionAbbr } from '@tabuhstudio/shared/config/position'
import MinusIcon from '@rsuite/icons/Minus'
import PlusIcon from '@rsuite/icons/Plus'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button, CheckPicker, Drawer, IconButton, Input, Message, SelectPicker, Stack } from 'rsuite'
import { v4 as uuidv4 } from 'uuid'
import { formatKeystroke } from '../../componentlogic/editor/keyMap'
import { useKeyMapStore } from '../../stores/useKeyMapStore'
import { useUserSelectionStore } from '../../stores/useUserSettingsStore'

const emptyKeystroke: Keystroke = { key: '', ctrl: false, alt: false, shift: false, meta: false }

// Instrument-scope options: both position groups (melodic, reyong, …) and single
// positions (kempli, ugal, …), labelled by their abbreviation.
const instrumentOptions = Object.entries(positionAbbr).map(([value, label]) => ({ label, value }))

// A symbol string is valid when NoteObject can parse it (position-independent here).
function symbolValid(symbol: string): boolean {
    if (!symbol) return false
    try {
        NoteObject.validate(symbol, undefined)
        return true
    } catch {
        return false
    }
}

/** A single-line input that captures the next keystroke pressed while it is focused. */
function KeystrokeInput({ value, onChange }: { value: Keystroke; onChange: (ks: Keystroke) => void }) {
    const [capturing, setCapturing] = useState(false)
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Ignore lone modifier presses — wait for the actual key.
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
        e.preventDefault()
        onChange({ key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey })
        setCapturing(false)
        e.currentTarget.blur()
    }
    return (
        <Input
            readOnly
            size="sm"
            value={capturing ? 'press a key…' : formatKeystroke(value)}
            placeholder="click, then press"
            onFocus={() => setCapturing(true)}
            onBlur={() => setCapturing(false)}
            onKeyDown={handleKeyDown}
        />
    )
}

function download(filename: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

interface KeyMapEditorProps {
    open: boolean
    setOpen: (open: boolean) => void
}

export function KeyMapEditor({ open, setOpen }: KeyMapEditorProps) {
    const keyMaps = useKeyMapStore((s) => s.keyMaps)
    const updateMappings = useKeyMapStore((s) => s.updateMappings)
    const addKeyMap = useKeyMapStore((s) => s.addKeyMap)
    const importKeyMap = useKeyMapStore((s) => s.importKeyMap)
    const renameKeyMap = useKeyMapStore((s) => s.renameKeyMap)

    const selectedKeyMapId = useUserSelectionStore((s) => s.selectedKeyMapId)
    const setSelectedKeyMapId = useUserSelectionStore((s) => s.setSelectedKeyMapId)

    const selected = keyMaps.find((k) => k.id === selectedKeyMapId) ?? keyMaps[0]

    // Staged rows: a working copy of the selected map's mappings, committed on Confirm.
    const [rows, setRows] = useState<EditableKeyMapping[]>([])
    const fileInput = useRef<HTMLInputElement>(null)

    // (Re)seed the staged rows whenever the drawer opens or the selected map changes.
    useEffect(() => {
        if (!open) return
        setRows(structuredClone(selected?.mappings ?? []))
    }, [open, selectedKeyMapId])

    const setRow = (id: string, patch: Partial<EditableKeyMapping>) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    const addRow = () =>
        setRows((rs) => [...rs, { id: uuidv4(), keystroke: { ...emptyKeystroke }, symbol: '', instruments: [] }])
    const deleteRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id))

    // Validation: empty/invalid symbols, empty keystrokes, and ambiguous bindings
    // (the same keystroke bound to two different symbols). Multiple keystrokes → one
    // symbol is allowed. Grouping key uses formatKeystroke, which matches the runtime
    // matcher (shift folded into printable keys).
    const byKeystroke = new Map<string, Set<string>>()
    for (const r of rows) {
        if (!r.keystroke.key) continue
        const k = formatKeystroke(r.keystroke)
        const set = byKeystroke.get(k) ?? new Set<string>()
        set.add(r.symbol)
        byKeystroke.set(k, set)
    }
    const ambiguous = [...byKeystroke.entries()].filter(([, symbols]) => symbols.size > 1).map(([k]) => k)
    const invalidSymbolRows = rows.filter((r) => !symbolValid(r.symbol))
    const missingKeystrokeRows = rows.filter((r) => !r.keystroke.key)

    const errors: string[] = []
    if (invalidSymbolRows.length) errors.push(`${invalidSymbolRows.length} row(s) have an empty or invalid symbol.`)
    if (missingKeystrokeRows.length) errors.push(`${missingKeystrokeRows.length} row(s) have no keystroke.`)
    if (ambiguous.length) errors.push(`Ambiguous keystroke(s): ${ambiguous.join(', ')} map to more than one symbol.`)

    const handleConfirm = () => {
        if (errors.length || !selected) return
        updateMappings(selected.id, rows)
        setOpen(false)
    }

    const handleNew = () => {
        const id = addKeyMap('New mapping')
        setSelectedKeyMapId(id)
    }

    const handleSaveFile = () => {
        if (!selected) return
        const def: KeyMapDefinition = { ...selected, mappings: rows }
        download(`${selected.name || 'keymap'}.json`, JSON.stringify(def, null, 2))
    }

    const handleLoadFile = async (file: File) => {
        try {
            const def = JSON.parse(await file.text()) as KeyMapDefinition
            if (!Array.isArray(def.mappings)) throw new Error('not a key map')
            const id = importKeyMap(def)
            setSelectedKeyMapId(id)
        } catch {
            // Silent: a malformed file simply does nothing. (Could surface a toast later.)
        }
    }

    return (
        <Drawer open={open} backdrop={false} enforceFocus={false} size="md" onClose={() => setOpen(false)}>
            <Drawer.Header>
                <Drawer.Title>Keyboard mapping</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} appearance="primary" disabled={errors.length > 0}>
                        Confirm
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                <Stack spacing={8} alignItems="center" wrap className="mb-3">
                    <span className="text-sm">keyboard definition:</span>
                    <SelectPicker
                        cleanable={false}
                        searchable={false}
                        style={{ width: 200 }}
                        data={keyMaps.map((k) => ({ label: k.name, value: k.id }))}
                        value={selected?.id}
                        onChange={(id) => id && setSelectedKeyMapId(id)}
                    />
                    <Input
                        size="sm"
                        style={{ width: 160 }}
                        placeholder="name"
                        value={selected?.name ?? ''}
                        onChange={(name) => selected && renameKeyMap(selected.id, name)}
                    />
                    <Button size="sm" onClick={handleNew}>
                        New
                    </Button>
                    <Button size="sm" onClick={handleSaveFile}>
                        Save to file
                    </Button>
                    <Button size="sm" onClick={() => fileInput.current?.click()}>
                        Load from file
                    </Button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="application/json"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleLoadFile(f)
                            e.target.value = ''
                        }}
                    />
                </Stack>

                {errors.length > 0 && (
                    <Message type="error" className="mb-3">
                        <ul className="list-disc pl-4">
                            {errors.map((msg) => (
                                <li key={msg}>{msg}</li>
                            ))}
                        </ul>
                    </Message>
                )}

                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-500">
                            <th className="pb-1 pr-2 font-normal">symbol</th>
                            <th className="pb-1 pr-2 font-normal">keystroke</th>
                            <th className="pb-1 pr-2 font-normal">instrument(s)</th>
                            <th className="pb-1" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="align-top">
                                <td className="pb-2 pr-2 w-24">
                                    <Input
                                        size="sm"
                                        value={row.symbol}
                                        onChange={(symbol) => setRow(row.id, { symbol })}
                                    />
                                </td>
                                <td className="pb-2 pr-2 w-40">
                                    <KeystrokeInput
                                        value={row.keystroke}
                                        onChange={(keystroke) => setRow(row.id, { keystroke })}
                                    />
                                </td>
                                <td className="pb-2 pr-2">
                                    <CheckPicker
                                        size="sm"
                                        block
                                        placeholder="all"
                                        data={instrumentOptions}
                                        value={row.instruments}
                                        onChange={(v) =>
                                            setRow(row.id, { instruments: (v as (Position | PositionGroup)[]) ?? [] })
                                        }
                                    />
                                </td>
                                <td className="pb-2">
                                    <IconButton
                                        size="sm"
                                        icon={<MinusIcon />}
                                        onClick={() => deleteRow(row.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <IconButton className="mt-2" size="sm" icon={<PlusIcon />} onClick={addRow}>
                    Add mapping
                </IconButton>
            </Drawer.Body>
        </Drawer>
    )
}
