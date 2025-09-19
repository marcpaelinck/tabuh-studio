import { useInstruments } from '../hooks/useInstruments'
import { type Score} from '../models/types'
import { createFlattenedScore, parseScore, type InstrumentAction, type TransportAction} from '../utils/score'
import { useState, type JSX, memo, useCallback, useMemo } from 'react'
import * as Tone from 'tone'

const ScoreHeader = memo(function ScoreHeader({ title, composer }: { title: string; composer?: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xl italic">{title ? title : '<untitled>'}</div>
      {composer && (
        <div>
          <span>by</span>
          <span className="font-bold"> {composer}</span>
        </div>
      )}
    </div>
  )
})

function ScoreSectionHeader({
  name,
  fullDisplay,
  onToggleDisplay,
}: {
  name: string
  fullDisplay: boolean
  onToggleDisplay: () => void
}): JSX.Element {
  return (
    <div className="flex justify-between border-b font-bold">
      <span className="cursor-pointer select-none">{name}</span>
      <div className="flex items-center gap-2">
        <span onClick={onToggleDisplay} className="cursor-pointer font-mono select-none">
          {fullDisplay ? '-' : '+'}
        </span>
      </div>
    </div>
  )
}

type AudioState = 'false' | 'true' | 'wait'

export default function ScorePlayer({ initialContent }: { initialContent: string }): JSX.Element {
  const score: Score = parseScore(initialContent)

  // const { ref: scoreSectionRef, maxSteps } = useMaxSteps()

  const [audioStarted, setAudioStarted] = useState<AudioState>('false')
  const [playing, setPlaying] = useState<boolean>(false)

  const [cursor, setCursor] = useState<number>(0)
  const updateCursor = useCallback(
    (sectionID: number, step: number) => setCursor(timeline.findIndex((p) => p.sectionId === sectionID) + step),
    [],
  )
  const updateCursorCallbacks = useMemo(() => {
    const callbacks: Record<number, (step: number) => void> = {}
    score.sections.forEach((section) => (callbacks[section.id] = (step: number) => updateCursor(section.id, step)))
    return callbacks
  }, [score.sections, updateCursor])

  const timeline = useMemo(() => createFlattenedScore(score), [score])
  const { playInstrument, muteAll } = useInstruments()

  async function playStop() {
    if (audioStarted === 'false') {
      Tone.start()
      setAudioStarted('wait')
      await Tone.loaded()
      setAudioStarted('true')
      startLoop()
    } else {
      if (playing) stopLoop()
      else startLoop()
    }
  }

  const startLoop = () => {
    // const accentedChars = new Set(['Í', 'Ó', 'É', 'Ú', 'Á', 'í', 'ó', 'é', 'ú', 'á', 'ć'])
    // const delayOffset = Tone.Time('32n')
    muteAll(0)
    // Tone.getContext().lookAhead = 0
    Tone.getTransport().cancel()

    timeline.forEach((beat) => {beat.actions.forEach((action) => {
      Tone.getTransport().schedule(
        (time)=>{
          // Check if action is an InstrumentAction object by checking for expected properties
          // if (typeof action == 'TransportAction' && action && 'bpm' in action && 'label' in action) {
          if (action.target == "transport") {
            var tAction = action as TransportAction
            if (tAction.bpm != undefined) {
              if (tAction.bpm[0] !== Tone.getTransport().bpm.value || tAction.bpm[1] !== Tone.getTransport().bpm.value) {
                if (tAction.bpm[0]) Tone.getTransport().bpm.setValueAtTime(tAction.bpm[0], time)
                if (tAction.bpm[1]) Tone.getTransport().bpm.rampTo(tAction.bpm[1], tAction.duration, time)
              }
            }
          } else {
            var iAction = action as InstrumentAction
            playInstrument(time, iAction.label, iAction)
          }
        }, action.time)
      })
    })

    if (Tone.getTransport().state !== 'started') Tone.getTransport().start()
    setPlaying(true)
  }

  const stopLoop = () => {
    muteAll(Tone.getTransport().seconds)
    Tone.getTransport().cancel()
    setPlaying(false)
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="custom-scrollbar flex h-full flex-col overflow-scroll bg-amber-100">
        <div className="my-4">
          <ScoreHeader title={score.title} composer={score.composer} />
        </div>

        {/* <div ref={scoreSectionRef} className="mx-4">
          {score.sections.map((section) => (
            <div key={section.id} className="mb-4">
              <ScoreSection
                section={section}
                maxSteps={maxSteps}
                cursorStep={timeline[cursor]?.sectionId === section.id ? timeline[cursor].sectionStep : undefined}
                setCursorStep={updateCursorCallbacks[section.id]}
              />
            </div>
          ))}
        </div> */}
      </div>

      <div className="flex flex-col gap-1 border-t bg-amber-100 px-4 pt-3 pb-4 text-xs">
        <div className="flex justify-center">
          <span className="italic">{score.title}</span>
          <span className="mx-1 text-black/40">–</span>
          <span>{score.composer}</span>
        </div>
        <div className="flex w-full">
          <div className="flex w-full items-center justify-center gap-2 select-none">
            <div className="h-4 w-4 flex-shrink-0">
              <img
                onClick={() => playStop()}
                src={`icons/${playing ? 'pause' : 'play'}_icon.svg`}
                className="h-full w-full cursor-pointer select-none"
                alt="Play/Stop"
              />
            </div>
            <span className="flex w-12 flex-shrink-0 justify-center">00:00</span>
            <div className="flex w-full cursor-pointer items-center py-1">
              <hr className="w-full border-1" />
            </div>
            <span className="flex w-12 flex-shrink-0 justify-center">00:00</span>
          </div>
        </div>
      </div>
    </div>
  )
}
