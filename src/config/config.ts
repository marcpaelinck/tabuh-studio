export const dimRateNonFocusedInstruments = 0.1 // Fraction to which the volume of instruments other than the focus should be reduced
export const BaseNote: string = "16n"
export const SOUNDS_FOLDER = 'sounds/'
export const alwaysFocusPositions = ["KEMPLI", "GONGS"]

export const NOTES = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3']

// A note is represented as {tone}_{muting}, e.g. O1_O, in case of a gangsa, stands for DONG1 OPEN.
// A tone corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
// Muting denotes whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)

export type InstrumentConfig = {
    type: string
    alphabet: string[]
    notes: string[][] //list of single notes or multiple notes that are played simultaneously
    svg_file: string | null,
    sampletemplate: string
    volume: number
}
export const instrumentConfigs: Record<string, InstrumentConfig> = {
    GONGS: {
        type: 'percussion',
        alphabet: ['G', 'P', 'T'],
        notes: [['GIR_OPEN'], ['PUR_OPEN'], ['TONG_OPEN']],
        volume: 0,
        svg_file: "GK_GONGS.svg",
        sampletemplate: "GK_GONGS_{note}.mp3",
    },
    KEMPLI: {
        type: 'percussion',
        alphabet: ['x?'],
        notes: [['X_MUTED']],
        volume: -5,
        svg_file: null,
        sampletemplate: "GK_KEMPLI_{note}.mp3",
    },
    CENGCENG: {
        type: 'percussion',
        alphabet: ['x', 'x?'],
        notes: [['X_OPEN'], ['X_MUTED']],
        volume: -14,
        svg_file: null,
        sampletemplate: "GK_CENGCENG_{note}.mp3",
    },
    KENDANG: {
        type: 'percussion',
        alphabet: ['(', ')', '*', '0', '8', '9'],
        notes: [['TUT_OPEN'], ['KUNG_OPEN'], ['PAK_OPEN'], ['CUNG_OPEN'], ['KA_OPEN'], ['DE_OPEN']],
        volume: 0,
        svg_file: "GK_KENDANG.svg",
        sampletemplate: "GK_KENDANG_{note}.wav",
    },
    JEGOGAN: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN']],
        volume: -14,
        svg_file: "GK_JEGOGAN.svg",
        sampletemplate: "GK_JEGOGAN_{note}.mp3",
    },
    CALUNG: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN']],
        volume: -14,
        svg_file: "GK_CALUNG.svg",
        sampletemplate: "GK_CALUNG_{note}.mp3",
    },
    PENYACAH: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN']],
        volume: -14,
        svg_file: "GK_PENYACAH.svg",
        sampletemplate: "GK_PENYACAH_{note}.mp3",
    },
    KANTILAN_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0_OPEN'], ['DENG0_OPEN'], ['DUNG0_OPEN'], ['DANG0_OPEN'], ['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING2_OPEN'], ['DONG0_ABBREVIATED'], ['DENG0_ABBREVIATED'], ['DUNG0_ABBREVIATED'], ['DANG0_ABBREVIATED'], ['DING1_ABBREVIATED'], ['DONG1_ABBREVIATED'], ['DENG1_ABBREVIATED'], ['DUNG1_ABBREVIATED'], ['DANG1_ABBREVIATED'], ['DING2_ABBREVIATED'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{note}.mp3",
    },
    KANTILAN_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0_OPEN'], ['DENG0_OPEN'], ['DUNG0_OPEN'], ['DANG0_OPEN'], ['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING2_OPEN'], ['DONG0_ABBREVIATED'], ['DENG0_ABBREVIATED'], ['DUNG0_ABBREVIATED'], ['DANG0_ABBREVIATED'], ['DING1_ABBREVIATED'], ['DONG1_ABBREVIATED'], ['DENG1_ABBREVIATED'], ['DUNG1_ABBREVIATED'], ['DANG1_ABBREVIATED'], ['DING2_ABBREVIATED'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{note}.mp3",
    },
    PEMADE_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0_OPEN'], ['DENG0_OPEN'], ['DUNG0_OPEN'], ['DANG0_OPEN'], ['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING2_OPEN'], ['DONG0_ABBREVIATED'], ['DENG0_ABBREVIATED'], ['DUNG0_ABBREVIATED'], ['DANG0_ABBREVIATED'], ['DING1_ABBREVIATED'], ['DONG1_ABBREVIATED'], ['DENG1_ABBREVIATED'], ['DUNG1_ABBREVIATED'], ['DANG1_ABBREVIATED'], ['DING2_ABBREVIATED'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{note}.mp3",
    },
    PEMADE_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0_OPEN'], ['DENG0_OPEN'], ['DUNG0_OPEN'], ['DANG0_OPEN'], ['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING2_OPEN'], ['DONG0_ABBREVIATED'], ['DENG0_ABBREVIATED'], ['DUNG0_ABBREVIATED'], ['DANG0_ABBREVIATED'], ['DING1_ABBREVIATED'], ['DONG1_ABBREVIATED'], ['DENG1_ABBREVIATED'], ['DUNG1_ABBREVIATED'], ['DANG1_ABBREVIATED'], ['DING2_ABBREVIATED'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{note}.mp3",
    },
    UGAL: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['DONG0_OPEN'], ['DENG0_OPEN'], ['DUNG0_OPEN'], ['DANG0_OPEN'], ['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING2_OPEN'], ['DONG0_ABBREVIATED'], ['DENG0_ABBREVIATED'], ['DUNG0_ABBREVIATED'], ['DANG0_ABBREVIATED'], ['DING1_ABBREVIATED'], ['DONG1_ABBREVIATED'], ['DENG1_ABBREVIATED'], ['DUNG1_ABBREVIATED'], ['DANG1_ABBREVIATED'], ['DING2_ABBREVIATED'], ['DONG0_MUTED'], ['DENG0_MUTED'], ['DUNG0_MUTED'], ['DANG0_MUTED'], ['DING1_MUTED'], ['DONG1_MUTED'], ['DENG1_MUTED'], ['DUNG1_MUTED'], ['DANG1_MUTED'], ['DING2_MUTED']],
        volume: -14,
        svg_file: "GK_UGAL.svg",
        sampletemplate: "GK_UGAL_{note}.mp3",
    },
    REYONG_1: {
        type: 'melodic',
        alphabet: ['e,', 'u,', 'a,', 'i', 'o', 'e', 'r', 'r?', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DENG0_OPEN'], ['DUNG0_OPEN'], ['DANG0_OPEN'], ['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DENG0_OPEN', 'DING1_OPEN'], ['DENG0_MUTED', 'DING1_MUTED'], ['DENG0_OPEN', 'DANG0_OPEN'], ['DENG0_ABBREVIATED', 'DANG0_ABBREVIATED'], ['DENG0_MUTED', 'DANG0_MUTED'], ['XDUNG0_OPEN'], ['XDUNG0_MUTED']],
        volume: -14,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_2: {
        type: 'melodic',
        alphabet: ['u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DUNG0_OPEN'], ['DANG0_OPEN'], ['DING1_OPEN'], ['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING1_OPEN', 'DENG1_OPEN'], ['DING1_ABBREVIATED', 'DENG1_ABBREVIATED'], ['DING1_MUTED', 'DENG1_MUTED'], ['XDONG1_OPEN'], ['XDONG1_MUTED']],
        volume: -14,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_3: {
        type: 'melodic',
        alphabet: ['o', 'e', 'u', 'a', 'i<', 'o<', 'e<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DONG1_OPEN'], ['DENG1_OPEN'], ['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING2_OPEN'], ['DONG2_OPEN'], ['DENG2_OPEN'], ['DUNG1_OPEN', 'DING2_OPEN'], ['DUNG1_ABBREVIATED', 'DING2_ABBREVIATED'], ['DUNG1_MUTED', 'DING2_MUTED'], ['XDANG1_OPEN'], ['XDANG1_MUTED']],
        volume: -14,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_4: {
        type: 'melodic',
        alphabet: ['u', 'a,', 'i<', 'o<', 'e<', 'u<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['DUNG1_OPEN'], ['DANG1_OPEN'], ['DING2_OPEN'], ['DONG2_OPEN'], ['DENG2_OPEN'], ['DUNG2_OPEN'], ['DING2_OPEN', 'DENG2_OPEN'], ['DING2_ABBREVIATED', 'DENG2_ABBREVIATED'], ['DING2_MUTED', 'DENG2_MUTED'], ['XDENG2_OPEN'], ['XDENG2_MUTED']],
        volume: -14,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
}

export const cInstrumentConfigs: Record<string, string[]> = {
    REYONG_13: ['REYONG_1', 'REYONG_3'],
    REYONG_24: ['REYONG_2', 'REYONG_4'],
    REYONG: ['REYONG_13', 'REYONG_24'],
    KANTILAN: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'],
    PEMADE: ['PEMADE_POLOS', 'PEMADE_SANGSIH'],
    GANGSA: ['KANTILAN', 'PEMADE'],
    GANGSA_POLOS: ['KANTILAN_POLOS', 'PEMADE_POLOS'],
    GANGSA_SANGSIH: ['KANTILAN_SANGSIH', 'PEMADE_SANGSIH'],
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
    highlight: {
        OPEN: ["green", "lime"],
        ABBREVIATED: ["blue", "aqua"],
        MUTED: ["purple", "fuchsia"],
        KA: ["green"],
        PAK: ["green"],
        DE: ["blue"],
        TUT: ["blue"],
        CUNG: ["purple"],
        KUNG: ["purple"]
    }
}
