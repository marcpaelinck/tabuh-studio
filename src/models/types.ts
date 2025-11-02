// INSTRUMENTS

import type { NotationArea } from "../components/NotationArea"

export type Instrument = {
  id: string
  name: string
  alphabet: string[]
}

// NOTATION

export type Note = {
  tone: string, // corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
  octave: number | null, // Scale always start with DING.
  stroke: string | null, // Striking location or method in case multiple ways exist to strike a key, chime or gong.
  muting: string, // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

export type NotationNote = {
  section: string
  s: string
  t: number  // attack time in base notes
  ms: number // attack time in ms
  d: number
  v: number // velocity
}
export type SectionData = {
  position: string
  velocity: number[]
  value: NotationNote[]
}
export type Section = {
  id: number
  title: string
  starttime: number   // start time in base notes
  starttimeMs: number // start time in ms
  duration: number
  tempo: number[]
  data: SectionData[]
}

export type Score = {
  title: string
  composer: string
  durationMs: number
  sections: Section[]
}

export type ScoreInfo = {
  title: string
  file: string
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

export type AnimationInfo = {
  svgInfo: SVGInfo
  notationAreaRef: React.RefObject<NotationArea | null>
}