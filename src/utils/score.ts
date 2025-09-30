import { cInstrumentConfigs, instrumentConfigs, type KeyGroup, type KeyPOS as KeyInfo } from '../config/config'
import { type Note, type Score } from '../models/types'
import * as Tone from 'tone'

export function parseScore(input: string): Score {
  return JSON.parse(input)
}

export interface SamplerAction {
  time: Tone.Unit.TimeObject
  label: string
  symbol: string
  velocity: Tone.Unit.NormalRange[]
  duration: Tone.Unit.TimeObject
}

export type TempoAction = {
  time: Tone.Unit.TimeObject
  bpm: (Tone.Unit.NormalRange | null)[]
  duration: Tone.Unit.TimeObject
}

export type DynamicsAction = {
  time: Tone.Unit.TimeObject
  velocity: (Tone.Unit.NormalRange | null)[]
  duration: Tone.Unit.TimeObject
}

export type CursorAction = {
  system: number
  time: Tone.Unit.TimeObject
  step: number
}

export type AnimationNote = {
  keyname: string
  stroke: string
  duration: Tone.Unit.TimeObject
  islast: boolean
}

export type AnimationAction = {
  time: Tone.Unit.TimeObject
  position: string
  currnote: AnimationNote | null
  nextnote: AnimationNote | null
  timeuntil: Tone.Unit.TimeObject
}

export type Timeline = {
  tempoactions: TempoAction[]
  sampleractions: SamplerAction[]
  animationactions: AnimationAction[]
  cursoractions: CursorAction[]
}

export type ScoreTimeline = Timeline[]

export type ScheduleFunctions = {
  playInstrument: CallableFunction,
  changeTempo: CallableFunction,
  animateNote: CallableFunction,
}

const n2TO = (notevalue: number) => {
  return { "16n": notevalue }
}

export function createTimeline(score: Score): Timeline {
  // Timeline will be used to create the Transport schedule

  const timeline: Timeline = {
    tempoactions: [], sampleractions: [], animationactions: [], cursoractions: []
  }
  if (!score) return { tempoactions: [], sampleractions: [], animationactions: [], cursoractions: [] }

  var currBpm: Tone.Unit.NormalRange = 0
  var currTime: Tone.Unit.TimeObject = n2TO(0)
  var positionScore: { [position: string]: Note[] } = {}

  // Create a mapping for notes to Pitch, Octave, 
  var note_to_keygroup: { [position: string]: { [symbol: string]: KeyGroup } } = {}
  for (const [position, posConfigs] of Object.entries(instrumentConfigs)) {
    note_to_keygroup[position] = Object.fromEntries(posConfigs.alphabet.map((char, index) => [char, posConfigs.noteGroups[index]]))
  }

  function note2noteAction(position: string, note: Note, isLast: boolean): AnimationNote | null {
    // TODO currently only animating first note of group
    const keyInfo: KeyInfo | null = note.s in note_to_keygroup[position] ? note_to_keygroup[position][note.s][0] : null
    return keyInfo ? { keyname: keyInfo[0], stroke: keyInfo[1], duration: n2TO(note.d), islast: isLast } : null
  }

  // Populate the action lists
  score.sections.forEach((section) => {

    // Create tempo actions
    currTime = n2TO(section.starttime)
    if (section.tempo[0] != currBpm || section.tempo[1] != currBpm) {
      timeline.tempoactions.push({ bpm: [section.tempo[0] != currBpm ? section.tempo[0] : null, section.tempo[1] != section.tempo[0] ? section.tempo[1] : null], time: currTime, duration: n2TO(section.duration) })
      currBpm = section.tempo[1]
    }

    // Create sampler actions
    section.data.forEach((stave) => {
      if (!(stave.label in positionScore)) positionScore[stave.label] = []
      stave.value.forEach((note) => {
        // create separate scores for each position, which will be used to create the animation actions 
        positionScore[stave.label].push(note)
        timeline.sampleractions.push({ label: stave.label, symbol: note.s, velocity: stave.velocity, time: n2TO(note.t), duration: n2TO(note.d || 1) })
      })
    })
  })

  // Create animation actions
  Object.keys(positionScore).forEach((position) => {
    const notes: Note[] = positionScore[position]
    notes.forEach((note, index) => {
      const currIsLast = (index == notes.length - 1)
      const aNote: AnimationNote | null = note2noteAction(position, notes[index], currIsLast)
      const nextIsLast = (index == notes.length - 2)
      const nextANote: AnimationNote | null = currIsLast ? null : note2noteAction(position, notes[index + 1], nextIsLast)
      const timeUntil: Tone.Unit.TimeObject = currIsLast ? n2TO(1000) : n2TO(notes[index + 1].t - note.t)
      timeline.animationactions.push({ time: n2TO(note.t), position: position, currnote: aNote, nextnote: nextANote, timeuntil: timeUntil })
    })
  })

  console.log(timeline.sampleractions.length + " sampler actions," + timeline.tempoactions.length + " tempo actions," + timeline.animationactions.length + " animation actions,")
  console.log(timeline.animationactions)

  return timeline
}

// export function createSchedule(score: Score, focusRef: React.RefObject<string>, schedFunctions: ScheduleFunctions) {
//   // Creates the schedule for the Transport object.
//   Tone.getTransport().stop()
//   Tone.getTransport().cancel()
//   Tone.getTransport().position = 0

//   const timeline: Timeline = createTimeline(score)

//   // const { playInstrument, muteInstrument, muteAll, mutedInstruments } = useInstruments(setInstruments)
//   // const { changeTempo, changeDynamics } = useInterpretations()
//   // const { animateNote } = useAnimationEngine(svgInfo)

//   // tempo actions
//   timeline.tempoactions.forEach((tAction: TempoAction) => {
//     Tone.getTransport().schedule((time) => schedFunctions.changeTempo(time, tAction), tAction.time)
//   })
//   // instrument actions (notes)
//   timeline.sampleractions.forEach((iAction: SamplerAction) => {
//     Tone.getTransport().schedule((time) => schedFunctions.playInstrument(time, iAction.label, iAction), iAction.time)
//   })
//   // TODO: Schedule animation actions
//   timeline.animationactions.forEach((aAction: AnimationAction) => {
//     Tone.getTransport().schedule((time) => schedFunctions.animateNote(time, aAction, focusRef.current), aAction.time)
//   })
//   // cursor actions
//   // beat.cursorActions.forEach((cAction: CursorAction) => {
//   //   Tone.getTransport().schedule((time) => moveCursor(time, cAction.step), cAction.time)
//   // })
//   // // TODO: gradual dynamics actions
//   // beat.dynamicsActions.forEach((dAction: DynamicsAction) => {
//   //   Tone.getTransport().schedule((time) => changeDynamics(time, dAction), dAction.time)
//   // })
// }

