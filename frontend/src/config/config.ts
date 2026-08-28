import type { MutingType, ToneType } from '@tabuhstudio/shared/types/basetypes'
import type { BPM, Subdivision } from 'tone/build/esm/core/type/Units'
import type { DynamicsValue } from '../typing/execution'
import type { EditorCursor } from '../typing/playback'
import type { Note } from '../typing/score'

// STYLE & THEME

export const FRAMESTYLE = ' border border-gray-300 '
export const tsBlue = '#1C78E0'

//prettier-ignore
export type CSSColors = | 'aliceblue' | 'antiquewhite' | 'aqua' | 'aquamarine' | 'azure' | 'beige' | 'bisque' | 'black' | 'blanchedalmond' | 'blue' | 'blueviolet' | 'brown' 
       | 'burlywood' | 'cadetblue' | 'chartreuse' | 'chocolate' | 'coral' | 'cornflowerblue' | 'cornsilk' | 'crimson' | 'cyan' | 'darkblue' | 'darkcyan' | 'darkgoldenrod'
       | 'darkgray' | 'darkgreen' | 'darkkhaki' | 'darkmagenta' | 'darkolivegreen' | 'darkorange' | 'darkorchid' | 'darkred' | 'darksalmon' | 'darkseagreen' | 'darkslateblue' 
       | 'darkslategray' | 'darkturquoise' | 'darkviolet' | 'deeppink' | 'deepskyblue' | 'dimgray' | 'dodgerblue' | 'firebrick' | 'floralwhite' | 'forestgreen' | 'fuchsia' 
       | 'gainsboro' | 'ghostwhite' | 'gold' | 'goldenrod' | 'gray' | 'green' | 'greenyellow' | 'honeydew' | 'hotpink' | 'indianred' | 'indigo' | 'ivory' | 'khaki' | 'lavender'
       | 'lavenderblush' | 'lawngreen' | 'lemonchiffon' | 'lightblue' | 'lightcoral' | 'lightcyan' | 'lightgoldenrodyellow' | 'lightgrey' | 'lightgreen' | 'lightpink' | 'lightsalmon'
       | 'lightseagreen' | 'lightskyblue' | 'lightslategray' | 'lightsteelblue' | 'lightyellow' | 'lime' | 'limegreen' | 'linen' | 'magenta' | 'maroon' | 'mediumaquamarine' 
       | 'mediumblue' | 'mediumorchid' | 'mediumpurple' | 'mediumseagreen' | 'mediumslateblue' | 'mediumspringgreen' | 'mediumturquoise' | 'mediumvioletred' | 'midnightblue' 
       | 'mintcream' | 'mistyrose' | 'moccasin' | 'navajowhite' | 'navy' | 'oldlace' | 'olive' | 'olivedrab' | 'orange' | 'orangered' | 'orchid' | 'palegoldenrod' | 'palegreen'
       | 'paleturquoise' | 'palevioletred' | 'papayawhip' | 'peachpuff' | 'peru' | 'pink' | 'plum' | 'powderblue' | 'purple' | 'red' | 'rosybrown' | 'royalblue' | 'saddlebrown'
       | 'salmon' | 'sandybrown' | 'seagreen' | 'seashell' | 'sienna' | 'silver' | 'skyblue' | 'slateblue' | 'slategray' | 'snow' | 'springgreen' | 'steelblue' | 'tan' | 'teal'
       | 'thistle' | 'tomato' | 'turquoise' | 'violet' | 'wheat' | 'white' | 'whitesmoke' | 'yellow' | 'yellowgreen'

type ThemeColor = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'violet'

export const theme: Record<string, ThemeColor> = { main: 'blue', animation: 'green', player: 'orange' }

export const editorFontSize = 12

// PLAYBACK -> MOVE TO SHARED

