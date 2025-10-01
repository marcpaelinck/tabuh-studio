// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import AnimationDiv from './components/Animation'
import { type Score } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore } from './utils/score'
import { useEffect, useRef, useState } from 'react'
import { type SvgInfo } from './components/Animation'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [scorefile, setScorefile] = useState<string>("")
  const [score, setScore] = useState<Score>({ title: '', composer: '', sections: [] })
  const [focus, setFocus] = useState<string>('')
  const focusReference: React.RefObject<string>  = useRef('')
  const svgInfoInfoReference: React.RefObject<SvgInfo> = useRef<SvgInfo>({ svg: null, panggul: null, x: null, y: null, animation: null })


  function updateScorefile(filename: string): void {setScorefile(filename)}
  function updateFocus(position: string): void {
    focusReference.current=position
    setFocus(position)
  }
  function updateSvgInfo(svgInfo: SvgInfo) {
    svgInfoInfoReference.current = svgInfo
    // setSvgInfo(svgInfo)

  }
  
  useEffect(() => {
    const loadScore = async () => {
      let jsonScore
      if (! scorefile) 
        jsonScore = await readFile('scores/gilak penutup [full].json')
      else
        jsonScore = await readFile('scores/' + scorefile)
      const score = parseScore(jsonScore)
      setScore(score)
      setIsLoading(false)
    }
    loadScore()
  }, [scorefile])
  

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
        <Selectors score={score} scoreUpdater={updateScorefile} focusUpdater={updateFocus} />
        <AnimationDiv focusRef={focusReference} focus={focus} svgInfoUpdater={updateSvgInfo}/>
        <ScorePlayer score={score} focusRef={focusReference} svgInfoRef={svgInfoInfoReference}/>
      </div>
    </div>
  )
}
