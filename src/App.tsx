// import ScoreEditor from './components/ScoreEditor'
import ScorePlayer from './components/ScorePlayer'
import { type Score } from './models/types'
import { readFile } from './utils/filesystem'
import { parseScore } from './utils/score'
import { useEffect, useState } from 'react'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [templateContent, setTemplateContent] = useState('')
  const [score, setScore] = useState<Score>({ title: '', composer: '', sections: [] })

  useEffect(() => {
    const loadTemplate = async () => {
      const templateContent = await readFile('scores/gilak penutup [full].json')
      setTemplateContent(templateContent)
      const templateScore = parseScore(templateContent)
      setScore(templateScore)
      setIsLoading(false)
    }
    loadTemplate()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="font-mono text-lg">Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0">
      <div className="h-full w-full overflow-scroll">
        <ScorePlayer
          initialContent={templateContent}
        />
      </div>
    </div>
  )
}
