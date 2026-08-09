// MIDI note-map PDF.
//
// Companion to the MIDI export: a reference sheet that maps every MIDI pitch in the exported
// file back to its Tabuh Studio note and notation symbol(s), grouped **per instrument** (the
// pitch mapping and GM program are both per instrument, so several positions of the same
// instrument — e.g. the four reyong — share one block). It lets a DAW user tell which MIDI
// note is which gamelan note.
//
// Pure builder (`buildMidiNoteMapModel`) + pdf-lib renderer (`generateMidiNoteMapPdf`).

import type { Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Instrument } from '@tabuhstudio/shared/types/position'
import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { gmProgram } from '../playback/midiGenerator'
import { instrumentNoteMapRows } from '../playback/pitchMap'

// Display names for the instruments (the `Instrument` enum values are upper-cased ids).
const INSTRUMENT_NAMES: Record<Instrument, string> = {
    UGAL: 'Ugal',
    GENDER_RAMBAT: 'Gender rambat',
    TROMPONG: 'Trompong',
    PEMADE: 'Pemade',
    KANTILAN: 'Kantilan',
    REYONG: 'Reyong',
    PENYACAH: 'Penyacah',
    CALUNG: 'Calung',
    JEGOGAN: 'Jegogan',
    GONGS: 'Gongs',
    CENGCENG: 'Cengceng',
    CENGCENG_KOPYAK: 'Cengceng kopyak',
    KENDANG: 'Kendang',
    KEMPLI: 'Kempli',
    REYONGB: 'Reyong (baleganjur)',
    PONGGANG: 'Ponggang',
    TAWATAWA: 'Tawa tawa'
}

// GM program names (0-based) for the programs the exporter uses; falls back to "Program N".
const GM_NAMES: Record<number, string> = {
    8: 'Celesta',
    9: 'Glockenspiel',
    10: 'Music Box',
    11: 'Vibraphone',
    12: 'Marimba',
    13: 'Xylophone',
    14: 'Tubular Bells',
    15: 'Dulcimer',
    47: 'Timpani',
    112: 'Tinkle Bell',
    113: 'Agogo',
    114: 'Steel Drums',
    115: 'Woodblock',
    116: 'Taiko Drum',
    117: 'Melodic Tom',
    118: 'Synth Drum',
    119: 'Reverse Cymbal',
    126: 'Applause'
}
const gmName = (program: number): string => GM_NAMES[program] ?? `Program ${program + 1}`

export interface MidiNoteMapRow {
    midi: number
    pitch: string // scientific name, e.g. "C1"
    note: string // Tabuh note name, e.g. "DING1"
    symbols: string // notation symbol(s) producing this pitch
}

/** One block of the note map — a whole instrument. */
export interface MidiNoteMapInstrument {
    instrument: Instrument
    name: string
    gmProgram: number // 0-based
    gmName: string
    rows: MidiNoteMapRow[]
}

export interface MidiNoteMapModel {
    title: string
    datestamp: string
    instruments: MidiNoteMapInstrument[]
}

function formatDatestamp(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase()
}

/**
 * Builds the note-map model from the exported track positions: one block per distinct
 * instrument (in first-seen track order), each showing the instrument's full pooled note
 * range with its instrument-consistent MIDI numbers.
 */
export function buildMidiNoteMapModel(scoreTitle: string, positions: Position[]): MidiNoteMapModel {
    const instruments: MidiNoteMapInstrument[] = []
    const seen = new Set<Instrument>()
    for (const position of positions) {
        const instrument = positionConfigs[position]?.instrument
        if (!instrument || seen.has(instrument)) continue
        seen.add(instrument)
        const program = gmProgram(position)
        instruments.push({
            instrument,
            name: INSTRUMENT_NAMES[instrument] ?? instrument,
            gmProgram: program,
            gmName: gmName(program),
            rows: instrumentNoteMapRows(instrument)
        })
    }
    return { title: scoreTitle, datestamp: formatDatestamp(new Date()), instruments }
}

// ---- Rendering ----

const A4: [number, number] = [595.276, 841.89]
const [PAGE_W, PAGE_H] = A4
const LEFT = 40
const RIGHT = 40
const BOTTOM = 40
const BODY_TOP = 74 // reserved for the header
const NOTATION_WEBPAGE = 'https://swarasanti.nl/music-notation/'

const COLS = 2
const COL_GAP = 24
const COL_W = (PAGE_W - LEFT - RIGHT - (COLS - 1) * COL_GAP) / COLS
const COL_X = (i: number): number => LEFT + i * (COL_W + COL_GAP)

const HEAD_H = 15
const ROW_H = 9.5
const BLOCK_GAP = 12
const HEAD_SIZE = 9
const ROW_SIZE = 7.5

const BLUE = rgb(0, 0, 1)
const BLACK = rgb(0, 0, 0)
const GREY = rgb(0.4, 0.4, 0.4)
const DARK_RED = rgb(0x80 / 255, 0x34 / 255, 0x0d / 255)

// The standard PDF fonts only encode WinAnsi; replace anything outside it.
const winAnsi = (s: string): string =>
    (s ?? '')
        .replace(/[–—]/g, '-')
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

