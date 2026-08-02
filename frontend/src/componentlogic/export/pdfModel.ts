// Builds a pdf-lib-agnostic document model from a Score, for the PDF export.
//
// Renders the COMPACT grouped notation: one row per notation group (tag = compactGroupLabel),
// each as a single continuous line of font characters. Beat columns come from
// `System.beatSlices`; the renderer draws green kempli lines at those columns.
//
// Phase 2a — metadata fidelity: metadata directives are anchored at their beat columns and
// carry structured runs (prefix / value / labels / suffix) so the renderer can place, span
// and dot-fill them. Tempo is phrased as "faster"/"slower" (Python `gamelan-notation`
// style): the "current" tempo before each change is taken from the actual execution flow
// (`executionManager`), the initial tempo is suppressed, and — when the same item resolves
// to different verdicts on different passes/iterations — it is split into one directive per
// group (each carrying a `(pass …, iter. …)` suffix). Dynamics show `<tags>: <value>`.

import { OCTAVE_MODIFIERS, type Position } from '@tabuhstudio/shared'
import { defaultTempo } from '../../config/config'
import { getPositionGroups } from '../../config/position-functions'
import type {
    DynamicsItem,
    ExecutionItem,
    ExecutionItemType,
    ExpressionItem,
    GotoItem,
    LoopItem,
    SequenceItem,
    SuppressItem,
    TempoItem
} from '../../typing/execution'
import type { Score, System } from '../../typing/score'
import { compactGroupLabel } from '../../utils/compactGroupLabel'
import { executionManager } from '../playback/executionManager'

export type PdfMetaStyle = 'label' | 'tempo' | 'dynamics' | 'goto' | 'loop' | 'sequence' | 'suppress'

/**
 * A metadata directive line. It is anchored to a beat span (`fromBeat`..`toBeat`, 0-based
 * indices into the system's beatSlices) and rendered as a sequence of runs:
 * `prefix` + [dots] + `value` + `labels` + `suffix`. `dotFill` requests a dotted fill for
 * gradual tempo/dynamics.
 */
export interface PdfMetaRow {
    style: PdfMetaStyle
    align: 'left' | 'right'
    fromBeat: number
    toBeat: number
    prefix?: string
    value?: string
    suffix?: string
    /** Labels rendered in the label (blue Courier-Bold) style: goto target / sequence list. */
    labels?: string[]
    /** Gradual fill: 'after' (tempo → after the word) or 'beforeValue' (dynamics → before value). */
    dotFill?: 'after' | 'beforeValue'
}

/** One notation row: a position/group tag + the full notation line (font characters). */
export interface PdfNotationRow {
    tag: string
    text: string
}

/** One gongan (system) block. */
export interface PdfSystemBlock {
    gonganId: number
    columnCount: number
    /** Beat column boundaries (cell indices), for anchoring metadata and kempli lines. */
    beatStarts: number[]
    beatEnds: number[]
    /** Columns at which to draw green kempli lines, or null when kempli is off. */
    kempliColumns: number[] | null
    above: PdfMetaRow[]
    rows: PdfNotationRow[]
    below: PdfMetaRow[]
}

export interface PdfDocumentModel {
    title: string
    composer: string
    datestamp: string
    systems: PdfSystemBlock[]
}

export interface BuildPdfOptions {
    /** Notation source. Only 'compact' is implemented. */
    source?: 'compact'
    /** Execution item types to omit from the metadata rows. */
    excludeExecutionTypes?: ExecutionItemType[]
    /** Positions whose octave diacritics are stripped from the notation text. */
    omitOctaveDiacritics?: Position[]
}

const DEFAULT_OMIT_OCTAVE: Position[] = ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4']
const SHOWN_TYPES: ReadonlySet<ExecutionItemType> = new Set([
    'tempo',
    'dynamics',
    'goto',
    'loop',
    'sequence',
    'suppress'
])

