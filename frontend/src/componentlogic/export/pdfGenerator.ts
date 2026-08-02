// Renders a PdfDocumentModel to a PDF (pdf-lib), reproducing the gamelan-notation layout:
// per gongan a block of notation rows (tag + continuous BaliMusic line) with green kempli
// lines behind the notes, metadata rows above/below, and a per-page header. See
// CLAUDE.PDF-generator.md.

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { PdfDocumentModel, PdfMetaRow, PdfMetaStyle, PdfSystemBlock } from './pdfModel'

const CM = 28.3465 // pt per cm
const A4: [number, number] = [595.276, 841.89]
const [PAGE_W, PAGE_H] = A4

const LEFT = 0.5 * CM
const RIGHT = 0.5 * CM
const BOTTOM = 1 * CM
const BODY_TOP = 2.1 * CM // reserved for the header
const TAG_W = 2.3 * CM
const SPACE_AFTER = 0.5 * CM
const NOTATION_WEBPAGE = 'https://swarasanti.nl/music-notation/'

const NOTATION_SIZE = 9
const NOTATION_ROW_H = 11
const META_ROW_H = 11
const TAG_SIZE = 8
const ID_SIZE = 7

const BLUE = rgb(0, 0, 1)
const BLACK = rgb(0, 0, 0)
const DARK_RED = rgb(0x80 / 255, 0x34 / 255, 0x0d / 255)
const GREEN = rgb(0, 0.8, 0)
const NOTATION_LEFT = LEFT + TAG_W

interface Fonts {
    bali: PDFFont
    helv: PDFFont
    helvBold: PDFFont
    helvObl: PDFFont
    courier: PDFFont
    courierBold: PDFFont
}

// The standard PDF fonts only encode WinAnsi. Metadata tooltips / titles can contain
// characters outside it (notably `→` in tempo/loop text), which would make `drawText`
// throw. Map the common ones (arrows → the WinAnsi angle quotes `›`/`‹`, which read as
// slim arrows) and replace anything else still out of range.
function winAnsi(s: string): string {
    return (
        s
            .replace(/→/g, '-›')
            .replace(/←/g, '‹-')
            .replace(/↔/g, '‹-›')
            .replace(/[–—]/g, '-')
            .replace(/[’‘]/g, "'")
            .replace(/[“”]/g, '"')
            .replace(/…/g, '...')
            .replace(/×/g, 'x')
            // Keep the WinAnsi angle quotes `‹`/`›` (U+2039/U+203A) we just mapped arrows to;
            // replace anything else outside WinAnsi.
            .replace(/[^\x20-\x7E\xA0-\xFF‹›]/g, '?')
    )
}

function metaFont(style: PdfMetaStyle, f: Fonts): { font: PDFFont; size: number; color: ReturnType<typeof rgb> } {
    switch (style) {
        case 'label':
            return { font: f.courierBold, size: 9, color: BLUE }
        case 'tempo':
        case 'dynamics':
        case 'suppress':
            return { font: f.helvObl, size: 8, color: BLACK }
        case 'goto':
        case 'loop':
            return { font: f.helv, size: 9, color: BLUE }
        case 'sequence':
            return { font: f.helv, size: 9, color: DARK_RED }
    }
}

