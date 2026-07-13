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

export const instrumentTypes = ['GONG_KEBYAR', 'UNDEFINED'] as const
export type InstrumentType = (typeof instrumentTypes)[number]