/** Strips the octave-modifier characters (e.g. `,` `<`) from a notation string. */
function stripOctaveDiacritics(text: string): string {
    const chars = [...OCTAVE_MODIFIERS]
    return chars.length ? text.replace(new RegExp(`[${chars.map(escapeRe).join('')}]`, 'g'), '') : text
}
const escapeRe = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function formatDatestamp(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase()
}

/** Formats a `(pass …, iter. …)` suffix; empty when there are no positive pass/iteration ids. */
function conditionSuffix(passes?: number[], iterations?: number[]): string {
    const ps = (passes ?? []).filter((p) => p > 0)
    const is = (iterations ?? []).filter((i) => i > 0)
    const parts: string[] = []
    if (ps.length) parts.push(`pass ${[...new Set(ps)].sort((a, b) => a - b).join(',')}`)
    if (is.length) parts.push(`iter. ${[...new Set(is)].sort((a, b) => a - b).join(',')}`)
    return parts.length ? ` (${parts.join(', ')})` : ''
}

/** Mirrors executionManager's pass/iteration matching, to detect item applications in the flow. */
function itemApplies(item: ExecutionItem, pass: number, iteration: number): boolean {
    const iterationMatches =
        !('iterations' in item) ||
        !(item as ExpressionItem).iterations ||
        (item as ExpressionItem).iterations!.length === 0 ||
        (item as ExpressionItem).iterations!.includes(iteration)
    if (!iterationMatches) return false
    const passMatches = !item.passes || item.passes.length === 0 || item.passes.includes(pass)
    if (!item.nthpass && passMatches) return true
    if (item.nthpass && item.passes && item.passes.length > 0) {
        const maxPassNr = Math.max(...item.passes)
        if (item.passes.includes(((pass - 1) % maxPassNr) + 1)) return true
    }
    return false
}

type TempoOccurrence = { pass: number; iteration: number; before: number }

/**
 * Walks the execution flow once and records, per tempo item, every application (pass /
 * iteration) together with the tempo in effect just before it. The first application in the
 * flow establishes the starting tempo and is not recorded (nothing to compare against).
 */
function collectTempoOccurrences(score: Score): Map<TempoItem, TempoOccurrence[]> {
    const occ = new Map<TempoItem, TempoOccurrence[]>()
    let running = defaultTempo
    let establishedInitial = false
    try {
        const { nextInFlow } = executionManager(score, 'multiple', 0, 1)
        let step = nextInFlow()
        let guard = 0
        while (step && guard++ < 20000) {
            const beatNbr = step.beatIdx + 1
            const before = running
            for (const item of (step.system.execution ?? []) as ExecutionItem[]) {
                if (item.type !== 'tempo') continue
                const tempo = item as TempoItem
                if (tempo.fromBeat !== beatNbr) continue
                if (!itemApplies(tempo, step.pass, step.iteration)) continue
                if (!establishedInitial) {
                    establishedInitial = true // the opening tempo — suppressed
                    continue
                }
                const list = occ.get(tempo)
                if (list) list.push({ pass: step.pass, iteration: step.iteration, before })
                else occ.set(tempo, [{ pass: step.pass, iteration: step.iteration, before }])
            }
            running = step.tempo[1]
            step = nextInFlow()
        }
    } catch {
        // A malformed / cyclic score can make the flow throw or loop; degrade to no tempo rows.
    }
    return occ
}

type Verdict = 'faster' | 'slower'

function tempoVerdict(item: TempoItem, before: number): Verdict | null {
    // Gradual with an explicit fromValue compares against that; otherwise against the
    // flow's current tempo (`before`).
    const from = item.isGradual && item.fromValue != null ? item.fromValue : before
    return item.value > from ? 'faster' : item.value < from ? 'slower' : null
}

