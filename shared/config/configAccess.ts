/**
 * Config access layer (refactor step 1 — see CLAUDE.refactor-configuration-settings.md).
 *
 * A thin, behaviour-preserving façade over the raw configuration constants (`positionConfigs`,
 * `orchestraConfigs`). Consumers call these accessors instead of indexing the constants directly,
 * so a later step can change the *source* of a slice (constants → normalized tables → DB) without
 * touching consumers. This step deliberately makes NO shape change: every accessor returns exactly
 * what the corresponding field returns today.
 */

import type { NoteSymbol } from '../types/basetypes.ts'
import type { Instrument, Orchestra, Position, PositionConfig } from '../types/position.ts'
import { orchestraPositions } from '../utils/position.ts'
import { positionConfigs } from './position.ts'

// ── Logical position properties ──────────────────────────────────────────────
export const hasPosition = (p: Position): boolean => p in positionConfigs
export const getPositionConfig = (p: Position): PositionConfig => positionConfigs[p]
export const getPositionName = (p: Position): string => positionConfigs[p]?.name ?? p
export const getPositionInstrument = (p: Position): Instrument | undefined => positionConfigs[p]?.instrument
/** Instrument category ('percussion' | 'daun' | 'chimes'); retired in a later step (→ note/stroke). */
export const getPositionType = (p: Position): string => positionConfigs[p]?.type

// ── Rendering ────────────────────────────────────────────────────────────────
export const getPositionSvgFile = (p: Position): string => positionConfigs[p]?.svg_file ?? ''

// ── Symbols / voicing (currently `symbolToNoteNames`) ────────────────────────
/** The whole symbol → shorthand-note-codes map for a position (used to build sampler lookups). */
export const getSymbolToNoteNames = (p: Position): { [symbol: string]: string[] } =>
    positionConfigs[p].symbolToNoteNames
/** Valid symbols for a position (= keys of its voicing). */
export const getValidSymbols = (p: Position): NoteSymbol[] =>
    Object.keys(positionConfigs[p].symbolToNoteNames) as NoteSymbol[]
/** The shorthand note code(s) a symbol maps to on a position (empty when the symbol is not playable). */
export const getShorthandCodes = (p: Position, symbol: string): string[] =>
    positionConfigs[p].symbolToNoteNames[symbol] ?? []
/** Whether a symbol is playable on a position. */
export const positionHasSymbol = (p: Position, symbol: string): boolean =>
    symbol in positionConfigs[p].symbolToNoteNames

// ── Orchestra membership / order ─────────────────────────────────────────────
/** Positions of an orchestra in the system-default order (delegates to the existing util). */
export const getOrchestraPositions = (orchestra: Orchestra | undefined | null): Position[] =>
    orchestraPositions(orchestra)

/** Every configured position (across all orchestras). Iteration seam for building per-position maps. */
export const getAllPositions = (): Position[] => Object.keys(positionConfigs) as Position[]
