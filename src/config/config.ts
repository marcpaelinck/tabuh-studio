export const SOUNDS_FOLDER = 'sounds/'

export const NOTES = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3']

export type KeyPOS = [string, string]

export type KeyGroup = KeyPOS[]

export type InstrumentConfig = {
    type: string
    alphabet: string[]
    noteGroups: KeyGroup[] //group of notea [pitch, octave, stroke] that are played simultaneously on the same instrument
    samples: string[]
    volume: number
}
export const instrumentConfigs: Record<string, InstrumentConfig> = {
    GONGS: {
        type: 'percussion',
        alphabet: ['G', 'P', 'T'],
        noteGroups: [[['GIR', 'OPEN']], [['PUR', 'OPEN']], [['TONG', 'OPEN']]],
        samples: ['Gong_OPEN.mp3', 'Kempur_OPEN.mp3', 'Kemong_OPEN.mp3'],
        volume: -24,
    },
    KEMPLI: {
        type: 'percussion',
        alphabet: ['x?'],
        noteGroups: [[['STRIKE', 'MUTED']]],
        samples: ['Kempli_MUTED.mp3'],
        volume: -20,
    },
    CENGCENG: {
        type: 'percussion',
        alphabet: ['x', 'x?'],
        noteGroups: [[['STRIKE', 'OPEN']], [['STRIKE', 'MUTED']]],
        samples: ['Cengceng_OPEN.mp3', 'Cengceng_MUTED.mp3'],
        volume: -24,
    },
    KENDANG: {
        type: 'percussion',
        alphabet: ['(', ')', '*', '0', '8', '9'],
        noteGroups: [[['TUT', 'OPEN']], [['KUNG', 'OPEN']], [['PAK', 'OPEN']], [['CUNG', 'OPEN']], [['KA', 'OPEN']], [['DE', 'OPEN']]],
        samples: ['Kendang TUT lanang.wav', 'Kendang KUNG lanang.wav', 'Kendang PAK lanang.wav', 'Kendang CUNG wadon.wav', 'Kendang KA wadon.wav', 'Kendang DE wadon.wav'],
        volume: -15,
    },
    JEGOGAN: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        noteGroups: [[['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']]],
        samples: ['Jegogan_DING1.mp3', 'Jegogan_DONG1.mp3', 'Jegogan_DENG1.mp3', 'Jegogan_DUNG1.mp3', 'Jegogan_DANG1.mp3'],
        volume: -24,
    },
    CALUNG: {
        type: 'melodic',
        alphabet: ['i', 'o', 'e', 'u', 'a'],
        noteGroups: [[['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']]],
        samples: ['Calung_DING1.mp3', 'Calung_DONG1.mp3', 'Calung_DENG1.mp3', 'Calung_DUNG1.mp3', 'Calung_DANG1.mp3'],
        volume: -24,
    },
    KANTILAN_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        noteGroups: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        samples: ['Kantilan_DONG0.mp3', 'Kantilan_DENG0.mp3', 'Kantilan_DUNG0.mp3', 'Kantilan_DANG0.mp3', 'Kantilan_DING1.mp3', 'Kantilan_DONG1.mp3', 'Kantilan_DENG1.mp3', 'Kantilan_DUNG1.mp3', 'Kantilan_DANG1.mp3', 'Kantilan_DING2.mp3', 'Kantilan_DONG0_MUTED.mp3', 'Kantilan_DENG0_MUTED.mp3', 'Kantilan_DUNG0_MUTED.mp3', 'Kantilan_DANG0_MUTED.mp3', 'Kantilan_DING1_MUTED.mp3', 'Kantilan_DONG1_MUTED.mp3', 'Kantilan_DENG1_MUTED.mp3', 'Kantilan_DUNG1_MUTED.mp3', 'Kantilan_DANG1_MUTED.mp3', 'Kantilan_DING2_MUTED.mp3', 'Kantilan_DONG0_ABBREVIATED.mp3', 'Kantilan_DENG0_ABBREVIATED.mp3', 'Kantilan_DUNG0_ABBREVIATED.mp3', 'Kantilan_DANG0_ABBREVIATED.mp3', 'Kantilan_DING1_ABBREVIATED.mp3', 'Kantilan_DONG1_ABBREVIATED.mp3', 'Kantilan_DENG1_ABBREVIATED.mp3', 'Kantilan_DUNG1_ABBREVIATED.mp3', 'Kantilan_DANG1_ABBREVIATED.mp3', 'Kantilan_DING2_ABBREVIATED.mp3'],
        volume: -24,
    },
    KANTILAN_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        noteGroups: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        samples: ['Kantilan_DONG0.mp3', 'Kantilan_DENG0.mp3', 'Kantilan_DUNG0.mp3', 'Kantilan_DANG0.mp3', 'Kantilan_DING1.mp3', 'Kantilan_DONG1.mp3', 'Kantilan_DENG1.mp3', 'Kantilan_DUNG1.mp3', 'Kantilan_DANG1.mp3', 'Kantilan_DING2.mp3', 'Kantilan_DONG0_MUTED.mp3', 'Kantilan_DENG0_MUTED.mp3', 'Kantilan_DUNG0_MUTED.mp3', 'Kantilan_DANG0_MUTED.mp3', 'Kantilan_DING1_MUTED.mp3', 'Kantilan_DONG1_MUTED.mp3', 'Kantilan_DENG1_MUTED.mp3', 'Kantilan_DUNG1_MUTED.mp3', 'Kantilan_DANG1_MUTED.mp3', 'Kantilan_DING2_MUTED.mp3', 'Kantilan_DONG0_MUTED.mp3', 'Kantilan_DENG0_MUTED.mp3', 'Kantilan_DUNG0_MUTED.mp3', 'Kantilan_DANG0_MUTED.mp3', 'Kantilan_DING1_MUTED.mp3', 'Kantilan_DONG1_MUTED.mp3', 'Kantilan_DENG1_MUTED.mp3', 'Kantilan_DUNG1_MUTED.mp3', 'Kantilan_DANG1_MUTED.mp3', 'Kantilan_DING2_MUTED.mp3'],
        volume: -24,
    },
    PEMADE_POLOS: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        noteGroups: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        samples: ['Pemade_DONG0.mp3', 'Pemade_DENG0.mp3', 'Pemade_DUNG0.mp3', 'Pemade_DANG0.mp3', 'Pemade_DING1.mp3', 'Pemade_DONG1.mp3', 'Pemade_DENG1.mp3', 'Pemade_DUNG1.mp3', 'Pemade_DANG1.mp3', 'Pemade_DING2.mp3', 'Pemade_DONG0_MUTED.mp3', 'Pemade_DENG0_MUTED.mp3', 'Pemade_DUNG0_MUTED.mp3', 'Pemade_DANG0_MUTED.mp3', 'Pemade_DING1_MUTED.mp3', 'Pemade_DONG1_MUTED.mp3', 'Pemade_DENG1_MUTED.mp3', 'Pemade_DUNG1_MUTED.mp3', 'Pemade_DANG1_MUTED.mp3', 'Pemade_DING2_MUTED.mp3', 'Pemade_DONG0_MUTED.mp3', 'Pemade_DENG0_MUTED.mp3', 'Pemade_DUNG0_MUTED.mp3', 'Pemade_DANG0_MUTED.mp3', 'Pemade_DING1_MUTED.mp3', 'Pemade_DONG1_MUTED.mp3', 'Pemade_DENG1_MUTED.mp3', 'Pemade_DUNG1_MUTED.mp3', 'Pemade_DANG1_MUTED.mp3', 'Pemade_DING2_MUTED.mp3'],
        volume: -24,
    },
    PEMADE_SANGSIH: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        noteGroups: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        samples: ['Pemade_DONG0.mp3', 'Pemade_DENG0.mp3', 'Pemade_DUNG0.mp3', 'Pemade_DANG0.mp3', 'Pemade_DING1.mp3', 'Pemade_DONG1.mp3', 'Pemade_DENG1.mp3', 'Pemade_DUNG1.mp3', 'Pemade_DANG1.mp3', 'Pemade_DING2.mp3', 'Pemade_DONG0_MUTED.mp3', 'Pemade_DENG0_MUTED.mp3', 'Pemade_DUNG0_MUTED.mp3', 'Pemade_DANG0_MUTED.mp3', 'Pemade_DING1_MUTED.mp3', 'Pemade_DONG1_MUTED.mp3', 'Pemade_DENG1_MUTED.mp3', 'Pemade_DUNG1_MUTED.mp3', 'Pemade_DANG1_MUTED.mp3', 'Pemade_DING2_MUTED.mp3', 'Pemade_DONG0_MUTED.mp3', 'Pemade_DENG0_MUTED.mp3', 'Pemade_DUNG0_MUTED.mp3', 'Pemade_DANG0_MUTED.mp3', 'Pemade_DING1_MUTED.mp3', 'Pemade_DONG1_MUTED.mp3', 'Pemade_DENG1_MUTED.mp3', 'Pemade_DUNG1_MUTED.mp3', 'Pemade_DANG1_MUTED.mp3', 'Pemade_DING2_MUTED.mp3'],
        volume: -24,
    },
    UGAL: {
        type: 'melodic',
        alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</', 'o,?', 'e,?', 'u,?', 'a,?', 'i?', 'o?', 'e?', 'u?', 'a?', 'i<?'],
        noteGroups: [[['DONG0', 'OPEN']], [['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG0', 'ABBREVIATED']], [['DENG0', 'ABBREVIATED']], [['DUNG0', 'ABBREVIATED']], [['DANG0', 'ABBREVIATED']], [['DING1', 'ABBREVIATED']], [['DONG1', 'ABBREVIATED']], [['DENG1', 'ABBREVIATED']], [['DUNG1', 'ABBREVIATED']], [['DANG1', 'ABBREVIATED']], [['DING2', 'ABBREVIATED']], [['DONG0', 'MUTED']], [['DENG0', 'MUTED']], [['DUNG0', 'MUTED']], [['DANG0', 'MUTED']], [['DING1', 'MUTED']], [['DONG1', 'MUTED']], [['DENG1', 'MUTED']], [['DUNG1', 'MUTED']], [['DANG1', 'MUTED']], [['DING2', 'MUTED']]],
        samples: ['Ugal_DONG0.mp3', 'Ugal_DENG0.mp3', 'Ugal_DUNG0.mp3', 'Ugal_DANG0.mp3', 'Ugal_DING1.mp3', 'Ugal_DONG1.mp3', 'Ugal_DENG1.mp3', 'Ugal_DUNG1.mp3', 'Ugal_DANG1.mp3', 'Ugal_DING2.mp3', 'Ugal_DONG0.mp3', 'Ugal_DENG0.mp3', 'Ugal_DUNG0.mp3', 'Ugal_DANG0.mp3', 'Ugal_DING1.mp3', 'Ugal_DONG1.mp3', 'Ugal_DENG1.mp3', 'Ugal_DUNG1.mp3', 'Ugal_DANG1.mp3', 'Ugal_DING2.mp3', 'Ugal_DONG0.mp3', 'Ugal_DENG0.mp3', 'Ugal_DUNG0.mp3', 'Ugal_DANG0.mp3', 'Ugal_DING1.mp3', 'Ugal_DONG1.mp3', 'Ugal_DENG1.mp3', 'Ugal_DUNG1.mp3', 'Ugal_DANG1.mp3', 'Ugal_DING2.mp3'],
        volume: -24,
    },
    REYONG_1: {
        type: 'melodic',
        alphabet: ['e,', 'u,', 'a,', 'i', 'o', 'e', 'r', 'b', 'b/', 'b?', 'x'],
        noteGroups: [[['DENG0', 'OPEN']], [['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DENG0', 'OPEN'], ['DING1', 'OPEN']], [['DENG0', 'OPEN'], ['DANG0', 'OPEN']], [['DENG0', 'ABBREVIATED'], ['DANG0', 'ABBREVIATED']], [['DENG0', 'MUTED'], ['DANG0', 'MUTED']], [['DUNG0', 'STRIKE']]],
        samples: ['Reyong_DENG0.mp3', 'Reyong_DUNG0.mp3', 'Reyong_DANG0.mp3', 'Reyong_DING1.mp3', 'Reyong_DONG1.mp3', 'Reyong_DENG1.mp3', 'Reyong_DENG0-DING1.mp3', 'Reyong_DENG0-DANG0.mp3', 'Reyong_DENG0-DANG0.mp3', 'Reyong_DENG0-DANG0.mp3', 'Reyong_DUNG0_TICK_1_PANGGUL.mp3', 'Reyong_DUNG0_TICK_2_PANGGUL.mp3'],
        volume: -30,
    },
    REYONG_2: {
        type: 'melodic',
        alphabet: ['u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'b', 'b/', 'b?', 'x'],
        noteGroups: [[['DUNG0', 'OPEN']], [['DANG0', 'OPEN']], [['DING1', 'OPEN']], [['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING1', 'OPEN'], ['DENG1', 'OPEN']], [['DING1', 'ABBREVIATED'], ['DENG1', 'ABBREVIATED']], [['DING1', 'MUTED'], ['DENG1', 'MUTED']], [['DONG1', 'STRIKE']]],
        samples: ['Reyong_DUNG0.mp3', 'Reyong_DANG0.mp3', 'Reyong_DING1.mp3', 'Reyong_DONG1.mp3', 'Reyong_DENG1.mp3', 'Reyong_DUNG1.mp3', 'Reyong_DANG1.mp3', 'Reyong_DING1-DENG1.mp3', 'Reyong_DING1-DENG1.mp3', 'Reyong_DING1-DENG1.mp3', 'Reyong_DONG1_TICK_1_PANGGUL.mp3', 'Reyong_DONG1_TICK_2_PANGGUL.mp3'],
        volume: -30,
    },
    REYONG_3: {
        type: 'melodic',
        alphabet: ['o', 'e', 'u', 'a', 'i<', 'o<', 'e<', 'b', 'b/', 'b?', 'x'],
        noteGroups: [[['DONG1', 'OPEN']], [['DENG1', 'OPEN']], [['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG2', 'OPEN']], [['DENG2', 'OPEN']], [['DUNG1', 'OPEN'], ['DING2', 'OPEN']], [['DUNG1', 'ABBREVIATED'], ['DING2', 'ABBREVIATED']], [['DUNG1', 'MUTED'], ['DING2', 'MUTED']], [['DUNG1', 'STRIKE']]],
        samples: ['Reyong_DONG1.mp3', 'Reyong_DENG1.mp3', 'Reyong_DUNG1.mp3', 'Reyong_DANG1.mp3', 'Reyong_DING2.mp3', 'Reyong_DONG2.mp3', 'Reyong_DENG2.mp3', 'Reyong_DUNG1-DING2.mp3', 'Reyong_DUNG1-DING2.mp3', 'Reyong_DUNG1-DING2.mp3', 'Reyong_DANG1_TICK_1_PANGGUL.mp3', 'Reyong_DANG1_TICK_2_PANGGUL.mp3'],
        volume: -30,
    },
    REYONG_4: {
        type: 'melodic',
        alphabet: ['u', 'a,', 'i<', 'o<', 'e<', 'u<', 'b', 'b/', 'b?', 'x'],
        noteGroups: [[['DUNG1', 'OPEN']], [['DANG1', 'OPEN']], [['DING2', 'OPEN']], [['DONG2', 'OPEN']], [['DENG2', 'OPEN']], [['DUNG2', 'OPEN']], [['DING2', 'OPEN'], ['DENG2', 'OPEN']], [['DING2', 'ABBREVIATED'], ['DENG2', 'ABBREVIATED']], [['DING2', 'MUTED'], ['DENG2', 'MUTED']], [['DONG2', 'STRIKE']]],
        samples: ['Reyong_DUNG1.mp3', 'Reyong_DANG1.mp3', 'Reyong_DING2.mp3', 'Reyong_DONG2.mp3', 'Reyong_DENG2.mp3', 'Reyong_DUNG2.mp3', 'Reyong_DONG2-DUNG2.mp3', 'Reyong_DONG2-DUNG2.mp3', 'Reyong_DONG2-DUNG2.mp3', 'Reyong_DENG2_TICK_1_PANGGUL.mp3', 'Reyong_DENG2_TICK_2_PANGGUL.mp3'],
        volume: -30,
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
    highlight: { [stroke: string]: string[] }
}

export const instrumentationConfig = {
    "instrumentation": {
        "GONG_KEBYAR": [
            { "group": "GONGS", "label": "GONGS", "svg_file": "GK_GONGS.svg" },
            { "group": "KENDANG", "label": "KENDANG", "svg_file": "GK_KENDANG.svg" },
            { "group": "JEGOGAN", "label": "JEGOGAN", "svg_file": "GK_JEGOGAN.svg" },
            { "group": "PENYACAH", "label": "PENYACAH", "svg_file": "GK_PENYACAH.svg" },
            { "group": "CALUNG", "label": "CALUNG", "svg_file": "GK_CALUNG.svg" },
            { "group": "PEMADE", "label": "PEMADE", "svg_file": "GK_GANGSA.svg" },
            { "group": "PEMADE_POLOS", "label": "- PEMADE_POLOS", "svg_file": "GK_GANGSA.svg" },
            { "group": "PEMADE_SANGSIH", "label": "- PEMADE_SANGSIH", "svg_file": "GK_GANGSA.svg" },
            { "group": "KANTILAN", "label": "KANTILAN", "svg_file": "GK_GANGSA.svg" },
            { "group": "KANTILAN_POLOS", "label": "- KANTILAN_POLOS", "svg_file": "GK_GANGSA.svg" },
            { "group": "KANTILAN_SANGSIH", "label": "- KANTILAN_SANGSIH", "svg_file": "GK_GANGSA.svg" },
            { "group": "UGAL", "label": "UGAL", "svg_file": "GK_GANGSA.svg" },
            { "group": "TROMPONG", "label": "TROMPONG", "animation": null },
            { "group": "REYONG", "label": "REYONG", "svg_file": "GK_REYONG.svg" },
            { "group": "REYONG_1", "label": "- REYONG_1", "svg_file": "GK_REYONG.svg" },
            { "group": "REYONG_2", "label": "- REYONG_2", "svg_file": "GK_REYONG.svg" },
            { "group": "REYONG_3", "label": "- REYONG_3", "svg_file": "GK_REYONG.svg" },
            { "group": "REYONG_4", "label": "- REYONG_4", "svg_file": "GK_REYONG.svg" }],
        "SEMAR_PAGULINGAN": [
            { "group": "GONGS", "label": "GONGS", "svg_file": "SP_GONGS.svg" },
            { "group": "KENDANG", "label": "KENDANG", "svg_file": "SP_KENDANG.svg" },
            { "group": "JEGOGAN", "label": "JEGOGAN", "svg_file": "SP_JEGOGAN.svg" },
            { "group": "CALUNG", "label": "CALUNG", "svg_file": "SP_CALUNG.svg" },
            { "group": "PEMADE", "label": "PEMADE", "svg_file": "SP_GANGSA.svg" },
            { "group": "PEMADE_POLOS", "label": "- PEMADE_POLOS", "svg_file": "SP_GANGSA.svg" },
            { "group": "PEMADE_SANGSIH", "label": "- PEMADE_SANGSIH", "svg_file": "SP_GANGSA.svg" },
            { "group": "KANTILAN", "label": "KANTILAN", "svg_file": "SP_GANGSA.svg" },
            { "group": "KANTILAN_POLOS", "label": "- KANTILAN_POLOS", "svg_file": "SP_GANGSA.svg" },
            { "group": "KANTILAN_SANGSIH", "label": "- KANTILAN_SANGSIH", "svg_file": "SP_GANGSA.svg" },
            { "group": "TROMPONG", "label": "TROMPONG", "svg_file": "SP_TROMPONG.svg" }
        ]
    },
    "highlight": {
        "OPEN": ["green", "lime"],
        "ABBREVIATED": ["blue", "aqua"],
        "MUTED": ["purple", "fuchsia"],
        "TICK1": ["green", "lime"],
        "TICK2": ["blue", "aqua"],
        "KAPAK": ["green"],
        "DETUT": ["blue"],
        "CUNGKUNG": ["purple"]
    }
}