/** Builds the tempo directive rows per system index from the collected flow occurrences. */
function buildTempoRowsBySystem(score: Score): Map<number, PdfMetaRow[]> {
    const bySystem = new Map<number, PdfMetaRow[]>()
    const occurrences = collectTempoOccurrences(score)
    const systemIndexOf = new Map<TempoItem, number>()
    for (const sys of score.systems)
        for (const item of (sys.execution ?? []) as ExecutionItem[])
            if (item.type === 'tempo') systemIndexOf.set(item as TempoItem, sys.index)

    for (const [item, occs] of occurrences) {
        const verdicts = occs
            .map((o) => ({ ...o, v: tempoVerdict(item, o.before) }))
            .filter((o): o is TempoOccurrence & { v: Verdict } => o.v !== null)
        if (verdicts.length === 0) continue

        const distinct = new Set(verdicts.map((o) => o.v))
        const rows: { value: Verdict; suffix: string }[] = []
        if (distinct.size === 1) {
            // Consistent verdict → one directive with the item's declared conditions.
            rows.push({ value: [...distinct][0], suffix: conditionSuffix(item.passes, item.iterations) })
        } else {
            // Conflicting verdicts → one directive per verdict group, labelled only with the
            // dimension(s) (pass and/or iteration) that actually distinguish the groups.
            const groups = [...distinct].map((v) => ({ v, occ: verdicts.filter((o) => o.v === v) }))
            const key = (nums: number[]) => [...new Set(nums)].sort((a, b) => a - b).join(',')
            const passVaries = new Set(groups.map((g) => key(g.occ.map((o) => o.pass)))).size > 1
            const iterVaries = new Set(groups.map((g) => key(g.occ.map((o) => o.iteration)))).size > 1
            for (const g of groups) {
                const passes = passVaries || !iterVaries ? g.occ.map((o) => o.pass) : []
                const iters = iterVaries ? g.occ.map((o) => o.iteration) : []
                rows.push({ value: g.v, suffix: conditionSuffix(passes, iters) })
            }
        }

        const from = Math.max(0, item.fromBeat - 1)
        const to = item.isGradual && item.toBeat ? Math.max(from, item.toBeat - 1) : from
        const sysIdx = systemIndexOf.get(item) ?? 0
        const list = bySystem.get(sysIdx) ?? []
        for (const r of rows)
            list.push({
                style: 'tempo',
                align: 'left',
                fromBeat: from,
                toBeat: to,
                value: r.value,
                suffix: r.suffix || undefined,
                dotFill: to > from ? 'after' : undefined
            })
        bySystem.set(sysIdx, list)
    }
    return bySystem
}

export function buildPdfModel(score: Score, opts: BuildPdfOptions = {}): PdfDocumentModel {
    const omit = new Set(opts.omitOctaveDiacritics ?? DEFAULT_OMIT_OCTAVE)
    const exclude = new Set(opts.excludeExecutionTypes ?? [])
    const groups = getPositionGroups(score.instrumenttype)
    const tempoRowsBySystem = exclude.has('tempo') ? new Map<number, PdfMetaRow[]>() : buildTempoRowsBySystem(score)

    const systems: PdfSystemBlock[] = score.systems
        .filter((sys) => (sys.groups?.length ?? 0) > 0)
        .map((sys) => buildSystemBlock(sys, groups, omit, exclude, tempoRowsBySystem.get(sys.index) ?? []))

    return { title: score.title, composer: score.composer ?? '', datestamp: formatDatestamp(new Date()), systems }
}

