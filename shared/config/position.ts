import type { InstrumentGroup } from '../types/basetypes'
import type { Position, PositionConfig, PositionGroup } from '../types/position'

/**
 * Possible grouping of instruments in the compact editor view.
 */
export const positionGroups: Record<PositionGroup, { positions: Position[]; name: string }> = {
    PEMADE: { positions: ['PEMADE_POLOS', 'PEMADE_SANGSIH'], name: 'Pemade' },
    KANTILAN: { positions: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'], name: 'Kantilan' },
    GANGSA_POLOS: { positions: ['PEMADE_POLOS', 'KANTILAN_POLOS'], name: 'gangsa p' },
    GANGSA_SANGSIH: { positions: ['PEMADE_SANGSIH', 'KANTILAN_SANGSIH'], name: 'Gangsa s' },
    GANGSA: { positions: ['PEMADE_POLOS', 'PEMADE_SANGSIH', 'KANTILAN_POLOS', 'KANTILAN_SANGSIH'], name: 'Gangsa' },
    GANGSA_RANGE: {
        positions: ['PEMADE_POLOS', 'PEMADE_SANGSIH', 'KANTILAN_POLOS', 'KANTILAN_SANGSIH', 'UGAL'],
        name: 'Gangsa+Ugal'
    },
    REYONG_13: { positions: ['REYONG_1', 'REYONG_3'], name: 'reyong 1+3' },
    REYONG_24: { positions: ['REYONG_2', 'REYONG_4'], name: 'reyong 2+4' },
    REYONG: { positions: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4', 'REYONGB_1', 'REYONGB_2'], name: 'Reyong' },
    POKOK: { positions: ['CALUNG', 'JEGOGAN', 'PENYACAH'], name: 'Pokok' },
    MELODIC: {
        positions: [
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
            'REYONGB_1',
            'REYONGB_2',
            'CALUNG',
            'JEGOGAN',
            'PENYACAH',
            'PONGGANG'
        ],
        name: 'Melodic'
    },
    DAUN: {
        positions: [
            'PEMADE_POLOS',
            'PEMADE_SANGSIH',
            'KANTILAN_POLOS',
            'KANTILAN_SANGSIH',
            'UGAL',
            'GENDER_RAMBAT',
            'CALUNG',
            'JEGOGAN',
            'PENYACAH'
        ],
        name: 'Daun'
    },
    PERCUSSION: {
        positions: [
            'KEMPLI',
            'KENDANG',
            'KENDANG_LANANG',
            'KENDANG_WADON',
            'REYONG_1',
            'REYONG_2',
            'REYONG_3',
            'REYONG_4',
            'CENGCENG',
            'CENGCENG_P',
            'CENGCENG_S',
            'REYONGB_1',
            'REYONGB_2',
            'TAWATAWA'
        ],
        name: 'Percussion'
    },
    CENGCENG_KOPYAK: { positions: ['CENGCENG_P', 'CENGCENG_S'], name: 'Cengceng' }
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
        },
        KEMPLI: {
            name: 'Kempli',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'GK_KEMPLI_{note}.mp3',
            symbolToNoteNames: { 'x': ['X_MUTED'] },
        },
        CENGCENG: {
            name: 'Cengceng',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'GK_CENGCENG_{note}.mp3',
            symbolToNoteNames: { x: ['X_OPEN'], 'x?': ['X_MUTED'] },
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
    },
        JEGOGAN: {
            name: 'Jegogan',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_JEGOGAN.svg',
            sampletemplate: 'GK_JEGOGAN_{note}.mp3',
            symbolToNoteNames: {i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i/': ['DING1'], 'o/': ['DONG1'], 'e/': ['DENG1'], 'u/': ['DUNG1'], 'a/': ['DANG1']},
    
        },
        CALUNG: {
            name: 'Calung',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_CALUNG.svg',
            sampletemplate: 'GK_CALUNG_{note}.mp3',
            symbolToNoteNames: {i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 'i/': ['DING1'], 'o/': ['DONG1'], 'e/': ['DENG1'], 'u/': ['DUNG1'], 'a/': ['DANG1']},
    
        },
        PENYACAH: {
            name: 'Penyacah',
            type: 'daun',
            volume: -20,
            svg_file: 'svg/GK_PENYACAH.svg',
            sampletemplate: 'GK_PENYACAH_{note}.mp3',
            symbolToNoteNames: {'u,': ['DUNG0'],'a,': ['DANG0'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'], a: ['DANG1'], 
                           /*     'u,/': ['DUNG0_ABBR'], 'a,/': ['DANG0_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'], 'a/': ['DANG1_ABBR'] */}, 
    
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
        },
        TROMPONG: {
            name: 'Trompong',
            type: 'daun',
            volume: -15,
            svg_file: 'svg/GK_UGAL.svg',
            sampletemplate: 'GK_UGAL_{note}.mp3',
            symbolToNoteNames: { 'a,': ['DANG0'], 'i,': ['DING0'], 'o,': ['DONG0'], 'e,': ['DENG0'], 'u,': ['DUNG0'], 'a': ['DANG1'], i: ['DING1'], o: ['DONG1'], e: ['DENG1'], u: ['DUNG1'],
                                 'a,/': ['DANG0_ABBR'], 'i,/': ['DING0_ABBR'], 'o,/': ['DONG0_ABBR'], 'e,/': ['DENG0_ABBR'], 'u,/': ['DUNG0_ABBR'], 'a/': ['DANG1_ABBR'], 'i/': ['DING1_ABBR'], 'o/': ['DONG1_ABBR'], 'e/': ['DENG1_ABBR'], 'u/': ['DUNG1_ABBR'],
                                 'a,?': ['DANG0_MUTED'], 'i,?': ['DING0_MUTED'], 'o,?': ['DONG0_MUTED'], 'e,?': ['DENG0_MUTED'], 'u,?': ['DUNG0_MUTED'], 'a?': ['DANG1_MUTED'], 'i?': ['DING1_MUTED'], 'o?': ['DONG1_MUTED'], 'e?': ['DENG1_MUTED'], 'u?': ['DUNG1_MUTED'] },
    
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
        },
        CENGCENG_P: {
            name: 'Cengceng polos',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'BAL_CENGCENG_P_{note}.mp3',
            symbolToNoteNames: { x: ['X_OPEN'], 'x?': ['X_MUTED'] },
        },
        CENGCENG_S: {
            name: 'Cengceng sangsih',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'BAL_CENGCENG_S_{note}.mp3',
            symbolToNoteNames: { x: ['X_OPEN'], 'x?': ['X_MUTED'] },
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
        },
        TAWATAWA: {
            name: 'Tawa tawa',
            type: 'percussion',
            volume: -15,
            svg_file: '',
            sampletemplate: 'BAL_TAWATAWA_{note}.mp3',
            symbolToNoteNames: { x: ['X'] },
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
        }
    }
