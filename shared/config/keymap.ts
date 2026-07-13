import type { EditableKeyMapping, KeyMapDefinition } from '../types/keymap.ts'
import type { PositionGroup } from '../types/position.ts'

// Utility function to simplify keystroke assignment
// Default values for all boolean attributes is false
const ks = ({
    key,
    ctrl,
    alt,
    shift,
    meta
}: {
    key: string
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    meta?: boolean
}) => ({ key, ctrl: ctrl ?? false, alt: alt ?? false, shift: shift ?? false, meta: meta ?? false })

// const ctrl: boolean = true
const alt: boolean = true
// const shift: boolean = true
// const meta: boolean = true

const defaultMappings: EditableKeyMapping[] = []

const larasMappings: EditableKeyMapping[] = [
    { id: '', keystroke: ks({ key: 'O' }), symbol: 'o,', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ key: 'E' }), symbol: 'e,', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ key: 'U' }), symbol: 'u,', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ key: 'A' }), symbol: 'a,', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ key: 'I' }), symbol: 'i', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ key: 'i' }), symbol: 'i<', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ alt, key: 'o' }), symbol: 'O', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ alt, key: 'e' }), symbol: 'E', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ alt, key: 'u' }), symbol: 'U', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ alt, key: 'a' }), symbol: 'A', instruments: ['MELODIC' as PositionGroup] },
    { id: '', keystroke: ks({ alt, key: 'i' }), symbol: 'I', instruments: ['MELODIC' as PositionGroup] }
    // Automatically assign id values
].map((obj, idx) => ({ ...obj, id: `${idx}` }))

export const keyMaps: KeyMapDefinition[] = [
    { id: '1', name: 'Default', mappings: defaultMappings },
    { id: '2', name: 'LARAS', mappings: larasMappings }
]
