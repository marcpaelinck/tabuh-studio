export type Instrument = {
  id: string
  name: string
  alphabet: string[]
}

export type Note = {
  s: string
  t: number
  d: number
}
export type SectionData = {
  position: string
  velocity: number[]
  value: Note[]
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