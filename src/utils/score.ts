import { instrumentConfigs, noteConfigs } from '../config/config'
import { type JsonNote, type Note, type Score } from '../models/types'
import * as Tone from 'tone'
import { n2TO } from './timeunits'

export function parseScore(input: string): Score {
  const score: Score = JSON.parse(input)
  // This function also calculates times in ms for each note, to be used by the animation.
  // The reason is that Transport.getSecondsAtTime() doesn't seem to process tempo changes correctly.
  var currentTimeMs = 0
  score.systems.forEach((system, sysidx, systemArray) => {
    system.sections.forEach((section, sectidx, sectionArray) => {
      section.starttimeMs = Math.round(currentTimeMs)
      for (const [position, stave] of Object.entries(section.staves)) {
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

export interface SamplerAction {
  time: Tone.Unit.TimeObject
  position: string
  symbol: string
  velocity: Tone.Unit.NormalRange
  duration: Tone.Unit.TimeObject
}

export type TempoAction = {
  time: Tone.Unit.TimeObject
  bpm: (Tone.Unit.NormalRange)[]
  duration: Tone.Unit.TimeObject
}

export type CursorAction = {
  system: number
  time: Tone.Unit.TimeObject
  step: number
}

export type AnimationNote = {
  system: number
  section: number
  time: Tone.Unit.TimeObject
  keyname: string
  stroke: string | null
  muting: string
  duration: Tone.Unit.TimeObject
  islast: boolean
}

export type AnimationAction = {
  time: Tone.Unit.TimeObject
  position: string
  symbol: string
  prevsystem: number | null
  prevsection: number | null
  currnote: AnimationNote | null
  nextnote: AnimationNote | null
  timeuntil: Tone.Unit.TimeObject
  timeuntilMs: number
}

export type Timeline = {
  totalDurationSec: number
  totalDurationTO: Tone.Unit.TimeObject  // Total duration expressed as BaseNote units
  tempoactions: TempoAction[]
  // dynamicsactions: DynamicsAction[]
  sampleractions: SamplerAction[]
  animationactions: AnimationAction[]
  cursoractions: CursorAction[]
}


export function createTimeline(score: Score | null): Timeline | null {
  // Timeline will be used to create the Transport schedule

  if (!score) return null

  const timeline: Timeline = {
    totalDurationSec: 0, totalDurationTO: n2TO(0), tempoactions: [], sampleractions: [], animationactions: [], cursoractions: []
  }
  if (!score) return timeline

  var currBpm: Tone.Unit.NormalRange = 0
  // currVelocity will keep track of the velocity of each separate instrument position
  // const currVelocity: { [position: string]: number } = Object.fromEntries(Object.keys(instrumentConfigs).map((pos) => [pos, 0]))
  var currTime: Tone.Unit.TimeObject = n2TO(0)
  const positionScore: { [position: string]: JsonNote[] } = {}

  // // Create a mapping for notes to Pitch, Octave, 
  // var note_to_keygroup: { [position: string]: { [symbol: string]: string[][] } } = {}
  // for (const [position, posConfigs] of Object.entries(instrumentConfigs)) {
  //   note_to_keygroup[position] = Object.fromEntries(posConfigs.alphabet.map((char, index) => [char, posConfigs.notes[index].map((str, index) => str.split("_"))]))
  // }

  // Create a mapping for notes to shorthand code
  const note_to_shCode: { [position: string]: { [symbol: string]: string[] } } = {}
  for (const [position, posConfigs] of Object.entries(instrumentConfigs)) {
    note_to_shCode[position] = Object.fromEntries(posConfigs.alphabet.map((char, index) => [char, posConfigs.notes[index]]))
  }

  const note2noteAction = (position: string, notationNote: JsonNote, isLast: boolean): AnimationNote | null => {
    // TODO currently only animating first note of group
    if (!(position in note_to_shCode)) return null
    const symbol = notationNote.s
    const shCode: string | null = symbol in note_to_shCode[position] ? note_to_shCode[position][symbol][0] : null
    const instrType: string = instrumentConfigs[position].type
    if (!shCode) return null
    const note: Note = noteConfigs[instrType][shCode]
    const keyname: string = `${note.tone}${note.octave != null ? note.octave : ""}`
    return shCode ? { system: notationNote.system, section: notationNote.section, time: n2TO(notationNote.t), keyname: keyname, stroke: note.stroke, muting: note.muting, duration: n2TO(notationNote.d), islast: isLast } : null
  }

  // function note2noteAction(position: string, note: NotationNote, isLast: boolean): AnimationNote | null {
  //   // TODO currently only animating first note of group
  //   const keyInfo: string[] | null = note.s in note_to_keygroup[position] ? note_to_keygroup[position][note.s][0] : null
  //   return keyInfo ? { tone: keyInfo[0], stroke: keyInfo[1], duration: n2TO(note.d), islast: isLast } : null
  // }

  // Used for tempo and dynamics actions. Checks for a value change and returns null if no change is detected.
  function changedValues(values: number[], reference: number): number[] | null {
    // return values
    return (values[0] != reference || values[1] != reference) ? values : null
  }

  var totalDurationInBaseNotes = 0

  // populate the action lists
  // score.systems.forEach((system, sysidx, systemArray) => {
  //   system.sections.forEach((section, sectidx, sectionArray) => {
  //     section.starttimeMs = Math.round(currentTimeMs)
  //     for (const [position, staveData] of Object.entries(section.staves)) {



  score.systems.forEach((system, sysidx, systemArray) => {
    system.sections.forEach((section) => {
      // Update the total duration time
      totalDurationInBaseNotes += section.duration
      timeline.totalDurationSec += (section.duration / 4) * 60 / (0.5 * (section.tempo[0] + section.tempo[1]))
      currTime = n2TO(section.starttime)

      // Create tempo actions for each tempo change.
      var newValues: number[] | null
      if (newValues = changedValues(section.tempo, currBpm)) {
        timeline.tempoactions.push({ bpm: newValues, time: currTime, duration: n2TO(section.duration) })
        currBpm = section.tempo[1]
      }
      timeline.totalDurationTO = n2TO(totalDurationInBaseNotes)

      // Create sampler actions
      for (const [position, stave] of Object.entries(section.staves)) {
        if (!(stave.position in positionScore)) positionScore[position] = []
        var sectionProgress: number = 0
        stave.notes.forEach((note) => {
          // create separate scores for each position, which will be used to create the animation actions 
          var velocity: number = stave.velocity[0] + (sectionProgress / section.duration) * (stave.velocity[1] - stave.velocity[0])
          note.v = velocity
          positionScore[position].push(note)
          timeline.sampleractions.push({ position: position, symbol: note.s, velocity: velocity, time: n2TO(note.t), duration: n2TO(note.d || 1) })
          sectionProgress += (note.d || 1)
        })
      }
    })
  })

  // Create animation actions
  Object.keys(positionScore).forEach((position) => {
    const notes: JsonNote[] = positionScore[position]
    notes.forEach((note, index) => {
      const currIsLast = (index == notes.length - 1)
      const aNote: AnimationNote | null = note2noteAction(position, notes[index], currIsLast)
      const nextIsLast = (index == notes.length - 2)
      const nextANote: AnimationNote | null = currIsLast ? null : note2noteAction(position, notes[index + 1], nextIsLast)
      const timeUntil: Tone.Unit.TimeObject = currIsLast ? n2TO(1000) : n2TO(notes[index + 1].t - note.t)
      const timeUntilMs: number = currIsLast ? 1000 : (notes[index + 1].ms - note.ms)
      const prevSystem = index > 0 ? notes[index - 1].system : null
      const prevSection = index > 0 ? notes[index - 1].section : null
      timeline.animationactions.push({ time: n2TO(note.t), position: position, symbol: note.s, prevsystem: prevSystem, prevsection: prevSection, currnote: aNote, nextnote: nextANote, timeuntil: timeUntil, timeuntilMs: timeUntilMs })
    })
  })

  return timeline
}
