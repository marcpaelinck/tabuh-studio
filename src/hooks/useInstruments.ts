import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { SamplerAction, TempoAction } from '../utils/score'
import { AVERAGE_ATTACK_DELAY } from '../models/constants'
import { cInstrumentConfigs, instrumentConfigs, NOTES, SOUNDS_FOLDER } from '../config/config'

export type LarasInstrument = {
  play: (time: number, action: SamplerAction) => void
  mute: (time: number) => void
}

export type LarasInstruments = Record<string, LarasInstrument>

const generateInstrumenMappings = (alphabet: string[]) => Object.fromEntries(alphabet.map((char, index) => [char, NOTES[index]]))


const pitchShift: Tone.PitchShift = new Tone.PitchShift({
  pitch: 0.0, // 1 unit equals 100 cents
  windowSize: 0.07,
  delayTime: 0,
  feedback: 0
}
).toDestination();

const createSampler = (instr_type: string, samples: { [key: string]: string }, volume: number) => {
  if (instr_type == 'melodic')
    // PitchShift currently disabled because it causes a slight time lag
    return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination() //.connect(pitchShift)
  else
    return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination()
}




const createInstrument = (key: string, samplers: Record<string, React.RefObject<Tone.Sampler | null>>): LarasInstrument => {
  const mapping = generateInstrumenMappings(instrumentConfigs[key].alphabet)
  return {
    play: (time: number, action: SamplerAction) => {
      if (mapping[action.symbol] && samplers[key].current) {
        // samplers[key].releaseAll(),
        samplers[key].current.triggerAttackRelease([mapping[action.symbol]], action.duration, time, action.velocity[0])
      }
    },
    mute: (time: number) => samplers[key].current ? samplers[key].current.releaseAll(time) : null,
  }
}

const createCInstrument = (components: string[], samplers: Record<string, React.RefObject<Tone.Sampler | null>>): LarasInstrument => {
  const allMappings: Record<string, Record<string, string>> = {}

  components.forEach((component) => {
    if (instrumentConfigs[component]?.alphabet.length) {
      allMappings[component] = generateInstrumenMappings(instrumentConfigs[component].alphabet)
    }
  })
  return {
    play: (time: number, action: SamplerAction) => {
      components.forEach((component) => {
        if (allMappings[component]?.[action.symbol] && samplers[component].current) {
          // samplers[component].triggerRelease([allMappings[component][action.symbol]])
          // samplers[component].releaseAll(),
          samplers[component].current.triggerAttackRelease([allMappings[component][action.symbol]], action.duration, time, action.velocity[0])
        }
      })
    },
    mute: (time: number) => {
      components.forEach((component) => {
        if (samplers[component].current) samplers[component].current.releaseAll(time)
      })
    },
  }
}

export const useInstruments = () => {
  const [mutedInstruments, setMutedInstruments] = useState<Record<string, boolean>>({})

  const samplersLoaded: { [key: string]: any } = {}
  const SetSamplersLoaded: { [key: string]: any } = {}
  Object.keys(instrumentConfigs).forEach((position, index) => { [samplersLoaded[position], SetSamplersLoaded[position]] = useState<boolean>(false) })

  // const samplerOnLoaded = (position: string) => {
  //   SetSamplersLoaded[position](true)
  // }
  // See https://github.com/Tonejs/Tone.js/wiki/Using-Tone.js-with-React-React-Typescript-or-Vue`
  const samplers: Record<string, React.RefObject<Tone.Sampler | null>> = Object.fromEntries(Object.keys(instrumentConfigs).map((position, index) => [position, useRef(null)]))
  useEffect(() => {
    for (const [position, config] of Object.entries(instrumentConfigs)) {
      samplers[position].current = new Tone.Sampler({ urls: Object.fromEntries(config.samples.map((sample, index) => [NOTES[index], sample])), baseUrl: SOUNDS_FOLDER/*, onload: () => samplerOnLoaded(position) */ }).toDestination()
    }
  }, [])


  const larasInstruments: LarasInstruments = {}

  Object.keys(instrumentConfigs).forEach((key) => (larasInstruments[key] = createInstrument(key, samplers)))
  // Object.entries(cInstrumentConfigs).forEach(
  //   ([key, components]) => (instruments[key] = createCInstrument(components, samplers)),
  // )
  // setInstruments(instruments)

  // Adds a small random deviation to the note attack time for a more realistic execution
  const random_attack_deviation = (time: number) => time + (-1 + 2 * Math.random()) * Tone.Time(AVERAGE_ATTACK_DELAY).valueOf()

  const playInstrument = useCallback(
    (time: number, label: string, action: SamplerAction) => {
      if (!mutedInstruments[label] /*&& larasInstruments[label]*/) {
        if (action.symbol === '.') larasInstruments[label].mute(time)
        else { larasInstruments[label].play(random_attack_deviation(time), action) }
      }
    },
    [mutedInstruments],
  )

  const muteInstrument = useCallback(
    (label: string) => setMutedInstruments((prev) => ({ ...prev, [label]: !prev[label] })),
    [],
  )

  const muteAll = useCallback(
    (time: number) => Object.keys(larasInstruments).forEach((label) => larasInstruments[label].mute(time)),
    [larasInstruments],
  )

  return {
    larasInstruments,
    playInstrument,
    muteInstrument,
    muteAll,
  }
}

