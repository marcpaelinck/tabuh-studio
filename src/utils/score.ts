import { createElement } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
    defaultIntroTime,
    defaultOutroTime,
    noteConfigs,
    positionConfigs,
    type BaseNoteTimeObj
} from '../config/config'
import {
    type ActionFunctions,
    type AnimationNote,
    type JsonNote,
    type JsonSymbol,
    type Note,
    type Score,
    type Section,
    type TimeLine
} from '../models/types'
import { cleanSymbol } from './alphabet'
import { BaseNoteEquiv2Millis, millis2BaseNoteEquiv, n2TO } from './timeunits'

export function parseScore(input: string): Score {
    const score: Score = JSON.parse(input)
    // This function also calculates times in ms for each note, to be used by the animation.
    // Transport.getSecondsAtTime() doesn't seem to process tempo changes correctly.
    var currentTimeMs = defaultIntroTime
    // TODO the following result will be incorrect if tempo[1] != tempo[0]
    const introTimeBn = millis2BaseNoteEquiv(defaultIntroTime, score.systems[0].sections[0].tempo[0])
    score.systems.forEach((system, sysidx, systemArray) => {
        system.uuid = uuidv4()
        system.starttime += introTimeBn
        system.sections.forEach((section, sectidx, sectionArray) => {
            section.starttime += introTimeBn
            section.starttimeMs = Math.round(currentTimeMs)
            // The time for all instruments is synced at the start of each section.
            // This will ensure that notation errors will not propagate throughout the score.
            for (const [_, measure] of Object.entries(section.staves)) {
                var relTime = 0 // Time relative to the section's start time
                measure.tempo = section.tempo
                measure.notes?.forEach((note: JsonNote) => {
                    // Convert the first note's absolute start time to relative time.
                    // TODO in the future the note's time attribute should be given relative to the section start time.
                    note.t += introTimeBn
                    relTime = note.t - section.starttime
                    // Determine the *average* tempo from the section start to the note start. This accounts for the factor 0.5
                    const avgTempo =
                        section.tempo[0] + ((section.tempo[1] - section.tempo[0]) * 0.5 * relTime) / section.duration
                    note.ms = section.starttimeMs + BaseNoteEquiv2Millis(note.t - section.starttime, avgTempo)
                    note.section = section.id
                    note.sysUuid = system.uuid
                    relTime += note.d
                })
                measure.notation.forEach((symbol: JsonSymbol) => {
                    symbol.t += introTimeBn
                })
            }
            currentTimeMs += BaseNoteEquiv2Millis(section.duration, section.tempo)
            if (sysidx === systemArray.length - 1 && sectidx === sectionArray.length - 1) {
                // Last section
                score.durationMs = currentTimeMs
            }
        })
    })
    return score
}

// Create a mapping for notes to shorthand code
// const note_to_shCode: { [position: string]: { [symbol: string]: string[] } } = {}
// for (const [position, posConfigs] of Object.entries(instrumentConfigs)) {
//   note_to_shCode[position] = Object.fromEntries(posConfigs.alphabet.map((char, index) => [char, posConfigs.notes[index]]))
// }

const note2AnimationNotes = (position: string, notationNote: JsonNote, ìsLast: boolean): AnimationNote[] => {
    if (!(position in positionConfigs)) return []
    const cleanedSymbol = cleanSymbol(notationNote.s)
    const shorthandCodes = positionConfigs[position].symbolToNoteNames[cleanedSymbol] || []
    const result: AnimationNote[] = []
    shorthandCodes.forEach((shCode) => {
        const instrType: string = positionConfigs[position].type
        if (!shCode) return null
        const note: Note = noteConfigs[instrType][shCode]
        const keyname: string = `${note.tone}${note.octave != null ? note.octave : ''}`
        result.push({
            sysUuid: notationNote.sysUuid,
            section: notationNote.section,
            time: n2TO(notationNote.t),
            keyname: keyname,
            tone: note.tone,
            stroke: note.stroke,
            muting: note.muting,
            duration: n2TO(notationNote.d),
            isLast: ìsLast
        })
    })
    return result
}

// Returns the tempo at the given time in BaseNote units relative to the start of the section.
const getCurrentBPM = (section: Section, relBNTime: number): number => {
    return Math.round(section.tempo[0] + (relBNTime / section.duration) * (section.tempo[1] - section.tempo[0]))
}

