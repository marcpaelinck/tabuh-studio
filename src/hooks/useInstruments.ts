import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { AnimationAction, SamplerAction, SamplerAnimationAction } from '../utils/score'
import { AVERAGE_ATTACK_DELAY } from '../models/constants'
import { alwaysFocusPositions, dimRateNonFocusedInstruments, instrumentConfigs, NOTES, SOUNDS_FOLDER } from '../config/config'
import { soundFile } from '../utils/config'
import { animateNotation, animatePanggul, highlightNote } from './useAnimation'
import type { SvgInfo } from '../components/Animation'
import type { NotationArea } from '../components/NotationArea'

export type LarasInstrument = {
  play: (time: number, action: SamplerAction, focus: string) => void
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

const createInstrument = (position: string, samplers: Record<string, React.RefObject<Tone.Sampler | null>>): LarasInstrument => {
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
          console.log(`ERROR: could not play sound ${action.position}-${action.symbol} `)
        }
      }
    },
    mute: (time: number) => sampler.current?.releaseAll(time),
  }
}

export const useInstruments = () => {
  const [mutedInstruments, setMutedInstruments] = useState<Record<string, boolean>>({})

  // See https://github.com/Tonejs/Tone.js/wiki/Using-Tone.js-with-React-React-Typescript-or-Vue`
  const samplers: Record<string, React.RefObject<Tone.Sampler | null>> = Object.fromEntries(Object.keys(instrumentConfigs).map((position, index) => [position, useRef(null)]))
  useEffect(() => {
    for (const [position, config] of Object.entries(instrumentConfigs)) {
      // samplers[position].current = new Tone.Sampler({ urls: Object.fromEntries(config.samples.map((sample, index) => [NOTES[index], sample])), baseUrl: SOUNDS_FOLDER }).toDestination()
      samplers[position].current = createSampler({ instr_type: config.type, samples: lookup[position].idx2sample, volume: config.volume }).toDestination()
    }
  }, [])


  const larasInstruments: LarasInstruments = {}

  Object.keys(instrumentConfigs).forEach((key) => (larasInstruments[key] = createInstrument(key, samplers)))

  // Adds a small random deviation to the note attack time for a more realistic execution
  const random_attack_deviation = (time: number) => time + (-1 + 2 * Math.random()) * Tone.Time(AVERAGE_ATTACK_DELAY).valueOf()

  const playInstrument = useCallback(
    (time: number, label: string, action: SamplerAction, focus: string) => {
      if (!mutedInstruments[label] /*&& larasInstruments[label]*/) {
        if (action.symbol === '.') larasInstruments[label].mute(time)
        else { larasInstruments[label].play(random_attack_deviation(time), action, focus) }
      }
    },
    [mutedInstruments],
  )

  // The following two functions are currently not being used. See commented code in ScorePlayer where playInstrumentWithAnimation is called.
  const executeAnimation = (saAction: SamplerAnimationAction, currentFocus: string, svgInfo: SvgInfo, notationArea: React.RefObject<NotationArea | null>) => {
    if (saAction.position === currentFocus) {
      // const svgInfo = svgInfoRef.current
      if (svgInfo.svg && saAction.currnote) {
        // Display notation
        animateNotation(saAction, notationArea)
        // Hightighting animation
        var keyElement = (svgInfo.svg.querySelector(`#${saAction.currnote.keyname}${saAction.currnote.stroke ? " ." + saAction.currnote.stroke : ""}`))
        if (keyElement) highlightNote(keyElement, saAction.currnote.duration)

        // Panggul animation
        if (svgInfo.panggul && svgInfo.x && svgInfo.y != null && svgInfo.animation) {
          animatePanggul(saAction, svgInfo)
        }
      }
    }
  }


  const playInstrumentWithAnimation = useCallback(
    (time: number, label: string, saAction: SamplerAnimationAction, focus: string, svgInfo: SvgInfo, notationArea: React.RefObject<NotationArea | null>) => {
      if (!mutedInstruments[label] /*&& larasInstruments[label]*/) {
        if (saAction.symbol === '.') larasInstruments[label].mute(time)
        else {
          larasInstruments[label].play(random_attack_deviation(time), saAction, focus)
          Tone.getDraw().schedule(() => executeAnimation(saAction, focus, svgInfo, notationArea), time)
        }
      }
    },
    [],
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
    playInstrument,
    playInstrumentWithAnimation,
    muteInstrument,
    muteAll,
  }
}

