import { instrumentConfigs, noteConfigs } from '../config/config'
import { type NotationNote, type Note, type Score, type Section, type SectionData } from '../models/types'
import * as Tone from 'tone'
import { n2TO } from './timeunits'

export function parseScore(input: string): Score {
  const score: Score = JSON.parse(input)
  // This function also calculates times in ms for each note, to be used by the animation.
  // The reason is that Transport.getSecondsAtTime() doesn't seem to process tempo changes correctly.
  var sectionTimeMs = 0
  score.sections.forEach((section, idx, sectionArray) => {
    section.starttimeMs = Math.round(sectionTimeMs)
    section.data.forEach((posData: SectionData) => {
      var dataTimeMs = sectionTimeMs
      posData.value.forEach((note: NotationNote) => {
        // Use the average tempo to determine the time in ms.
        const currTempo = section.tempo[0] + (section.tempo[1] - section.tempo[0]) * (note.t - section.starttime) / section.duration
        dataTimeMs = section.starttimeMs + 1000 * ((note.t - section.starttime) / 4) * (60 / (0.5 * (section.tempo[0] + currTempo)))
        note.ms = dataTimeMs
      })
    })
    sectionTimeMs += 1000 * (section.duration / 4) * (60 / (0.5 * (section.tempo[0] + section.tempo[1])))
    if (idx === sectionArray.length - 1) {
      score.durationMs = sectionTimeMs
    }
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
  section: string
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
  prevsection: string
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


export function createTimeline(score: Score): Timeline {
  // Timeline will be used to create the Transport schedule

  console.log(`creating score for ${score.title}`)
  console.log(`starting with ${score.sections[0].data[0].position} ${score.sections[0].data[0].value[0].s}`)

  const timeline: Timeline = {
    totalDurationSec: 0, totalDurationTO: n2TO(0), tempoactions: [], sampleractions: [], animationactions: [], cursoractions: []
  }
  if (!score) return timeline

  var currBpm: Tone.Unit.NormalRange = 0
  // currVelocity will keep track of the velocity of each separate instrument position
  // const currVelocity: { [position: string]: number } = Object.fromEntries(Object.keys(instrumentConfigs).map((pos) => [pos, 0]))
  var currTime: Tone.Unit.TimeObject = n2TO(0)
  const positionScore: { [position: string]: NotationNote[] } = {}

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

  const note2noteAction = (position: string, notationNote: NotationNote, isLast: boolean): AnimationNote | null => {
    // TODO currently only animating first note of group
    if (!(position in note_to_shCode)) return null
    const symbol = notationNote.s
    const shCode: string | null = symbol in note_to_shCode[position] ? note_to_shCode[position][symbol][0] : null
    const instrType: string = instrumentConfigs[position].type
    if (!shCode) return null
    const note: Note = noteConfigs[instrType][shCode]
    const keyname: string = `${note.tone}${note.octave != null ? note.octave : ""}`
    return shCode ? { section: notationNote.section, time: n2TO(notationNote.t), keyname: keyname, stroke: note.stroke, muting: note.muting, duration: n2TO(notationNote.d), islast: isLast } : null
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
  score.sections.forEach((section) => {
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
    section.data.forEach((stave) => {
      if (!(stave.position in positionScore)) positionScore[stave.position] = []
      var sectionProgress: number = 0
      stave.value.forEach((note) => {
        // create separate scores for each position, which will be used to create the animation actions 
        note.section = section.title
        var velocity: number = stave.velocity[0] + (sectionProgress / section.duration) * (stave.velocity[1] - stave.velocity[0])
        note.v = velocity
        positionScore[stave.position].push(note)
        timeline.sampleractions.push({ position: stave.position, symbol: note.s, velocity: velocity, time: n2TO(note.t), duration: n2TO(note.d || 1) })
        sectionProgress += (note.d || 1)
      })
    })
  })

  // Create animation actions
  Object.keys(positionScore).forEach((position) => {
    const notes: NotationNote[] = positionScore[position]
    notes.forEach((note, index) => {
      const currIsLast = (index == notes.length - 1)
      const aNote: AnimationNote | null = note2noteAction(position, notes[index], currIsLast)
      const nextIsLast = (index == notes.length - 2)
      const nextANote: AnimationNote | null = currIsLast ? null : note2noteAction(position, notes[index + 1], nextIsLast)
      const timeUntil: Tone.Unit.TimeObject = currIsLast ? n2TO(1000) : n2TO(notes[index + 1].t - note.t)
      const timeUntilMs: number = currIsLast ? 1000 : (notes[index + 1].ms - note.ms)
      const prevSection = index == 0 ? "-" : notes[index - 1].section
      timeline.animationactions.push({ time: n2TO(note.t), position: position, symbol: note.s, prevsection: prevSection, currnote: aNote, nextnote: nextANote, timeuntil: timeUntil, timeuntilMs: timeUntilMs })
    })
  })

  return timeline
}
