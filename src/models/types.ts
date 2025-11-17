// INSTRUMENTS

import type { JSX } from "react"
import type { MutingType, StrokeType, ToneType } from "../config/config"

export type Instrument = {
  id: string
  name: string
  alphabet: string[]
}

// NOTATION

export type Note = {
  tone: ToneType, // corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
  octave: number | null, // Scale always start with DING.
  stroke: StrokeType | null, // Striking location or method in case multiple ways exist to strike a key, chime or gong.
  muting: MutingType, // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

export type JsonNote = {
  system: number
  section: number
  s: string
  t: number  // attack time in base notes
  ms: number // attack time in ms
  d: number
  v: number // velocity
}

// Used as 
export type JsonSymbol = {
  system: number
  section: number
  s: string
  t: number  // attack time in base notes
  d: number
}

// Notation of one section for one instrument position
export type Stave = {
  velocity: number[]
  notes: JsonNote[]
  notation: JsonSymbol[]
}

// Subdivision of a system, typically spans one kempli beat
export type Section = {
  id: number
  gongan: number
  starttime: number   // start time in base notes
  starttimeMs: number // start time in ms
  duration: number
  tempo: number[]
  staves: { [position: string]: Stave }
}

// Subdivision of a score, typically spans one gongan
export type System = {
  id: number
  starttime: number // start time of first section
  duration: number // sum of section durations
  part: string
  sections: Section[]
}

export type Score = {
  title: string
  composer: string
  durationMs: number
  systems: System[]
}

export type ScoreInfo = {
  title: string
  instrumentgroup: string
  file: string
  notationversion: string
  pdf: string
}

// ANIMATION

export type XCoordRecord = { [note: string]: number } | null
export type AnimationData = { hover_x: number, hover_y: number, stroke_x: number, stroke_y: number, stroke_rotation: number, stroke_scale: number[] } | null

export type SVGInfo = {
  svg: SVGSVGElement | null
  panggul: SVGUseElement | null
  x: XCoordRecord
  y: number | null
  animation: AnimationData
}

// export type NotationType = DetailedReactHTMLElement<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>[]
export type NotationType = JSX.Element[]

export type AnimationInfo = {
  svgInfo: SVGInfo
  highlightRef: React.RefObject<CallableFunction | null>
}