// Column x-offsets within a track block (relative to the block's left edge). The note
// column is wide enough for the longest Tabuh names (e.g. "XDUNG0_MUTED").
const C_MIDI_R = 24 // right edge for the right-aligned MIDI number
const C_PITCH = 30
const C_NOTE = 58
const C_SYMBOL = 128

function addLink(doc: PDFDocument, page: PDFPage, x: number, y: number, w: number, h: number, uri: string): void {
    const annot = doc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, y, x + w, y + h],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) }
    })
    page.node.addAnnot(doc.context.register(annot))
}

const blockHeight = (t: MidiNoteMapInstrument): number => HEAD_H + t.rows.length * ROW_H

/** Truncates text to fit `maxW` at `size` in `font`, appending "…" when clipped. */
function fit(text: string, font: PDFFont, size: number, maxW: number): string {
    if (font.widthOfTextAtSize(text, size) <= maxW) return text
    let s = text
    while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > maxW) s = s.slice(0, -1)
    return s + '…'
}

/** Renders the note-map model to PDF bytes. */
export async function generateMidiNoteMapPdf(model: MidiNoteMapModel): Promise<Uint8Array> {
    const doc = await PDFDocument.create()
    const helv = await doc.embedFont(StandardFonts.Helvetica)
    const helvBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const courier = await doc.embedFont(StandardFonts.Courier)

    let page = doc.addPage(A4)
    let pageNo = 1

    const drawHeader = (p: PDFPage, no: number): void => {
        if (no === 1) {
            const lbl = 'notation explained: ',
                url = NOTATION_WEBPAGE
            const lw = helv.widthOfTextAtSize(lbl, 9),
                uw = helv.widthOfTextAtSize(url, 9)
            const x = PAGE_W - RIGHT - lw - uw,
                y = PAGE_H - 18
            p.drawText(lbl, { x, y, size: 9, font: helv, color: BLACK })
            p.drawText(url, { x: x + lw, y, size: 9, font: helv, color: BLACK })
            p.drawLine({
                start: { x: x + lw, y: y - 1 },
                end: { x: x + lw + uw, y: y - 1 },
                thickness: 0.4,
                color: BLACK
            })
            addLink(doc, p, x + lw, y - 2, uw, 11, url)
        }
        const titleY = PAGE_H - 32
        p.drawText(winAnsi(`MIDI note map: ${model.title}`), {
            x: LEFT,
            y: titleY,
            size: 12,
            font: helvBold,
            color: DARK_RED
        })
        const ps = String(no),
            pw = helv.widthOfTextAtSize(ps, 11)
        p.drawText(ps, { x: (PAGE_W - pw) / 2, y: titleY, size: 11, font: helv, color: BLACK })
        const dw = helv.widthOfTextAtSize(model.datestamp, 9)
        p.drawText(model.datestamp, { x: PAGE_W - RIGHT - dw, y: titleY, size: 9, font: helv, color: BLACK })
        const note = 'Nominal 12-TET pitches (not true pelog/slendro tuning). MIDI note number: C4 = 60.'
        p.drawText(note, { x: LEFT, y: PAGE_H - 46, size: 7.5, font: helv, color: GREY })
        p.drawLine({
            start: { x: LEFT, y: PAGE_H - 52 },
            end: { x: PAGE_W - RIGHT, y: PAGE_H - 52 },
            thickness: 0.5,
            color: BLACK
        })
    }

    drawHeader(page, pageNo)
    const colTop = PAGE_H - BODY_TOP
    let col = 0
    let y = colTop

    const newPage = (): void => {
        page = doc.addPage(A4)
        pageNo++
        drawHeader(page, pageNo)
        col = 0
        y = colTop
    }

    const drawBlock = (x: number, top: number, t: MidiNoteMapInstrument): void => {
        page.drawText(winAnsi(`${t.name}  ·  GM ${t.gmProgram + 1} ${t.gmName}`), {
            x,
            y: top - HEAD_SIZE,
            size: HEAD_SIZE,
            font: helvBold,
            color: BLUE
        })
        let ry = top - HEAD_H
        for (const row of t.rows) {
            const baseline = ry - ROW_SIZE + 1.5
            const midiStr = String(row.midi)
            page.drawText(midiStr, {
                x: x + C_MIDI_R - courier.widthOfTextAtSize(midiStr, ROW_SIZE),
                y: baseline,
                size: ROW_SIZE,
                font: courier,
                color: BLACK
            })
            page.drawText(row.pitch, { x: x + C_PITCH, y: baseline, size: ROW_SIZE, font: courier, color: GREY })
            page.drawText(row.note, { x: x + C_NOTE, y: baseline, size: ROW_SIZE, font: helv, color: BLACK })
            page.drawText(fit(winAnsi(row.symbols), courier, ROW_SIZE, COL_W - C_SYMBOL), {
                x: x + C_SYMBOL,
                y: baseline,
                size: ROW_SIZE,
                font: courier,
                color: DARK_RED
            })
            ry -= ROW_H
        }
    }

    for (const t of model.instruments) {
        const h = blockHeight(t)
        if (y - h < BOTTOM && y < colTop) {
            col++
            if (col >= COLS) newPage()
            else y = colTop
        }
        drawBlock(COL_X(col), y, t)
        y -= h + BLOCK_GAP
    }

    return doc.save()
}
