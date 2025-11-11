import { useCallback, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import type { SamplerAction } from '../utils/score'
import { AVERAGE_ATTACK_DELAY } from '../config/constants'
import { alwaysFocusPositions, dimRateNonFocusedInstruments, instrumentConfigs, NOTES, SOUNDS_FOLDER } from '../config/config'
import { soundFile } from '../utils/config'

export type InstrumentSampler = {
  play: (time: number, action: SamplerAction, focus: string) => void
  mute: (time: number) => void
}

export type InstrumentSamplers = Record<string, InstrumentSampler>

// const pitchShift: Tone.PitchShift = new Tone.PitchShift({
//   pitch: 0.0, // 1 unit equals 100 cents
//   windowSize: 0.07,
//   delayTime: 0,
//   feedback: 0
// }
// ).toDestination();

const createSampler = ({ instr_type, samples, volume }: { instr_type: string, samples: { [key: string]: string }, volume: number }) => {
  if (instr_type == 'melodic')
    // PitchShift currently disabled because it causes a slight time lag
    return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination() //.connect(pitchShift)
  else
    return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination()
}

const lookup = Object.fromEntries(Object.entries(instrumentConfigs).map(([position, config]) => {
  const noteList = [...new Set(config.notes.flat())]
  const indexToSample = Object.fromEntries(noteList.map((note, index) => [NOTES[index], soundFile(note, instrumentConfigs[position].sampletemplate)]))
  const noteToIndex = Object.fromEntries(noteList.map((notestr, index) => [notestr, NOTES[index]]))
  const symbolToIndices = Object.fromEntries(config.alphabet.map((symbol, index) => [symbol, config.notes[index].map((repr) => noteToIndex[repr])]))
  return [position, { "idx2sample": indexToSample, "symbol2idxs": symbolToIndices }]
}))

const createInstrument = (position: string, samplers: Record<string, React.RefObject<Tone.Sampler | null>>): InstrumentSampler => {
  const sampler: React.RefObject<Tone.Sampler | null> = samplers[position]

  return {
    play: (time: number, action: SamplerAction, focus: string) => {
      // const dimValue = (focus == "" || focusPositions.includes(focus)) ? 1 : dimRateNonFocusedInstruments
      const dimValue = (focus == "" || focus == position || alwaysFocusPositions.includes(position)) ? 1 : dimRateNonFocusedInstruments
      const indices = lookup[position].symbol2idxs[action.symbol]
      if (indices && samplers[position].current) {
        try {
          sampler.current?.triggerAttackRelease(indices, action.duration, time, action.velocity * dimValue)
        } catch {
          console.log(`ERROR: could not play sound ${action.position} ${action.symbol} `)
        }
      }
    },
    mute: (time: number) => sampler.current?.releaseAll(time),
  }
}

export const useInstruments = () => {

  // See https://github.com/Tonejs/Tone.js/wiki/Using-Tone.js-with-React-React-Typescript-or-Vue`
  const samplers: Record<string, React.RefObject<Tone.Sampler | null>> = Object.fromEntries(Object.keys(instrumentConfigs).map((position) => [position, useRef(null)]))
  useEffect(() => {
    for (const [position, config] of Object.entries(instrumentConfigs)) {
      // samplers[position].current = new Tone.Sampler({ urls: Object.fromEntries(config.samples.map((sample, index) => [NOTES[index], sample])), baseUrl: SOUNDS_FOLDER }).toDestination()
      samplers[position].current = createSampler({ instr_type: config.type, samples: lookup[position].idx2sample, volume: config.volume }).toDestination()
    }
  }, [])


  const instrumentSamplers: InstrumentSamplers = {}

  Object.keys(instrumentConfigs).forEach((position) => (instrumentSamplers[position] = createInstrument(position, samplers)))

  // Adds a small random deviation to the note attack time for a more realistic execution
  const random_attack_deviation = (time: number) => time + (-1 + 2 * Math.random()) * Tone.Time(AVERAGE_ATTACK_DELAY).valueOf()

  const playInstrument = useCallback(
    (time: number, position: string, action: SamplerAction, focus: string) => {
      if (action.symbol === '.') instrumentSamplers[position].mute(time)
      else { instrumentSamplers[position].play(random_attack_deviation(time), action, focus) }
    },
    [],
  )

  const muteAll = useCallback(
    (time: number) => Object.keys(instrumentSamplers).forEach((label) => instrumentSamplers[label].mute(time)),
    [instrumentSamplers],
  )

  return {
    playInstrument,
    muteAll,
  }
}

