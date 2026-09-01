import type { MutingType, ToneType } from '@tabuhstudio/shared/types/basetypes'
import type { BPM, Subdivision } from 'tone/build/esm/core/type/Units'
import type { DynamicsValue } from '../typing/execution'
import type { EditorCursor } from '../typing/playback'

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
    pp: 0.12,
    p: 0.15,
    mp: 0.22,
    mf: 0.35,
    f: 0.5,
    ff: 1.0
}
export const defaultDynamics: DynamicsValue = 'mf'
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
