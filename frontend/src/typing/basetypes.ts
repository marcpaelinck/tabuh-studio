// NOTATION

export type NoteSymbol = string

export type BPM = number

export type TimeInBasenoteEquiv = number

export type DurationInBasenoteEquiv = number

export type UUID = string

// Typing of tone and muting
// See https://stackoverflow.com/questions/54607961/how-to-define-a-type-based-on-values-of-an-array
// prettier-ignore
const _tones_ = ['DING','DONG','DENG','DUNG','DANG','GIR','PUR','TONG','X','X','KA','PAK','DE','TUT','CUNG','KUNG'] as const
export type ToneType = (typeof _tones_)[number] // 'DING' | 'DONG' | 'DENG' | ...

const _strokes_ = ['KNOB', 'RIM'] as const
export type StrokeLocation = (typeof _strokes_)[number]

const _mutings_ = ['OPEN', 'ABBREVIATED', 'MUTED'] as const
export type MutingType = (typeof _mutings_)[number]

export type InstrumentType = 'GONG_KEBYAR' | 'SEMAR_PAGULINGAN' | 'UNDEFINED'

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
