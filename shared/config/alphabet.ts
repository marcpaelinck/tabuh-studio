import type { NoteSymbol, ToneType } from '../types/basetypes'
import type { Position } from '../types/position'
import { positionConfigs, positionGroups } from './position'

export type Kind = 'tone' | 'prefix' | 'octavation' | 'modifier' | 'rest' | 'error' | 'null'
export type Category = 'melodic' | 'percussion' | 'colotomy' | 'all' | 'other'
export const invalidSymbol = '!'

export interface AlphabetItem {
    kind: Kind
    category?: Category
    combinesWith?: Category[]
    combinesWithPrefix?: boolean
    name: string
    description: string
    positions: Position[]
    /**
     * The tone a pitch character produces (1-to-1, orchestra-independent). Set only on atomic tone
     * symbols; absent on prefixes/octavation/modifiers/rests and on multi-note symbols (`b`, `t`)
     * whose notes come from the voicing. Prep for deriving `NoteObject.tone` (retires `noteConfigs`).
     */
    tone?: ToneType
}

// prettier-ignore
export const alphabet: Record<NoteSymbol, AlphabetItem> = {
    '.': {
        kind: 'rest',
        category: 'all',
        name: 'Silence',
        description: 'Mutes the previous note',
        positions: Object.keys(positionConfigs) as Position[]
    },
    '-': {
        kind: 'rest',
        category: 'all',
        name: 'Extension',
        description: 'Extends the previous note',
        positions: Object.keys(positionConfigs) as Position[]
    },
    ' ': {
        kind: 'rest',
        category: 'all',
        name: 'Extension',
        description: 'Extends the previous note',
        positions: Object.keys(positionConfigs) as Position[]
    },
    '0': {
        kind: 'tone',
        category: 'percussion',
        name: 'Krum',
        tone: 'CUNG',
        description: 'Lanang stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    '8': {
        kind: 'tone',
        category: 'percussion',
        name: 'Ka',
        tone: 'KA',
        description: 'Lanang stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    '9': {
        kind: 'tone',
        category: 'percussion',
        name: 'Det',
        tone: 'DE',
        description: 'Lanang stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    G: { kind: 'tone', category: 'colotomy', name: 'Gir', tone: 'GIR', description: 'Gong stroke', positions: ['GONGS'] },
    P: { kind: 'tone', category: 'colotomy', name: 'Pur', tone: 'PUR', description: 'Kempur stroke', positions: ['GONGS'] },
    T: { kind: 'tone', category: 'colotomy', name: 'Tong', tone: 'TONG', description: 'Kemong stroke', positions: ['GONGS'] },
    x: {
        kind: 'tone',
        category: 'percussion',
        name: 'Stroke',
        tone: 'X',
        description: 'percussion stroke. Reyong: on chime rim. Kempli: open stroke. Ceng-ceng: open stroke.',
        positions: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4', 'REYONGB_1', 'REYONGB_2', 'CENGCENG', 'KEMPLI', 'CENGCENG_P', 'CENGCENG_S', 'TAWATAWA']
    },
    y: {
        kind: 'tone',
        category: 'percussion',
        name: 'Stroke 2 panggul',
        description: 'percussion stroke. Reyong: on chime rim. Kempli: muted stroke. Ceng-ceng: open stroke.',
        positions: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4', 'REYONGB_1', 'REYONGB_2']
    },
    '(': {
        kind: 'tone',
        category: 'percussion',
        name: 'Tut',
        tone: 'TUT',
        description: 'Wadon stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    ')': {
        kind: 'tone',
        category: 'percussion',
        name: 'Pung',
        tone: 'KUNG',
        description: 'Wadon stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    '*': {
        kind: 'tone',
        category: 'percussion',
        name: 'Pak',
        tone: 'PAK',
        description: 'Wadon stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    i: {
        kind: 'tone',
        category: 'melodic',
        name: 'DING',
        tone: 'DING',
        description: 'Generic tone (without octave)',
        positions: positionGroups.MELODIC.positions
    },
    o: {
        kind: 'tone',
        category: 'melodic',
        name: 'DONG',
        tone: 'DONG',
        description: 'Generic tone (without octave)',
        positions: positionGroups.MELODIC.positions
    },
    e: {
        kind: 'tone',
        category: 'melodic',
        name: 'DENG',
        tone: 'DENG',
        description: 'Generic tone (without octave)',
        positions: positionGroups.MELODIC.positions
    },
    u: {
        kind: 'tone',
        category: 'melodic',
        name: 'DUNG',
        tone: 'DUNG',
        description: 'Generic tone (without octave)',
        positions: positionGroups.MELODIC.positions
    },
    a: {
        kind: 'tone',
        category: 'melodic',
        name: 'DANG',
        tone: 'DANG',
        description: 'Generic tone (without octave)',
        positions: positionGroups.MELODIC.positions
    },
    t: {
        kind: 'tone',
        category: 'melodic',
        name: 'DENG-DING',
        description: 'Combined stroke on DENG and DING (only used in DONG norot pattern)',
        positions: ['REYONG_1']
    },
    b: {
        kind: 'tone',
        category: 'percussion',
        name: 'Byong',
        description: "Combined stroke on first and third chime of a reyong position's 3-note range",
        positions: positionGroups.REYONG.positions
    },
    I: {
        kind: 'prefix',
        combinesWith: ['melodic'],
        name: 'DING grace note',
        description: 'Briefly struck note preceding another note',
        positions: positionGroups.MELODIC.positions
    },
    O: {
        kind: 'prefix',
        combinesWith: ['melodic'],
        name: 'DONG grace note',
        description: 'Briefly struck note preceding another note',
        positions: positionGroups.MELODIC.positions
    },
    E: {
        kind: 'prefix',
        combinesWith: ['melodic'],
        name: 'DENG grace note',
        description: 'Briefly struck note preceding another note',
        positions: positionGroups.MELODIC.positions
    },
    U: {
        kind: 'prefix',
        combinesWith: ['melodic'],
        name: 'DUNG grace note',
        description: 'Briefly struck note preceding another note',
        positions: positionGroups.MELODIC.positions
    },
    A: {
        kind: 'prefix',
        combinesWith: ['melodic'],
        name: 'DANG grace note',
        description: 'Briefly struck note preceding another note',
        positions: positionGroups.MELODIC.positions
    },
    X: {
        kind: 'prefix',
        combinesWith: ['melodic'],
        name: 'Stroke',
        description: 'Stroke on chime rim.',
        positions: positionGroups.REYONG.positions
    },
    B: {
        kind: 'prefix',
        combinesWith: ['percussion'],
        name: 'Byong',
        description: "Combined stroke on first and third chime of a reyong position's 3-note range",
        positions: positionGroups.REYONG.positions
    },
    ',': {
        kind: 'octavation',
        combinesWith: ['melodic'],
        combinesWithPrefix: true,
        name: 'Octave -1',
        description: 'Lowers the tone with one octave',
        positions: positionGroups.MELODIC.positions
    },
    '<': {
        kind: 'octavation',
        combinesWith: ['melodic'],
        combinesWithPrefix: true,
        name: 'Octave +1',
        description: 'Raises the tone with one octave',
        positions: positionGroups.MELODIC.positions
    },
    '/': {
        kind: 'modifier',
        combinesWith: ['melodic', 'percussion'],
        combinesWithPrefix: true,
        name: 'Abbreviated',
        description: 'Mutes note immediately after the stroke.',
        positions: positionGroups.MELODIC.positions.concat(positionGroups.PERCUSSION.positions)
    },
    '?': {
        kind: 'modifier',
        combinesWith: ['melodic', 'percussion'],
        combinesWithPrefix: true,
        name: 'Muted',
        description: 'Mutes note during the stroke.',
        positions: positionGroups.MELODIC.positions.concat(positionGroups.PERCUSSION.positions)
    },
    ';': {
        kind: 'modifier',
        combinesWith: ['melodic', 'percussion'],
        combinesWithPrefix: false,
        name: 'Tremolo',
        description: 'Repeated succession of the same note.',
        positions: positionGroups.MELODIC.positions.concat(positionGroups.PERCUSSION.positions)
    },
    ':': {
        kind: 'modifier',
        combinesWith: ['melodic', 'percussion'],
        combinesWithPrefix: false,
        name: 'Accelerating tremolo',
        description: 'Repeated succession of the same note, starting slowly and gradually increasing the tempo.',
        positions: positionGroups.MELODIC.positions.concat(positionGroups.PERCUSSION.positions)
    },
    _: {
        kind: 'modifier',
        combinesWith: ['melodic', 'percussion'],
        combinesWithPrefix: true,
        name: 'Half duration',
        description: 'Halves the duration of the note.',
        positions: positionGroups.MELODIC.positions.concat(positionGroups.PERCUSSION.positions)
    },
    '[': {
        kind: 'modifier',
        combinesWith: ['melodic'],
        combinesWithPrefix: false,
        name: 'Rake left',
        description:
            'Slide the panggul along the notes from left to right, starting on the note to which the modifier belongs.',
        positions: positionGroups.DAUN.positions
    },
    ']': {
        kind: 'modifier',
        combinesWith: ['melodic'],
        combinesWithPrefix: false,
        name: 'Rake left',
        description:
            'Slide the panggul along the notes from right to left, starting on the note to which the modifier belongs.',
        positions: positionGroups.DAUN.positions
    },
    n: {
        kind: 'modifier',
        combinesWith: ['melodic'],
        combinesWithPrefix: false,
        name: 'Norot',
        description: '4-note partial norot pattern. Combines with three trailing spaces.',
        positions: positionGroups.MELODIC.positions
    },
    '!': {
        kind: 'error',
        category: 'all',
        name: 'Invalid symbol',
        description: 'Invalid symbol',
        positions: Object.keys(positionConfigs) as Position[]
    }
}