/** Draws the per-page header (title / composer / page no. / datestamp, hyperlink on page 1). */
function drawHeader(page: PDFPage, pageNo: number, model: PdfDocumentModel, f: Fonts) {
    const hyperY = PAGE_H - 20 // above the title row / separator
    const titleY = PAGE_H - 33
    const composerY = PAGE_H - 43
    const sepY = PAGE_H - 48

    // Hyperlink (page 1 only), raised above the separator line.
    if (pageNo === 1) {
        const label = 'notation explained: ' + NOTATION_WEBPAGE
        const w = f.helv.widthOfTextAtSize(label, 9)
        const x = PAGE_W - RIGHT - w
        page.drawText(label, { x, y: hyperY, size: 9, font: f.helv, color: BLACK })
        const prefixW = f.helv.widthOfTextAtSize('notation explained: ', 9)
        const urlW = f.helv.widthOfTextAtSize(NOTATION_WEBPAGE, 9)
        page.drawLine({
            start: { x: x + prefixW, y: hyperY - 1 },
            end: { x: x + prefixW + urlW, y: hyperY - 1 },
            thickness: 0.4,
            color: BLACK
        })
        addLink(page, x + prefixW, hyperY - 2, urlW, 11, NOTATION_WEBPAGE)
    }

    page.drawText(winAnsi(model.title), { x: LEFT, y: titleY, size: 11, font: f.helvBold, color: DARK_RED })
    // Composer under the title (smaller, black) when available.
    if (model.composer) {
        page.drawText(winAnsi(model.composer), { x: LEFT, y: composerY, size: 8, font: f.helv, color: BLACK })
    }
    const pageStr = String(pageNo)
    const pageW = f.helv.widthOfTextAtSize(pageStr, 11)
    page.drawText(pageStr, { x: (PAGE_W - pageW) / 2, y: titleY, size: 11, font: f.helv, color: BLACK })
    const dateW = f.helv.widthOfTextAtSize(model.datestamp, 9)
    page.drawText(model.datestamp, { x: PAGE_W - RIGHT - dateW, y: titleY, size: 9, font: f.helv, color: BLACK })

    // Separator line under the header.
    page.drawLine({ start: { x: LEFT, y: sepY }, end: { x: PAGE_W - RIGHT, y: sepY }, thickness: 0.5, color: BLACK })
}

function addLink(page: PDFPage, x: number, y: number, w: number, h: number, uri: string) {
    const doc = page.doc
    const annot = doc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, y, x + w, y + h],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) }
    })
    page.node.addAnnot(doc.context.register(annot))
}

