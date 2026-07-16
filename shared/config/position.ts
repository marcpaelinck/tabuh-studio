import { KEMPLI_BEAT_CHAR } from '../constants/noteChars'
import type { InstrumentGroup } from '../types/basetypes'
import type { Position, PositionConfig, PositionGroup } from '../types/position'

export const positionGroups: Record<PositionGroup, Position[]> = {
    PEMADE: ['PEMADE_POLOS', 'PEMADE_SANGSIH'],
    KANTILAN: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'],
    GANGSA_POLOS: ['PEMADE_POLOS', 'KANTILAN_POLOS'],
    GANGSA_SANGSIH: ['PEMADE_SANGSIH', 'KANTILAN_SANGSIH'],
    GANGSA: ['PEMADE_POLOS', 'PEMADE_SANGSIH', 'KANTILAN_POLOS', 'KANTILAN_SANGSIH'],
    GANGSA_RANGE: ['PEMADE_POLOS', 'PEMADE_SANGSIH', 'KANTILAN_POLOS', 'KANTILAN_SANGSIH', 'UGAL'],
    REYONG_13: ['REYONG_1', 'REYONG_3'],
    REYONG_24: ['REYONG_2', 'REYONG_4'],
    REYONG: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4'],
    POKOK: ['CALUNG', 'JEGOGAN', 'PENYACAH'],
    MELODIC: [
        'PEMADE_POLOS',
        'PEMADE_SANGSIH',
        'KANTILAN_POLOS',
        'KANTILAN_SANGSIH',
        'UGAL',
        'GENDER_RAMBAT',
        'REYONG_1',
        'REYONG_3',
        'REYONG_2',
        'REYONG_4',
        'CALUNG',
        'JEGOGAN',
        'PENYACAH'
    ]
}

export const positionAbbr: Partial<Record<Position | PositionGroup, string>> = {
    PEMADE_POLOS: 'pemadeP',
    PEMADE_SANGSIH: 'pemadeS',
    KANTILAN_POLOS: 'kantilanP',
    KANTILAN_SANGSIH: 'kantilanS',
    PEMADE: 'pemade',
    KANTILAN: 'kantilan',
    GANGSA_POLOS: 'gangsaP',
    GANGSA_SANGSIH: 'gangsaS',
    GANGSA: 'gangsa',
    GANGSA_RANGE: 'gangsa/ugal',
    REYONG_1: 'reyong1',
    REYONG_2: 'reyong2',
    REYONG_3: 'reyong3',
    REYONG_4: 'reyong4',
    REYONG_13: 'reyong13',
    REYONG_24: 'reyong24',
    REYONG: 'reyong',
    UGAL: 'ugal',
    PENYACAH: 'penyacah',
    CALUNG: 'calung',
    JEGOGAN: 'jegogan',
    POKOK: 'pokok',
    KEMPLI: 'kempli',
    CENGCENG: 'cengceng',
    GONGS: 'gongs',
    MELODIC: 'melodic'
}

export const defaultBeatPosition: Position = 'KEMPLI'

// List of available instrument groups.
// The staffs will appear in the editor in the given sequence.
export const orchestras: Partial<Record<InstrumentGroup, { positions: Position[]; beatPosition: Position }>> = {
    GONG_KEBYAR: {
        positions: [
            'UGAL',
            'GENDER_RAMBAT',
            'TROMPONG',
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
        ],
        beatPosition: 'KEMPLI'
    },
    BALEGANJUR: {
        positions: ['CENGCENG_P', 'CENGCENG_S', 'REYONGB_1', 'REYONGB_2', 'PONGGANG', 'GONGS', 'KENDANG', 'TAWATAWA'],
        beatPosition: 'TAWATAWA'
    }
}

