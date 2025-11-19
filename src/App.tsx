// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import Selectors from './components/Selectors'
import Animation from './components/Animation'
import { type Score, type AnimationInfo, type NotationType, type ScoreInfo } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore, type Timeline } from './utils/scoreplayerUtils/score'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { FRAMESTYLE } from './config/constants'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [songList, setSongList] = useState<string[]>([])
  const menuDisabled = useRef<Record<string, boolean>>({"tabuh": false, "focus": false})
  const [selectedSong, setSelectedSong] = useState<string | null>(null)
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  const songDictRef: RefObject<Record<string, string>> = useRef({})
  const focusReference: RefObject<string | null>  = useRef(null)
  const animationInfoRef: RefObject<AnimationInfo> = useRef<AnimationInfo>({ svgInfo: {svg: null, panggul: null, x: null, y: 2, animation: null}, highlightRef: useRef(() => {})})
  const timelineRef: RefObject<Timeline | null>  = useRef(null)
  const notationRef: RefObject<NotationType | null> = useRef(null)
  const playbackSpeedRef = useRef<number>(1)

  const updateSong = (newSongName: string | null): void => {
      if (newSongName !== selectedSong) setSelectedSong(newSongName)
    }
 
  const updateFocus = (position: string | null): void => {
    if  (position !== focusReference.current) {
      focusReference.current=position
      if (timelineRef.current?.notation && position && position in timelineRef.current?.notation)
        notationRef.current = timelineRef.current.notation[position]
      setSelectedFocus(position)
    }
  }

  const updatePlaybackSpeed = (newSpeed: number) => {playbackSpeedRef.current=newSpeed / 100}

  const updateTimeline = (timeline: Timeline): void => {timelineRef.current = timeline}

  const updateAnimationInfo = (animationInfo: AnimationInfo): void => {
    animationInfoRef.current = animationInfo
  }
  
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
        songDictRef.current = Object.fromEntries(scoreInfo.map((score: ScoreInfo) => [score.title, score.file]))
        setSongList(Object.keys(songDictRef.current))
        setMenuDisabled("tabuh", false)
      }
      fetchScores();
  }, []);

  // Load and parse the score when a new score title is selected
  useEffect(() => {
    const loadScore = async () => {
      if (selectedSong) {
        setMenuDisabled("focus", false)
        let jsonScore = await readFile('scores/' + songDictRef.current[selectedSong])
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
        {selectedFocus && <Animation focus={selectedFocus} notationRef={notationRef} animationInfoUpdater={updateAnimationInfo}/>}
        <ScorePlayer score={score} focusRef={focusReference} animationInfoRef={animationInfoRef} pbSpeedRef={playbackSpeedRef}  timelineUpdater={updateTimeline}/>
      </div>
    </div>
  )
}
