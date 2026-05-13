import _ from 'lodash'
import type { ExecutionItem } from '../typing/execution'

export function executionItemSeqId(item: ExecutionItem) {
    const typeSeq = { loop: 1000, tempo: 2000, dynamics: 3000, wait: 4000, goto: 5000, sequence: 6000, suppress: 7000 }[
        item.type
    ]
    const beatSeq = 100 * ('fromSection' in item ? item.fromSection || item.section : 0)
    const passesSeq = 10 * (_.min(item.passes) || 0)
    const iterSeq = 'iterations' in item ? _.min(item.iterations) || 0 : 0
    return typeSeq + beatSeq + passesSeq + iterSeq
}

// Formats a floating point value as int if the decimals are all 0
function fmtFloat(value: number): number {
    return value == Math.floor(value) ? Math.floor(value) : value
}

function toText(values: number[] | undefined, ordinal: boolean = false): string {
    if (values) {
        var list = values.toSorted((a, b) => a - b).map((val) => `${val}`)
        if (ordinal) list = values.toSorted((a, b) => a - b).map((val) => toOrdinal(val))
        if (list.length > 1) return list.slice(0, -1).join(', ') + ' & ' + _.last(list)
        else return list.join('') // also takes care of empty array
    } else return ''
}

function toOrdinal(val: number): string {
    switch (val) {
        case 1:
            return `1st`
        case 2:
            return `2nd`
        case 3:
            return `3rd`
        default:
            return `${val}th`
    }
}

export function executionItemTooltip(item: ExecutionItem, length: 'short' | 'long'): string {
    const nbrOfPasses = !item.passes ? 0 : item.passes.length
    // const maxPassNr = !item.passes ? 0 : Math.max(...item.passes)
    const sortedPasses = item.passes ? item.passes.sort() : []
    const sortedIterations = 'iterations' in item && item.iterations ? item.iterations.sort() : []
    // Create components for the values to return.
    var instruction: string = ''
    var preposition: string = ''
    var shortTooltip: string = ''
    item.seqId = executionItemSeqId(item) // TODO move outside of this function
    switch (item.type) {
        case 'goto': {
            shortTooltip = item.targetname
            instruction = `go to ${item.targetname}`
            preposition = 'after'
            break
        }
        case 'loop': {
            shortTooltip = `${item.count}X`
            instruction = `play ${item.count}X`
            preposition = 'on'
            break
        }
        case 'wait': {
            shortTooltip = `${item.seconds} sec.`
            instruction = `wait ${fmtFloat(item.seconds)} ${item.seconds > 1 ? 'seconds' : 'second'}`
            preposition = 'after'
            break
        }
        case 'tempo':
        case 'dynamics': {
            const current = length == 'long' ? 'current' : ''
            const itemtype = length == 'long' ? `${item.type} ` : ''
            if (item.type == 'tempo') {
                const isGradual = item.isGradual && item.fromValue != item.value
                shortTooltip = `${itemtype}${isGradual ? (!item.fromValue ? `${current}→` : item.fromValue + '→') : ''}${item.value} BPM`
            } else {
                const isGradual = item.isGradual && item.fromDynamics != item.dynamics
                shortTooltip = `${itemtype}${isGradual ? (!item.fromDynamics ? `${current}→` : item.fromDynamics + '→') : ''}${item.dynamics}`
            }
            const multipleSections = item.isGradual && item.fromSection != item.section
            const startFromSection1 = !item.isGradual && !item.fromSection && item.section == 1
            if (startFromSection1) {
                instruction = shortTooltip
            } else {
                instruction =
                    shortTooltip +
                    ` beat ${multipleSections ? (!item.fromSection ? '1→' : item.fromSection + '→') : ''}${item.section}`
            }
            preposition = 'on'
            break
        }
    }
    if (length == 'short') return shortTooltip

    var loopcondition = ''
    var andloopcondition = ''
    if (sortedIterations.length > 0) {
        const loopcond = `${toText(sortedIterations, true)} ${sortedIterations.length > 1 ? 'iterations' : 'iteration'}`
        loopcondition = ' ' + preposition + ' ' + loopcond
        andloopcondition = ', ' + loopcond
    }
    // Compose the long tooltip version
    switch (true) {
        case !nbrOfPasses:
            return `${instruction}${loopcondition}`
        case nbrOfPasses && !item.nthpass:
            return `${instruction} ${preposition} ${nbrOfPasses > 1 ? 'passes' : 'pass'} ${toText(item.passes)}${andloopcondition}`
        case nbrOfPasses && item.nthpass:
            return `${instruction} ${preposition} every ${toText(sortedPasses, true)} ${nbrOfPasses > 1 ? 'passes' : 'pass'}${andloopcondition}`
        default:
            return `Invalid combination: missing one or more pass numbers.`
    }
}