// Creates a timeline object for the Player application
export function createTimeline(score: Score | undefined, actionFunctions: ActionFunctions): TimeLine {
    // TimeLine will be used to create the Transport schedule

    if (!score || score == ({} as Score)) return {} as TimeLine
    const timeline: TimeLine = {
        totalDurationSec: 0,
        totalDurationTO: n2TO(0),
        initialBPM: 60, // Update after BPM and velocity have been added to EditorSystemData
        tempoactions: [],
        sampleractions: [],
        animationactions: [],
        playercursoractions: [],
        editorcursoractions: [],
        genericactions: [], // currently only used for final action when playback reaches end of schedule
        notation: {}
    }
    if (!score) return timeline

    var totalDurationInBaseNotes = 0
    const positionScore: { [position: string]: JsonNote[] } = {}
    const positionNotation: { [position: string]: JsonSymbol[] } = {}

    score.systems.forEach((system, sysidx) => {
        system.sections.forEach((section, secidx) => {
            // Update the total duration time
            totalDurationInBaseNotes += section.duration
            timeline.totalDurationSec += ((section.duration / 4) * 60) / (0.5 * (section.tempo[0] + section.tempo[1]))

            // Create sampler actions
            if (actionFunctions.play) {
                for (const [position, measure] of Object.entries(section.staves)) {
                    if (!(position in positionScore)) positionScore[position] = []
                    if (!(position in positionNotation)) positionNotation[position] = []
                    var sectionProgress: number = 0
                    measure.notes?.forEach((note) => {
                        // create separate scores for each position, which will be used to create the animation actions
                        var velocity: number =
                            measure.velocity[0] +
                            (sectionProgress / section.duration) * (measure.velocity[1] - measure.velocity[0])
                        note.v = velocity
                        positionScore[position].push(note)
                        const bpm = getCurrentBPM(section, sectionProgress)
                        if (!actionFunctions.play) return // redundant, this is just to avoid a ts error
                        timeline.sampleractions.push({
                            action: actionFunctions.play,
                            position: position,
                            cleanedSymbol: cleanSymbol(note.s),
                            bpm: bpm,
                            velocity: velocity,
                            time: n2TO(note.t),
                            duration: n2TO(note.d || 1),
                            isLast: sysidx == score.systems.length - 1 && secidx == system.sections.length - 1
                        })
                        sectionProgress += note.d || 1
                    })
                    measure.notation.forEach((symbol: JsonSymbol) => {
                        symbol.sysUuid = system.uuid
                        symbol.sectionId = section.id
                        positionNotation[position].push(symbol)
                    })
                }
            }
        })
    })
    if (actionFunctions.generic)
        timeline.genericactions.push({ action: actionFunctions.generic, time: n2TO(totalDurationInBaseNotes) })

    // Create animation actions
    Object.keys(positionScore).forEach((position) => {
        const notes: JsonNote[] = positionScore[position]
        // Add an animation action for the displacement of the panggul
        // from the starting position to the first note
        if (actionFunctions.animate) {
            timeline.animationactions.push({
                action: actionFunctions.animate,
                time: n2TO(0),
                position: position,
                prevsysUuid: null,
                prevsection: null,
                currnotes: [],
                nextnotes: note2AnimationNotes(position, notes[1], false),
                timeuntil: n2TO(notes[1].t),
                timeuntilMs: notes[1].ms
            })
            notes.forEach((note, index) => {
                const currIsLast: boolean = index == notes.length - 1
                const aNotes: AnimationNote[] = note2AnimationNotes(position, notes[index], currIsLast)
                const nextIsLast: boolean = index == notes.length - 2
                const nextANotes: AnimationNote[] = currIsLast
                    ? []
                    : note2AnimationNotes(position, notes[index + 1], nextIsLast)
                const timeUntil: BaseNoteTimeObj = currIsLast ? n2TO(1000) : n2TO(notes[index + 1].t - note.t)
                const timeUntilMs: number = currIsLast ? defaultOutroTime : notes[index + 1].ms - note.ms
                const prevSystem = index > 0 ? notes[index - 1].sysUuid : null
                const prevSection = index > 0 ? notes[index - 1].section : null
                if (!actionFunctions.animate) return // redundant, this is just to avoid a ts error
                timeline.animationactions.push({
                    action: actionFunctions.animate,
                    time: n2TO(note.t),
                    position: position,
                    prevsysUuid: prevSystem,
                    prevsection: prevSection,
                    currnotes: aNotes,
                    nextnotes: nextANotes,
                    timeuntil: timeUntil,
                    timeuntilMs: timeUntilMs
                })
                // if (timeline.animationactions[timeline.animationactions.length - 1].timeuntilMs < 0)
                // debug(`${position} ${note.system}-${note.section} ${timeUntilMs} [${note.ms} ${notes[index + 1].ms}] [${note.t} ${notes[index + 1].t}] `)
            })
        }
    })

    // Create cursor actions
    if (actionFunctions.playercursor) {
        Object.keys(positionNotation).forEach((position) => {
            timeline.notation[position] = []
            const symbols: JsonSymbol[] = positionNotation[position]
            let currentline: string = ''
            let line: number = 0
            symbols.forEach((symbol, index) => {
                const newSystem = index > 0 ? symbol.sysUuid != symbols[index - 1].sysUuid : false
                const newSection =
                    index > 0 ? !newSystem && (newSystem || symbol.sectionId !== symbols[index - 1].sectionId) : false
                const lastNoteOfSection = index == symbols.length - 1 || symbols[index + 1].sysUuid != symbol.sysUuid

                if (newSection) currentline += ' '
                const range = [currentline.length, currentline.length + symbol.s.length]
                currentline += symbol.s
                if (!actionFunctions.playercursor) return // redundant, this is just to avoid a ts error
                timeline.playercursoractions.push({
                    action: actionFunctions.playercursor,
                    time: n2TO(symbol.t),
                    sysuuid: symbol.sysUuid,
                    section: symbol.sectionId,
                    position: position,
                    symbol: symbol.s,
                    line: line,
                    range: range
                })
                if (lastNoteOfSection) {
                    timeline.notation[position].push(
                        createElement(
                            'p',
                            {
                                key: line,
                                id: `notation-${line}`,
                                className: 'appearance-none p-[0px] m-0 text-sm/6 balifont'
                            },
                            currentline
                        )
                    )
                    currentline = ''
                    line++
                }
            })
        })
    }

    return timeline
}
