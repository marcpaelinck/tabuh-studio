import { useAnimationEngine } from '../hooks/useAnimation'
import { useInstruments } from '../hooks/useInstruments'
import { useInterpretations } from '../hooks/useInterpretations'
import { type Score, type AnimationInfo} from '../models/types'
import { useState, type JSX, useMemo, useEffect } from 'react'
import * as Tone from 'tone'
import { createTimeline, type AnimationAction, type CursorAction, type SamplerAction, type Timeline } from '../utils/score'
  //-------------------------CONTROLS--------------------------------------
import {FaPlay, FaPause} from "react-icons/fa"
import {FaBackwardFast} from "react-icons/fa6"
import { Slider } from 'rsuite';
import 'rsuite/Slider/styles/index.css'

type AudioState = 'false' | 'true' | 'wait'

export default function ScorePlayer({ score, focusRef, animationInfoRef, pbSpeedRef, timelineUpdater}: 
  { score: Score | null, focusRef: React.RefObject<string>, animationInfoRef:React.RefObject<AnimationInfo>, pbSpeedRef: React.RefObject<number>, timelineUpdater: CallableFunction }): JSX.Element {

  const [audioStarted, setAudioStarted] = useState<AudioState>('false')
  const [playing, setPlaying] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [totalDuration, setTotalDuration] = useState<number>(0)

  const { playInstrument, muteAll} = useInstruments()
  const {changeTempo} = useInterpretations()
  const { animateInstrument, animateNotation } = useAnimationEngine()

  // recreate the Transport schedule when a new score is selected
  const timeline = useMemo(() => createTimeline(score), [score])
  
  useEffect(() => {
    timelineUpdater(timeline)
    createSchedule(timeline)
    rewind()
  }, [timeline]);

  function updateProgress(){
    setProgress(Tone.getTransport().seconds)
    Tone.getTransport()
  }

  function createSchedule(timeline: Timeline | null) {
    // Creates the schedule for the Transport object.f
    if (! timeline || !score) return

    if (audioStarted) pause()
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0

    console.log(`Creating schedule for ${score?.title}`)
    
    // instrument actions (notes)
    timeline.sampleractions.forEach((sAction: SamplerAction) => {
      Tone.getTransport().schedule((time) => changeTempo(time, sAction, pbSpeedRef.current), sAction.time)      
      Tone.getTransport().schedule((time) => playInstrument(time, sAction, focusRef.current), sAction.time)
    })
    // Schedule animation actions
    timeline.animationactions.forEach((aAction: AnimationAction) => {
      Tone.getTransport().schedule((time) => animateInstrument(time, aAction, focusRef.current, animationInfoRef.current, pbSpeedRef.current), aAction.time)
      })
    // Schedule cursor actions
    timeline.cursoractions.forEach((cAction: CursorAction) => {
      Tone.getTransport().schedule((time) => animateNotation(time, cAction, focusRef.current, animationInfoRef.current), cAction.time)
      })

    setTotalDuration(Math.round(score.durationMs/1000))
    //@ts-ignore unused `time` argument
    Tone.getTransport().scheduleRepeat((time) => updateProgress(), "2hz", 0)//, timeline.totalDurationTO)

  }

  function jumpToProgressTime(time: number | number[]) {
    const newTime = typeof time === 'number' ? time : time[1]
    Tone.getTransport().stop()
    Tone.getTransport().seconds = newTime
    Tone.getTransport().start()
    setProgress(newTime)
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

  async function playPause() {
    if (! timeline) return

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

  function rewind() {
    if (! timeline) return

    Tone.getTransport().stop()
    Tone.getTransport().seconds=0
    setProgress(0)
    // TODO: use `resetAnimation` callback that is passed as prop
    // animationInfoRef.current?.notationAreaRef.current?.clear()
    pause()
  }

  //-------------------------CONTROLS--------------------------------------
  const toMmSs = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  //-----------------------------------------------------------------------

return (
    <div className="flex flex-col justify-between">
      {/* <div className="custom-scrollbar flex h-full flex-col overflow-scroll">
        <div className="my-4">
          <ScoreHeader title={score.title} composer={score.composer} />
        </div>
      </div> */}

      <div className="max-width-200 gap-1 px-4 pt-3 pb-4 text-xs">
        <div className="flex justify-center">
        </div>
        <div className="flex w-full">
          <div className="flex w-full items-center gap-5 justify-center select-none">
            <div className="h-4 w-4 shrink-0">
              <button onClick={() => rewind()}><FaBackwardFast/></button>
            </div>
            <div className="h-4 w-4 shrink-0">
              <button onClick={() => playPause()}>{playing? <FaPause/> : <FaPlay/>}</button>
            </div>
            <span className="flex w-12 shrink-0 justify-center"><p>{toMmSs(progress)}</p>{" "}</span>
            <div className="flex w-full items-center ">
              <Slider progress
                className="flex w-full"
                barClassName="flex w-full"
                renderTooltip = {(value) => value ? toMmSs(value) : ""}
                min={0} 
                max={totalDuration} 
                value={progress} 
                onChange={(val) => jumpToProgressTime(val)} 
              />
            </div>
            <span className="flex w-12 shrink-0 justify-center"><p>{toMmSs(totalDuration)}</p></span>
          </div>
        </div>
      </div>
      <div >
      </div>
    </div>
  )
}
