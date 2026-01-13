import type { Note } from '../models/types'
export const AVERAGE_ATTACK_DELAY = 0.01 // (seconds) Average deviation of the note attack time for a more 'natural' effect

// TAILWIND STYLES

export const FRAMESTYLE = ' rounded-xl shadow-lg shadow-gray-400 border border-gray-300 '

// COLORS

//prettier-ignore
export type ColorName = | 'aliceblue' | 'antiquewhite' | 'aqua' | 'aquamarine' | 'azure' | 'beige' | 'bisque' | 'black' | 'blanchedalmond' | 'blue' | 'blueviolet' | 'brown' 
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

// THEME

type Color = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'violet'

export const theme: Record<string, Color> = { main: 'blue', animation: 'green', player: 'orange' }

export const tsStyleSheet = () => {
    for (const sheet of document.styleSheets) {
        if (sheet.title === 'reactsuite-theme.less') {
            return sheet
        }
    }
}

// EDITOR

export const editorFontSize = 14
export const editorDoNotDisplay = ['KEMPLI']
export const editorInitialExpandState = false

export type NavigationAction =
    | 'cellup'
    | 'celldown'
    | 'cellleft'
    | 'cellright'
    | 'rowstart'
    | 'rowend'
    | 'firstrow'
    | 'lastrow'

export const editorSortingOrder = [
    'UGAL',
    'PEMADE_POLOS',
    'PEMADE_SANGSIH',
    'KANTILAN_POLOS',
    'KANTILAN_SANGSIH',
    'REYONG_1',
    'REYONG_2',
    'REYONG_3',
    'REYONG_4',
    'PENYACAH',
    'CALUNG',
    'JEGOGAN',
    'GONGS',
    'CENGCENG',
    'KENDANG',
    'KEMPLI'
]
export const partColorPalette: ColorName[] = [
    'darkseagreen',
    'aquamarine',
    'paleturquoise',
    'lightsteelblue',
    'thistle',
    'lavender',
    'cornsilk',
    'khaki'
]

// PLAYER

// List of playback speeds for selector
export const speedList = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

export const defaultIntroTime: number = 0 // silence added before the beginning of the score in milliseconds
export const defaultOutroTime: number = 10000 // attenuation time added after the end of the score in milliseconds

export const dimRateNonFocusedInstruments = 0.2 // Fraction to which the volume of instruments other than the focus should be reduced
export const BaseNote: '16n' = '16n'
export type BaseNoteTimeObj = { '16n': number }
export const SOUNDS_FOLDER = 'sounds/'
export const alwaysFocusPositions = ['KEMPLI', 'GONGS']

// Check if the set of sample files is complete
export const doSanityCheck = false

// prettier-ignore
export const NOTES = ['C1','C#1','D1','D#1','E1','F1','F#1','G1','G#1','A1','A#1','B1','C2','C#2','D2','D#2','E2','F2',
                      'F#2','G2','G#2','A2','A#2','B2','C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3']

// Typing of tone and muting
// See https://stackoverflow.com/questions/54607961/how-to-define-a-type-based-on-values-of-an-array
// prettier-ignore
const _tones_ = ['DING','DONG','DENG','DUNG','DANG','GIR','PUR','TONG','X','X','KA','PAK','DE','TUT','CUNG','KUNG'] as const
export type ToneType = (typeof _tones_)[number] // 'DING' | 'DONG' | 'DENG' | ...
const _strokes_ = ['KNOB', 'RIM'] as const
export type StrokeType = (typeof _strokes_)[number]
const _mutings_ = ['OPEN', 'ABBREVIATED', 'MUTED'] as const
export type MutingType = (typeof _mutings_)[number]

// INSTRUMENT, INSTRUMENT POSITION AND GROUPING INFO

export type InstrumentConfig = { name: string; positions: string[] }

export type PositionConfig = {
    //`notes` contains a list of single notes or multiple notes that are played simultaneously.
    // The string values are 'shorthand' codes that uniquely define a sample (see const noteConfigs).
    name: string
    type: string
    svg_file: string
    sampletemplate: string
    volume: number
    symbolToNoteNames: { [symbol: string]: string[] }
}

// The following characters should be ignored when sending a note to a Sampler.
// TODO This is a temporary solution to avoid having to double the length of each
// alphabet for these rarely used modifiers.
export const ignoreChars: string[] = ['_', '='] // half and quarter base note duration.

