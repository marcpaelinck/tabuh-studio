import type { HTMLAttributes, ReactElement } from 'react'

// ANIMATION

export type XCoordRecord = { [note: string]: number } | null

export type YCoordRecord = { y: number } | null

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

export type HilightRangeFunction = (hlRange: HighlightRange) => void
