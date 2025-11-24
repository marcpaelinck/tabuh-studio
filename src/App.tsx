// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import Animation from './components/Animation'
import { panggulDefaultOption } from './components/Animation'
import { type MenuItemInfo, type Score, type SVGInfo } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore, type Timeline } from './utils/scoreplayerUtils/score'
import { useEffect, useMemo, useRef, useState, type JSX, type RefObject } from 'react'
import { FRAMESTYLE } from './config/constants'
import { speedDefaultOption } from './utils/selectorsUtils/selectorsUtils'
import { positionConfigs } from './config/config';
import { useScoreDict } from './hooks/useScoreList'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const menuDisabled = useRef<Record<string, boolean>>({"tabuh": false, "focus": false})
  const setMenuDisabled = (label: string, value: boolean) => {
    menuDisabled.current = Object.assign(menuDisabled.current, Object.fromEntries([[label, value]]))
  }
  const scoreDict = useScoreDict(setMenuDisabled)
  const [selectedScore, setSelectedScore] = useState<string | null>(null)
  const [selectedFocus, setSelectedFocus] = useState<string[]>([])
  const [notationParas, setNotationParas] = useState<JSX.Element[] | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  const highlightFunctionRef: RefObject<CallableFunction> = useRef<CallableFunction>(()=>{})
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(speedDefaultOption.value as number)
  const [svgInfo, setSvgInfo] = useState<SVGInfo>({svg: null, panggul: null,x: null, y: null, animation: null})
  const [panggulOption, setPanggulOption] = useState<MenuItemInfo>(panggulDefaultOption)

  var scoreList: string[] = Object.keys(scoreDict)

  const timelineRef: RefObject<Timeline | null>  = useRef(null)

  const updateScore = (newScoreName: string | null): void => {
      if (newScoreName !== selectedScore) setSelectedScore(newScoreName)
    }
 
  const updateFocus = (focus: string[]): void => {
    if  (focus !== selectedFocus) {
      setSelectedFocus(focus)
      //TODO currently only displaying notation for the first focus position
      if (timelineRef.current?.notation && focus && focus[0] in timelineRef.current?.notation)
        setNotationParas(timelineRef.current.notation[focus[0]])
    }
  }
      
  const  panggulMenuItems: MenuItemInfo[] = useMemo(() => {
        const hideItem: MenuItemInfo = panggulDefaultOption
        const menuItems: MenuItemInfo[] = selectedFocus.map((position) => {
            return {key: position, displayValue: positionConfigs[position].name, value:position }
        })
        setPanggulOption(menuItems.length>0 ? menuItems[0] : panggulDefaultOption)
        return [hideItem].concat(menuItems)
    }
    , [selectedFocus])

  const updateTimeline = (timeline: Timeline): void => {timelineRef.current = timeline}


  // Load and parse the score when a new score title is selected
  useEffect(() => {
    const loadScore = async () => {
      if (selectedScore) {
        setMenuDisabled("focus", false)
        let jsonScore = await readFile('scores/' + scoreDict[selectedScore])
        const newScore = parseScore(jsonScore)
            if (newScore && newScore!=score) {
                setScore(newScore)
            }
        setMenuDisabled("focus", false)
      }
      setIsLoading(false)
    }
    loadScore()
  }, [selectedScore])
  

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="font-mono text-lg">Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex w-full min-h-0 ">
      {/*App frame is 8/10 of screen width and centered*/}
      <div className="lg:w-1/10">
      </div>
      <div className={"lg:w-8/10 sm:w-full" + FRAMESTYLE}>
        <div className="pt-6 pl-6 pr-6">
          <Selectors menuDisabled={menuDisabled} scoreList={scoreList} score={score} scoreUpdater={updateScore} focusUpdater={updateFocus} speedUpdater={setPlaybackSpeed}/>
        </div>
        {selectedFocus.length>0 && 
        <Animation 
          focus={selectedFocus} 
          notationElement={notationParas} 
          panggulMenuItems={panggulMenuItems} 
          panggulOption={panggulOption} 
          highlightFunctionRef={highlightFunctionRef} 
          setPanggulOption={setPanggulOption} 
          setSVGInfo={setSvgInfo}
        />}
        <ScorePlayer 
          score={score} 
          focus={selectedFocus} 
          pbSpeed={playbackSpeed}  
          svgInfo={svgInfo} 
          panggulOption={panggulOption} 
          highlightFunctionRef={highlightFunctionRef} 
          timelineUpdater={updateTimeline}
        />
      </div>
    </div>
  )
}
