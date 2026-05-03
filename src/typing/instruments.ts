// INSTRUMENTS / AUDIO

export type Instrument = { id: string; name: string; alphabet: string[] }

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

export type InstrumentType = 'GONG_KEBYAR' | 'SEMAR_PAGULINGAN' | 'UNDEFINED'

export type Tone = 'i,' | 'o,' | 'e,' | 'u,' | 'a,' | 'i' | 'o' | 'e' | 'u' | 'a' | 'i<' | 'o<' | 'e<' | 'u<' | 'a<'
