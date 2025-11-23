import { ignoreChars, positionConfigs, noteConfigs, type MutingType, type StrokeType, type ToneType } from '../../config/config'
import { type JsonNote, type JsonSymbol, type NotationElement, type Note, type Score, type Section } from '../../models/types'
import * as Tone from 'tone'
import { n2TO } from '../timeunits'
import { createElement } from 'react'

export function parseScore(input: string): Score {
  const score: Score = JSON.parse(input)
  // This function also calculates times in ms for each note, to be used by the animation.
  // The reason is that Transport.getSecondsAtTime() doesn't seem to process tempo changes correctly.
  var currentTimeMs = 0
  score.systems.forEach((system, sysidx, systemArray) => {
    system.sections.forEach((section, sectidx, sectionArray) => {
      section.starttimeMs = Math.round(currentTimeMs)
      for (const [_, stave] of Object.entries(section.staves)) {
        var dataTimeMs = currentTimeMs
        stave.notes.forEach((note: JsonNote) => {
          // Use the average tempo to determine the time in ms.
          const currTempo = section.tempo[0] + (section.tempo[1] - section.tempo[0]) * (note.t - section.starttime) / section.duration
          dataTimeMs = section.starttimeMs + 1000 * ((note.t - section.starttime) / 4) * (60 / (0.5 * (section.tempo[0] + currTempo)))
          note.ms = dataTimeMs
          note.section = section.id
          note.system = system.id
        })
      }
      currentTimeMs += 1000 * (section.duration / 4) * (60 / (0.5 * (section.tempo[0] + section.tempo[1])))
      if (sysidx === systemArray.length - 1 && sectidx === sectionArray.length - 1) {
        score.durationMs = currentTimeMs
      }
    })
  })
  return score
}

// Remove chars that should be ignored. See remark in configs.ts
const cleanSymbol = (symbol: string) => ignoreChars.reduce((sym, char) => sym.replace(char, ""), symbol)



// Creates a dict {<instrument> -> [<positions>]} from a score object.s
// const geInstrtPosDict = (score: Score): { [instrument: string]: string[] } => {
//   const positions: string[] = score.systems.map((system: System) => system.sections.map((section: Section) => Object.keys(section.staves)).flat()).flat()
//   const instrPosDict: { [instrument: string]: string[] } = {}
//   positions.forEach((position: string) => {
//     const instrument: string = position.split("_")[0]
//     instrPosDict[instrument] = (instrPosDict[instrument] || []).concat([position])
//   })
//   return instrPosDict
// }

export interface SamplerAction {
  time: Tone.Unit.TimeObject
  position: string
  cleanedSymbol: string
  bpm: number
  velocity: Tone.Unit.NormalRange
  duration: Tone.Unit.TimeObject
}

export type TempoAction = {
  time: Tone.Unit.TimeObject
  bpm: (Tone.Unit.NormalRange)[]
  duration: Tone.Unit.TimeObject
}

export type AnimationNote = {
  system: number
  section: number
  time: Tone.Unit.TimeObject
  keyname: string
  tone: ToneType
  stroke: StrokeType | null
  muting: MutingType
  duration: Tone.Unit.TimeObject
  islast: boolean
}

export type AnimationAction = {
  time: Tone.Unit.TimeObject
  position: string
  prevsystem: number | null
  prevsection: number | null
  currnotes: AnimationNote[]
  nextnotes: AnimationNote[]
  timeuntil: Tone.Unit.TimeObject
  timeuntilMs: number
}

export type CursorAction = {
  time: Tone.Unit.TimeObject
  position: string
  symbol: string
  newsystem: boolean
  newsection: boolean
  line: number
  range: number[]
}

export type Timeline = {
  totalDurationSec: number
  totalDurationTO: Tone.Unit.TimeObject  // Total duration expressed as BaseNote units
  tempoactions: TempoAction[]
  sampleractions: SamplerAction[]
  animationactions: AnimationAction[]
  cursoractions: CursorAction[]
  notation: { [position: string]: NotationElement }
}

// Create a mapping for notes to shorthand code
// const note_to_shCode: { [position: string]: { [symbol: string]: string[] } } = {}
// for (const [position, posConfigs] of Object.entries(instrumentConfigs)) {
//   note_to_shCode[position] = Object.fromEntries(posConfigs.alphabet.map((char, index) => [char, posConfigs.notes[index]]))
// }

const note2AnimationNotes = (position: string, notationNote: JsonNote, isLast: boolean): AnimationNote[] => {
  if (!(position in positionConfigs)) return []
  const cleanedSymbol = cleanSymbol(notationNote.s)
  const shorthandCodes = positionConfigs[position].symbolToNoteNames[cleanedSymbol] || []
  const result: AnimationNote[] = []
  shorthandCodes.forEach((shCode) => {
    const instrType: string = positionConfigs[position].type
    if (!shCode) return null
    const note: Note = noteConfigs[instrType][shCode]
    const keyname: string = `${note.tone}${note.octave != null ? note.octave : ""}`
    result.push({
      system: notationNote.system,
      section: notationNote.section,
      time: n2TO(notationNote.t),
      keyname: keyname,
      tone: note.tone,
      stroke: note.stroke,
      muting: note.muting,
      duration: n2TO(notationNote.d),
      islast: isLast
    })
  })
  return result
}

