// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import Animation from './components/Animation'
import { type Score, type AnimationInfo, type NotationType } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore, type Timeline } from './utils/score'
import { useEffect, useRef, useState, type Ref, type RefObject } from 'react'
import { FRAMESTYLE } from './config/constants'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [scoreFile, setScoreFile] = useState<string>("")
  const [score, setScore] = useState<Score | null>(null)
  const [focus, setFocus] = useState<string>('')
  const focusReference: RefObject<string>  = useRef('')
  const animationInfoRef: RefObject<AnimationInfo> = useRef<AnimationInfo>({ svgInfo: {svg: null, panggul: null, x: null, y: 2, animation: null}, notationAreaRef: useRef(null)})
  const timelineRef: RefObject<Timeline | null>  = useRef(null)
  const notationRef: RefObject<NotationType | null> = useRef(null)


  const updateScoreTitle = (newScorefile: string): void => {
      if (newScorefile !== scoreFile) setScoreFile(newScorefile)
    }
 
    const updateFocus = (position: string): void => {
    if  (position !== focusReference.current) {
      focusReference.current=position
      if (timelineRef.current?.notation && position in timelineRef.current?.notation)
        notationRef.current = timelineRef.current.notation[position]
      setFocus(position)
    }
  }

const updateTimeline = (timeline: Timeline): void => {
  timelineRef.current = timeline
}

  const updateAnimationInfo = (animationInfo: AnimationInfo): void => {
    animationInfoRef.current = animationInfo
  }
  
  // Load and parse the score when a new score title is selected
  useEffect(() => {
    const loadScore = async () => {
      if (scoreFile) {
        let jsonScore = await readFile('scores/' + scoreFile)
        const score = parseScore(jsonScore)
        setScore(score)
      }
      setIsLoading(false)
    }
    loadScore()
  }, [scoreFile])
  

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="font-mono text-lg">Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex w-screen min-h-0 ">
      {/*App frame is 8/10 of screen width and centered*/}
      <div className="w-1/10">
      </div>
      <div className={"w-8/10" + FRAMESTYLE}>
        <Selectors score={score} scoreUpdater={updateScoreTitle} focusUpdater={updateFocus} />
        {focus && <Animation focus={focus} notationRef={notationRef} animationInfoUpdater={updateAnimationInfo}/>}
        <ScorePlayer score={score} focusRef={focusReference} animationInfoRef={animationInfoRef} timelineUpdater={updateTimeline}/>
      </div>
    </div>
  )
}
