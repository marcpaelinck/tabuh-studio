import { useAnimationEngine } from '../hooks/useAnimation'
import { useInstruments } from '../hooks/useInstruments'
import { useInterpretations } from '../hooks/useInterpretations'
import { type Score} from '../models/types'
import { useState, type JSX, memo, useMemo, useEffect, useRef, type ClassType } from 'react'
import * as Tone from 'tone'
import { type SvgInfo } from './Animation'
import { createTimeline, type AnimationAction, type SamplerAction, type TempoAction, type Timeline } from '../utils/score'
  //-------------------------CONTROLS--------------------------------------
import {FaPlay, FaPause} from "react-icons/fa"
import {FaBackwardFast} from "react-icons/fa6"
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import  {NotationArea}  from './NotationArea'

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

type AudioState = 'false' | 'true' | 'wait'

export default function ScorePlayer({ score, scoretitle, focus, focusRef, svgInfoRef}: { score: Score, scoretitle: string, focus: string, focusRef: React.RefObject<string>, svgInfoRef:React.RefObject<SvgInfo> }): JSX.Element {

  const [audioStarted, setAudioStarted] = useState<AudioState>('false')
  const [playing, setPlaying] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [totalDuration, setTotalDuration] = useState<number>(0)
  const  notationArea:React.RefObject<NotationArea|null> = useRef(null)

  const { playInstrument, muteAll} = useInstruments()
  const {changeTempo} = useInterpretations()
  const { executeAnimation } = useAnimationEngine()

  // recreate the Transport schedule when a new score is selected
  const timeline = useMemo(() => createTimeline(score), [score])
  
  useEffect(() => {
    createSchedule(timeline)
    rewind()
  }, [timeline]);

  function updateProgress(time: number){
    setProgress(Tone.getTransport().seconds)
    Tone.getTransport()
  }

  function createSchedule(timeline: Timeline) {
    // Creates the schedule for the Transport object.
    if (audioStarted) pause()
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().position = 0

    console.log(`Creating schedule for ${score.title}`)
    
    // tempo actions
    timeline.tempoactions.forEach((tAction: TempoAction) => {
      Tone.getTransport().schedule((time) => changeTempo(time, tAction), tAction.time)
    })
    // instrument actions (notes)
    timeline.sampleractions.forEach((iAction: SamplerAction) => {
      Tone.getTransport().schedule((time) => playInstrument(time, iAction.position, iAction, focusRef.current), iAction.time)
    })
    // Schedule animation actions
    timeline.animationactions.forEach((aAction: AnimationAction) => {
      Tone.getTransport().schedule((time) => executeAnimation(time, aAction, focusRef.current, svgInfoRef.current, notationArea), aAction.time)
      })
    // instrument actions (both sampler and animation)
    //TODO For better sync of animation, consider using Tone.getDraw().schedule. See https://github.com/Tonejs/Tone.js/wiki/Performance#syncing-visuals
    //     The following call does this. However this causes both the audio and animation to stutter from time to time. Need to dive into this before activating.
    //     The call should replace the above two calls (instrument actions and animation actions)
    // timeline.sampleranimationactions.forEach((saAction: SamplerAnimationAction) => {
    //   Tone.getTransport().schedule((time) => playInstrumentWithAnimation(time, saAction.position, saAction, focusRef.current, svgInfoRef.current, notationArea), saAction.time)
    // })
    // cursor actions
    // beat.cursorActions.forEach((cAction: CursorAction) => {
    //   Tone.getTransport().schedule((time) => moveCursor(time, cAction.step), cAction.time)
    // })
    setTotalDuration(Math.round(score.durationMs/1000))
    Tone.getTransport().scheduleRepeat((time) => updateProgress(time), "2hz", 0, timeline.totalDurationTO)

  }

  function jumpToProgressTime(time: number | number[]) {
    const newTime = typeof time === 'number' ? time : time[1]
    Tone.getTransport().stop()
    Tone.getTransport().position = newTime
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
    Tone.getTransport().stop()
    Tone.getTransport().position=0
    setProgress(0)
    notationArea.current?.clear()
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
            <div className="h-4 w-4 flex-shrink-0">
              <button onClick={() => rewind()}><FaBackwardFast/></button>
            </div>
            <div className="h-4 w-4 flex-shrink-0">
              <button onClick={() => playPause()}>{playing? <FaPause/> : <FaPlay/>}</button>
            </div>
            <span className="flex w-12 flex-shrink-0 justify-center"><p>{toMmSs(progress)}</p>{" "}</span>
            <div className="flex w-full items-center ">
              {/* <hr className="w-full border-1" /> */}
              <Slider min={0} max={totalDuration} value={progress} onChange={(val) => jumpToProgressTime(val)} styles={{track: {backgroundColor: '#8ec5ff'}, handle: {borderColor: '#8ec5ff'}}}/>
            </div>
            <span className="flex w-12 flex-shrink-0 justify-center"><p>{toMmSs(totalDuration)}</p></span>
          </div>
        </div>
      </div>
      <div >
        <div className="flex w-full items-center">
          {/* 
          //@ts-ignore */}
          <NotationArea notationAreaRef={notationArea} rows={8} cols={800}/>
        </div>
      </div>
    </div>
  )
}
