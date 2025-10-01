import { useAnimationEngine } from '../hooks/useAnimation'
import { useInstruments } from '../hooks/useInstruments'
import { useInterpretations } from '../hooks/useInterpretations'
import { type Score} from '../models/types'
import { useState, type JSX, memo, useMemo, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { type SvgInfo } from './Animation'
import { createTimeline, type AnimationAction, type SamplerAction, type TempoAction, type Timeline } from '../utils/score'

const ScoreHeader = memo(function ScoreHeader({ title, composer }: { title: string; composer?: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xl italic">{title ? title : '<select a title>'}</div>
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

export default function ScorePlayer({ score, focusRef, svgInfoRef}: { score: Score, focusRef: React.RefObject<string>, svgInfoRef:React.RefObject<SvgInfo> }): JSX.Element {
  // const score: Score = parseScore(initialContent)
  // const score: Score = {title: "", composer: "", sections: []}

  // const { ref: scoreSectionRef, maxSteps } = useMaxSteps()
  
  const [audioStarted, setAudioStarted] = useState<AudioState>('false')
  const [playing, setPlaying] = useState<boolean>(false)
  // const [cursor, setCursor] = useState<number>(0)
  // const updateCursor = useCallback(
  //   (sectionID: number, step: number) => setCursor(timeline.findIndex((p) => p.sectionId === sectionID) + step),
  //   [],
  // )
  // const updateCursorCallbacks = useMemo(() => {
  //   const callbacks: Record<number, (step: number) => void> = {}
  //   score.sections.forEach((section) => (callbacks[section.id] = (step: number) => updateCursor(section.id, step)))
  //   return callbacks
  // }, [score.sections, updateCursor])


  const { larasInstruments, playInstrument, muteInstrument, muteAll} = useInstruments()
  const {changeTempo, changeDynamics} = useInterpretations()
  const { executeAnimation } = useAnimationEngine(svgInfoRef, focusRef)
  // const focusReference: React.RefObject<string>  = useRef("")

  // useEffect(() => {focusReference.current = focus}, [focus])

  // recreate the Transport schedule when a new score is selected
  const timeline = useMemo(() => createTimeline(score), [score])
  useEffect(() => createSchedule(timeline), [score]);

  function createSchedule(timeline: Timeline) {
    // Creates the schedule for the Transport object.
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().position = 0

    // tempo actions
    timeline.tempoactions.forEach((tAction: TempoAction) => {
      Tone.getTransport().schedule((time) => changeTempo(time, tAction), tAction.time)
    })
    // instrument actions (notes)
    timeline.sampleractions.forEach((iAction: SamplerAction) => {
      Tone.getTransport().schedule((time) => playInstrument(time, iAction.label, iAction), iAction.time)
    })
    // Schedule animation actions
    timeline.animationactions.forEach((aAction: AnimationAction) => {
      Tone.getTransport().schedule((time) => executeAnimation(time, aAction), aAction.time)
      })
    // cursor actions
    // beat.cursorActions.forEach((cAction: CursorAction) => {
    //   Tone.getTransport().schedule((time) => moveCursor(time, cAction.step), cAction.time)
    // })
    // // TODO: gradual dynamics actions
    // beat.dynamicsActions.forEach((dAction: DynamicsAction) => {
    //   Tone.getTransport().schedule((time) => changeDynamics(time, dAction), dAction.time)
    // })
  }

  const play = () => {
    muteAll(0)
    if (Tone.getTransport().state !== 'started') Tone.getTransport().start()
    setPlaying(true)
  }

  const pause = () => {
    Tone.getTransport().pause()
    muteAll(Tone.getTransport().seconds)
    setPlaying(false)
  }

  const playPauseButton: React.RefObject<HTMLImageElement | null>  = useRef(null)

  async function playPause() {
    if (audioStarted === 'false') {
      Tone.start()
      setAudioStarted('wait')
      await Tone.loaded()
      // logSamplersLoaded()
      setAudioStarted('true')
      play()
    } else {
      if (playing) pause()
      else play()
    }
  }

  return (
    <div className="flex flex-col justify-between">
      <div className="custom-scrollbar flex h-full flex-col overflow-scroll">
        <div className="my-4">
          <ScoreHeader title={score.title} composer={score.composer} />
        </div>
      </div>

      <div className="max-width-200 gap-1 border-t px-4 pt-3 pb-4 text-xs">
        <div className="flex justify-center">
          {/* <span className="italic">{score.title}</span> */}
          {/* <span className="mx-1 text-black/40">–</span> */}
          {/* <span>{score.composer}</span> */}
        </div>
        <div className="flex w-full">
          <div className="flex w-full items-center justify-center gap-2 select-none">
            <div className="h-4 w-4 flex-shrink-0">
              <img
                onClick={() => playPause()}
                src={`icons/${playing ? 'pause' : 'play'}_icon.svg`}
                className="h-full w-full cursor-pointer select-none"
                alt="Play/Stop"
                ref={playPauseButton}
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
