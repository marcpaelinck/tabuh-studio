// Builds a pdf-lib-agnostic document model from a Score, for the PDF export.
//
// Phase 1 renders the COMPACT grouped notation: one row per notation group (tag =
// compactGroupLabel), each as a single continuous line of font characters. Beat columns
// come from `System.beatSlices`; the renderer draws green kempli lines at those columns.
// Metadata rows are derived from `System.execution` + `System.label`. The model is
// deliberately decoupled from pdf-lib and from the source (compact/expanded/single
// position) so the renderer and future sources can share it.

import { OCTAVE_MODIFIERS, type InstrumentGroup, type Position } from '@tabuhstudio/shared'
import { getPositionGroups } from '../../config/position-functions'
import type { ExecutionItem, ExecutionItemType, SequenceItem } from '../../typing/execution'
import type { Score, System } from '../../typing/score'
import { compactGroupLabel } from '../../utils/compactGroupLabel'
import { executionItemTooltip } from '../../utils/executionItems'

export type PdfMetaStyle = 'label' | 'tempo' | 'dynamics' | 'goto' | 'loop' | 'sequence'

/** A metadata directive line, placed at a beat column, above or below the notation. */
export interface PdfMetaRow {
    text: string
    /** Column (cell index) where the text is anchored. */
    column: number
    align: 'left' | 'right'
    style: PdfMetaStyle
    /** For `sequence`: the gongan labels (rendered in blue, wrapped with a hanging indent). */
    labels?: string[]
}

/** One notation row: a position/group tag + the full notation line (font characters). */
export interface PdfNotationRow {
    tag: string
    text: string
}

/** One gongan (system) block. */
export interface PdfSystemBlock {
    gonganId: number
    /** Total number of columns (max notation length across rows). */
    columnCount: number
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
    /** Notation source. Only 'compact' is implemented in Phase 1. */
    source?: 'compact'
    /** Execution item types to omit from the metadata rows. */
    excludeExecutionTypes?: ExecutionItemType[]
    /** Positions whose octave diacritics are stripped from the notation text. */
    omitOctaveDiacritics?: Position[]
}

const DEFAULT_OMIT_OCTAVE: Position[] = ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4']

// Metadata that appears ABOVE the notation; everything else (goto/loop/sequence) goes below.
const ABOVE_TYPES: ReadonlySet<ExecutionItemType> = new Set(['tempo', 'dynamics'])
const SHOWN_TYPES: ReadonlySet<ExecutionItemType> = new Set(['tempo', 'dynamics', 'goto', 'loop', 'sequence'])

/** Strips the octave-modifier characters (e.g. `,` `<`) from a notation string. */
function stripOctaveDiacritics(text: string): string {
    const chars = [...OCTAVE_MODIFIERS]
    return chars.length ? text.replace(new RegExp(`[${chars.map(escapeRe).join('')}]`, 'g'), '') : text
}
const escapeRe = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function formatDatestamp(d: Date): string {
    // "d mmm yyyy" lowercased, e.g. "29 jul 2026" — the DB datetime is not on the TS Score
    // model yet, so `now` is used (see the doc's Header note).
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase()
}

export function buildPdfModel(score: Score, opts: BuildPdfOptions = {}): PdfDocumentModel {
    const omit = new Set(opts.omitOctaveDiacritics ?? DEFAULT_OMIT_OCTAVE)
    const exclude = new Set(opts.excludeExecutionTypes ?? [])
    const groups = getPositionGroups(score.instrumenttype)

    const systems: PdfSystemBlock[] = score.systems
        .filter((sys) => (sys.groups?.length ?? 0) > 0)
        .map((sys) => buildSystemBlock(sys, groups, score.instrumenttype, omit, exclude))

    return { title: score.title, composer: score.composer ?? '', datestamp: formatDatestamp(new Date()), systems }
}

function buildSystemBlock(
    sys: System,
    groups: ReturnType<typeof getPositionGroups>,
    orchestra: InstrumentGroup,
    omit: Set<Position>,
    exclude: Set<ExecutionItemType>
): PdfSystemBlock {
    const rows: PdfNotationRow[] = (sys.groups ?? []).map((group) => {
        const { label } = compactGroupLabel(group.positions, groups)
        let text = group.notation.join('')
        if (group.positions.every((p) => omit.has(p))) text = stripOctaveDiacritics(text)
        return { tag: label, text }
    })

    const columnCount = Math.max(0, ...(sys.groups ?? []).map((g) => g.notation.length))

    // Green kempli lines at each beat start — only when kempli is actually on.
    const kempliColumns = sys.kempli.state !== 'off' ? sys.beatSlices.map((s) => s.start) : null

    const above: PdfMetaRow[] = []
    const below: PdfMetaRow[] = []

    for (const item of (sys.execution ?? []) as ExecutionItem[]) {
        if (exclude.has(item.type) || !SHOWN_TYPES.has(item.type)) continue
        const text = executionItemTooltip(item, 'long', orchestra)
        if (!text) continue
        if (ABOVE_TYPES.has(item.type)) {
            // tempo / dynamics: left-aligned (the tooltip already carries the beat numbers).
            above.push({ text, column: 0, align: 'left', style: item.type as PdfMetaStyle })
        } else if (item.type === 'sequence') {
            below.push({ text, column: 0, align: 'left', style: 'sequence', labels: (item as SequenceItem).labels })
        } else {
            // goto / loop — placed below the notation, right-aligned.
            below.push({ text, column: 0, align: 'right', style: item.type as PdfMetaStyle })
        }
    }

    // Label row (blue), above the notation, anchored at the first beat.
    if (sys.label) above.push({ text: sys.label, column: 0, align: 'left', style: 'label' })

    return { gonganId: sys.id, columnCount, kempliColumns, above, rows, below }
}
