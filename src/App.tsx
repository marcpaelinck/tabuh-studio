// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import Animation from './components/Animation'
import { type Score } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore } from './utils/score'
import { useEffect, useRef, useState } from 'react'
import { type SvgInfo } from './components/Animation'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [scoreTitle, setScoreTitle] = useState<string>("")
  const [score, setScore] = useState<Score>({ title: '', composer: '', durationMs: 0, sections: [] })
  const [focus, setFocus] = useState<string>('')
  const focusReference: React.RefObject<string>  = useRef('')
  const svgInfoReference: React.RefObject<SvgInfo> = useRef<SvgInfo>({ svg: null, panggul: null, x: null, y: 2, animation: null })


  const updateScoreTitle = (newScorefile: string): void => {
      if (newScorefile !== scoreTitle) setScoreTitle(newScorefile)
    }
  const updateFocus = (position: string): void => {
    if  (position !== focusReference.current) {
      focusReference.current=position
      setFocus(position)
    }
  }
  const updateSvgInfo = (svgInfo: SvgInfo): void => {
    svgInfoReference.current = svgInfo
  }
  
  // Load and parse the score when a new score title is selected
  useEffect(() => {
    const loadScore = async () => {
      let jsonScore
      if (! scoreTitle) 
        jsonScore = await readFile('scores/gilak penutup [full].json')
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
      <div className="w-1/10">
      </div>
      <div className="w-8/10 rounded-xl p-6 shadow-lg">
        <Selectors score={score} scoreUpdater={updateScoreTitle} focusUpdater={updateFocus} />
        <Animation focus={focus} svgInfoUpdater={updateSvgInfo}/>
        <ScorePlayer score={score} focus={focus} focusRef={focusReference} svgInfoRef={svgInfoReference}/>
      </div>
    </div>
  )
}
