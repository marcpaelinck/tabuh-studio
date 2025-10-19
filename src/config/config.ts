export const dimRateNonFocusedInstruments = 0.1 // Fraction to which the volume of instruments other than the focus should be reduced
export const BaseNote: string = "16n"
export const SOUNDS_FOLDER = 'sounds/'

export const NOTES = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3']

// A tone corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
// Muting denotes whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
export type Note = [tone: string, muting: string]

export type Notes = Note[]

export type InstrumentConfig = {
    type: string
    alphabet: string[]
    notes: Notes[] //single note, or multiple notes that are played simultaneously
    svg_file: string | null,
    sampletemplate: string
    volume: number
}
export const instrumentConfigs: Record<string, InstrumentConfig> = {
    GONGS: {
        type: 'percussion',
        alphabet: ['G', 'P', 'T'],
        notes: [[['GIR', 'OPEN']], [['PUR', 'OPEN']], [['TONG', 'OPEN']]],
        volume: -24,
        svg_file: "GK_GONGS.svg",
        sampletemplate: "GK_GONGS_{tone}_{muting}.mp3",
    },
    KEMPLI: {
        type: 'percussion',
        alphabet: ['x?'],
        notes: [[['STRIKE', 'MUTED']]],
        volume: -20,
        svg_file: null,
        sampletemplate: "GK_KEMPLI_{tone}_{muting}.mp3",
    },
    CENGCENG: {
        type: 'percussion',
        alphabet: ['x', 'x?'],
        notes: [[['STRIKE', 'OPEN']], [['STRIKE', 'MUTED']]],
        volume: -24,
        svg_file: null,
        sampletemplate: "GK_CENGCENG_{tone}_{muting}.mp3",
    },
    KENDANG: {
        type: 'percussion',
        alphabet: ['(', ')', '*', '0', '8', '9'],
        notes: [[['TUT', 'OPEN']], [['KUNG', 'OPEN']], [['PAK', 'OPEN']], [['CUNG', 'OPEN']], [['KA', 'OPEN']], [['DE', 'OPEN']]],
        volume: -10,
        svg_file: "GK_KENDANG.svg",
        sampletemplate: "GK_KENDANG_{tone}_{muting}.wav",
    },
    JEGOGAN: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [[['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']]],
        volume: -24,
        svg_file: "GK_JEGOGAN.svg",
        sampletemplate: "GK_JEGOGAN_{tone}_{muting}.mp3",
    },
    CALUNG: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [[['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']]],
        volume: -24,
        svg_file: "GK_CALUNG.svg",
        sampletemplate: "GK_CALUNG_{tone}_{muting}.mp3",
    },
    PENYACAH: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [[['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']]],
        volume: -24,
        svg_file: "GK_PENYACAH.svg",
        sampletemplate: "GK_PENYACAH_{tone}_{muting}.mp3",
    },
    KANTILAN_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{tone}_{muting}.mp3",
    },
    KANTILAN_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{tone}_{muting}.mp3",
    },
    PEMADE_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{tone}_{muting}.mp3",
    },
    PEMADE_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{tone}_{muting}.mp3",
    },
    UGAL: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        volume: -24,
        svg_file: "GK_UGAL.svg",
        sampletemplate: "GK_UGAL_{tone}_{muting}.mp3",
    },
    REYONG_1: {
        type: 'melodic',
        alphabet: ['e,', 'u,', 'a,', 'i', 'o', 'e', 'r', 'r?', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [[['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DENG0', 'OPEN'], ['DING1', 'OPEN']], [['DENG0', 'MUTED'], ['DING1', 'MUTED']], [['DENG0', 'OPEN'], ['DANG0', 'OPEN']], [['DENG0', 'ABBREVIATED'], ['DANG0', 'ABBREVIATED']], [['DENG0', 'MUTED'], ['DANG0', 'MUTED']], [['TICKDUNG0', 'OPEN']], [['TICKDUNG0', 'MUTED']]],
        volume: -24,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{tone}_{muting}.mp3",
    },
    REYONG_2: {
        type: 'melodic',
        alphabet: ['u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [[['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING1', 'OPEN'], ['DENG1', 'OPEN']], [['DING1', 'ABBREVIATED'], ['DENG1', 'ABBREVIATED']], [['DING1', 'MUTED'], ['DENG1', 'MUTED']], [['TICKDONG1', 'OPEN']], [['TICKDONG1', 'MUTED']]],
        volume: -24,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{tone}_{muting}.mp3",
    },
    REYONG_3: {
        type: 'melodic',
        alphabet: ['o', 'e', 'u', 'a', 'i<', 'o<', 'e<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [[['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG2', 'OPEN']], [['DENG2', 'OPEN']], [['DUNG1', 'OPEN'], ['DING2', 'OPEN']], [['DUNG1', 'ABBREVIATED'], ['DING2', 'ABBREVIATED']], [['DUNG1', 'MUTED'], ['DING2', 'MUTED']], [['TICKDANG1', 'OPEN']], [['TICKDANG1', 'MUTED']]],
        volume: -24,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{tone}_{muting}.mp3",
    },
    REYONG_4: {
        type: 'melodic',
        alphabet: ['u', 'a,', 'i<', 'o<', 'e<', 'u<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [[['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG2', 'OPEN']], [['DENG2', 'OPEN']], [['DUNG2', 'OPEN']], [['DING2', 'OPEN'], ['DENG2', 'OPEN']], [['DING2', 'ABBREVIATED'], ['DENG2', 'ABBREVIATED']], [['DING2', 'MUTED'], ['DENG2', 'MUTED']], [['TICKDENG2', 'OPEN']], [['TICKDENG2', 'MUTED']]],
        volume: -24,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{tone}_{muting}.mp3",
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
        TICKOPEN: ["green", "lime"],
        TICKMUTED: ["blue", "aqua"],
        KAPAK: ["green"],
        DETUT: ["blue"],
        CUNGKUNG: ["purple"]
    }
}
