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
  // const [timeLine, setTimeLine] = useState<Timeline>({tempoactions: [], sampleractions: [], animationactions:[], cursoractions: []})
  const [focus, setFocus] = useState<string>('')
  const focusReference: React.RefObject<string>  = useRef('')
  // const svgReference: React.RefObject<SVGSVGElement | null>  = useRef(null)
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

  // const { larasInstruments, playInstrument, muteInstrument } = useInstruments()
  // const { changeTempo, changeDynamics } = useInterpretations()
  // const { animateNote } = useAnimationEngine(svgInfoInfoReference.current)

  // const playInstrument = () => {}
  // const changeTempo = () => {}
  // const animateNote = () => {}

  
  useEffect(() => {
    const loadScore = async () => {
      console.log("scorefile=" + scorefile)
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

  // function setSvgRef(svg: SVGSVGElement) {
  //   if (svg!==svgReference.current) {
  //     svgReference.current=svg
  //   }
  // }
  
  return (
    <div className="flex w-screen min-h-0 ">
      <div className="w-1/10">
      </div>
      <div className="w-8/10 rounded-xl p-6 shadow-lg">
        <Selectors score={score} scoreUpdater={updateScorefile} focusUpdater={updateFocus} />
        <AnimationDiv focusRef={focusReference} svgInfoUpdater={updateSvgInfo}/>
        <ScorePlayer score={score} focus={focus} focusRef={focusReference} svgInfoRef={svgInfoInfoReference}/>
      </div>
    </div>
  )
}
