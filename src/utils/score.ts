import {type Score } from '../models/types'
import * as Tone from 'tone'

export function parseScore(input: string): Score {
  return JSON.parse(input)
}

export interface InstrumentAction  {
  target: string
  label: string
  symbol: string
  velocity: Tone.Unit.NormalRange[]
  time: Tone.Unit.TimeObject
  duration: Tone.Unit.TimeObject
}

export type TransportAction ={
  target: string
  bpm: (Tone.Unit.NormalRange | null)[]
  time: Tone.Unit.TimeObject
  duration: Tone.Unit.TimeObject
}

export type TimelineBeat = {
  sectionId: number
  actions: (InstrumentAction | TransportAction)[]
}

export type ScoreTimeline = TimelineBeat[]

const n2TO = (notevalue: number) => {
  return {"16n": notevalue}
}

export function createFlattenedScore(score: Score): TimelineBeat[] {
  const timeline: TimelineBeat[] = []
  var currBpm: Tone.Unit.NormalRange = 0
  var currTime: Tone.Unit.TimeObject = n2TO(0)

  score.sections.forEach((section) => {
    var actionList: (InstrumentAction | TransportAction)[] = []

    currTime = n2TO(section.starttime)

    if (section.tempo[0] != currBpm || section.tempo[1] != currBpm) {
      actionList.push({target: "transport", bpm: [section.tempo[0]!=currBpm ? section.tempo[0] : null, section.tempo[1]!=section.tempo[0] ? section.tempo[1] : null], time: currTime, duration: n2TO(section.duration)})
      currBpm = section.tempo[1]
    }

    section.data.forEach((stave) => {
      stave.value.forEach((note) => {
        actionList.push({target: "instrument", label: stave.label, symbol: note.s, velocity: stave.velocity, time: n2TO(note.t), duration: n2TO(note.d || 1) })
      })
      
      // actionList.push(...stave.value
      //   .map((note) =>({target: "instrument", label: stave.label, symbol: note.s, velocity: stave.velocity, time: n2TO(note.t), duration: n2TO(note.d || 1) })))
    })
    if (actionList.length > 0) {
      timeline.push({
        sectionId: section.id,
        actions: actionList,
      })
    }
  })
  console.log(timeline.length + " events pushed")
  return timeline
}