export const defaultTempo: BPM = 60
export const dynamicValues = ['pp', 'p', 'mp', 'mf', 'f', 'ff']
export const dynamicsToNumber: Record<DynamicsValue, number> = {
    pp: 0.24,
    p: 0.35,
    mp: 0.51,
    mf: 0.67,
    f: 0.83,
    ff: 1.0
}
export const defaultDynamics: number = 0.67 // mf
export const defaultBeatFrequency = 4 // Default beat (kempli) frequency used for systems where kempli.state === 'off'
export const AVERAGE_ATTACK_DELAY = 0.01 // (seconds) Average deviation of the note attack time for a more 'natural' effect
export const noCursor: EditorCursor = { sysUuid: '', beatSlice: { start: 0, end: 0 }, lastColumn: 0 } // 'null' value for the playback cursor of the editor

// List of playback speeds for selector
export const speedList = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

export const playerIntroTime: number = 2000 // silence added before the beginning of the score in milliseconds
export const editorIntroTime: number = 0 // silence added before the beginning of the score in milliseconds
export const playerOutroTime: number = 5000 // attenuation time added after the end of the score in milliseconds
export const editorOutroTime: number = 2000 // attenuation time added after the end of the score in milliseconds

export const dimRateNonFocusedInstruments = 0.2 // Fraction to which the volume of instruments other than the focus should be reduced
export const baseNoteValue: number = 16 // BaseNoteValue is the time unit in which all notes are expressed internally. 16 means 1/16th note, 8 means 1/8th note, etc.
export const baseNoteSubdivision: Subdivision = '16n'
export const SOUNDS_FOLDER = 'sounds/'
export const alwaysFocusPositions = ['KEMPLI', 'GONGS']

// Check if the set of sample files is complete
export const doSanityCheck = false

// prettier-ignore
export const NOTES = ['C1','C#1','D1','D#1','E1','F1','F#1','G1','G#1','A1','A#1','B1','C2','C#2','D2','D#2','E2','F2',
                      'F#2','G2','G#2','A2','A#2','B2','C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3']

// INSTRUMENT, INSTRUMENT POSITION AND GROUPING INFO

