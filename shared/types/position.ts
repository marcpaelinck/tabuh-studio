export type Modifiers = { before: string[]; after: string[] }

export type Orchestra = 'GONG_KEBYAR' | 'BALEGANJUR' | 'SEMAR_PAGULINGAN'

export type Instrument =
    // Gong Kebyar
    | 'UGAL'
    | 'GENDER_RAMBAT'
    | 'TROMPONG'
    | 'PEMADE'
    | 'KANTILAN'
    | 'REYONG'
    | 'PENYACAH'
    | 'CALUNG'
    | 'JEGOGAN'
    | 'CENGCENG'
    | 'KEMPLI'
    | 'GK_GONGS'
    | 'GK_KENDANG'
    // Baleganjur
    | 'REYONGB'
    | 'PONGGANG'
    | 'TAWATAWA'
    | 'BAL_GONGS'
    | 'BAL_KENDANG'
    | 'BAL_CENGCENG_KOPYAK'
    // Semar Pagulingan
    | 'SP_PEMADE'
    | 'SP_KANTILAN'
    | 'SP_CALUNG'
    | 'SP_JEGOGAN'
    | 'SP_TROMPONG'
    | 'SP_GENDER'
    | 'SP_SULING'
    | 'SP_GONGS'
    | 'SP_KEMPLI'
    | 'SP_KENDANG'
    | 'SP_CENGCENG'

export type Position =
    // Gong Kebyar
    | 'CALUNG'
    | 'CENGCENG'
    | 'GENDER_RAMBAT'
    | 'JEGOGAN'
    | 'KANTILAN_POLOS'
    | 'KANTILAN_SANGSIH'
    | 'KEMPLI'
    | 'PEMADE_POLOS'
    | 'PEMADE_SANGSIH'
    | 'PENYACAH'
    | 'REYONG_1'
    | 'REYONG_2'
    | 'REYONG_3'
    | 'REYONG_4'
    | 'TROMPONG'
    | 'UGAL'
    | 'GK_GONGS'
    | 'GK_KENDANG'
    | 'GK_KENDANG_LANANG'
    | 'GK_KENDANG_WADON'
    // Baleganjur
    | 'REYONGB_1'
    | 'REYONGB_2'
    | 'TAWATAWA'
    | 'PONGGANG'
    | 'BAL_GONGS'
    | 'BAL_KENDANG'
    | 'BAL_KENDANG_LANANG'
    | 'BAL_KENDANG_WADON'
    | 'BAL_CENGCENG_P'
    | 'BAL_CENGCENG_S'
    // Semar Pagulingan
    | 'SP_PEMADE_POLOS'
    | 'SP_PEMADE_SANGSIH'
    | 'SP_KANTILAN_POLOS'
    | 'SP_KANTILAN_SANGSIH'
    | 'SP_CALUNG'
    | 'SP_JEGOGAN'
    | 'SP_TROMPONG'
    | 'SP_GENDER'
    | 'SP_SULING'
    | 'SP_GONGS'
    | 'SP_KEMPLI'
    | 'SP_KENDANG'
    | 'SP_KENDANG_LANANG'
    | 'SP_KENDANG_WADON'
    | 'SP_CENGCENG'

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

export type InstrumentConfig = { name: string; positions: Position[] }

export type PositionConfig = {
    // `symbolToNoteNames` maps each valid symbol to a list of 'shorthand' codes; each code uniquely
    // defines a sample. Sample files and per-instrument volumes live in the SampleSet (see
    // frontend/src/config/sampleSets.ts), not here.
    name: string
    instrument: Instrument
    type: string
    svg_file: string
    symbolToNoteNames: { [symbol: string]: string[] }
}
