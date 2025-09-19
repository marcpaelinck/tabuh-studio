import { useCallback, useMemo, useState } from 'react'
import * as Tone from 'tone'
import type { Note } from '../models/types'
import type { InstrumentAction } from '../utils/score'

const SOUNDS_FOLDER = 'sounds/'
const NOTES = ['D2', 'E2', 'G#2', 'A2', 'C#2', 'D3', 'E3', 'G#3', 'A3', 'C#3', 'D4', 'E4', 'G#4', 'A4', 'C#4', 'D5', 'E5', 'G#5', 'A5', 'C#6', 'D6', 'E6', 'G#6', 'A6']

type InstrumentConfig = {
  type: string
  alphabet: string[]
  samples: string[]
  volume: number
}

const instrumentConfigs: Record<string, InstrumentConfig> = {
GONG: {
  type: 'percussion',
	alphabet: ['G', 'P', 'T'],
	samples: ['Gong.mp3', 'Kempur.mp3', 'Kemong.mp3'],
	volume: -24,
	},
KEMPLI: {
  type: 'percussion',
  alphabet: ['x?'],
	samples: ['Kempli_MUTED.mp3'],
	volume: -20,
	},
CENGCENG: {
  type: 'percussion',
  alphabet: ['x', 'x?'],
	samples: ['Cengceng.mp3', 'Cengceng_MUTED.mp3'],
	volume: -24,
	},
JEGOGAN: {
  type: 'melodic',
  alphabet: ['i', 'o', 'e', 'u', 'a'],
	samples: ['Jegogan_DING1.mp3', 'Jegogan_DONG1.mp3', 'Jegogan_DENG1.mp3', 'Jegogan_DUNG1.mp3', 'Jegogan_DANG1.mp3'],
	volume: -24,
	},
CALUNG: {
  type: 'melodic',
  alphabet: ['i', 'o', 'e', 'u', 'a'],
	samples: ['Calung_DING1.mp3', 'Calung_DONG1.mp3', 'Calung_DENG1.mp3', 'Calung_DUNG1.mp3', 'Calung_DANG1.mp3'],
	volume: -24,
	},
KANTILAN_POLOS: {
  type: 'melodic',
  alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</'],
	samples: ['Kantilan_DONG0.mp3', 'Kantilan_DENG0.mp3', 'Kantilan_DUNG0.mp3', 'Kantilan_DANG0.mp3', 'Kantilan_DING1.mp3', 'Kantilan_DONG1.mp3', 'Kantilan_DENG1.mp3', 'Kantilan_DUNG1.mp3', 'Kantilan_DANG1.mp3', 'Kantilan_DING2.mp3', 'Kantilan_DONG0_MUTED.mp3', 'Kantilan_DENG0_MUTED.mp3', 'Kantilan_DUNG0_MUTED.mp3', 'Kantilan_DANG0_MUTED.mp3', 'Kantilan_DING1_MUTED.mp3', 'Kantilan_DONG1_MUTED.mp3', 'Kantilan_DENG1_MUTED.mp3', 'Kantilan_DUNG1_MUTED.mp3', 'Kantilan_DANG1_MUTED.mp3', 'Kantilan_DING2_MUTED.mp3'],
	volume: -24,
	},
KANTILAN_SANGSIH: {
  type: 'melodic',
  alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</'],
	samples: ['Kantilan_DONG0.mp3', 'Kantilan_DENG0.mp3', 'Kantilan_DUNG0.mp3', 'Kantilan_DANG0.mp3', 'Kantilan_DING1.mp3', 'Kantilan_DONG1.mp3', 'Kantilan_DENG1.mp3', 'Kantilan_DUNG1.mp3', 'Kantilan_DANG1.mp3', 'Kantilan_DING2.mp3', 'Kantilan_DONG0_MUTED.mp3', 'Kantilan_DENG0_MUTED.mp3', 'Kantilan_DUNG0_MUTED.mp3', 'Kantilan_DANG0_MUTED.mp3', 'Kantilan_DING1_MUTED.mp3', 'Kantilan_DONG1_MUTED.mp3', 'Kantilan_DENG1_MUTED.mp3', 'Kantilan_DUNG1_MUTED.mp3', 'Kantilan_DANG1_MUTED.mp3', 'Kantilan_DING2_MUTED.mp3'],
	volume: -24,
	},
PEMADE_POLOS: {
  type: 'melodic',
  alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</'],
	samples: ['Pemade_DONG0.mp3', 'Pemade_DENG0.mp3', 'Pemade_DUNG0.mp3', 'Pemade_DANG0.mp3', 'Pemade_DING1.mp3', 'Pemade_DONG1.mp3', 'Pemade_DENG1.mp3', 'Pemade_DUNG1.mp3', 'Pemade_DANG1.mp3', 'Pemade_DING2.mp3', 'Pemade_DONG0_MUTED.mp3', 'Pemade_DENG0_MUTED.mp3', 'Pemade_DUNG0_MUTED.mp3', 'Pemade_DANG0_MUTED.mp3', 'Pemade_DING1_MUTED.mp3', 'Pemade_DONG1_MUTED.mp3', 'Pemade_DENG1_MUTED.mp3', 'Pemade_DUNG1_MUTED.mp3', 'Pemade_DANG1_MUTED.mp3', 'Pemade_DING2_MUTED.mp3'],
	volume: -24,
	},
PEMADE_SANGSIH: {
  type: 'melodic',
  alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<', 'o,/', 'e,/', 'u,/', 'a,/', 'i/', 'o/', 'e/', 'u/', 'a/', 'i</'],
	samples: ['Pemade_DONG0.mp3', 'Pemade_DENG0.mp3', 'Pemade_DUNG0.mp3', 'Pemade_DANG0.mp3', 'Pemade_DING1.mp3', 'Pemade_DONG1.mp3', 'Pemade_DENG1.mp3', 'Pemade_DUNG1.mp3', 'Pemade_DANG1.mp3', 'Pemade_DING2.mp3', 'Pemade_DONG0_MUTED.mp3', 'Pemade_DENG0_MUTED.mp3', 'Pemade_DUNG0_MUTED.mp3', 'Pemade_DANG0_MUTED.mp3', 'Pemade_DING1_MUTED.mp3', 'Pemade_DONG1_MUTED.mp3', 'Pemade_DENG1_MUTED.mp3', 'Pemade_DUNG1_MUTED.mp3', 'Pemade_DANG1_MUTED.mp3', 'Pemade_DING2_MUTED.mp3'],
	volume: -24,
	},
UGAL: {
  type: 'melodic',
  alphabet: ['o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i<'],
  samples: ['Ugal_DONG0.mp3', 'Ugal_DENG0.mp3', 'Ugal_DUNG0.mp3', 'Ugal_DANG0.mp3', 'Ugal_DING1.mp3', 'Ugal_DONG1.mp3', 'Ugal_DENG1.mp3', 'Ugal_DUNG1.mp3', 'Ugal_DANG1.mp3', 'Ugal_DING2.mp3'],
	volume: -24,
	},
REYONG_1: {
  type: 'melodic',
  alphabet: ['e,', 'u,', 'a,', 'i', 'o', 'e', 'r', 'b', 'b/', 'b?', 'x', 'y'],
	samples: ['Reyong_DENG0.mp3', 'Reyong_DUNG0.mp3', 'Reyong_DANG0.mp3', 'Reyong_DING1.mp3', 'Reyong_DONG1.mp3', 'Reyong_DENG1.mp3', 'Reyong_DENG0-DING1.mp3', 'Reyong_DENG0-DANG0.mp3', 'Reyong_DENG0-DANG0_ABBREVIATED.mp3', 'Reyong_DENG0-DANG0_MUTED.mp3',  'Reyong_DUNG0_TICK_1_PANGGUL.mp3', 'Reyong_DUNG0_TICK_2_PANGGUL.mp3'],
	volume: -30,
	},
REYONG_2: {
  type: 'melodic',
  alphabet: ['u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'b', 'b/', 'b?', 'x', 'y'],
	samples: ['Reyong_DUNG0.mp3', 'Reyong_DANG0.mp3', 'Reyong_DING1.mp3', 'Reyong_DONG1.mp3', 'Reyong_DENG1.mp3', 'Reyong_DUNG1.mp3', 'Reyong_DANG1.mp3', 'Reyong_DING1-DENG1.mp3', 'Reyong_DING1-DENG1_ABBREVIATED.mp3', 'Reyong_DING1-DENG1_MUTED.mp3', 'Reyong_DONG1_TICK_1_PANGGUL.mp3', 'Reyong_DONG1_TICK_2_PANGGUL.mp3'],
	volume: -30,
	},
REYONG_3: {
  type: 'melodic',
  alphabet: ['o', 'e', 'u', 'a', 'i<', 'o<', 'e<', 'b', 'b/', 'b?', 'x', 'y'],
	samples: ['Reyong_DONG1.mp3', 'Reyong_DENG1.mp3', 'Reyong_DUNG1.mp3', 'Reyong_DANG1.mp3', 'Reyong_DING2.mp3', 'Reyong_DONG2.mp3', 'Reyong_DENG2.mp3', 'Reyong_DUNG1-DING2.mp3', 'Reyong_DUNG1-DING2_ABBREVIATED.mp3', 'Reyong_DUNG1-DING2_MUTED.mp3', 'Reyong_DANG1_TICK_1_PANGGUL.mp3', 'Reyong_DANG1_TICK_2_PANGGUL.mp3'],
	volume: -30,
	},
REYONG_4: {
  type: 'melodic',
  alphabet: ['u', 'a,', 'i<', 'o<', 'e<', 'u<', 'b', 'b/', 'b?', 'x', 'y'],
	samples: ['Reyong_DUNG1.mp3', 'Reyong_DANG1.mp3', 'Reyong_DING2.mp3', 'Reyong_DONG2.mp3', 'Reyong_DENG2.mp3', 'Reyong_DUNG2.mp3', 'Reyong_DONG2-DUNG2.mp3', 'Reyong_DONG2-DUNG2_ABBREVIATED.mp3', 'Reyong_DONG2-DUNG2_MUTED.mp3', 'Reyong_DENG2_TICK_1_PANGGUL.mp3', 'Reyong_DENG2_TICK_2_PANGGUL.mp3'],
	volume: -30,
	},
}

const cInstrumentConfigs: Record<string, string[]> = {
  REYONG_13: ['REYONG_1', 'REYONG_3'],
  REYONG_24: ['REYONG_2', 'REYONG_4'],
  REYONG: ['REYONG_13', 'REYONG_24'],
  KANTILAN: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'],
  PEMADE: ['PEMADE_POLOS', 'PEMADE_SANGSIH'],
  GANGSA: ['KANTILAN', 'PEMADE'],
  GANGSA_POLOS: ['KANTILAN_POLOS', 'PEMADE_POLOS'],
  GANGSA_SANGSIH: ['KANTILAN_SANGSIH', 'PEMADE_SANGSIH'],
}

export type LarasInstrument = {
  play: (time: number, action: InstrumentAction) => void
  mute: (time: number) => void
}

export type LarasInstruments = Record<string, LarasInstrument>

const generateMappings = (alphabet: string[]) => Object.fromEntries(alphabet.map((char, index) => [char, NOTES[index]]))


const pitchShift: Tone.PitchShift = new Tone.PitchShift( {
      pitch : 0.0 ,
      windowSize : 0.07 ,
      delayTime : 0 ,
      feedback : 0
      }
    ).toDestination();

const createSampler = (instr_type: string, samples: { [key: string]: string }, volume: number) => {
  if (instr_type=='melodic')
    return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination() // .connect(pitchShift)
  else
    return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination()
}

const createInstrument = (key: string, samplers: Record<string, Tone.Sampler>): LarasInstrument => {
  const mapping = generateMappings(instrumentConfigs[key].alphabet)
  return {
    play: (time: number, action: InstrumentAction) => {
      if (mapping[action.symbol]) {
        // samplers[key].releaseAll(),
        samplers[key].triggerAttackRelease([mapping[action.symbol]], action.duration, time , action.velocity[0])
      }
    },
    mute: (time: number) => samplers[key].releaseAll(time),
  }
}

const createCInstrument = (components: string[], samplers: Record<string, Tone.Sampler>): LarasInstrument => {
  const allMappings: Record<string, Record<string, string>> = {}

  components.forEach((component) => {
    if (instrumentConfigs[component]?.alphabet.length) {
      allMappings[component] = generateMappings(instrumentConfigs[component].alphabet)
    }
  })

  return {
    play: (time: number, action: InstrumentAction) => {
      components.forEach((component) => {
        if (allMappings[component]?.[action.symbol]) {
          // samplers[component].triggerRelease([allMappings[component][action.symbol]])
          // samplers[component].releaseAll(),
          samplers[component].triggerAttackRelease([allMappings[component][action.symbol]], action.duration, time , action.velocity[0])
        }
      })
    },
    mute: (time: number) => {
      components.forEach((component) => {
        if (samplers[component]) samplers[component].releaseAll(time)
      })
    },
  }
}

export const useInstruments = () => {
  const [mutedInstruments, setMutedInstruments] = useState<Record<string, boolean>>({})

  const samplers = useMemo(() => {
    return Object.fromEntries(
      Object.entries(instrumentConfigs).map(([key, config]) => [
        key,
        createSampler(key, Object.fromEntries(config.samples.map((sample, index) => [NOTES[index], sample])), config.volume),
      ]),
    )
  }, [])

  const instruments: LarasInstruments = {}

  Object.keys(instrumentConfigs).forEach((key) => (instruments[key] = createInstrument(key, samplers)))
  Object.entries(cInstrumentConfigs).forEach(
    ([key, components]) => (instruments[key] = createCInstrument(components, samplers)),
  )

  const playInstrument = useCallback(
    (time: number, label: string, action: InstrumentAction) => {
      if (!mutedInstruments[label] && instruments[label]) {
        if (action.symbol === '.') instruments[label].mute(time)
        else instruments[label].play(time, action)
      }
    },
    [mutedInstruments, instruments],
  )

  const muteInstrument = useCallback(
    (label: string) => setMutedInstruments((prev) => ({ ...prev, [label]: !prev[label] })),
    [],
  )

  const muteAll = useCallback(
    (time: number) => Object.keys(instruments).forEach((label) => instruments[label].mute(time)),
    [instruments],
  )

  return {
    playInstrument,
  /*  muteInstrument, */
    muteAll,
/*    mutedInstruments, */
  }
}
