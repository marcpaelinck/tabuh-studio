import * as Tone from 'tone'
import { positionConfigs } from '../config/config'
import { isExtension, isMuting } from '../config/configfunctions'
import type { PlaybackAction } from '../hooks/playbackReducer'
import type {
    EditorCursorAction,
    EditorSystem,
    GenericAction,
    PlayerCursorAction,
    Position,
    SamplerAction,
    TempoAction,
    TimeLine
} from '../models/types'
import { cleanSymbol } from './alphabet'
import { debug } from './debugger'
import { executionManager, type FlowStep } from './executionManager'
import { defaultObject } from './objectUtils'
import { n2TO, TO2n } from './timeunits'

const changeTempo: (time: number, action: TempoAction | SamplerAction, pbSpeed: number) => void = (
    time: number,
    action: TempoAction,
    pbSpeed: number
) => {
    if (action.bpm != undefined) {
        Tone.getTransport().bpm.setValueAtTime(action.bpm * pbSpeed, time)
    }
}

// Creates a timeline to play back (parts of) the score in the editor
// useCache: if true, the unsaved (cached) user edits will be played back.
export function createTimelineFromEditor(pbAction: PlaybackAction, useCache: boolean): TimeLine | undefined {
    // Check that all necessary data is being passed
    debug(
        `creating timeline ${pbAction.playbackType} totSystems=${pbAction.data?.systems.length} startAtIndex=${pbAction.systemIndex} functions OK: ${pbAction.actionFunctions != undefined}`
    )
    if (!(pbAction.playbackType && pbAction.data && pbAction.systemIndex != undefined && pbAction.actionFunctions))
        return undefined

    const timeline: TimeLine = {
        totalDurationSec: 0,
        totalDurationTO: n2TO(0),
        initialBPM: 60, // Update after BPM and velocity have been added to EditorSystemData
        tempoactions: [],
        sampleractions: [],
        animationactions: [],
        playercursoractions: [],
        editorcursoractions: [],
        genericactions: [],
        notation: {} as Record<Position, any>
    }

    const { nextInFlow } = executionManager(pbAction.data, pbAction.systemIndex, pbAction.playbackType)

    const velocity = 0.7 // Update after BPM and velocity have been added to EditorSystemData
    var prevSystem: EditorSystem | undefined = undefined
    var currNote: Record<string, SamplerAction | null> = Object.fromEntries(
        Object.keys(positionConfigs).map((key) => [key, null])
    )
    var current: FlowStep | undefined = nextInFlow()
    // Keeps track of the longest measure duration in a section. All measures in a system should have
    // the same length but in case they don't, this value will be used to resync the following system.
    var maxMeasureDuration: number = 0
    // const introTimeBn = Math.round(millis2BaseNoteEquiv(defaultIntroTime, 60))
    var sectionStartTime: number = 0
    debug(current)

    while (current) {
        debug(current)
        maxMeasureDuration = 0
        for (const position of current.positions) {
            var currTime: number = sectionStartTime
            var cursorPos: number = 0
            const measure = current.measures[position]
            var notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
            if (!notation) notation = Array(4).fill(defaultObject('JsonSymbol'))
            notation.forEach((symbol, symidx) => {
                const endOfPosition = current!.lastSystem && current!.lastSection && symidx == notation.length - 1
                if (pbAction.actionFunctions!.play && (!isExtension(symbol) || endOfPosition)) {
                    // Encountered a new note symbol, a muting symbol or last symbol for this instrument position.
                    if (currNote[position]) {
                        // Need to close and save the currently 'playing' note.
                        // Add a basenote duration if the last symbol of the staff is an extension
                        const addDuration = isExtension(symbol) ? 1 : 0
                        // Update the current note's sampler action and save it to the timeline.
                        currNote[position].duration = n2TO(currTime - TO2n(currNote[position].time) + addDuration)
                        currNote[position].isLast = endOfPosition && isExtension(symbol)
                        timeline.sampleractions.push(currNote[position])
                        currNote[position] = null
                    }
                    if (!isExtension(symbol) && !isMuting(symbol)) {
                        // Create a sampler action for the new note
                        currNote[position] = {
                            action: pbAction.actionFunctions!.play,
                            position: position,
                            cleanedSymbol: cleanSymbol(symbol),
                            bpm: measure.tempo[0] + (symidx / notation.length) * (measure.tempo[1] - measure.tempo[0]),
                            velocity: velocity,
                            time: n2TO(currTime),
                            duration: n2TO(1), // can be updated later
                            isLast: endOfPosition // can be updated later
                        }
                        if (endOfPosition) {
                            timeline.sampleractions.push(currNote[position])
                            currNote[position] = null
                        }
                    }
                }
                // Create a cursor action
                if (pbAction.actionFunctions!.playercursor) {
                    timeline.playercursoractions.push({
                        action: pbAction.actionFunctions!.playercursor,
                        time: n2TO(currTime),
                        sysuuid: current!.system.uuid,
                        section: current!.sectionIdx,
                        position: position,
                        symbol: symbol,
                        line: 0,
                        range: [cursorPos, cursorPos + symbol.length]
                    })
                }
                cursorPos += symbol.length
                currTime += 1
            })
            maxMeasureDuration = Math.max(currTime - sectionStartTime, maxMeasureDuration)
        }
        // Create editor cursor actions and tempo actions.
        // Only one cursor action per system is needed.
        if (pbAction.actionFunctions.editorcursor) {
            var cursorTime = sectionStartTime
            timeline.editorcursoractions.push({
                action: pbAction.actionFunctions.editorcursor,
                time: n2TO(cursorTime),
                prevsysuuid: prevSystem?.uuid || undefined,
                sysuuid: current.system.uuid,
                section: current.sectionIdx
            })
        }
        prevSystem = current.system
        current = nextInFlow()
        sectionStartTime += maxMeasureDuration
    }
    // Determine the total playback duration
    timeline.totalDurationTO = n2TO(sectionStartTime)
    if (pbAction.actionFunctions.generic)
        timeline.genericactions.push({ action: pbAction.actionFunctions.generic, time: timeline.totalDurationTO })
    debug(timeline, true)
    return timeline
}

export function scheduleTransport(timeLine: TimeLine | undefined, pbSpeed: number = 1) {
    // Creates the schedule for the Transport object.
    if (!timeLine) return

    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0

    // Tempo and instrument actions (notes)
    // Set the initial tempo to 60 (intro time)
    const tAction: TempoAction = { time: { '16n': 0 }, bpm: timeLine.initialBPM, duration: { '16n': 0 } }
    Tone.getTransport().schedule((time) => changeTempo(time, tAction, pbSpeed), tAction.time)
    timeLine.sampleractions.forEach((sAction: SamplerAction) => {
        Tone.getTransport().schedule((time) => changeTempo(time, sAction, pbSpeed), sAction.time)
        Tone.getTransport().schedule((time) => sAction.action(time, sAction), sAction.time)
    })

    // Player Cursor actions
    timeLine.playercursoractions.forEach((cAction: PlayerCursorAction) => {
        Tone.getTransport().schedule((time) => cAction.action(time, cAction), cAction.time)
    })

    // Editor Cursor actions
    timeLine.editorcursoractions.forEach((cAction: EditorCursorAction) => {
        Tone.getTransport().schedule((time) => cAction.action(time, cAction), cAction.time)
    })

    // Action for when end of schedule is reached
    timeLine.genericactions.forEach((gAction: GenericAction) => {
        Tone.getTransport().schedule((time) => gAction.action(time), gAction.time)
    })
}
