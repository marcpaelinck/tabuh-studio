// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import Animation from './components/Animation'
import { type Score, type AnimationInfo, type NotationType } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore } from './utils/score'
import { useEffect, useRef, useState, type Ref, type RefObject } from 'react'
import { FRAMESTYLE } from './config/constants'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [scoreTitle, setScoreTitle] = useState<string>("")
  const [score, setScore] = useState<Score | null>(null)
  const [focus, setFocus] = useState<string>('')
  const focusReference: RefObject<string>  = useRef('')
  const animationInfoRef: RefObject<AnimationInfo> = useRef<AnimationInfo>({ svgInfo: {svg: null, panggul: null, x: null, y: 2, animation: null}, notationAreaRef: useRef(null)})
  const notationRef: RefObject<NotationType | null> = useRef(null)


  const updateScoreTitle = (newScorefile: string): void => {
      if (newScorefile !== scoreTitle) setScoreTitle(newScorefile)
    }
 
    const updateFocus = (position: string): void => {
    if  (position !== focusReference.current) {
      focusReference.current=position
      setFocus(position)
    }
  }

const updateNotation = (notation: NotationType): void => {
  notationRef.current = notation
}

  const updateAnimationInfo = (animationInfo: AnimationInfo): void => {
    animationInfoRef.current = animationInfo
  }
  
  // Load and parse the score when a new score title is selected
  useEffect(() => {
    const loadScore = async () => {
      if (scoreTitle) {
        let jsonScore = await readFile('scores/' + scoreTitle)
        const score = parseScore(jsonScore)
        setScore(score)
      }
      setIsLoading(false)
    }
    loadScore()
  }, [scoreTitle])
  

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
        <ScorePlayer score={score} focusRef={focusReference} animationInfoRef={animationInfoRef} notationUpdater={updateNotation}/>
      </div>
    </div>
  )
}