// Translates shorthand codes used in instrumentConfigs to Note records.
// The stroke is used for the animation.
export const noteConfigs: Record<string, Record<string, Note>> = {
    percussion: {
        // GONGS
        GIR: { tone: 'GIR', octave: null, stroke: null, muting: 'OPEN' },
        PUR: { tone: 'PUR', octave: null, stroke: null, muting: 'OPEN' },
        TONG: { tone: 'TONG', octave: null, stroke: null, muting: 'OPEN' },
        // KEMPLI
        X_OPEN: { tone: 'X', octave: null, stroke: 'KNOB', muting: 'OPEN' },
        X_MUTED: { tone: 'X', octave: null, stroke: 'KNOB', muting: 'MUTED' },
        // KENDANG
        KA: { tone: 'KA', octave: null, stroke: null, muting: 'OPEN' },
        PAK: { tone: 'PAK', octave: null, stroke: null, muting: 'OPEN' },
        DE: { tone: 'DE', octave: null, stroke: null, muting: 'OPEN' },
        TUT: { tone: 'TUT', octave: null, stroke: null, muting: 'OPEN' },
        CUNG: { tone: 'CUNG', octave: null, stroke: null, muting: 'OPEN' },
        KUNG: { tone: 'KUNG', octave: null, stroke: null, muting: 'OPEN' }
    },
    daun: {
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
        XDANG1: { tone: 'DANG', octave: 1, stroke: 'RIM', muting: 'OPEN' },
        XDENG2: { tone: 'DENG', octave: 2, stroke: 'RIM', muting: 'OPEN' },
        XDUNG0_MUTED: { tone: 'DUNG', octave: 0, stroke: 'RIM', muting: 'MUTED' },
        XDONG1_MUTED: { tone: 'DONG', octave: 1, stroke: 'RIM', muting: 'MUTED' },
        XDANG1_MUTED: { tone: 'DANG', octave: 1, stroke: 'RIM', muting: 'MUTED' },
        XDENG2_MUTED: { tone: 'DENG', octave: 2, stroke: 'RIM', muting: 'MUTED' }
    }
}

