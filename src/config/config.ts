import type { Note } from "../models/types"

export const dimRateNonFocusedInstruments = 0.1 // Fraction to which the volume of instruments other than the focus should be reduced
export const BaseNote: string = "16n"
export const SOUNDS_FOLDER = 'sounds/'
export const alwaysFocusPositions = ["KEMPLI", "GONGS"]

export const NOTES = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3']

// A note is represented as {tone}_{muting}, e.g. O1_O, in case of a gangsa, stands for DONG1 OPEN.
// A tone corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
// Muting denotes whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)

export type InstrumentConfig = {
    //`notes` contains a list of single notes or multiple notes that are played simultaneously.
    // The string values are 'shorthand' codes that uniquely define a sample (see const noteConfigs).
    type: string
    alphabet: string[]
    notes: string[][]
    svg_file: string,
    sampletemplate: string
    volume: number
}

// Translates shorthand codes used in instrumentConfigs to Note records.
// The stroke is used for the animation.
export const noteConfigs: Record<string, Record<string, Note>> = {
    'percussion': {
        // GONGS
        'GIR': { tone: 'GIR', octave: null, stroke: null, muting: 'OPEN' },
        'PUR': { tone: 'PUR', octave: null, stroke: null, muting: 'OPEN' },
        'TONG': { tone: 'TONG', octave: null, stroke: null, muting: 'OPEN' },
        // KEMPLI
        'X_OPEN': { tone: 'X', octave: null, stroke: 'KNOB', muting: 'OPEN' },
        'X_MUTED': { tone: 'X', octave: null, stroke: 'KNOB', muting: 'MUTED' },
        // KENDANG
        'KA': { tone: 'KA', octave: null, stroke: null, muting: 'OPEN' },
        'PAK': { tone: 'PAK', octave: null, stroke: null, muting: 'OPEN' },
        'DE': { tone: 'DE', octave: null, stroke: null, muting: 'OPEN' },
        'TUT': { tone: 'TUT', octave: null, stroke: null, muting: 'OPEN' },
        'CUNG': { tone: 'CUNG', octave: null, stroke: null, muting: 'OPEN' },
        'KUNG': { tone: 'KUNG', octave: null, stroke: null, muting: 'OPEN' },
    },
    'melodic': {
        'DONG0': { tone: 'DONG', octave: 0, stroke: null, muting: 'OPEN' },
        'DENG0': { tone: 'DENG', octave: 0, stroke: null, muting: 'OPEN' },
        'DUNG0': { tone: 'DUNG', octave: 0, stroke: null, muting: 'OPEN' },
        'DANG0': { tone: 'DANG', octave: 0, stroke: null, muting: 'OPEN' },
        'DING1': { tone: 'DING', octave: 1, stroke: null, muting: 'OPEN' },
        'DONG1': { tone: 'DONG', octave: 1, stroke: null, muting: 'OPEN' },
        'DENG1': { tone: 'DENG', octave: 1, stroke: null, muting: 'OPEN' },
        'DUNG1': { tone: 'DUNG', octave: 1, stroke: null, muting: 'OPEN' },
        'DANG1': { tone: 'DANG', octave: 1, stroke: null, muting: 'OPEN' },
        'DING2': { tone: 'DING', octave: 2, stroke: null, muting: 'OPEN' },
        'DONG0_ABBR': { tone: 'DONG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        'DENG0_ABBR': { tone: 'DENG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        'DUNG0_ABBR': { tone: 'DUNG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        'DANG0_ABBR': { tone: 'DANG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        'DING1_ABBR': { tone: 'DING', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        'DONG1_ABBR': { tone: 'DONG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        'DENG1_ABBR': { tone: 'DENG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        'DUNG1_ABBR': { tone: 'DUNG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        'DANG1_ABBR': { tone: 'DANG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        'DING2_ABBR': { tone: 'DING', octave: 2, stroke: null, muting: 'ABBREVIATED' },
        'DONG0_MUTED': { tone: 'DONG', octave: 0, stroke: null, muting: 'MUTED' },
        'DENG0_MUTED': { tone: 'DENG', octave: 0, stroke: null, muting: 'MUTED' },
        'DUNG0_MUTED': { tone: 'DUNG', octave: 0, stroke: null, muting: 'MUTED' },
        'DANG0_MUTED': { tone: 'DANG', octave: 0, stroke: null, muting: 'MUTED' },
        'DING1_MUTED': { tone: 'DING', octave: 1, stroke: null, muting: 'MUTED' },
        'DONG1_MUTED': { tone: 'DONG', octave: 1, stroke: null, muting: 'MUTED' },
        'DENG1_MUTED': { tone: 'DENG', octave: 1, stroke: null, muting: 'MUTED' },
        'DUNG1_MUTED': { tone: 'DUNG', octave: 1, stroke: null, muting: 'MUTED' },
        'DANG1_MUTED': { tone: 'DANG', octave: 1, stroke: null, muting: 'MUTED' },
        'DING2_MUTED': { tone: 'DING', octave: 2, stroke: null, muting: 'MUTED' },
    },
    "reyong": {
        // REYONG SPECIFIC
        'DENG0': { tone: 'DENG', octave: 0, stroke: 'KNOB', muting: 'OPEN' },
        'DUNG0': { tone: 'DUNG', octave: 0, stroke: 'KNOB', muting: 'OPEN' },
        'DANG0': { tone: 'DANG', octave: 0, stroke: 'KNOB', muting: 'OPEN' },
        'DING1': { tone: 'DING', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        'DONG1': { tone: 'DONG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        'DENG1': { tone: 'DENG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        'DUNG1': { tone: 'DUNG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        'DANG1': { tone: 'DANG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        'DING2': { tone: 'DING', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        'DONG2': { tone: 'DONG', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        'DENG2': { tone: 'DENG', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        'DUNG2': { tone: 'DUNG', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        'DENG0_ABBR': { tone: 'DENG', octave: 0, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DUNG0_ABBR': { tone: 'DUNG', octave: 0, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DANG0_ABBR': { tone: 'DANG', octave: 0, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DING1_ABBR': { tone: 'DING', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DONG1_ABBR': { tone: 'DONG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DENG1_ABBR': { tone: 'DENG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DUNG1_ABBR': { tone: 'DUNG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DANG1_ABBR': { tone: 'DANG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DING2_ABBR': { tone: 'DING', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DONG2_ABBR': { tone: 'DONG', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DENG2_ABBR': { tone: 'DENG', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DUNG2_ABBR': { tone: 'DUNG', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        'DENG0_MUTED': { tone: 'DENG', octave: 0, stroke: 'KNOB', muting: 'MUTED' },
        'DUNG0_MUTED': { tone: 'DUNG', octave: 0, stroke: 'KNOB', muting: 'MUTED' },
        'DANG0_MUTED': { tone: 'DANG', octave: 0, stroke: 'KNOB', muting: 'MUTED' },
        'DING1_MUTED': { tone: 'DING', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        'DONG1_MUTED': { tone: 'DONG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        'DENG1_MUTED': { tone: 'DENG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        'DUNG1_MUTED': { tone: 'DUNG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        'DANG1_MUTED': { tone: 'DANG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        'DING2_MUTED': { tone: 'DING', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        'DONG2_MUTED': { tone: 'DONG', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        'DENG2_MUTED': { tone: 'DENG', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        'DUNG2_MUTED': { tone: 'DUNG', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        'XDUNG0': { tone: 'DUNG', octave: 0, stroke: 'RIM', muting: 'OPEN' },
        'XDONG1': { tone: 'DONG', octave: 1, stroke: 'RIM', muting: 'OPEN' },
        'XDANG1': { tone: 'DANG', octave: 1, stroke: 'RIM', muting: 'OPEN' },
        'XDENG2': { tone: 'DENG', octave: 2, stroke: 'RIM', muting: 'OPEN' },
        'XDUNG0_MUTED': { tone: 'DUNG', octave: 0, stroke: 'RIM', muting: 'MUTED' },
        'XDONG1_MUTED': { tone: 'DONG', octave: 1, stroke: 'RIM', muting: 'MUTED' },
        'XDANG1_MUTED': { tone: 'DANG', octave: 1, stroke: 'RIM', muting: 'MUTED' },
        'XDENG2_MUTED': { tone: 'DENG', octave: 2, stroke: 'RIM', muting: 'MUTED' },
    }
}

export const instrumentConfigs: Record<string, InstrumentConfig> = {
    GONGS: {
        type: 'percussion',
        alphabet: ['G', 'P', 'T'],
        notes: [['GIR'], ['PUR'], ['TONG']],
        volume: -5,
        svg_file: "/svg/GK_GONGS.svg",
        sampletemplate: "GK_GONGS_{note}.mp3",
    },
    KEMPLI: {
        type: 'percussion',
        alphabet: ['x?'],
        notes: [['X_MUTED']],
        volume: -5,
        svg_file: "",
        sampletemplate: "GK_KEMPLI_{note}.mp3",
    },
    CENGCENG: {
        type: 'percussion',
        alphabet: ['x', 'x?'],
        notes: [['X_OPEN'], ['X_MUTED']],
        volume: -14,
        svg_file: "",
        sampletemplate: "GK_CENGCENG_{note}.mp3",
    },
    KENDANG: {
        type: 'percussion',
        alphabet: ['(', ')', '*', '0', '8', '9'],
        notes: [['TUT'], ['KUNG'], ['PAK'], ['CUNG'], ['KA'], ['DE']],
        volume: 0,
        svg_file: "/svg/GK_KENDANG.svg",
        sampletemplate: "GK_KENDANG_{note}.wav",
    },
    JEGOGAN: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1']],
        volume: -14,
        svg_file: "/svg/GK_JEGOGAN.svg",
        sampletemplate: "GK_JEGOGAN_{note}.mp3",
    },
    CALUNG: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1']],
        volume: -14,
        svg_file: "/svg/GK_CALUNG.svg",
        sampletemplate: "GK_CALUNG_{note}.mp3",
    },
    PENYACAH: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1']],
        volume: -14,
        svg_file: "/svg/GK_PENYACAH.svg",
        sampletemplate: "GK_PENYACAH_{note}.mp3",
    },
    KANTILAN_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0'], ['DENG0'], ['DUNG0'], ['DANG0'], ['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1'], ['DING2'], ['DONG0_ABBR'], ['DENG0_ABBR'], ['DUNG0_ABBR'], ['DANG0_ABBR'], ['DING1_ABBR'], ['DONG1_ABBR'], ['DENG1_ABBR'], ['DUNG1_ABBR'], ['DANG1_ABBR'], ['DING2_ABBR'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{note}.mp3",
    },
    KANTILAN_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0'], ['DENG0'], ['DUNG0'], ['DANG0'], ['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1'], ['DING2'], ['DONG0_ABBR'], ['DENG0_ABBR'], ['DUNG0_ABBR'], ['DANG0_ABBR'], ['DING1_ABBR'], ['DONG1_ABBR'], ['DENG1_ABBR'], ['DUNG1_ABBR'], ['DANG1_ABBR'], ['DING2_ABBR'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{note}.mp3",
    },
    PEMADE_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0'], ['DENG0'], ['DUNG0'], ['DANG0'], ['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1'], ['DING2'], ['DONG0_ABBR'], ['DENG0_ABBR'], ['DUNG0_ABBR'], ['DANG0_ABBR'], ['DING1_ABBR'], ['DONG1_ABBR'], ['DENG1_ABBR'], ['DUNG1_ABBR'], ['DANG1_ABBR'], ['DING2_ABBR'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{note}.mp3",
    },
    PEMADE_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0'], ['DENG0'], ['DUNG0'], ['DANG0'], ['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1'], ['DING2'], ['DONG0_ABBR'], ['DENG0_ABBR'], ['DUNG0_ABBR'], ['DANG0_ABBR'], ['DING1_ABBR'], ['DONG1_ABBR'], ['DENG1_ABBR'], ['DUNG1_ABBR'], ['DANG1_ABBR'], ['DING2_ABBR'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{note}.mp3",
    },
    UGAL: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0'], ['DENG0'], ['DUNG0'], ['DANG0'], ['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1'], ['DING2'], ['DONG0_ABBR'], ['DENG0_ABBR'], ['DUNG0_ABBR'], ['DANG0_ABBR'], ['DING1_ABBR'], ['DONG1_ABBR'], ['DENG1_ABBR'], ['DUNG1_ABBR'], ['DANG1_ABBR'], ['DING2_ABBR'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_UGAL.svg",
        sampletemplate: "GK_UGAL_{note}.mp3",
    },
    REYONG_1: {
        type: 'reyong',
        alphabet: ['e,', 'u,', 'a,', 'i', 'o', 'e', 'r', 'r?', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DENG0'], ['DUNG0'], ['DANG0'], ['DING1'], ['DONG1'], ['DENG1'], ['DENG0', 'DING1'], ['DENG0_MUTED', 'DING1_MUTED'], ['DENG0', 'DANG0'], ['DENG0_ABBR', 'DANG0_ABBR'], ['DENG0_MUTED', 'DANG0_MUTED'], ['XDUNG0'], ['XDUNG0_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_2: {
        type: 'reyong',
        alphabet: ['u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DUNG0'], ['DANG0'], ['DING1'], ['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1'], ['DING1', 'DENG1'], ['DING1_ABBR', 'DENG1_ABBR'], ['DING1_MUTED', 'DENG1_MUTED'], ['XDONG1'], ['XDONG1_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_3: {
        type: 'reyong',
        alphabet: ['o', 'e', 'u', 'a', 'i<', 'o<', 'e<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DONG1'], ['DENG1'], ['DUNG1'], ['DANG1'], ['DING2'], ['DONG2'], ['DENG2'], ['DUNG1', 'DING2'], ['DUNG1_ABBR', 'DING2_ABBR'], ['DUNG1_MUTED', 'DING2_MUTED'], ['XDANG1'], ['XDANG1_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_4: {
        type: 'reyong',
        alphabet: ['u', 'a,', 'i<', 'o<', 'e<', 'u<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DUNG1'], ['DANG1'], ['DING2'], ['DONG2'], ['DENG2'], ['DUNG2'], ['DING2', 'DENG2'], ['DING2_ABBR', 'DENG2_ABBR'], ['DING2_MUTED', 'DENG2_MUTED'], ['XDENG2'], ['XDENG2_MUTED']],
        volume: -14,
        svg_file: "/svg/GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
}

export type InstrumentAnimationInfo = { group: string, label: string, svg_file: string }

export type AnimationConfig = {
    instrumentation: { [name: string]: InstrumentAnimationInfo[] }
    highlight: { [muting: string]: string[] }
}

export const focusOptions = {
    // value: [positions]
    GONGS: ["GONGS"],
    KENDANG: ["KENDANG"],
    JEGOGAN: ["JEGOGAN"],
    CALUNG: ["CALUNG"],
    PENYACAH: ["PENYACAH"],
    KANTILAN: ["KANTILAN_POLOS", "KANTILAN_SANGSIH"],
    "- KANTILAN_POLOS": ["KANTILAN_POLOS"],
    "- KANTILAN_SANGSIH": ["KANTILAN_SANGSIH"],
    PEMADE: ["PEMADE_POLOS", "PEMADE_SANGSIH"],
    "- PEMADE_POLOS": ["PEMADE_POLOS"],
    "- PEMADE_SANGSIH": ["PEMADE_SANGSIH"],
    UGAL: ["UGAL"],
    REYONG: ["REYONG_1", "REYONG_2", "REYONG_3", "REYONG_4"],
    "- REYONG_1": ["REYONG_1"],
    "- REYONG_2": ["REYONG_2"],
    "- REYONG_3": ["REYONG_3"],
    "- REYONG_4": ["REYONG_4"],
}

export const animationConfig = {
    // Highlight determines the highlight color.
    // Highlight keys can be a pitch or a muting type.
    // In case of a multiple match the pitch takes priority.
    highlight: {
        OPEN: ["green", "lime"],
        ABBREVIATED: ["blue", "aqua"],
        MUTED: ["purple", "fuchsia"],
        KA: ["green"],
        PAK: ["green"],
        DE: ["blue"],
        TUT: ["blue"],
        CUNG: ["purple"],
        KUNG: ["purple"],
    }

}
