export type Instrument = {
  id: string
  name: string
  alphabet: string[]
}

export type Note = {
  tone: string, // corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
  octave: number | null, // Scale always start with DING.
  stroke: string | null, // Striking location or method in case multiple ways exist to strike a key, chime or gong.
  muting: string, // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

export type NotationNote = {
  s: string
  t: number
  d: number
}
export type SectionData = {
  position: string
  velocity: number[]
  value: NotationNote[]
}
export type Section = {
  id: number
  title: string
  starttime: number
  duration: number
  tempo: number[]
  data: SectionData[]
}

export type Score = {
  title: string
  composer: string
  sections: Section[]
}

export type ScoreInfo = {
  title: string
  file: string
}