export const dimRateNonFocusedInstruments = 0.1 // Fraction to which the volume of instruments other than the focus should be reduced
export const BaseNote: string = "16n"
export const SOUNDS_FOLDER = 'sounds/'

export const NOTES = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3']

// A tone corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
// Muting denotes whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
export type Note = string[]

export type Notes = Note[]

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
        notes: [['G_O'], ['P_O'], ['T_O']],
        volume: -24,
        svg_file: "GK_GONGS.svg",
        sampletemplate: "GK_GONGS_{note}.mp3",
    },
    KEMPLI: {
        type: 'percussion',
        alphabet: ['x?'],
        notes: [['X_M']],
        volume: -20,
        svg_file: null,
        sampletemplate: "GK_KEMPLI_{note}.mp3",
    },
    CENGCENG: {
        type: 'percussion',
        alphabet: ['x', 'x?'],
        notes: [['X_O'], ['X_M']],
        volume: -24,
        svg_file: null,
        sampletemplate: "GK_CENGCENG_{note}.mp3",
    },
    KENDANG: {
        type: 'percussion',
        alphabet: ['(', ')', '*', '0', '8', '9'],
        notes: [['TU_O'], ['KU_O'], ['PA_O'], ['CU_O'], ['KA_O'], ['DE_O']],
        volume: -10,
        svg_file: "GK_KENDANG.svg",
        sampletemplate: "GK_KENDANG_{note}.wav",
    },
    JEGOGAN: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O']],
        volume: -24,
        svg_file: "GK_JEGOGAN.svg",
        sampletemplate: "GK_JEGOGAN_{note}.mp3",
    },
    CALUNG: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O']],
        volume: -24,
        svg_file: "GK_CALUNG.svg",
        sampletemplate: "GK_CALUNG_{note}.mp3",
    },
    PENYACAH: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        notes: [['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O']],
        volume: -24,
        svg_file: "GK_PENYACAH.svg",
        sampletemplate: "GK_PENYACAH_{note}.mp3",
    },
    KANTILAN_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['O0_O'], ['E0_O'], ['U0_O'], ['A0_O'], ['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O'], ['I2_O'], ['O0_A'], ['E0_A'], ['U0_A'], ['A0_A'], ['I1_A'], ['O1_A'], ['E1_A'], ['U1_A'], ['A1_A'], ['I2_A'], ['O0_M'], ['E0_M'], ['U0_M'], ['A0_M'], ['I1_M'], ['O1_M'], ['E1_M'], ['U1_M'], ['A1_M'], ['I2_M']],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{note}.mp3",
    },
    KANTILAN_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['O0_O'], ['E0_O'], ['U0_O'], ['A0_O'], ['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O'], ['I2_O'], ['O0_A'], ['E0_A'], ['U0_A'], ['A0_A'], ['I1_A'], ['O1_A'], ['E1_A'], ['U1_A'], ['A1_A'], ['I2_A'], ['O0_M'], ['E0_M'], ['U0_M'], ['A0_M'], ['I1_M'], ['O1_M'], ['E1_M'], ['U1_M'], ['A1_M'], ['I2_M']],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_KANTILAN_{note}.mp3",
    },
    PEMADE_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['O0_O'], ['E0_O'], ['U0_O'], ['A0_O'], ['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O'], ['I2_O'], ['O0_A'], ['E0_A'], ['U0_A'], ['A0_A'], ['I1_A'], ['O1_A'], ['E1_A'], ['U1_A'], ['A1_A'], ['I2_A'], ['O0_M'], ['E0_M'], ['U0_M'], ['A0_M'], ['I1_M'], ['O1_M'], ['E1_M'], ['U1_M'], ['A1_M'], ['I2_M']],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{note}.mp3",
    },
    PEMADE_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['O0_O'], ['E0_O'], ['U0_O'], ['A0_O'], ['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O'], ['I2_O'], ['O0_A'], ['E0_A'], ['U0_A'], ['A0_A'], ['I1_A'], ['O1_A'], ['E1_A'], ['U1_A'], ['A1_A'], ['I2_A'], ['O0_M'], ['E0_M'], ['U0_M'], ['A0_M'], ['I1_M'], ['O1_M'], ['E1_M'], ['U1_M'], ['A1_M'], ['I2_M']],
        volume: -24,
        svg_file: "GK_GANGSA.svg",
        sampletemplate: "GK_PEMADE_{note}.mp3",
    },
    UGAL: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        notes: [['O0_O'], ['E0_O'], ['U0_O'], ['A0_O'], ['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O'], ['I2_O'], ['O0_A'], ['E0_A'], ['U0_A'], ['A0_A'], ['I1_A'], ['O1_A'], ['E1_A'], ['U1_A'], ['A1_A'], ['I2_A'], ['O0_M'], ['E0_M'], ['U0_M'], ['A0_M'], ['I1_M'], ['O1_M'], ['E1_M'], ['U1_M'], ['A1_M'], ['I2_M']],
        volume: -24,
        svg_file: "GK_UGAL.svg",
        sampletemplate: "GK_UGAL_{note}.mp3",
    },
    REYONG_1: {
        type: 'melodic',
        alphabet: ['e,', 'u,', 'a,', 'i', 'o', 'e', 'r', 'r?', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['E0_O'], ['U0_O'], ['A0_O'], ['I1_O'], ['O1_O'], ['E1_O'], ['E0_O', 'I1_O'], ['E0_M', 'I1_M'], ['E0_O', 'A0_O'], ['E0_A', 'A0_A'], ['E0_M', 'A0_M'], ['XU0_O'], ['XU0_M']],
        volume: -24,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_2: {
        type: 'melodic',
        alphabet: ['u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['U0_O'], ['A0_O'], ['I1_O'], ['O1_O'], ['E1_O'], ['U1_O'], ['A1_O'], ['I1_O', 'E1_O'], ['I1_A', 'E1_A'], ['I1_M', 'E1_M'], ['XO1_O'], ['XO1_M']],
        volume: -24,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_3: {
        type: 'melodic',
        alphabet: ['o', 'e', 'u', 'a', 'i<', 'o<', 'e<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['O1_O'], ['E1_O'], ['U1_O'], ['A1_O'], ['I2_O'], ['O2_O'], ['E2_O'], ['U1_O', 'I2_O'], ['U1_A', 'I2_A'], ['U1_M', 'I2_M'], ['XA1_O'], ['XA1_M']],
        volume: -24,
        svg_file: "GK_REYONG.svg",
        sampletemplate: "GK_REYONG_{note}.mp3",
    },
    REYONG_4: {
        type: 'melodic',
        alphabet: ['u', 'a,', 'i<', 'o<', 'e<', 'u<', 'b', 'b/', 'b?', 'x', 'x/'],
        notes: [['U1_O'], ['A1_O'], ['I2_O'], ['O2_O'], ['E2_O'], ['U2_O'], ['I2_O', 'E2_O'], ['I2_A', 'E2_A'], ['I2_M', 'E2_M'], ['XE2_O'], ['XE2_M']],
        volume: -24,
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
