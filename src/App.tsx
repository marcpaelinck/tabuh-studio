// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import Animation from './components/Animation'
import { type Score, type AnimationInfo, type ScoreInfo } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore, type Timeline } from './utils/scoreplayerUtils/score'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { FRAMESTYLE } from './config/constants'
import { focusDefaultOption, speedDefaultOption } from './utils/selectorsUtils/selectorsUtils'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const menuDisabled = useRef<Record<string, boolean>>({"tabuh": false, "focus": false})
  const [selectedSong, setSelectedSong] = useState<string | null>(null)
  const [selectedFocus, setSelectedFocus] = useState<string[]>([])
  const focusReference: RefObject<string[]>  = useRef(focusDefaultOption.value as string[])
  const [score, setScore] = useState<Score | null>(null)
  const [songDict, setSongDict] = useState<Record<string, string>>({})
  var songList: string[] = Object.keys(songDict)

  const playbackSpeedRef = useRef<number>(speedDefaultOption.value as number)
  const timelineRef: RefObject<Timeline | null>  = useRef(null)

  const animationInfoRef: RefObject<AnimationInfo> =useRef({ svgInfo: {svg: null, panggul: null, x: null, y: 2, animation: null}, highlightRef: useRef(() => {}), panggulRef: useRef(null), panggulOptionRef: useRef(null), notationRef: useRef(null)})

  const updateSong = (newSongName: string | null): void => {
      if (newSongName !== selectedSong) setSelectedSong(newSongName)
    }
 
  const updateFocus = (position: string[]): void => {
    if  (position !== focusReference.current) {
      focusReference.current=position
      //TODO currently only displaying notation for the first focus position
      if (timelineRef.current?.notation && position && position[0] in timelineRef.current?.notation)
        animationInfoRef.current.notationRef.current = timelineRef.current.notation[position[0]]
      setSelectedFocus(position)
    }
  }

  const updatePlaybackSpeed = (newSpeed: number) => {playbackSpeedRef.current=newSpeed}

  const updateTimeline = (timeline: Timeline): void => {timelineRef.current = timeline}

  const setMenuDisabled = (label: string, value: boolean) => {
    menuDisabled.current = Object.assign(menuDisabled.current, Object.fromEntries([[label, value]]))
  }

  // Retrieve information about available notation scores  
  useEffect(() => {
      async function fetchScores() {
        setMenuDisabled("tabuh", true)
        setMenuDisabled("focus", true)
        const files = await readFile('scores/content.json');
        const scoreInfo: ScoreInfo[] = JSON.parse(files)
        setSongDict(Object.fromEntries(scoreInfo.map((score: ScoreInfo) => [score.title, score.file])))
        setMenuDisabled("tabuh", false)
      }
      fetchScores();
  }, []);

  // Load and parse the score when a new score title is selected
  useEffect(() => {
    const loadScore = async () => {
      if (selectedSong) {
        setMenuDisabled("focus", false)
        let jsonScore = await readFile('scores/' + songDict[selectedSong])
        const newScore = parseScore(jsonScore)
            if (newScore && newScore!=score) {
                setScore(newScore)
            }
        setMenuDisabled("focus", false)
      }
      setIsLoading(false)
    }
    loadScore()
  }, [selectedSong])
  

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
          <Selectors menuDisabled={menuDisabled} songList={songList} score={score} songUpdater={updateSong} focusUpdater={updateFocus} speedUpdater={updatePlaybackSpeed}/>
        </div>
        {selectedFocus && <Animation focus={selectedFocus} animationInfoRef={animationInfoRef}/>}
        <ScorePlayer score={score} focusRef={focusReference} animationInfoRef={animationInfoRef} pbSpeedRef={playbackSpeedRef}  timelineUpdater={updateTimeline}/>
      </div>
    </div>
  )
}