// Translates shorthand codes used in instrumentConfigs to Note records.
// The stroke is used for the animation.
export const noteConfigs: Record<string, Record<string, Note>> = {
    percussion: {
        // GONGS
        GIR: { tone: 'GIR', octave: null, stroke: null, muting: 'OPEN' },
        PUR: { tone: 'PUR', octave: null, stroke: null, muting: 'OPEN' },
        TONG: { tone: 'TONG', octave: null, stroke: null, muting: 'OPEN' },
        // KEMPLI
        X: { tone: 'X', octave: null, stroke: null, muting: 'OPEN' },
        // CENGCENG
        X_OPEN: { tone: 'X', octave: null, stroke: null, muting: 'OPEN' },
        X_MUTED: { tone: 'X', octave: null, stroke: null, muting: 'MUTED' },
        // KENDANG
        KA: { tone: 'KA', octave: null, stroke: null, muting: 'OPEN' },
        PAK: { tone: 'PAK', octave: null, stroke: null, muting: 'OPEN' },
        DE: { tone: 'DE', octave: null, stroke: null, muting: 'OPEN' },
        TUT: { tone: 'TUT', octave: null, stroke: null, muting: 'OPEN' },
        CUNG: { tone: 'CUNG', octave: null, stroke: null, muting: 'OPEN' },
        KUNG: { tone: 'KUNG', octave: null, stroke: null, muting: 'OPEN' }
    },
    daun: {
        DING0: { tone: 'DING', octave: 0, stroke: null, muting: 'OPEN' },
        DONG0: { tone: 'DONG', octave: 0, stroke: null, muting: 'OPEN' },
        DENG0: { tone: 'DENG', octave: 0, stroke: null, muting: 'OPEN' },
        DUNG0: { tone: 'DUNG', octave: 0, stroke: null, muting: 'OPEN' },
        DANG0: { tone: 'DANG', octave: 0, stroke: null, muting: 'OPEN' },
        DING1: { tone: 'DING', octave: 1, stroke: null, muting: 'OPEN' },
        DONG1: { tone: 'DONG', octave: 1, stroke: null, muting: 'OPEN' },
        DENG1: { tone: 'DENG', octave: 1, stroke: null, muting: 'OPEN' },
        DUNG1: { tone: 'DUNG', octave: 1, stroke: null, muting: 'OPEN' },
        DANG1: { tone: 'DANG', octave: 1, stroke: null, muting: 'OPEN' },
        DING2: { tone: 'DING', octave: 2, stroke: null, muting: 'OPEN' },
        DING0_ABBR: { tone: 'DING', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        DONG0_ABBR: { tone: 'DONG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        DENG0_ABBR: { tone: 'DENG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        DUNG0_ABBR: { tone: 'DUNG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        DANG0_ABBR: { tone: 'DANG', octave: 0, stroke: null, muting: 'ABBREVIATED' },
        DING1_ABBR: { tone: 'DING', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        DONG1_ABBR: { tone: 'DONG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        DENG1_ABBR: { tone: 'DENG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        DUNG1_ABBR: { tone: 'DUNG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        DANG1_ABBR: { tone: 'DANG', octave: 1, stroke: null, muting: 'ABBREVIATED' },
        DING2_ABBR: { tone: 'DING', octave: 2, stroke: null, muting: 'ABBREVIATED' },
        DING0_MUTED: { tone: 'DING', octave: 0, stroke: null, muting: 'MUTED' },
        DONG0_MUTED: { tone: 'DONG', octave: 0, stroke: null, muting: 'MUTED' },
        DENG0_MUTED: { tone: 'DENG', octave: 0, stroke: null, muting: 'MUTED' },
        DUNG0_MUTED: { tone: 'DUNG', octave: 0, stroke: null, muting: 'MUTED' },
        DANG0_MUTED: { tone: 'DANG', octave: 0, stroke: null, muting: 'MUTED' },
        DING1_MUTED: { tone: 'DING', octave: 1, stroke: null, muting: 'MUTED' },
        DONG1_MUTED: { tone: 'DONG', octave: 1, stroke: null, muting: 'MUTED' },
        DENG1_MUTED: { tone: 'DENG', octave: 1, stroke: null, muting: 'MUTED' },
        DUNG1_MUTED: { tone: 'DUNG', octave: 1, stroke: null, muting: 'MUTED' },
        DANG1_MUTED: { tone: 'DANG', octave: 1, stroke: null, muting: 'MUTED' },
        DING2_MUTED: { tone: 'DING', octave: 2, stroke: null, muting: 'MUTED' }
    },
    chimes: {
        // REYONG SPECIFIC
        DENG0: { tone: 'DENG', octave: 0, stroke: 'KNOB', muting: 'OPEN' },
        DUNG0: { tone: 'DUNG', octave: 0, stroke: 'KNOB', muting: 'OPEN' },
        DANG0: { tone: 'DANG', octave: 0, stroke: 'KNOB', muting: 'OPEN' },
        DING1: { tone: 'DING', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        DONG1: { tone: 'DONG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        DENG1: { tone: 'DENG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        DUNG1: { tone: 'DUNG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        DANG1: { tone: 'DANG', octave: 1, stroke: 'KNOB', muting: 'OPEN' },
        DING2: { tone: 'DING', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        DONG2: { tone: 'DONG', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        DENG2: { tone: 'DENG', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        DUNG2: { tone: 'DUNG', octave: 2, stroke: 'KNOB', muting: 'OPEN' },
        DENG0_ABBR: { tone: 'DENG', octave: 0, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DUNG0_ABBR: { tone: 'DUNG', octave: 0, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DANG0_ABBR: { tone: 'DANG', octave: 0, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DING1_ABBR: { tone: 'DING', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DONG1_ABBR: { tone: 'DONG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DENG1_ABBR: { tone: 'DENG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DUNG1_ABBR: { tone: 'DUNG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DANG1_ABBR: { tone: 'DANG', octave: 1, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DING2_ABBR: { tone: 'DING', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DONG2_ABBR: { tone: 'DONG', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DENG2_ABBR: { tone: 'DENG', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DUNG2_ABBR: { tone: 'DUNG', octave: 2, stroke: 'KNOB', muting: 'ABBREVIATED' },
        DENG0_MUTED: { tone: 'DENG', octave: 0, stroke: 'KNOB', muting: 'MUTED' },
        DUNG0_MUTED: { tone: 'DUNG', octave: 0, stroke: 'KNOB', muting: 'MUTED' },
        DANG0_MUTED: { tone: 'DANG', octave: 0, stroke: 'KNOB', muting: 'MUTED' },
        DING1_MUTED: { tone: 'DING', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        DONG1_MUTED: { tone: 'DONG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        DENG1_MUTED: { tone: 'DENG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        DUNG1_MUTED: { tone: 'DUNG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        DANG1_MUTED: { tone: 'DANG', octave: 1, stroke: 'KNOB', muting: 'MUTED' },
        DING2_MUTED: { tone: 'DING', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        DONG2_MUTED: { tone: 'DONG', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        DENG2_MUTED: { tone: 'DENG', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        DUNG2_MUTED: { tone: 'DUNG', octave: 2, stroke: 'KNOB', muting: 'MUTED' },
        XDUNG0: { tone: 'DUNG', octave: 0, stroke: 'RIM', muting: 'OPEN' },
        XDONG1: { tone: 'DONG', octave: 1, stroke: 'RIM', muting: 'OPEN' },
        XDUNG1: { tone: 'DUNG', octave: 1, stroke: 'RIM', muting: 'OPEN' }, // Baleganjur
        XDANG1: { tone: 'DANG', octave: 1, stroke: 'RIM', muting: 'OPEN' },
        XDENG2: { tone: 'DENG', octave: 2, stroke: 'RIM', muting: 'OPEN' },
        XDUNG0_ABBR: { tone: 'DUNG', octave: 0, stroke: 'RIM', muting: 'ABBREVIATED' },
        XDONG1_ABBR: { tone: 'DONG', octave: 1, stroke: 'RIM', muting: 'ABBREVIATED' },
        XDUNG1_ABBR: { tone: 'DUNG', octave: 1, stroke: 'RIM', muting: 'ABBREVIATED' }, // Baleganjur
        XDANG1_ABBR: { tone: 'DANG', octave: 1, stroke: 'RIM', muting: 'ABBREVIATED' },
        XDENG2_ABBR: { tone: 'DENG', octave: 2, stroke: 'RIM', muting: 'ABBREVIATED' },
        XDUNG0_MUTED: { tone: 'DUNG', octave: 0, stroke: 'RIM', muting: 'MUTED' },
        XDONG1_MUTED: { tone: 'DONG', octave: 1, stroke: 'RIM', muting: 'MUTED' },
        XDUNG1_MUTED: { tone: 'DUNG', octave: 1, stroke: 'RIM', muting: 'MUTED' }, // Baleganjur
        XDANG1_MUTED: { tone: 'DANG', octave: 1, stroke: 'RIM', muting: 'MUTED' },
        XDENG2_MUTED: { tone: 'DENG', octave: 2, stroke: 'RIM', muting: 'MUTED' }
    }
}

// ANIMATION

export const animationConfig: Record<string, Partial<Record<MutingType | ToneType, CSSColors[]>>> = {
    // Highlight determines the highlight color.
    // Highlight keys can be a pitch or a muting type.
    // In case of a multiple match the pitch takes priority.
    highlight: {
        OPEN: ['lime', 'deepskyblue', 'lightcyan', 'lightpink'],
        ABBREVIATED: ['darkseagreen', 'blue', 'cyan', 'magenta'],
        MUTED: ['darkgreen', 'midnightblue', 'darkcyan', 'darkmagenta'],
        KA: ['green'],
        PAK: ['green'],
        DE: ['blue'],
        TUT: ['blue'],
        CUNG: ['purple'],
        KUNG: ['purple']
    }
}
