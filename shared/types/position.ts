export type Modifiers = { before: string[]; after: string[] }

export type PositionConfig = {
    //`notes` contains a list of single notes or multiple notes that are played simultaneously.
    // The string values are 'shorthand' codes that uniquely define a sample (see const noteConfigs).
    // sampletemplate should contain the string '{note}' where the note name should appear in the
    // sample file name.
    name: string
    type: string
    svg_file: string
    sampletemplate: string
    volume: number
    symbolToNoteNames: { [symbol: string]: string[] }
}

export type Position =
    | 'CALUNG'
    | 'CENGCENG'
    | 'GENDER_RAMBAT'
    | 'GONGS'
    | 'JEGOGAN'
    | 'KANTILAN_POLOS'
    | 'KANTILAN_SANGSIH'
    | 'KEMPLI'
    | 'KENDANG'
    | 'KENDANG_LANANG'
    | 'KENDANG_WADON'
    | 'PEMADE_POLOS'
    | 'PEMADE_SANGSIH'
    | 'PENYACAH'
    | 'REYONG_1'
    | 'REYONG_2'
    | 'REYONG_3'
    | 'REYONG_4'
    | 'TROMPONG'
    | 'UGAL'
    | 'CENGCENG_P'
    | 'CENGCENG_S'
    | 'REYONGB_1'
    | 'REYONGB_2'
    | 'TAWATAWA'
    | 'PONGGANG'

export type PositionGroup =
    | 'PEMADE'
    | 'KANTILAN'
    | 'GANGSA_POLOS'
    | 'GANGSA_SANGSIH'
    | 'GANGSA'
    | 'GANGSA_RANGE'
    | 'REYONG_13'
    | 'REYONG_24'
    | 'REYONG'
    | 'REYONGB'
    | 'POKOK'
    | 'MELODIC'
    | 'DAUN'
    | 'PERCUSSION'
    | 'CENGCENG_KOPYAK'