//prettier-ignore
export const positionConfigs: Record<Position, PositionConfig> = {
        GONGS: {
            name: 'Gongs',
            type: 'percussion', //TODO move type to instrument and grouping info
            volume: -10,
            svg_file: 'svg/GK_GONGS.svg',
            sampletemplate: 'GK_GONGS_{note}.mp3',
            symbolToNoteNames: { G: ['GIR'], P: ['PUR'], T: ['TONG'] }, //TODO move alphabet info to separate settings
            validStrokes: [],
            modifiers:{before:[], after:[]}
        },
        KEMPLI: {
            name: 'Kempli',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'GK_KEMPLI_{note}.mp3',
            symbolToNoteNames: { 'x': ['X_MUTED'] },
            validStrokes: [KEMPLI_BEAT_CHAR + ';', KEMPLI_BEAT_CHAR + ':'],
            modifiers: {before: [], after:[';', ':']}
        },
        CENGCENG: {
            name: 'Cengceng',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'GK_CENGCENG_{note}.mp3',
            symbolToNoteNames: { x: ['X_OPEN'], 'x?': ['X_MUTED'] },
            validStrokes: ['x;', 'x:', 'x?;', 'x?:'],
            modifiers: {before: [], after:[';', ':']}
        },
        KENDANG: {
            name: 'Kendang',
            type: 'percussion',
            volume: -15,
            svg_file: 'svg/GK_KENDANG.svg',
            sampletemplate: 'GK_KENDANG_{note}.wav',
            symbolToNoteNames: { '0': ['CUNG'], '8': ['KA'], '9': ['DE'], '(': ['TUT'], ')': ['KUNG'], '*': ['PAK'],
                                 '0/': ['CUNG'], '8/': ['KA'], '9/': ['DE'], '(/': ['TUT'], ')/': ['KUNG'], '*/': ['PAK'],
                                 '0?': ['CUNG'], '8?': ['KA'], '9?': ['DE'], '(?': ['TUT'], ')?': ['KUNG'], '*?': ['PAK'] },
            validStrokes: ['0:', '8:', '9:', '(:', '):', '*:', '0;', '8;', ';:', '(;', ');', '*;'],
            modifiers: {before: [], after:[';', ':']}
        },
        KENDANG_WADON: {
            name: 'Kendang',
            type: 'percussion',
            volume: -15,
            svg_file: 'svg/GK_KENDANG.svg',
            sampletemplate: 'GK_KENDANG_{note}.wav',
            symbolToNoteNames: { '0': ['CUNG'], '8': ['KA'], '9': ['DE'], '(': ['TUT'], ')': ['KUNG'], '*': ['PAK'],
                                 '0/': ['CUNG'], '8/': ['KA'], '9/': ['DE'], '(/': ['TUT'], ')/': ['KUNG'], '*/': ['PAK'],
                                 '0?': ['CUNG'], '8?': ['KA'], '9?': ['DE'], '(?': ['TUT'], ')?': ['KUNG'], '*?': ['PAK'] },
            validStrokes: ['0:', '8:', '9:', '(:', '):', '*:', '0;', '8;', ';:', '(;', ');', '*;'],
            modifiers: {before: [], after:[';', ':']}
        },
        KENDANG_LANANG: {
            name: 'Kendang',
            type: 'percussion',
            volume: -15,
            svg_file: 'svg/GK_KENDANG.svg',
            sampletemplate: 'GK_KENDANG_{note}.wav',
            symbolToNoteNames: { '0': ['CUNG'], '8': ['KA'], '9': ['DE'], '(': ['TUT'], ')': ['KUNG'], '*': ['PAK'],
                                 '0/': ['CUNG'], '8/': ['KA'], '9/': ['DE'], '(/': ['TUT'], ')/': ['KUNG'], '*/': ['PAK'],
                                 '0?': ['CUNG'], '8?': ['KA'], '9?': ['DE'], '(?': ['TUT'], ')?': ['KUNG'], '*?': ['PAK'] },
            validStrokes: ['0:', '8:', '9:', '(:', '):', '*:', '0;', '8;', ';:', '(;', ');', '*;'],
                modifiers: {before: [], after:[';', ':']}
    },
        JEGOGAN: {
            name: 'Jegogan',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_JEGOGAN.svg',
            sampletemplate: 'GK_JEGOGAN_{note}.mp3',
            symbolToNoteNames: {i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i/': ['DING1'], 'o/': ['DONG1'], 'e/': ['DENG1'], 'u/': ['DUNG1'], 'a/': ['DANG1']},
            validStrokes: [],
            modifiers:{before:[], after:[]}
    
        },
        CALUNG: {
            name: 'Calung',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_CALUNG.svg',
            sampletemplate: 'GK_CALUNG_{note}.mp3',
            symbolToNoteNames: {i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i/': ['DING1'], 'o/': ['DONG1'], 'e/': ['DENG1'], 'u/': ['DUNG1'], 'a/': ['DANG1']},
            validStrokes: [],
            modifiers:{before:[], after:[]}
    
        },
        PENYACAH: {
            name: 'Penyacah',
            type: 'daun',
            volume: -20,
            svg_file: 'svg/GK_PENYACAH.svg',
            sampletemplate: 'GK_PENYACAH_{note}.mp3',
            symbolToNoteNames: {'u,': ['DUNG0'],'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 
                           /*     'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'] */}, 
            validStrokes: [],
            modifiers:{before:[], after:[]}
    
        },
        KANTILAN_POLOS: {
            name: 'Kantilan polos',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_GANGSA.svg',
            sampletemplate: 'GK_KANTILAN_{note}.mp3',
            symbolToNoteNames: { 'o,': ['DONG0'], 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i<': ['DING2'],
                                 'o,/': ['DONG0_ABBR'], 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 
                                 'o,?': ['DONG0_MUTED'], 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED']},
            validStrokes: ['o,_', 'e,_', 'u,_', 'a,_', 'i_', 'o_', 'e_', 'u_', 'a_', 'i<_',
                            'o,/_', 'e,/_', 'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_', 'u/_', 'a/_', 'i</_',
                            'o,;', 'e,;', 'u,;', 'a,;', 'i;', 'o;', 'e;', 'u;', 'a;', 'i<;', 
                            'o,:', 'e,:', 'u,:', 'a,:', 'i:', 'o:', 'e:', 'u:', 'a:', 'i<:',
                            'o,[', 'e,[', 'u,[', 'a,[', 'i[', 'o[', 'e[', 'u[', 'a[', 'i<[', 
                            'o,]', 'e,]', 'u,]', 'a,]', 'i]', 'o]', 'e]', 'u]', 'a]', 'i<]',
                            'o,n', 'e,n', 'u,n', 'a,n', 'in', 'on', 'en', 'un', 'an', 'i<n',
                            'o,N', 'e,N', 'u,N', 'a,N', 'iN', 'oN', 'eN', 'uN', 'aN', 'i<N',
                            'O,', 'E,', 'U,', 'A,', 'I', 'O', 'E', 'U', 'A', 'I<'],
            modifiers: {before: ['I','O','E','U','A'], after: ['_', ';', ':', '[', ']', 'n', 'N']}                    
        },
        KANTILAN_SANGSIH: {
            name: 'Kantilan sangsih',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_GANGSA.svg',
            sampletemplate: 'GK_KANTILAN_{note}.mp3',
            symbolToNoteNames: { 'o,': ['DONG0'], 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i<': ['DING2'],
                                 'o,/': ['DONG0_ABBR'], 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 
                                 'o,?': ['DONG0_MUTED'], 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED']},
            validStrokes: ['o,_', 'e,_', 'u,_', 'a,_', 'i_', 'o_', 'e_', 'u_', 'a_', 'i<_',
                            'o,/_', 'e,/_', 'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_', 'u/_', 'a/_', 'i</_',
                            'o,;', 'e,;', 'u,;', 'a,;', 'i;', 'o;', 'e;', 'u;', 'a;', 'i<;', 
                            'o,:', 'e,:', 'u,:', 'a,:', 'i:', 'o:', 'e:', 'u:', 'a:', 'i<:',
                            'o,[', 'e,[', 'u,[', 'a,[', 'i[', 'o[', 'e[', 'u[', 'a[', 'i<[', 
                            'o,]', 'e,]', 'u,]', 'a,]', 'i]', 'o]', 'e]', 'u]', 'a]', 'i<]',
                            'o,n', 'e,n', 'u,n', 'a,n', 'in', 'on', 'en', 'un', 'an', 'i<n',
                            'o,N', 'e,N', 'u,N', 'a,N', 'iN', 'oN', 'eN', 'uN', 'aN', 'i<N',
                            'O,', 'E,', 'U,', 'A,', 'I', 'O', 'E', 'U', 'A', 'I<'],
            modifiers: {before: ['I','O','E','U','A'], after: ['_', ';', ':', '[', ']', 'n', 'N']}                    
        },
        PEMADE_POLOS: {
            name: 'Pemade polos',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_GANGSA.svg',
            sampletemplate: 'GK_PEMADE_{note}.mp3',
            symbolToNoteNames: { 'o,': ['DONG0'], 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i<': ['DING2'],
                                 'o,/': ['DONG0_ABBR'], 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 
                                 'o,?': ['DONG0_MUTED'], 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED']},
            validStrokes: ['o,_', 'e,_', 'u,_', 'a,_', 'i_', 'o_', 'e_', 'u_', 'a_', 'i<_',
                            'o,/_', 'e,/_', 'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_', 'u/_', 'a/_', 'i</_',
                            'o,;', 'e,;', 'u,;', 'a,;', 'i;', 'o;', 'e;', 'u;', 'a;', 'i<;', 
                            'o,:', 'e,:', 'u,:', 'a,:', 'i:', 'o:', 'e:', 'u:', 'a:', 'i<:',
                            'o,[', 'e,[', 'u,[', 'a,[', 'i[', 'o[', 'e[', 'u[', 'a[', 'i<[', 
                            'o,]', 'e,]', 'u,]', 'a,]', 'i]', 'o]', 'e]', 'u]', 'a]', 'i<]',
                            'o,n', 'e,n', 'u,n', 'a,n', 'in', 'on', 'en', 'un', 'an', 'i<n',
                            'o,N', 'e,N', 'u,N', 'a,N', 'iN', 'oN', 'eN', 'uN', 'aN', 'i<N',
                            'O,', 'E,', 'U,', 'A,', 'I', 'O', 'E', 'U', 'A', 'I<'],
            modifiers: {before: ['I','O','E','U','A'], after: ['_', ';', ':', '[', ']', 'n', 'N']}                    
    
        },
        PEMADE_SANGSIH: {
            name: 'Pemade sangsih',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_GANGSA.svg',
            sampletemplate: 'GK_PEMADE_{note}.mp3',
            symbolToNoteNames: { 'o,': ['DONG0'], 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i<': ['DING2'],
                                 'o,/': ['DONG0_ABBR'], 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 
                                 'o,?': ['DONG0_MUTED'], 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED']},
            validStrokes: ['o,_', 'e,_', 'u,_', 'a,_', 'i_', 'o_', 'e_', 'u_', 'a_', 'i<_',
                            'o,/_', 'e,/_', 'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_', 'u/_', 'a/_', 'i</_',
                            'o,;', 'e,;', 'u,;', 'a,;', 'i;', 'o;', 'e;', 'u;', 'a;', 'i<;', 
                            'o,:', 'e,:', 'u,:', 'a,:', 'i:', 'o:', 'e:', 'u:', 'a:', 'i<:',
                            'o,[', 'e,[', 'u,[', 'a,[', 'i[', 'o[', 'e[', 'u[', 'a[', 'i<[', 
                            'o,]', 'e,]', 'u,]', 'a,]', 'i]', 'o]', 'e]', 'u]', 'a]', 'i<]',
                            'o,n', 'e,n', 'u,n', 'a,n', 'in', 'on', 'en', 'un', 'an', 'i<n',
                            'o,N', 'e,N', 'u,N', 'a,N', 'iN', 'oN', 'eN', 'uN', 'aN', 'i<N',
                            'O,', 'E,', 'U,', 'A,', 'I', 'O', 'E', 'U', 'A', 'I<'],
            modifiers: {before: ['I','O','E','U','A'], after: ['_', ';', ':', '[', ']', 'n', 'N']}                    
        },
        UGAL: {
            name: 'Ugal',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_UGAL.svg',
            sampletemplate: 'GK_UGAL_{note}.mp3',
            symbolToNoteNames: { 'o,': ['DONG0'], 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i<': ['DING2'],
                                 'o,/': ['DONG0_ABBR'], 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 
                                 'o,?': ['DONG0_MUTED'], 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED']},
            validStrokes: ['o,_', 'e,_', 'u,_', 'a,_', 'i_', 'o_', 'e_', 'u_', 'a_', 'i<_',
                            'o,/_', 'e,/_', 'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_', 'u/_', 'a/_', 'i</_',
                            'o,;', 'e,;', 'u,;', 'a,;', 'i;', 'o;', 'e;', 'u;', 'a;', 'i<;', 
                            'o,:', 'e,:', 'u,:', 'a,:', 'i:', 'o:', 'e:', 'u:', 'a:', 'i<:',
                            'o,[', 'e,[', 'u,[', 'a,[', 'i[', 'o[', 'e[', 'u[', 'a[', 'i<[', 
                            'o,]', 'e,]', 'u,]', 'a,]', 'i]', 'o]', 'e]', 'u]', 'a]', 'i<]',
                            'o,n', 'e,n', 'u,n', 'a,n', 'in', 'on', 'en', 'un', 'an', 'i<n',
                            'o,N', 'e,N', 'u,N', 'a,N', 'iN', 'oN', 'eN', 'uN', 'aN', 'i<N',
                            'O,', 'E,', 'U,', 'A,', 'I', 'O', 'E', 'U', 'A', 'I<'],
            modifiers: {before: ['I','O','E','U','A'], after: ['_', ';', ':', '[', ']', 'n', 'N']}                    
        },
        TROMPONG: {
            name: 'Ugal',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_UGAL.svg',
            sampletemplate: 'GK_UGAL_{note}.mp3',
            symbolToNoteNames: { 'a,': ['DANG0'], 'i,': ['DING0'], 'o,': ['DONG0'], 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a': ['DANG1'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'],
                                 'a,/': ['DANG0_ABBR'], 'i,/': ['DING0_ABBR'], 'o,/': ['DONG0_ABBR'], 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a/': ['DANG1_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'],
                                 'a,?': ['DANG0_MUTED'], 'i,?': ['DING0_MUTED'], 'o,?': ['DONG0_MUTED'], 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a?': ['DANG1_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'] },
            validStrokes: [],
            modifiers:{before:[], after:[]}
    
        },
        GENDER_RAMBAT: {
            name: 'Gender rambat',
            type: 'daun',
            volume: -15,
            svg_file: '',
            sampletemplate: 'GK_GENDERRAMBAT_{note}.mp3',
            symbolToNoteNames: { 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i<': ['DING2'],
                                 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 
                                 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED']},
            validStrokes: ['e,_', 'u,_', 'a,_', 'i_', 'o_', 'e_', 'u_', 'a_', 'i<_',
                            'e,/_', 'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_', 'u/_', 'a/_', 'i</_',
                            'e,;', 'u,;', 'a,;', 'i;', 'o;', 'e;', 'u;', 'a;', 'i<;', 
                            'e,:', 'u,:', 'a,:', 'i:', 'o:', 'e:', 'u:', 'a:', 'i<:',
                            'e,[', 'u,[', 'a,[', 'i[', 'o[', 'e[', 'u[', 'a[', 'i<[', 
                            'e,]', 'u,]', 'a,]', 'i]', 'o]', 'e]', 'u]', 'a]', 'i<]',
                            'e,n', 'u,n', 'a,n', 'in', 'on', 'en', 'un', 'an', 'i<n',
                            'e,N', 'u,N', 'a,N', 'iN', 'oN', 'eN', 'uN', 'aN', 'i<N',
                            'E,', 'U,', 'A,', 'I', 'O', 'E', 'U', 'A', 'I<'],
            modifiers: {before: ['I','O','E','U','A'], after: ['_', ';', ':', '[', ']', 'n', 'N']}                    
    
        },
        REYONG_1: {
            name: 'Reyong 1',
            type: 'chimes',
            volume: -15,
            svg_file: 'svg/GK_REYONG.svg',
            sampletemplate: 'GK_REYONG_{note}.mp3',
            symbolToNoteNames: {'e,': ['DENG0'], 'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], 
                                'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 
                                'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 
                                t: ['DENG0', 'DING1'], 't?': ['DENG0_MUTED', 'DING1_MUTED'], 
                                b: ['DENG0', 'DANG0'], 'b/': ['DENG0_ABBR', 'DANG0_ABBR'], 'b?': ['DENG0_MUTED', 'DANG0_MUTED'], 
                                x: ['XDUNG0'], 'x/': ['XDUNG0_ABBR'], 'x?': ['XDUNG0_MUTED']
            },
            validStrokes: ['e,_', 'u,_', 'a,_', 'i_', 'o_', 'e_',
                            'e,/_', 'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_',
                            'e,;', 'u,;', 'a,;', 'i;', 'o;', 'e;', 
                            'e,:', 'u,:', 'a,:', 'i:', 'o:', 'e:',
                            'in', 'on', 'en', 'un', 'an',
                            'iN', 'oN', 'eN', 'uN', 'aN',
                            'E', 'U', 'A', 'I', 'O', 'X', 'B'
                            ],
            modifiers: {before: ['I','O','E','U','A', 'X', 'B'], after: ['_', ';', ':','n', 'N']}                    
        },
        REYONG_2: {
            name: 'Reyong 2',
            type: 'chimes',
            volume: -15,
            svg_file: 'svg/GK_REYONG.svg',
            sampletemplate: 'GK_REYONG_{note}.mp3',
            symbolToNoteNames: {'u,': ['DUNG0'], 'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 
                                'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 
                                'u,?': ['DUNG0_MUTED'], 'a,?': ['DANG0_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 
                                b: ['DING1', 'DENG1'], 'b/': ['DING1_ABBR', 'DENG1_ABBR'], 'b?': ['DING1_MUTED', 'DENG1_MUTED'], 
                                x: ['XDONG1'], 'x/': ['XDONG1_ABBR'], 'x?': ['XDONG1_MUTED']
            },
            validStrokes: ['u,_', 'a,_', 'i_', 'o_', 'e_', 'u_', 'a_',
                            'u,/_', 'a,/_', 'i/_', 'o/_', 'e/_', 'u/_', 'a/_',
                            'u,;', 'a,;', 'i;', 'o;', 'e;', 'u;', 'a;', 
                            'u,:', 'a,:', 'i:', 'o:', 'e:', 'u:', 'a:',
                            'in', 'on', 'en', 'un', 'an',
                            'iN', 'oN', 'eN', 'uN', 'aN',
                            'I', 'O', 'E', 'U', 'A', 'X', 'B'
                        ],
            modifiers: {before: ['I','O','E','U','A', 'X', 'B'], after: ['_', ';', ':','n', 'N']}                    
    
        },
        REYONG_3: {
            name: 'Reyong 3',
            type: 'chimes',
            volume: -15,
            svg_file: 'svg/GK_REYONG.svg',
            sampletemplate: 'GK_REYONG_{note}.mp3',
            symbolToNoteNames: {o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i<': ['DING2'], 'o<': ['DONG2'], 'e<': ['DENG2'], 
                               'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 'o</': ['DONG2_ABBR'], 'e</': ['DENG2_ABBR'],
                               'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED'], 'o<?': ['DONG2_MUTED'], 'e<?': ['DENG2_MUTED'], 
                                b: ['DUNG1', 'DING2'], 'b/': ['DUNG1_ABBR', 'DING2_ABBR'], 'b?': ['DUNG1_MUTED', 'DING2_MUTED'], 
                                x: ['XDANG1'], 'x/': ['XDANG1_ABBR'], 'x?': ['XDANG1_MUTED']
            },
            validStrokes: ['o_', 'e_', 'u_', 'a_', 'i<_', 'o<_', 'e<_',
                            'o/_', 'e/_', 'u/_', 'a/_', 'i</_', 'o</_', 'e</_',
                            'o;', 'e;', 'u;', 'a;', 'i<;', 'o<;', 'e<;', 
                            'o:', 'e:', 'u:', 'a:', 'i<:', 'o<:', 'e<:',
                            'in', 'on', 'en', 'un', 'an',
                            'iN', 'oN', 'eN', 'uN', 'aN',
                            'I', 'O', 'E', 'U', 'A', 'X', 'B'
                        ],
            modifiers: {before: ['I','O','E','U','A', 'X', 'B'], after: ['_', ';', ':','n', 'N']}                    
        },
        REYONG_4: {
            name: 'Reyong 4',
            type: 'chimes',
            volume: -15,
            svg_file: 'svg/GK_REYONG.svg',
            sampletemplate: 'GK_REYONG_{note}.mp3',
            symbolToNoteNames: {u: ['DUNG1'], 'a': ['DANG1'], 'i<': ['DING2'], 'o<': ['DONG2'], 'e<': ['DENG2'], 'u<': ['DUNG2'], 
                               'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'], 'i</': ['DING2_ABBR'], 'o</': ['DONG2_ABBR'], 'e</': ['DENG2_ABBR'], 'u</': ['DUNG2_ABBR'],
                               'u?': ['DUNG1_MUTED'], 'a?': ['DANG1_MUTED'], 'i<?': ['DING2_MUTED'], 'o<?': ['DONG2_MUTED'], 'e<?': ['DENG2_MUTED'], 'u<?': ['DUNG2_MUTED'],
                                b: ['DONG2', 'DUNG2'], 'b/': ['DONG2_ABBR', 'DUNG2_ABBR'], 'b?': ['DONG2_MUTED', 'DUNG2_MUTED'], 
                                x: ['XDENG2'], 'x/': ['XDENG2_ABBR'], 'x?': ['XDENG2_MUTED']
            },
            validStrokes: ['u_', 'a_', 'i<_', 'o<_', 'e<_', 'u<_',
                            'u/_', 'a/_', 'i</_', 'o</_', 'e</_', 'u</_',
                            'u;', 'a;', 'i<;', 'o<;', 'e<;', 'u<;', 
                            'u:', 'a:', 'i<:', 'o<:', 'e<:', 'u<:',
                            'in', 'on', 'en', 'un', 'an',
                            'iN', 'oN', 'eN', 'uN', 'aN',
                            'I', 'O', 'E', 'U', 'A', 'X', 'B'
                        ],
            modifiers: {before: ['I','O','E','U','A', 'X', 'B'], after: ['_', ';', ':','n', 'N']}                    
        },
        CENGCENG_P: {
            name: 'Cengceng polos',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'BAL_CENGCENG_P_{note}.mp3',
            symbolToNoteNames: { x: ['X'], 'x?': ['X_MUTED'] },
            validStrokes: ['x;', 'x:', 'x?;', 'x?:'],
            modifiers: {before: [], after:[';', ':']}
        },
        CENGCENG_S: {
            name: 'Cengceng sangsih',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'BAL_CENGCENG_S_{note}.mp3',
            symbolToNoteNames: { x: ['X'], 'x?': ['X_MUTED'] },
            validStrokes: ['x;', 'x:', 'x?;', 'x?:'],
            modifiers: {before: [], after:[';', ':']}
        },
    REYONGB_1: {
        name: 'Reyong 1',
        type: 'chimes',
        volume: -15,
        svg_file: '',
        sampletemplate: 'BAL_REYONGB_{note}.mp3',
        symbolToNoteNames: {
            o: ['DONG1'],
            e: ['DENG1'],
            'o/': ['DONG1_ABBR'],
            'e/': ['DENG1_ABBR'],
            'o?': ['DONG1_MUTED'],
            'e?': ['DENG1_MUTED'],
            b: ['DONG1', 'DENG1'],
            'b/': ['DONG1_ABBR', 'DENG1_ABBR'],
            'b?': ['DONG1_MUTED', 'DENG1_MUTED'],
            x: ['XDONG1'],
            'x/': ['XDONG1_ABBR'],
            'x?': ['XDONG1_MUTED']
        },
        validStrokes: ['o;', 'e;', 'o:', 'e:', 'O', 'E'],
        modifiers: { before: ['O', 'E', 'X', 'B'], after: [';', ':'] }
    },
    REYONGB_2: {
        name: 'Reyong 2',
        type: 'chimes',
        volume: -15,
        svg_file: '',
        sampletemplate: 'BAL_REYONGB_{note}.mp3',
        symbolToNoteNames: {
            u: ['DUNG1'],
            a: ['DANG1'],
            'u/': ['DUNG1_ABBR'],
            'a/': ['DANG1_ABBR'],
            'u?': ['DUNG1_MUTED'],
            'a?': ['DANG1_MUTED'],
            b: ['DUNG1', 'DANG1'],
            'b/': ['DUNG1_ABBR', 'DANG1_ABBR'],
            'b?': ['DUNG1_MUTED', 'DANG1_MUTED'],
            x: ['XDUNG1'],
            'x/': ['XDUNG1_ABBR'],
            'x?': ['XDUNG1_MUTED']
        },
        validStrokes: ['u;', 'a;', 'u:', 'a:', 'U', 'A'],
        modifiers: { before: ['U', 'A', 'X', 'B'], after: [';', ':'] }
    },
    TAWATAWA: {
        name: 'Tawa tawa',
        type: 'percussion',
        volume: -15,
        svg_file: '',
        sampletemplate: 'BAL_TAWATAWA_{note}.mp3',
        symbolToNoteNames: { x: ['X'] },
        validStrokes: [],
        modifiers: { before: [], after: [] }
    },
    PONGGANG: {
        name: 'Ponggang',
        type: 'chimes',
        volume: -15,
        svg_file: '',
        sampletemplate: 'BAL_PONGGANG_{note}.mp3',
        symbolToNoteNames: {
            u: ['DUNG1'],
            a: ['DANG1'],
        },
        validStrokes: ['u;', 'a;', 'u:', 'a:', 'U', 'A'],
        modifiers: { before: ['U', 'A', 'X', 'B'], after: [';', ':'] }
    }
    }
