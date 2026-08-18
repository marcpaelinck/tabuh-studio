// The Phase-4 introductory Editor tour. Like the Player tour, a thin wrapper: rebuild the live
// EditorSnapshot each render and hand the steps + snapshot to useTourController. Reuses the shared
// setup prologue to load the Cendrawasih / GONG KEBYAR score, then walks the editor.

import { useRef } from 'react'
import { useEditorStateStore } from '../stores/useEditorStateStore'
import { useScoreStore } from '../stores/useScoreStore'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'
import { editorTourSteps, type EditorSnapshot } from './editorTourSteps'
import { useTourController } from './useTourController'
import { useTourStore } from './useTourStore'

export function EditorTour() {
    const { scoreBrowserOpen, browserOrchestra, editorNotationClicks } = useTourStore()

    const currentScore = useScoreStore((s) => s.currentScore)
    const { selectedScoreOption, mainView, setEditorView } = useUserSelectionStore()
    const { showExpansion, setShowExpansion } = useEditorStateStore()

    const scoreBaselineRef = useRef<string | undefined>(undefined)
    const notationClickBaselineRef = useRef<number>(0)

    const snapshot: EditorSnapshot = {
        currentScoreTitle: currentScore?.title,
        selectedScoreTitle: selectedScoreOption?.objValue?.title,
        selectedScoreBaseline: scoreBaselineRef.current,
        browserOrchestra,
        scoreBrowserOpen,
        mainView,
        showExpansion,
        editorNotationClicks,
        editorNotationBaseline: notationClickBaselineRef.current
    }

    const Tour = useTourController<EditorSnapshot>({
        tourId: 'editor',
        steps: editorTourSteps,
        snapshot,
        // Show Next/Back on the informational steps; action steps override to a lone Skip.
        options: { buttons: ['back', 'close', 'primary', 'skip'] },
        onStart: () => {
            const t = useTourStore.getState()
            t.setScoreBrowserOpen(false)
            t.setBrowserOrchestra(null)
            // Ensure the editable Compact view so the per-part anchors (labels, notation, Expand/
            // Typing toggles) exist when the tour reaches them.
            useUserSelectionStore.getState().setEditorView('compact')
            t.requestMenu('0')
            setShowExpansion(true)
            setEditorView('compact')
        },
        onEnd: () => useTourStore.getState().requestMenu(null),
        // Step 0 ("close") is conditional: start there only if a score is already open.
        startIndex: () => (useScoreStore.getState().currentScore ? 0 : 1),
        onStepBefore: (id) => {
            if (id === 'selectScore') {
                scoreBaselineRef.current = useUserSelectionStore.getState().selectedScoreOption?.objValue?.title
            } else if (id === 'clickNotation' || id === 'expandDemo') {
                notationClickBaselineRef.current = useTourStore.getState().editorNotationClicks
            }
        }
    })

    return <>{Tour}</>
}
