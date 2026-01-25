import _ from 'lodash'
import type { EditorScore, EditorSystem, UUID } from '../../models/types'
import { debug } from '../debugger'
import { executionManager, type FlowStep } from '../executionManager'

// CYCLE DETECTION

// Checks for cycles ('endless loops') caused by 'go to' instructions.
// Creates a finite state machine. Detects cycle by iterating through the score using
// the executionManager and checking if a state is encountered more than once.

type GoToTransitions = Record<number, number> // Transition matrix for a single goto instruction
type StateTransitionMatrix = Record<UUID, GoToTransitions[]> // A system can have multiple goto instructions.
type GoToState = Record<UUID, number[]> // Each system has one state value for each goto instruction.
type State = Record<UUID, GoToState> // The machine state consists of the combination of system ID and goto state.
// Only include systems that have one or more goto instruction.

function createTransitions(score: EditorScore): StateTransitionMatrix {
    // Define the states and transitions for each goto instruction as follows.
    // All systems start with additional state 0.
    // 1. No goto or unconditional goto - 1 state.
    //      Transitions: 0->1->1
    // 2. 'Fixed pass' condition - N states where N==<max pass nbr.>.
    //      Transitions: 0->1->2-> ... ->N->N
    // 3. Cyclic condition - C states where C is cycle length.
    //      Transitions: 0->1->2-> ... ->C->1
    // Each system states consists of a vector containing the state of each goto instruction.
    // The machine's state is a vector containing all system states.
    // A transitions object contains a vector of state transition definitions for each system.
    const transitions: Record<string, Record<number, number>[]> = {}
    for (const system of score.systems) {
        const gotos = system.execution?.filter((exec) => exec.type == 'goto') || []
        if (gotos.length == 0) continue

        const systrans: Record<number, number>[] = []
        transitions[shortId(system)] = systrans
        // if (gotos.length == 0) {
        //     systrans.push({ 0: 1, 1: 1 })
        //     continue
        // }
        gotos.map((goto) => {
            const gototrans: Record<number, number> = {}
            gototrans[-1] = 0 // cyclic indicator
            if (!goto.passes) {
                // Unconditional goto
                gototrans[0] = 1
                gototrans[1] = 1
            } else {
                for (var i = 0; i < Math.max(...goto.passes); i++) {
                    gototrans[i] = i + 1
                }
                if (!goto.each) {
                    gototrans[i] = i
                } else {
                    gototrans[i] = 0
                    gototrans[-1] = 1
                }
            }
            systrans.push(gototrans)
        })
    }
    debug(transitions)
    return transitions
}

// Returns the next state given the current system uuid
function nextGoToState(currState: GoToState | undefined, uuid: UUID, transitions: StateTransitionMatrix) {
    if (currState == undefined) return _.mapValues(transitions, (sysstatus) => sysstatus.map(() => 0)) as GoToState
    const newState: GoToState = currState
    // resetCyclic==false: return next state
    // resetCyclic==true: Reset the current system's counter if it cyclic and has reached its maximum
    newState[uuid] = newState[uuid].map((state, idx) => transitions[uuid][idx][state])
    return newState
}

// The validator uses this (unique) ID instead of the uuid to make debug logging more readable
function shortId(system: EditorSystem | undefined): string {
    return system ? `#${system.id}` : 'undefined'
}

// Uses the execution manager to iterate through the systems in playback sequence until the end of the score.
// Updates the playback state accordingly. Returns false if a state is encountered more than once.
// This is an indication of a closed cycle.
function simulatePlayback(score: EditorScore, transitions: StateTransitionMatrix) {
    const states = new Set()
    var uuid = shortId(score.systems[0])
    var gotoState: GoToState = nextGoToState(undefined, uuid, transitions)
    var state: State = {}
    state[shortId(score.systems[0])] = gotoState
    var jState: string = JSON.stringify(state)
    const { resetFlow, nextInFlow } = executionManager(score)
    resetFlow()

    var loop: boolean = false
    var step: FlowStep | undefined = { system: { id: 0 } as EditorSystem } as FlowStep
    var syscounter = 0 // safety net
    var beatcount: number = 0
    const debugvar = []

    while (!loop && step && syscounter < 1000) {
        // Next in flow
        var beatcount = 0
        while (step && shortId(step.system as EditorSystem) == uuid && beatcount < 500) {
            // NextInFlow returns the next beat (section) so we need to iterate until we reach the next
            // system. Count helps to detect a cycle within a system (not likely to occur).
            // A maximum of 100 allow for a loop within a system.
            step = nextInFlow()
            beatcount += 1
        }
        if (step) debugvar.push(step.system.id)
        uuid = shortId(step?.system)
        if (!step || !(uuid in transitions)) continue

        debug(
            `BEFORE STATE CHECK loop=${loop} beatcount=${beatcount} syscount=${syscounter} uuid=${uuid} state=${jState}`
        )
        loop = beatcount >= 500
        syscounter += 1
        // Reset the counter if it is cyclic

        // debug(`COUNT=${syscounter} UUID=${uuid}`)
        gotoState = nextGoToState(gotoState, uuid, transitions)
        state[uuid] = gotoState
        jState = JSON.stringify(state)
        if (uuid in transitions) {
            loop = states.has(jState)
            debug(`VALIDATION loop=${loop} beatcount=${beatcount} syscount=${syscounter} uuid=${uuid} state=${jState}`)
            debug(states)
            states.add(jState)
        }
        if (!loop) {
        }
    }
    loop = loop || syscounter >= 1000
    // debug(`VALIDATION loop=${loop} beatcount=${beatcount} syscount=${syscounter} state=${jState}`)
    // debug(states)
    debug(`LOOP=${loop}`)
    debug(JSON.stringify(debugvar))
    return !loop
}

// Detects the presence of a closed loop. Returns true if no loops were detected.
export function cycleValidation(score: EditorScore) {
    if (!score) return true
    const transitions: StateTransitionMatrix = createTransitions(score)
    return simulatePlayback(score, transitions)
}
