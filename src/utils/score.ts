import { type SectionData, type Score } from '../models/types'

export function parseScore(input: string): Score {
  return JSON.parse(input)
}

export function splitSectionData(data: SectionData[], steps: number): SectionData[][] {
  if (steps <= 0 || data.length === 0) return []

  const labels = data.map(({ label }) => label)
  const values = data.map(({ value }) => value)

  if (values.length === 0) return []

  const dataLength = values[0].length
  const chunks: SectionData[][] = []

  for (let i = 0; i < dataLength; i += steps) {
    const chunk: SectionData[] = labels.map((label, j) => {
      const end = Math.min(i + steps, values[j].length)
      const value = values[j].slice(i, end)

      return { label, value }
    })
    chunks.push(chunk)
  }

  return chunks
}

type InstrumentAction = {
  label: string
  value: string
}

export type ScoreTimelinePoint = {
  timelineStep: number
  sectionId: number
  sectionStep: number
  time: number
  tempo: number
  instrumentActions: InstrumentAction[]
}

export type ScoreTimeline = ScoreTimelinePoint[]

export function createScoreTimeline(score: Score): ScoreTimelinePoint[] {
  const timeline: ScoreTimelinePoint[] = []
  let currentTime = 0
  let timelineStep = 0

  score.sections.forEach((section) => {
    const sectionBpm = section.tempo || 120
    const secondsPerStep = 60 / sectionBpm
    const maxSteps = section.data.reduce((max, data) => Math.max(max, data.value.length), 0)

    for (let step = 0; step < maxSteps; step++) {
      const instrumentActions: InstrumentAction[] = section.data
        .filter((data) => data.value[step] && data.value[step] !== ' ')
        .map((data) => ({ label: data.label, value: data.value[step] }))

      timeline.push({
        timelineStep: timelineStep,
        sectionId: section.id,
        sectionStep: step,
        time: currentTime,
        tempo: sectionBpm,
        instrumentActions,
      })

      currentTime += secondsPerStep
      timelineStep++
    }
  })

  return timeline
}
