/**
 * Callback functions that are scheduled by the PlaybackManager.
 *
 * These callback functions generate sound, animation and state changes.
 * They are provided by the components that are involved in a playback action
 * such as the Animation or Editor windows.
 * The functions are scheduled in the Tone.js Transport object  by the
 * PlaybackManager.
 */
import type { Dispatch } from 'react'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type {
    AnimationFunction,
    DashboardFunction,
    EditorCursorFunction,
    GenericFunction,
    PlaybackCallbackFunctions,
    PlayerCursorFunction,
    ProgressFunction,
    SamplerFunction,
    TempoFunction
} from '../typing/playback'

// Callback functions used when creating a playback schedule in Tone.Transport
interface PlaybackFunctionStore extends PlaybackCallbackFunctions {
    setTempoFunction: Dispatch<TempoFunction>
    setPlayFunction: Dispatch<SamplerFunction>
    setAnimateFunction: Dispatch<AnimationFunction>
    setPlayerCursorFunction: Dispatch<PlayerCursorFunction>
    setEditorCursorFunction: Dispatch<EditorCursorFunction>
    setDashboardFunction: Dispatch<DashboardFunction>
    setProgressFunction: Dispatch<ProgressFunction>
    setFinalizeFunction: Dispatch<GenericFunction>
}

export const usePlaybackFunctionStore: UseBoundStore<StoreApi<PlaybackFunctionStore>> = create((set) => ({
    tempoFunction: (): void => {},
    playFunction: (): void => {},
    animateFunction: (): void => {},
    playerCursorFunction: (): void => {},
    editorCursorFunction: (): void => {},
    dashboardFunction: (): void => {},
    progressFunction: (): void => {},
    finalizeFunction: (): void => {},
    setTempoFunction: (func: TempoFunction) => set(() => ({ tempoFunction: func })),
    setPlayFunction: (func: SamplerFunction) => set(() => ({ playFunction: func })),
    setAnimateFunction: (func: AnimationFunction) => set(() => ({ animateFunction: func })),
    setPlayerCursorFunction: (func: PlayerCursorFunction) => set(() => ({ playerCursorFunction: func })),
    setEditorCursorFunction: (func: EditorCursorFunction) => set(() => ({ editorCursorFunction: func })),
    setDashboardFunction: (func: DashboardFunction) => set(() => ({ dashboardFunction: func })),
    setProgressFunction: (func: ProgressFunction) => set(() => ({ progressFunction: func })),
    setFinalizeFunction: (func: GenericFunction) => set(() => ({ finalizeFunction: func }))
}))
