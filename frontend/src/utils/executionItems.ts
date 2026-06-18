import _ from 'lodash'
import { positionConfigs } from '../config/config'
import type { Position } from '../typing/basetypes'
import type { ExecutionItem } from '../typing/execution'

export function executionItemSeqId(item: ExecutionItem) {
    const typeSeq = {
        loop: 1000,
        tempo: 2000,
        dynamics: 3000,
        wait: 4000,
        goto: 5000,
        sequence: 6000,
        suppress: 7000,
        kempli: 8000
    }[item.type]
    const beatSeq = 100 * ('fromBeat' in item ? (item.fromBeat ?? 0) || (item.toBeat ?? 0) : 0)
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

function positionsText(positions: Position[] | undefined): string {
    if (!positions || positions.length === 0) return 'all positions'
    return positions.map((p) => positionConfigs[p]?.name ?? p).join(', ')
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
        case 'sequence': {
            const seq = item.labels.join(' → ')
            shortTooltip =
                `seq:${item.labels.slice(0, Math.min(3, item.labels.length)).join('→')}` +
                (item.labels.length > 3 ? '...' : '')
            instruction = `play sequence ${seq}`
            preposition = 'after'
            break
        }
        case 'suppress': {
            const beatsText = item.beats && item.beats.length ? ` on beat ${toText(item.beats)}` : ''
            shortTooltip = `suppress ${positionsText(item.positions)}`
            instruction = `suppress ${positionsText(item.positions)}${beatsText}`
            preposition = 'on'
            break
        }
        case 'kempli': {
            const beatsText = item.beats && item.beats.length ? ` on beat ${toText(item.beats)}` : ''
            shortTooltip = `kempli ${item.value}`
            instruction = `kempli ${item.value}${beatsText}`
            preposition = 'on'
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
            const multipleSections = item.isGradual && item.fromBeat != item.toBeat
            const startFromSection1 = !item.isGradual && item.fromBeat == 1
            if (startFromSection1) {
                instruction = shortTooltip
            } else {
                instruction = shortTooltip + ` beat ${item.fromBeat}${multipleSections ? '→' + item.toBeat : ''}`
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