// Returns the tempo at the given time in BaseNote units relative to the start of the section.
const getCurrentBPM = (section: Section, relBNTime: number): number => {
  return Math.round(section.tempo[0] + (relBNTime / section.duration) * (section.tempo[1] - section.tempo[0]))
}

export function createTimeline(score: Score | null): Timeline | null {
  // Timeline will be used to create the Transport schedule

  if (!score) return null

  const timeline: Timeline = {
    totalDurationSec: 0,
    totalDurationTO: n2TO(0),
    tempoactions: [],
    sampleractions: [],
    animationactions: [],
    cursoractions: [],
    notation: {}
  }
  if (!score) return timeline

  var totalDurationInBaseNotes = 0
  const positionScore: { [position: string]: JsonNote[] } = {}
  const positionNotation: { [position: string]: JsonSymbol[] } = {}

  score.systems.forEach((system) => {
    system.sections.forEach((section) => {
      // Update the total duration time
      totalDurationInBaseNotes += section.duration
      timeline.totalDurationSec += (section.duration / 4) * 60 / (0.5 * (section.tempo[0] + section.tempo[1]))

      // Create sampler actions
      for (const [position, stave] of Object.entries(section.staves)) {
        if (!(position in positionScore)) positionScore[position] = []
        if (!(position in positionNotation)) positionNotation[position] = []
        var sectionProgress: number = 0
        stave.notes.forEach((note) => {
          // create separate scores for each position, which will be used to create the animation actions 
          var velocity: number = stave.velocity[0] + (sectionProgress / section.duration) * (stave.velocity[1] - stave.velocity[0])
          note.v = velocity
          positionScore[position].push(note)
          const bpm = getCurrentBPM(section, sectionProgress)
          timeline.sampleractions.push({
            position: position,
            cleanedSymbol: cleanSymbol(note.s),
            bpm: bpm,
            velocity: velocity,
            time: n2TO(note.t),
            duration: n2TO(note.d || 1)
          })
          sectionProgress += (note.d || 1)
        })
        stave.notation.forEach((symbol: JsonSymbol) => {
          symbol.system = system.id
          symbol.section = section.id
          positionNotation[position].push(symbol)
        })
      }
    })
  })

  // Create animation actions
  Object.keys(positionScore).forEach((position) => {
    const notes: JsonNote[] = positionScore[position]
    notes.forEach((note, index) => {
      const currIsLast = (index == notes.length - 1)
      const aNotes: AnimationNote[] = note2AnimationNotes(position, notes[index], currIsLast)
      const nextIsLast = (index == notes.length - 2)
      const nextANotes: AnimationNote[] = currIsLast ? [] : note2AnimationNotes(position, notes[index + 1], nextIsLast)
      const timeUntil: Tone.Unit.TimeObject = currIsLast ? n2TO(1000) : n2TO(notes[index + 1].t - note.t)
      const timeUntilMs: number = currIsLast ? 1000 : (notes[index + 1].ms - note.ms)
      const prevSystem = index > 0 ? notes[index - 1].system : null
      const prevSection = index > 0 ? notes[index - 1].section : null
      timeline.animationactions.push({
        time: n2TO(note.t),
        position: position,
        prevsystem: prevSystem,
        prevsection: prevSection,
        currnotes: aNotes,
        nextnotes: nextANotes,
        timeuntil: timeUntil,
        timeuntilMs: timeUntilMs
      })
    })
  })

  // Create cursor actions
  Object.keys(positionNotation).forEach((position) => {
    timeline.notation[position] = []
    const symbols: JsonSymbol[] = positionNotation[position]
    let currentline: string = ""
    let line: number = 0
    symbols.forEach((symbol, index) => {
      const newSystem = index > 0 ? symbol.system != symbols[index - 1].system : false
      const newSection = index > 0 ? !newSystem && (newSystem || symbol.section !== symbols[index - 1].section) : false
      const lastNoteOfSection = (index == symbols.length - 1) || (symbols[index + 1].system != symbol.system)

      if (newSection) currentline += " "
      const range = [currentline.length, currentline.length + symbol.s.length]
      currentline += symbol.s
      timeline.cursoractions.push({
        time: n2TO(symbol.t),
        position: position,
        symbol: symbol.s,
        newsystem: newSystem,
        newsection: newSection,
        line: line,
        range: range
      })
      if (lastNoteOfSection) {
        timeline.notation[position].push(createElement('p',
          {
            key: line,
            id: `notation-${line}`,
            className: 'appearance-none p-[0px] m-0 text-sm/6 balifont',
          },
          currentline))
        currentline = ""
        line++
      }
    })
  })

  return timeline
}
