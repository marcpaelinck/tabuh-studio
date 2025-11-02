// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import Animation from './components/Animation'
import { type Score, type AnimationInfo } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore } from './utils/score'
import { memo, useEffect, useRef, useState } from 'react'
import { FRAMESTYLE } from './config/constants'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [scoreTitle, setScoreTitle] = useState<string>("")
  const [score, setScore] = useState<Score>({ title: '', composer: '', durationMs: 0, sections: [] })
  const [focus, setFocus] = useState<string>('')
  const focusReference: React.RefObject<string>  = useRef('')
  const animationInfoReference: React.RefObject<AnimationInfo> = useRef<AnimationInfo>({ svg: null, panggul: null, x: null, y: 2, animation: null })


  const updateScoreTitle = (newScorefile: string): void => {
      if (newScorefile !== scoreTitle) setScoreTitle(newScorefile)
    }
  const updateFocus = (position: string): void => {
    if  (position !== focusReference.current) {
      focusReference.current=position
      setFocus(position)
    }
  }
  const updateSvgInfo = (svgInfo: AnimationInfo): void => {
    animationInfoReference.current = svgInfo
  }
  
  // Load and parse the score when a new score title is selected
  useEffect(() => {
    const loadScore = async () => {
      let jsonScore
      if (! scoreTitle) 
        jsonScore = '{"title": "", "composer": "", "sections": []}'
      else
        jsonScore = await readFile('scores/' + scoreTitle)
      const score = parseScore(jsonScore)
      setScore(score)
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
        <Animation focus={focus} svgInfoUpdater={updateSvgInfo}/>
        <ScorePlayer score={score} focusRef={focusReference} svgInfoRef={animationInfoReference}/>
      </div>
    </div>
  )
}