export const instrumentConfigs: Record<string, InstrumentConfig> = {
    GONGS: { name: 'Gongs', positions: ['GONGS'] },
    KEMPLI: { name: 'Kempli', positions: ['KEMPLI'] },
    CENGCENG: { name: 'Cengceng', positions: ['CENGCENG'] },
    KENDANG: { name: 'Kendang', positions: ['KENDANG'] },
    JEGOGAN: { name: 'Jegogan', positions: ['JEGOGAN'] },
    CALUNG: { name: 'Calung', positions: ['CALUNG'] },
    PENYACAH: { name: 'Penyacah', positions: ['PENYACAH'] },
    PEMADE: { name: 'Pemade', positions: ['PEMADE_POLOS', 'PEMADE_SANGSIH'] },
    KANTILAN: { name: 'Kantilan', positions: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'] },
    UGAL: { name: 'Ugal', positions: ['UGAL'] },
    REYONG: { name: 'Reyong', positions: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4'] }
}

// Next two lists used when applying multiple instrument notation
export const polosPositions = [
    'JEGOGAN',
    'CALUNG',
    'UGAL',
    'PENYACAH',
    'PEMADE_POLOS',
    'KANTILAN_POLOS',
    'REYONG_1',
    'REYONG_2',
    'REYONG_3',
    'REYONG_4'
]

export const sangsihPositions = ['PEMADE_SANGSIH', 'KANTILAN_SANGSIH', 'REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4']

// ALPHABET + SAMPLES
//TODO separate alphabet info from samples info. Same for instrument type.
export const EXTENSION = ['-', ' ']
export const MUTING = ['.']

export const positionConfigs: Record<string, PositionConfig> = {
    GONGS: {
        name: 'Gongs',
        type: 'percussion', //TODO move type to instrument and grouping info
        volume: -5,
        svg_file: 'svg/GK_GONGS.svg',
        sampletemplate: 'GK_GONGS_{note}.mp3',
        symbolToNoteNames: { G: ['GIR'], P: ['PUR'], T: ['TONG'] } //TODO move alphabet info to separate settings
    },
    KEMPLI: {
        name: 'Kempli',
        type: 'percussion',
        volume: -5,
        svg_file: '',
        sampletemplate: 'GK_KEMPLI_{note}.mp3',
        symbolToNoteNames: { 'x?': ['X_MUTED'] }
    },
    CENGCENG: {
        name: 'Cengceng',
        type: 'percussion',
        volume: -14,
        svg_file: '',
        sampletemplate: 'GK_CENGCENG_{note}.mp3',
        symbolToNoteNames: { x: ['X_OPEN'], 'x?': ['X_MUTED'] }
    },
    KENDANG: {
        name: 'Kendang',
        type: 'percussion',
        volume: 0,
        svg_file: 'svg/GK_KENDANG.svg',
        sampletemplate: 'GK_KENDANG_{note}.wav',
        symbolToNoteNames: { '0': ['CUNG'], '8': ['KA'], '9': ['DE'], '(': ['TUT'], ')': ['KUNG'], '*': ['PAK'] }
    },
    JEGOGAN: {
        name: 'Jegogan',
        type: 'daun',
        volume: -5,
        svg_file: 'svg/GK_JEGOGAN.svg',
        sampletemplate: 'GK_JEGOGAN_{note}.mp3',
        symbolToNoteNames: {
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i/': ['DING1'],
            'o/': ['DONG1'],
            'e/': ['DENG1'],
            'u/': ['DUNG1'],
            'a/': ['DANG1']
        }
    },
    CALUNG: {
        name: 'Calung',
        type: 'daun',
        volume: -5,
        svg_file: 'svg/GK_CALUNG.svg',
        sampletemplate: 'GK_CALUNG_{note}.mp3',
        symbolToNoteNames: {
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i/': ['DING1'],
            'o/': ['DONG1'],
            'e/': ['DENG1'],
            'u/': ['DUNG1'],
            'a/': ['DANG1']
        }
    },
    PENYACAH: {
        name: 'Penyacah',
        type: 'daun',
        volume: -15,
        svg_file: 'svg/GK_PENYACAH.svg',
        sampletemplate: 'GK_PENYACAH_{note}.mp3',
        symbolToNoteNames: {
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'u,/': ['DUNG0'],
            'a,/': ['DANG0'],
            'i/': ['DING1'],
            'o/': ['DONG1'],
            'e/': ['DENG1'],
            'u/': ['DUNG1'],
            'a/': ['DANG1']
        }
    },
    KANTILAN_POLOS: {
        name: 'Kantilan polos',
        type: 'daun',
        volume: -14,
        svg_file: 'svg/GK_GANGSA.svg',
        sampletemplate: 'GK_KANTILAN_{note}.mp3',
        symbolToNoteNames: {
            'o,': ['DONG0'],
            'e,': ['DENG0'],
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i<': ['DING2'],
            'o,/': ['DONG0_ABBR'],
            'e,/': ['DENG0_ABBR'],
            'u,/': ['DUNG0_ABBR'],
            'a,/': ['DANG0_ABBR'],
            'i/': ['DING1_ABBR'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'i</': ['DING2_ABBR'],
            'o,?': ['DONG0_MUTED'],
            'e,?': ['DENG0_MUTED'],
            'u,?': ['DUNG0_MUTED'],
            'a,?': ['DANG0_MUTED'],
            'i?': ['DING1_MUTED'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            'i<?': ['DING2_MUTED']
        }
    },
    KANTILAN_SANGSIH: {
        name: 'Kantilan sangsih',
        type: 'daun',
        volume: -14,
        svg_file: 'svg/GK_GANGSA.svg',
        sampletemplate: 'GK_KANTILAN_{note}.mp3',
        symbolToNoteNames: {
            'o,': ['DONG0'],
            'e,': ['DENG0'],
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i<': ['DING2'],
            'o,/': ['DONG0_ABBR'],
            'e,/': ['DENG0_ABBR'],
            'u,/': ['DUNG0_ABBR'],
            'a,/': ['DANG0_ABBR'],
            'i/': ['DING1_ABBR'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'i</': ['DING2_ABBR'],
            'o,?': ['DONG0_MUTED'],
            'e,?': ['DENG0_MUTED'],
            'u,?': ['DUNG0_MUTED'],
            'a,?': ['DANG0_MUTED'],
            'i?': ['DING1_MUTED'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            'i<?': ['DING2_MUTED']
        }
    },
    PEMADE_POLOS: {
        name: 'Pemade polos',
        type: 'daun',
        volume: -14,
        svg_file: 'svg/GK_GANGSA.svg',
        sampletemplate: 'GK_PEMADE_{note}.mp3',
        symbolToNoteNames: {
            'o,': ['DONG0'],
            'e,': ['DENG0'],
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i<': ['DING2'],
            'o,/': ['DONG0_ABBR'],
            'e,/': ['DENG0_ABBR'],
            'u,/': ['DUNG0_ABBR'],
            'a,/': ['DANG0_ABBR'],
            'i/': ['DING1_ABBR'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'i</': ['DING2_ABBR'],
            'o,?': ['DONG0_MUTED'],
            'e,?': ['DENG0_MUTED'],
            'u,?': ['DUNG0_MUTED'],
            'a,?': ['DANG0_MUTED'],
            'i?': ['DING1_MUTED'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            'i<?': ['DING2_MUTED']
        }
    },
    PEMADE_SANGSIH: {
        name: 'Pemade sangsih',
        type: 'daun',
        volume: -14,
        svg_file: 'svg/GK_GANGSA.svg',
        sampletemplate: 'GK_PEMADE_{note}.mp3',
        symbolToNoteNames: {
            'o,': ['DONG0'],
            'e,': ['DENG0'],
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i<': ['DING2'],
            'o,/': ['DONG0_ABBR'],
            'e,/': ['DENG0_ABBR'],
            'u,/': ['DUNG0_ABBR'],
            'a,/': ['DANG0_ABBR'],
            'i/': ['DING1_ABBR'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'i</': ['DING2_ABBR'],
            'o,?': ['DONG0_MUTED'],
            'e,?': ['DENG0_MUTED'],
            'u,?': ['DUNG0_MUTED'],
            'a,?': ['DANG0_MUTED'],
            'i?': ['DING1_MUTED'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            'i<?': ['DING2_MUTED']
        }
    },
    UGAL: {
        name: 'Ugal',
        type: 'daun',
        volume: -14,
        svg_file: 'svg/GK_UGAL.svg',
        sampletemplate: 'GK_UGAL_{note}.mp3',
        symbolToNoteNames: {
            'o,': ['DONG0'],
            'e,': ['DENG0'],
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i<': ['DING2'],
            'o,/': ['DONG0_ABBR'],
            'e,/': ['DENG0_ABBR'],
            'u,/': ['DUNG0_ABBR'],
            'a,/': ['DANG0_ABBR'],
            'i/': ['DING1_ABBR'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'i</': ['DING2_ABBR'],
            'o,?': ['DONG0_MUTED'],
            'e,?': ['DENG0_MUTED'],
            'u,?': ['DUNG0_MUTED'],
            'a,?': ['DANG0_MUTED'],
            'i?': ['DING1_MUTED'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            'i<?': ['DING2_MUTED']
        }
    },
    REYONG_1: {
        name: 'Reyong 1',
        type: 'chimes',
        volume: -14,
        svg_file: 'svg/GK_REYONG.svg',
        sampletemplate: 'GK_REYONG_{note}.mp3',
        symbolToNoteNames: {
            'e,': ['DENG0'],
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            'e,/': ['DENG0_ABBR'],
            'u,/': ['DUNG0_ABBR'],
            'a,/': ['DANG0_ABBR'],
            'i/': ['DING1_ABBR'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'e,?': ['DENG0_MUTED'],
            'u,?': ['DUNG0_MUTED'],
            'a,?': ['DANG0_MUTED'],
            'i?': ['DING1_MUTED'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            t: ['DENG0', 'DING1'],
            't?': ['DENG0_MUTED', 'DING1_MUTED'],
            b: ['DENG0', 'DANG0'],
            'b/': ['DENG0_ABBR', 'DANG0_ABBR'],
            'b?': ['DENG0_MUTED', 'DANG0_MUTED'],
            x: ['XDUNG0'],
            'x/': ['XDUNG0_MUTED']
        }
    },
    REYONG_2: {
        name: 'Reyong 2',
        type: 'chimes',
        volume: -14,
        svg_file: 'svg/GK_REYONG.svg',
        sampletemplate: 'GK_REYONG_{note}.mp3',
        symbolToNoteNames: {
            'u,': ['DUNG0'],
            'a,': ['DANG0'],
            i: ['DING1'],
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'u,/': ['DUNG0_ABBR'],
            'a,/': ['DANG0_ABBR'],
            'i/': ['DING1_ABBR'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'u,?': ['DUNG0_MUTED'],
            'a,?': ['DANG0_MUTED'],
            'i?': ['DING1_MUTED'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            b: ['DING1', 'DENG1'],
            'b/': ['DING1_ABBR', 'DENG1_ABBR'],
            'b?': ['DING1_MUTED', 'DENG1_MUTED'],
            x: ['XDONG1'],
            'x/': ['XDONG1_MUTED']
        }
    },
    REYONG_3: {
        name: 'Reyong 3',
        type: 'chimes',
        volume: -14,
        svg_file: 'svg/GK_REYONG.svg',
        sampletemplate: 'GK_REYONG_{note}.mp3',
        symbolToNoteNames: {
            o: ['DONG1'],
            e: ['DENG1'],
            u: ['DUNG1'],
            a: ['DANG1'],
            'i<': ['DING2'],
            'o<': ['DONG2'],
            'e<': ['DENG2'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'i</': ['DING2_ABBR'],
            'o</': ['DONG2_ABBR'],
            'e</': ['DENG2_ABBR'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            'i<?': ['DING2_MUTED'],
            'o<?': ['DONG2_MUTED'],
            'e<?': ['DENG2_MUTED'],
            b: ['DUNG1', 'DING2'],
            'b/': ['DUNG1_ABBR', 'DING2_ABBR'],
            'b?': ['DUNG1_MUTED', 'DING2_MUTED'],
            x: ['XDANG1'],
            'x/': ['XDANG1_MUTED']
        }
    },
    REYONG_4: {
        name: 'Reyong 4',
        type: 'chimes',
        volume: -14,
        svg_file: 'svg/GK_REYONG.svg',
        sampletemplate: 'GK_REYONG_{note}.mp3',
        symbolToNoteNames: {
            u: ['DUNG1'],
            'a,': ['DANG1'],
            'i<': ['DING2'],
            'o<': ['DONG2'],
            'e<': ['DENG2'],
            'u<': ['DUNG2'],
            'u/': ['DUNG1_ABBR'],
            'a,/': ['DANG1_ABBR'],
            'i</': ['DING2_ABBR'],
            'o</': ['DONG2_ABBR'],
            'e</': ['DENG2_ABBR'],
            'u</': ['DUNG2_ABBR'],
            'u?': ['DUNG1_MUTED'],
            'a,?': ['DANG1_MUTED'],
            'i<?': ['DING2_MUTED'],
            'o<?': ['DONG2_MUTED'],
            'e<?': ['DENG2_MUTED'],
            'u<?': ['DUNG2_MUTED'],
            b: ['DONG2', 'DUNG2'],
            'b/': ['DONG2_ABBR', 'DUNG2_ABBR'],
            'b?': ['DONG2_MUTED', 'DUNG2_MUTED'],
            x: ['XDENG2'],
            'x/': ['XDENG2_MUTED']
        }
    }
}

// ANIMATION

export type InstrumentAnimationInfo = { group: string; label: string; svg_file: string }

export type AnimationConfig = {
    instrumentation: { [name: string]: InstrumentAnimationInfo[] }
    highlight: { [muting: string]: string[] }
}

export const focusOptions = {
    // value: [positions]
    GONGS: ['GONGS'],
    KENDANG: ['KENDANG'],
    JEGOGAN: ['JEGOGAN'],
    CALUNG: ['CALUNG'],
    PENYACAH: ['PENYACAH'],
    KANTILAN: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'],
    '- KANTILAN_POLOS': ['KANTILAN_POLOS'],
    '- KANTILAN_SANGSIH': ['KANTILAN_SANGSIH'],
    PEMADE: ['PEMADE_POLOS', 'PEMADE_SANGSIH'],
    '- PEMADE_POLOS': ['PEMADE_POLOS'],
    '- PEMADE_SANGSIH': ['PEMADE_SANGSIH'],
    UGAL: ['UGAL'],
    REYONG: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4'],
    '- REYONG_1': ['REYONG_1'],
    '- REYONG_2': ['REYONG_2'],
    '- REYONG_3': ['REYONG_3'],
    '- REYONG_4': ['REYONG_4']
}

export const animationConfig: Record<string, Partial<Record<MutingType | ToneType, ColorName[]>>> = {
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

const xx = {
    aliceblue: { hex: '#f0f8ff', rgb: [240, 248, 255] },
    antiquewhite: { hex: '#faebd7', rgb: [250, 235, 215] },
    aquamarine: { hex: '#7fffd4', rgb: [127, 255, 212] },
    azure: { hex: '#f0ffff', rgb: [240, 255, 255] },
    beige: { hex: '#f5f5dc', rgb: [245, 245, 220] },
    bisque: { hex: '#ffe4c4', rgb: [255, 228, 196] },
    blanchedalmond: { hex: '#ffebcd', rgb: [255, 235, 205] },
    burlywood: { hex: '#deb887', rgb: [222, 184, 135] },
    cornflowerblue: { hex: '#6495ed', rgb: [100, 149, 237] },
    cornsilk: { hex: '#fff8dc', rgb: [255, 248, 220] },
    darkgray: { hex: '#a9a9a9', rgb: [169, 169, 169] },
    darkkhaki: { hex: '#bdb76b', rgb: [189, 183, 107] },
    darksalmon: { hex: '#e9967a', rgb: [233, 150, 122] },
    darkseagreen: { hex: '#8fbc8f', rgb: [143, 188, 143] },
    dimgray: { hex: '#696969', rgb: [105, 105, 105] },
    floralwhite: { hex: '#fffaf0', rgb: [255, 250, 240] },
    gainsboro: { hex: '#dcdcdc', rgb: [220, 220, 220] },
    ghostwhite: { hex: '#f8f8ff', rgb: [248, 248, 255] },
    gray: { hex: '#808080', rgb: [128, 128, 128] },
    honeydew: { hex: '#f0fff0', rgb: [240, 255, 240] },
    hotpink: { hex: '#ff69b4', rgb: [255, 105, 180] },
    ivory: { hex: '#fffff0', rgb: [255, 255, 240] },
    khaki: { hex: '#f0e68c', rgb: [240, 230, 140] },
    lavender: { hex: '#e6e6fa', rgb: [230, 230, 250] },
    lavenderblush: { hex: '#fff0f5', rgb: [255, 240, 245] },
    lemonchiffon: { hex: '#fffacd', rgb: [255, 250, 205] },
    lightblue: { hex: '#add8e6', rgb: [173, 216, 230] },
    lightcoral: { hex: '#f08080', rgb: [240, 128, 128] },
    lightcyan: { hex: '#e0ffff', rgb: [224, 255, 255] },
    lightgoldenrodyellow: { hex: '#fafad2', rgb: [250, 250, 210] },
    lightgrey: { hex: '#d3d3d3', rgb: [144, 238, 144] },
    lightgreen: { hex: '#90ee90', rgb: [211, 211, 211] },
    lightpink: { hex: '#ffb6c1', rgb: [255, 182, 193] },
    lightsalmon: { hex: '#ffa07a', rgb: [255, 160, 122] },
    lightskyblue: { hex: '#87cefa', rgb: [135, 206, 250] },
    lightslategray: { hex: '#778899', rgb: [119, 136, 153] },
    lightsteelblue: { hex: '#b0c4de', rgb: [176, 196, 222] },
    lightyellow: { hex: '#ffffe0', rgb: [255, 255, 224] },
    linen: { hex: '#faf0e6', rgb: [250, 240, 230] },
    mediumaquamarine: { hex: '#66cdaa', rgb: [102, 205, 170] },
    mediumpurple: { hex: '#9370d8', rgb: [147, 112, 216] },
    mediumslateblue: { hex: '#7b68ee', rgb: [123, 104, 238] },
    mintcream: { hex: '#f5fffa', rgb: [245, 255, 250] },
    mistyrose: { hex: '#ffe4e1', rgb: [255, 228, 225] },
    moccasin: { hex: '#ffe4b5', rgb: [255, 228, 181] },
    navajowhite: { hex: '#ffdead', rgb: [255, 222, 173] },
    oldlace: { hex: '#fdf5e6', rgb: [253, 245, 230] },
    orchid: { hex: '#da70d6', rgb: [218, 112, 214] },
    palegoldenrod: { hex: '#eee8aa', rgb: [238, 232, 170] },
    palegreen: { hex: '#98fb98', rgb: [152, 251, 152] },
    paleturquoise: { hex: '#afeeee', rgb: [175, 238, 238] },
    palevioletred: { hex: '#d87093', rgb: [216, 112, 147] },
    papayawhip: { hex: '#ffefd5', rgb: [255, 239, 213] },
    peachpuff: { hex: '#ffdab9', rgb: [255, 218, 185] },
    pink: { hex: '#ffc0cb', rgb: [255, 192, 203] },
    plum: { hex: '#dda0dd', rgb: [221, 160, 221] },
    powderblue: { hex: '#b0e0e6', rgb: [176, 224, 230] },
    rosybrown: { hex: '#bc8f8f', rgb: [188, 143, 143] },
    salmon: { hex: '#fa8072', rgb: [250, 128, 114] },
    seashell: { hex: '#fff5ee', rgb: [255, 245, 238] },
    silver: { hex: '#c0c0c0', rgb: [192, 192, 192] },
    skyblue: { hex: '#87ceeb', rgb: [135, 206, 235] },
    slategray: { hex: '#708090', rgb: [112, 128, 144] },
    snow: { hex: '#fffafa', rgb: [255, 250, 250] },
    tan: { hex: '#d2b48c', rgb: [210, 180, 140] },
    thistle: { hex: '#d8bfd8', rgb: [216, 191, 216] },
    violet: { hex: '#ee82ee', rgb: [238, 130, 238] },
    wheat: { hex: '#f5deb3', rgb: [245, 222, 179] },
    white: { hex: '#ffffff', rgb: [255, 255, 255] },
    whitesmoke: { hex: '#f5f5f5', rgb: [245, 245, 245] }
}

export const colorPalette: Record<ColorName, { hex: string; rgb: number[] }> = {
    aliceblue: { hex: '#f0f8ff', rgb: [240, 248, 255] },
    antiquewhite: { hex: '#faebd7', rgb: [250, 235, 215] },
    aqua: { hex: '#00ffff', rgb: [0, 255, 255] },
    aquamarine: { hex: '#7fffd4', rgb: [127, 255, 212] },
    azure: { hex: '#f0ffff', rgb: [240, 255, 255] },
    beige: { hex: '#f5f5dc', rgb: [245, 245, 220] },
    bisque: { hex: '#ffe4c4', rgb: [255, 228, 196] },
    black: { hex: '#000000', rgb: [0, 0, 0] },
    blanchedalmond: { hex: '#ffebcd', rgb: [255, 235, 205] },
    blue: { hex: '#0000ff', rgb: [0, 0, 255] },
    blueviolet: { hex: '#8a2be2', rgb: [138, 43, 226] },
    brown: { hex: '#a52a2a', rgb: [165, 42, 42] },
    burlywood: { hex: '#deb887', rgb: [222, 184, 135] },
    cadetblue: { hex: '#5f9ea0', rgb: [95, 158, 160] },
    chartreuse: { hex: '#7fff00', rgb: [127, 255, 0] },
    chocolate: { hex: '#d2691e', rgb: [210, 105, 30] },
    coral: { hex: '#ff7f50', rgb: [255, 127, 80] },
    cornflowerblue: { hex: '#6495ed', rgb: [100, 149, 237] },
    cornsilk: { hex: '#fff8dc', rgb: [255, 248, 220] },
    crimson: { hex: '#dc143c', rgb: [220, 20, 60] },
    cyan: { hex: '#00ffff', rgb: [0, 255, 255] },
    darkblue: { hex: '#00008b', rgb: [0, 0, 139] },
    darkcyan: { hex: '#008b8b', rgb: [0, 139, 139] },
    darkgoldenrod: { hex: '#b8860b', rgb: [184, 134, 11] },
    darkgray: { hex: '#a9a9a9', rgb: [169, 169, 169] },
    darkgreen: { hex: '#006400', rgb: [0, 100, 0] },
    darkkhaki: { hex: '#bdb76b', rgb: [189, 183, 107] },
    darkmagenta: { hex: '#8b008b', rgb: [139, 0, 139] },
    darkolivegreen: { hex: '#556b2f', rgb: [85, 107, 47] },
    darkorange: { hex: '#ff8c00', rgb: [255, 140, 0] },
    darkorchid: { hex: '#9932cc', rgb: [153, 50, 204] },
    darkred: { hex: '#8b0000', rgb: [139, 0, 0] },
    darksalmon: { hex: '#e9967a', rgb: [233, 150, 122] },
    darkseagreen: { hex: '#8fbc8f', rgb: [143, 188, 143] },
    darkslateblue: { hex: '#483d8b', rgb: [72, 61, 139] },
    darkslategray: { hex: '#2f4f4f', rgb: [47, 79, 79] },
    darkturquoise: { hex: '#00ced1', rgb: [0, 206, 209] },
    darkviolet: { hex: '#9400d3', rgb: [148, 0, 211] },
    deeppink: { hex: '#ff1493', rgb: [255, 20, 147] },
    deepskyblue: { hex: '#00bfff', rgb: [0, 191, 255] },
    dimgray: { hex: '#696969', rgb: [105, 105, 105] },
    dodgerblue: { hex: '#1e90ff', rgb: [30, 144, 255] },
    firebrick: { hex: '#b22222', rgb: [178, 34, 34] },
    floralwhite: { hex: '#fffaf0', rgb: [255, 250, 240] },
    forestgreen: { hex: '#228b22', rgb: [34, 139, 34] },
    fuchsia: { hex: '#ff00ff', rgb: [255, 0, 255] },
    gainsboro: { hex: '#dcdcdc', rgb: [220, 220, 220] },
    ghostwhite: { hex: '#f8f8ff', rgb: [248, 248, 255] },
    gold: { hex: '#ffd700', rgb: [255, 215, 0] },
    goldenrod: { hex: '#daa520', rgb: [218, 165, 32] },
    gray: { hex: '#808080', rgb: [128, 128, 128] },
    green: { hex: '#008000', rgb: [0, 128, 0] },
    greenyellow: { hex: '#adff2f', rgb: [173, 255, 47] },
    honeydew: { hex: '#f0fff0', rgb: [240, 255, 240] },
    hotpink: { hex: '#ff69b4', rgb: [255, 105, 180] },
    indianred: { hex: '#cd5c5c', rgb: [205, 92, 92] },
    indigo: { hex: '#4b0082', rgb: [75, 0, 130] },
    ivory: { hex: '#fffff0', rgb: [255, 255, 240] },
    khaki: { hex: '#f0e68c', rgb: [240, 230, 140] },
    lavender: { hex: '#e6e6fa', rgb: [230, 230, 250] },
    lavenderblush: { hex: '#fff0f5', rgb: [255, 240, 245] },
    lawngreen: { hex: '#7cfc00', rgb: [124, 252, 0] },
    lemonchiffon: { hex: '#fffacd', rgb: [255, 250, 205] },
    lightblue: { hex: '#add8e6', rgb: [173, 216, 230] },
    lightcoral: { hex: '#f08080', rgb: [240, 128, 128] },
    lightcyan: { hex: '#e0ffff', rgb: [224, 255, 255] },
    lightgoldenrodyellow: { hex: '#fafad2', rgb: [250, 250, 210] },
    lightgrey: { hex: '#d3d3d3', rgb: [144, 238, 144] },
    lightgreen: { hex: '#90ee90', rgb: [211, 211, 211] },
    lightpink: { hex: '#ffb6c1', rgb: [255, 182, 193] },
    lightsalmon: { hex: '#ffa07a', rgb: [255, 160, 122] },
    lightseagreen: { hex: '#20b2aa', rgb: [32, 178, 170] },
    lightskyblue: { hex: '#87cefa', rgb: [135, 206, 250] },
    lightslategray: { hex: '#778899', rgb: [119, 136, 153] },
    lightsteelblue: { hex: '#b0c4de', rgb: [176, 196, 222] },
    lightyellow: { hex: '#ffffe0', rgb: [255, 255, 224] },
    lime: { hex: '#00ff00', rgb: [0, 255, 0] },
    limegreen: { hex: '#32cd32', rgb: [50, 205, 50] },
    linen: { hex: '#faf0e6', rgb: [250, 240, 230] },
    magenta: { hex: '#ff00ff', rgb: [255, 0, 255] },
    maroon: { hex: '#800000', rgb: [128, 0, 0] },
    mediumaquamarine: { hex: '#66cdaa', rgb: [102, 205, 170] },
    mediumblue: { hex: '#0000cd', rgb: [0, 0, 205] },
    mediumorchid: { hex: '#ba55d3', rgb: [186, 85, 211] },
    mediumpurple: { hex: '#9370d8', rgb: [147, 112, 216] },
    mediumseagreen: { hex: '#3cb371', rgb: [60, 179, 113] },
    mediumslateblue: { hex: '#7b68ee', rgb: [123, 104, 238] },
    mediumspringgreen: { hex: '#00fa9a', rgb: [0, 250, 154] },
    mediumturquoise: { hex: '#48d1cc', rgb: [72, 209, 204] },
    mediumvioletred: { hex: '#c71585', rgb: [199, 21, 133] },
    midnightblue: { hex: '#191970', rgb: [25, 25, 112] },
    mintcream: { hex: '#f5fffa', rgb: [245, 255, 250] },
    mistyrose: { hex: '#ffe4e1', rgb: [255, 228, 225] },
    moccasin: { hex: '#ffe4b5', rgb: [255, 228, 181] },
    navajowhite: { hex: '#ffdead', rgb: [255, 222, 173] },
    navy: { hex: '#000080', rgb: [0, 0, 128] },
    oldlace: { hex: '#fdf5e6', rgb: [253, 245, 230] },
    olive: { hex: '#808000', rgb: [128, 128, 0] },
    olivedrab: { hex: '#6b8e23', rgb: [107, 142, 35] },
    orange: { hex: '#ffa500', rgb: [255, 165, 0] },
    orangered: { hex: '#ff4500', rgb: [255, 69, 0] },
    orchid: { hex: '#da70d6', rgb: [218, 112, 214] },
    palegoldenrod: { hex: '#eee8aa', rgb: [238, 232, 170] },
    palegreen: { hex: '#98fb98', rgb: [152, 251, 152] },
    paleturquoise: { hex: '#afeeee', rgb: [175, 238, 238] },
    palevioletred: { hex: '#d87093', rgb: [216, 112, 147] },
    papayawhip: { hex: '#ffefd5', rgb: [255, 239, 213] },
    peachpuff: { hex: '#ffdab9', rgb: [255, 218, 185] },
    peru: { hex: '#cd853f', rgb: [205, 133, 63] },
    pink: { hex: '#ffc0cb', rgb: [255, 192, 203] },
    plum: { hex: '#dda0dd', rgb: [221, 160, 221] },
    powderblue: { hex: '#b0e0e6', rgb: [176, 224, 230] },
    purple: { hex: '#800080', rgb: [128, 0, 128] },
    red: { hex: '#ff0000', rgb: [255, 0, 0] },
    rosybrown: { hex: '#bc8f8f', rgb: [188, 143, 143] },
    royalblue: { hex: '#4169e1', rgb: [65, 105, 225] },
    saddlebrown: { hex: '#8b4513', rgb: [139, 69, 19] },
    salmon: { hex: '#fa8072', rgb: [250, 128, 114] },
    sandybrown: { hex: '#f4a460', rgb: [244, 164, 96] },
    seagreen: { hex: '#2e8b57', rgb: [46, 139, 87] },
    seashell: { hex: '#fff5ee', rgb: [255, 245, 238] },
    sienna: { hex: '#a0522d', rgb: [160, 82, 45] },
    silver: { hex: '#c0c0c0', rgb: [192, 192, 192] },
    skyblue: { hex: '#87ceeb', rgb: [135, 206, 235] },
    slateblue: { hex: '#6a5acd', rgb: [106, 90, 205] },
    slategray: { hex: '#708090', rgb: [112, 128, 144] },
    snow: { hex: '#fffafa', rgb: [255, 250, 250] },
    springgreen: { hex: '#00ff7f', rgb: [0, 255, 127] },
    steelblue: { hex: '#4682b4', rgb: [70, 130, 180] },
    tan: { hex: '#d2b48c', rgb: [210, 180, 140] },
    teal: { hex: '#008080', rgb: [0, 128, 128] },
    thistle: { hex: '#d8bfd8', rgb: [216, 191, 216] },
    tomato: { hex: '#ff6347', rgb: [255, 99, 71] },
    turquoise: { hex: '#40e0d0', rgb: [64, 224, 208] },
    violet: { hex: '#ee82ee', rgb: [238, 130, 238] },
    wheat: { hex: '#f5deb3', rgb: [245, 222, 179] },
    white: { hex: '#ffffff', rgb: [255, 255, 255] },
    whitesmoke: { hex: '#f5f5f5', rgb: [245, 245, 245] },
    yellow: { hex: '#ffff00', rgb: [255, 255, 0] },
    yellowgreen: { hex: '#9acd32', rgb: [154, 205, 50] }
}