export async function generatePdf(model: PdfDocumentModel): Promise<Uint8Array> {
    const ttf = await fetch('/fonts/baliMusic5.ttf').then((r) => r.arrayBuffer())

    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const f: Fonts = {
        bali: await doc.embedFont(ttf),
        helv: await doc.embedFont(StandardFonts.Helvetica),
        helvBold: await doc.embedFont(StandardFonts.HelveticaBold),
        helvObl: await doc.embedFont(StandardFonts.HelveticaOblique),
        courier: await doc.embedFont(StandardFonts.Courier),
        courierBold: await doc.embedFont(StandardFonts.CourierBold)
    }
    doc.setTitle(model.title)
    doc.setAuthor('BaliMusic')

    const cellW = f.bali.widthOfTextAtSize('u', NOTATION_SIZE)

    // Sequence directive: "sequence: " + gongan labels (blue) joined by a slim arrow, wrapped
    // to the page width with the continuation lines hanging-indented under the first label.
    const SEQ_SIZE = 9
    const seqPrefix = 'sequence: '
    const seqSep = '-›'
    const seqPrefixW = f.helv.widthOfTextAtSize(seqPrefix, SEQ_SIZE)
    const seqSepW = f.helv.widthOfTextAtSize(seqSep, SEQ_SIZE)
    const seqMaxRight = PAGE_W - RIGHT
    const seqIndentX = NOTATION_LEFT + seqPrefixW

    // Labels use the same font + size as the system (position) labels.
    const seqLabelFont = f.courierBold
    const seqLabelSize = TAG_SIZE

    const seqLineCount = (labels: string[]): number => {
        let lineX = seqIndentX
        let lines = 1
        labels.forEach((lbl, i) => {
            const need =
                seqLabelFont.widthOfTextAtSize(winAnsi(lbl), seqLabelSize) + (i < labels.length - 1 ? seqSepW : 0)
            if (lineX + need > seqMaxRight && lineX > seqIndentX) {
                lines += 1
                lineX = seqIndentX
            }
            lineX += need
        })
        return lines
    }

    let page = doc.addPage(A4)
    let pageNo = 1
    drawHeader(page, pageNo, model, f)
    let y = PAGE_H - BODY_TOP // top of the body; content flows downward

    const newPage = () => {
        page = doc.addPage(A4)
        pageNo += 1
        drawHeader(page, pageNo, model, f)
        y = PAGE_H - BODY_TOP
    }

    // Sequence: "sequence: " (dark red) + labels (blue) joined by ` › `, wrapped with a
    // hanging indent so the word "sequence" stands out on continuation lines.
    const drawSequence = (labels: string[]) => {
        page.drawText(seqPrefix, { x: NOTATION_LEFT, y: y - SEQ_SIZE, size: SEQ_SIZE, font: f.helv, color: DARK_RED })
        let lineX = seqIndentX
        labels.forEach((lbl, i) => {
            const text = winAnsi(lbl)
            const w = seqLabelFont.widthOfTextAtSize(text, seqLabelSize)
            const sep = i < labels.length - 1 ? seqSep : ''
            const need = w + (sep ? seqSepW : 0)
            if (lineX + need > seqMaxRight && lineX > seqIndentX) {
                y -= META_ROW_H
                lineX = seqIndentX
            }
            const baseline = y - SEQ_SIZE
            page.drawText(text, { x: lineX, y: baseline, size: seqLabelSize, font: seqLabelFont, color: BLUE })
            lineX += w
            if (sep) {
                page.drawText(sep, { x: lineX, y: baseline, size: SEQ_SIZE, font: f.helv, color: DARK_RED })
                lineX += seqSepW
            }
        })
        y -= META_ROW_H
    }

    // Beat-column x helpers (fixed monospaced cell grid).
    const beatLeftX = (sys: PdfSystemBlock, b: number) =>
        NOTATION_LEFT + (sys.beatStarts[Math.min(b, sys.beatStarts.length - 1)] ?? 0) * cellW
    const beatRightX = (sys: PdfSystemBlock, b: number) =>
        NOTATION_LEFT + (sys.beatEnds[Math.min(b, sys.beatEnds.length - 1)] ?? sys.columnCount) * cellW

    type Run = { text: string; font: PDFFont; size: number; color: ReturnType<typeof rgb> }
    type PositionedRun = Run & { x: number }
    type Positioned = { x0: number; x1: number; size: number; runs: PositionedRun[] }
    type MetaLine = { kind: 'metas'; metas: Positioned[] } | { kind: 'seq'; labels: string[] }

    // Lays out one directive's runs at absolute x (no drawing, no y). Gradual tempo/dynamics
    // get a dotted fill across their beat span; right-aligned rows (goto/loop) end at the
    // system's right edge. Returns the occupied x-interval [x0, x1] for row packing.
    const layoutMeta = (row: PdfMetaRow, sys: PdfSystemBlock, systemRight: number): Positioned => {
        const base = metaFont(row.style, f)
        const mk = (text: string, font = base.font, color = base.color): Run => ({
            text: winAnsi(text),
            font,
            size: base.size,
            color
        })
        const runW = (r: Run) => r.font.widthOfTextAtSize(r.text, r.size)

        const runs: Run[] = []
        if (row.style === 'label') {
            runs.push(mk(row.value ?? ''))
        } else if (row.style === 'goto') {
            if (row.prefix) runs.push(mk(row.prefix, f.helv, BLUE))
            ;(row.labels ?? []).forEach((lbl, i) => runs.push(mk((i ? ', ' : '') + lbl, f.courierBold, BLUE)))
            if (row.suffix) runs.push(mk(row.suffix, f.helv, BLUE))
        } else if (row.style === 'loop') {
            if (row.prefix) runs.push(mk(row.prefix, f.helv, BLUE))
            if (row.value) runs.push(mk(row.value, f.helv, BLUE))
            if (row.suffix) runs.push(mk(row.suffix, f.helv, BLUE))
        } else {
            // tempo / dynamics: prefix [dots] value suffix — dots position depends on dotFill.
            const pre: Run[] = []
            const post: Run[] = []
            if (row.dotFill === 'beforeValue') {
                if (row.prefix) pre.push(mk(row.prefix))
                if (row.value) post.push(mk(row.value))
                if (row.suffix) post.push(mk(row.suffix))
            } else {
                if (row.prefix) pre.push(mk(row.prefix))
                if (row.value) pre.push(mk(row.value))
                if (row.suffix) post.push(mk(row.suffix))
            }
            let dots = ''
            if (row.dotFill) {
                const spanW = beatRightX(sys, row.toBeat) - beatLeftX(sys, row.fromBeat)
                const textW = [...pre, ...post].reduce((s, r) => s + runW(r), 0)
                const dw = base.font.widthOfTextAtSize('.', base.size)
                const n = Math.floor((spanW - textW) / dw)
                if (n > 0) dots = '.'.repeat(n)
            }
            runs.push(...pre)
            if (dots) runs.push(mk(dots))
            runs.push(...post)
        }

        const totalW = runs.reduce((s, r) => s + runW(r), 0)
        const x0 = row.align === 'right' ? systemRight - totalW : beatLeftX(sys, row.fromBeat)
        let x = x0
        const positioned: PositionedRun[] = runs.map((r) => {
            const pr = { ...r, x }
            x += runW(r)
            return pr
        })
        return { x0, x1: x, size: base.size, runs: positioned }
    }

    // Packs directives into lines (Phase 2b row merging): a directive joins the current line
    // if its x-interval doesn't overlap (within MERGE_GAP) anything already on it, else it
    // starts a new line. Sequence rows are never packed (they wrap over several lines).
    const MERGE_GAP = 6
    const packLines = (rows: PdfMetaRow[], sys: PdfSystemBlock, systemRight: number): MetaLine[] => {
        const lines: MetaLine[] = []
        let cur: Positioned[] = []
        const flush = () => {
            if (cur.length) lines.push({ kind: 'metas', metas: cur })
            cur = []
        }
        for (const row of rows) {
            if (row.style === 'sequence' && row.labels) {
                flush()
                lines.push({ kind: 'seq', labels: row.labels })
                continue
            }
            const p = layoutMeta(row, sys, systemRight)
            if (cur.some((q) => p.x0 < q.x1 + MERGE_GAP && q.x0 < p.x1 + MERGE_GAP)) {
                flush()
                cur = [p]
            } else cur.push(p)
        }
        flush()
        return lines
    }

    const linesHeight = (lines: MetaLine[]): number =>
        lines.reduce((h, ln) => h + (ln.kind === 'seq' ? seqLineCount(ln.labels) : 1) * META_ROW_H, 0)

    // Draws one packed line at the current y and advances y past it.
    const drawLine = (line: MetaLine) => {
        if (line.kind === 'seq') {
            drawSequence(line.labels)
            return
        }
        const baseline = y - Math.max(...line.metas.map((m) => m.size))
        for (const meta of line.metas)
            for (const r of meta.runs)
                page.drawText(r.text, { x: r.x, y: baseline, size: r.size, font: r.font, color: r.color })
        y -= META_ROW_H
    }

    for (const sys of model.systems) {
        const systemRight = NOTATION_LEFT + sys.columnCount * cellW
        const aboveLines = packLines(sys.above, sys, systemRight)
        const belowLines = packLines(sys.below, sys, systemRight)

        // Keep each gongan together: if it won't fit and this isn't a fresh page, break.
        const blockH =
            linesHeight(aboveLines) + sys.rows.length * NOTATION_ROW_H + linesHeight(belowLines) + SPACE_AFTER
        if (y - blockH < BOTTOM && y < PAGE_H - BODY_TOP - 1) newPage()

        // Metadata above.
        for (const line of aboveLines) drawLine(line)

        // Green kempli lines behind the notation rows, centred on each beat's first symbol
        // (like the editor's grid), not on the symbol's left edge.
        const notationTop = y
        const notationBottom = notationTop - sys.rows.length * NOTATION_ROW_H
        if (sys.kempliColumns) {
            for (const col of sys.kempliColumns) {
                const x = NOTATION_LEFT + (col + 0.5) * cellW
                page.drawLine({
                    start: { x, y: notationBottom },
                    end: { x, y: notationTop },
                    thickness: 1.5,
                    color: GREEN,
                    opacity: 0.5
                })
            }
        }

        // Notation rows.
        sys.rows.forEach((row, idx) => {
            const baseline = y - NOTATION_SIZE
            page.drawText(winAnsi(row.tag), { x: LEFT, y: baseline, size: TAG_SIZE, font: f.helvBold, color: BLACK })
            if (idx === 0) {
                const idStr = String(sys.gonganId)
                const idW = f.courier.widthOfTextAtSize(idStr, ID_SIZE)
                page.drawText(idStr, {
                    x: NOTATION_LEFT - idW - 2,
                    y: baseline,
                    size: ID_SIZE,
                    font: f.courier,
                    color: BLACK
                })
            }
            if (row.text)
                page.drawText(row.text, {
                    x: NOTATION_LEFT,
                    y: baseline,
                    size: NOTATION_SIZE,
                    font: f.bali,
                    color: BLACK
                })
            y -= NOTATION_ROW_H
        })

        // Metadata below.
        for (const line of belowLines) drawLine(line)

        y -= SPACE_AFTER
    }

    return doc.save()
}