function buildSystemBlock(
    sys: System,
    groups: ReturnType<typeof getPositionGroups>,
    omit: Set<Position>,
    exclude: Set<ExecutionItemType>,
    tempoRows: PdfMetaRow[]
): PdfSystemBlock {
    const rows: PdfNotationRow[] = (sys.groups ?? []).map((group) => {
        const { label } = compactGroupLabel(group.positions, groups)
        let text = group.notation.join('')
        if (group.positions.every((p) => omit.has(p))) text = stripOctaveDiacritics(text)
        return { tag: label, text }
    })

    const columnCount = Math.max(0, ...(sys.groups ?? []).map((g) => g.notation.length))
    const beatStarts = sys.beatSlices.map((s) => s.start)
    const beatEnds = sys.beatSlices.map((s) => s.end)
    const kempliColumns = sys.kempli.state !== 'off' ? beatStarts : null
    const lastBeat = Math.max(0, sys.beatSlices.length - 1)
    const beatIdx = (beat1: number) => Math.min(Math.max(0, beat1 - 1), lastBeat)

    // Collect the metadata by kind, then order the ABOVE block as: label first, then
    // suppress, then tempo (from the flow) and dynamics last.
    const labelRows: PdfMetaRow[] = sys.label
        ? [{ style: 'label', align: 'left', fromBeat: 0, toBeat: 0, value: sys.label }]
        : []
    const suppressRows: PdfMetaRow[] = []
    const dynamicsRows: PdfMetaRow[] = []
    const gotoRows: PdfMetaRow[] = []
    const loopRows: PdfMetaRow[] = []
    const sequenceRows: PdfMetaRow[] = []

    for (const item of (sys.execution ?? []) as ExecutionItem[]) {
        if (exclude.has(item.type) || !SHOWN_TYPES.has(item.type)) continue
        if (item.type === 'dynamics') {
            const d = item as DynamicsItem
            const tags = d.positions.length ? compactGroupLabel(d.positions, groups, true).label : ''
            const from = beatIdx(d.fromBeat)
            const to = d.isGradual && d.toBeat ? Math.max(from, beatIdx(d.toBeat)) : from
            dynamicsRows.push({
                style: 'dynamics',
                align: 'left',
                fromBeat: from,
                toBeat: to,
                prefix: tags ? `${tags}: ` : '',
                value: d.dynamics,
                suffix: conditionSuffix(d.passes, d.iterations) || undefined,
                dotFill: to > from ? 'beforeValue' : undefined
            })
        } else if (item.type === 'suppress') {
            const s = item as SuppressItem
            const tags = s.positions && s.positions.length ? compactGroupLabel(s.positions, groups, true).label : 'all'
            const from = s.beats && s.beats.length ? beatIdx(Math.min(...s.beats)) : 0
            suppressRows.push({
                style: 'suppress',
                align: 'left',
                fromBeat: from,
                toBeat: from,
                prefix: 'suppress ',
                value: tags,
                suffix: conditionSuffix(s.passes, s.iterations) || undefined
            })
        } else if (item.type === 'goto') {
            const g = item as GotoItem
            gotoRows.push({
                style: 'goto',
                align: 'right',
                fromBeat: lastBeat,
                toBeat: lastBeat,
                prefix: 'go to ',
                labels: [g.targetname],
                suffix: conditionSuffix(g.passes) || undefined
            })
        } else if (item.type === 'loop') {
            const l = item as LoopItem
            loopRows.push({
                style: 'loop',
                align: 'right',
                fromBeat: lastBeat,
                toBeat: lastBeat,
                prefix: 'play ',
                value: `${l.count}X`,
                suffix: conditionSuffix(l.passes) || undefined
            })
        } else if (item.type === 'sequence') {
            sequenceRows.push({
                style: 'sequence',
                align: 'left',
                fromBeat: 0,
                toBeat: lastBeat,
                prefix: 'sequence: ',
                labels: (item as SequenceItem).labels
            })
        }
    }

    // ABOVE: label first, then suppress, then tempo + dynamics last.
    const above: PdfMetaRow[] = [
        ...labelRows,
        ...suppressRows,
        ...(exclude.has('tempo') ? [] : tempoRows),
        ...dynamicsRows
    ]
    // BELOW order mirrors the Python: loop, goto, sequence.
    const below: PdfMetaRow[] = [...loopRows, ...gotoRows, ...sequenceRows]

    return { gonganId: sys.id, columnCount, beatStarts, beatEnds, kempliColumns, above, rows, below }
}
