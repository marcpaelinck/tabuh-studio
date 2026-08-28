import type { MutingType, StrokeLocation, ToneType } from '@tabuhstudio/shared/types/basetypes'
import type { HTMLAttributes, ReactElement } from 'react'

// ANIMATION

export type XCoordRecord = { [note: string]: number } | null

export type YCoordRecord = { y: number } | null

export type AnimationNoteProps = {
    tone: ToneType // corresponds with a specific key, chime, gong or (in case of a kendang) stroke type.
    octave: number | null // 0, 1 or 2: relative to the instrument. Scale always start with DING.
    stroke: StrokeLocation | null // Striking location or method in case multiple ways exist to strike a key, chime or gong.
    muting: MutingType // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

export type AnimationData = {
    hover_x: number
    hover_y: number
    stroke_x: number
    stroke_y: number
    stroke_rotation: number
    stroke_scale: number[]
} | null

export type SVGInfo = {
    svg: SVGSVGElement | null
    panggul: SVGUseElement | null
    x: XCoordRecord
    y: number | null
    animation: AnimationData
}
// export type NotationType = DetailedReactHTMLElement<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>[]

export type NotationParagraph = ReactElement<HTMLAttributes<HTMLParagraphElement>>

export type TextCursorPosition = {
    x: number
    y: number
    leftSymbol: SVGTSpanElement | null
    rightSymbol: SVGTSpanElement | null
}

export interface HighlightRange {
    line: number
    range: number[]
}

// Determines whether the playback cursor highlights each beat separately or the entire system
export type PlaybackCursorStyle = 'Beat' | 'System' | 'None'

export type HilightRangeFunction = (hlRange: HighlightRange) => void
