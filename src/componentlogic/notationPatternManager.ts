// Converts (shorthand) symbols that represent a sequence of base notes to the corresponding base note symbols.

import { MutingChars } from '../config/config'
import type { NoteSymbol } from '../typing/basetypes'
import type { Position } from '../typing/instruments'
import type { Measure } from '../typing/score'
import { splitTone } from '../utils/alphabet'
import { getPatternType } from '../utils/patterns'

type NorotSubPattern = 'ngubeng' | 'majalan'
type NorotType = 'homophonic' | 'kotekan'

type NorotDefinition = Partial<
    Record<
        Position,
        Record<NoteSymbol, Record<NorotType, Record<NorotSubPattern, NoteSymbol[]> & { basenote: NoteSymbol }>>
    >
>

// prettier-ignore
const patterns = {
    norot:
        // NOROT: a single norot symbol stands for a 4-note norot subpattern (ngubeng, majalan). The pattern logic will determine which pattern
        //        should be created. See Tenzer, Gamelan Gong Keybar, p. 215ff.
        {
            size: 4, // Number of notes in a subpattern
            patterns: {
                // ngubeng and majalan patterns. '?' stands for the previous base note, the current base if the pattern occurs on GIR
                //  and if the previous symbol is not a norot pattern).
                // The majalan pattern is applied at the beginning of a norot passage, when the base note changes
                // and when a norot symbol aligns with the gir.
                // Reyong notes should previously have been cast to octave 1, for other positions no preliminary casting
                // should be performed (i.e. the norot note is the 'polos' note for both polos and sangsih positions).
                UGAL: {
                    'o,': { homophonic: { ngubeng: ['o,', 'e,', 'o,', 'e,'], majalan: ['?', 'o,/', 'o,', 'e,'], basenote: 'o,' },
                            kotekan: { ngubeng: ['o,', '.', 'o,', '.'], majalan: ['?', 'o,', 'o,', '.'], basenote: 'o,' } },
                    'e,': { homophonic: { ngubeng: ['e,', 'u,', 'e,', 'u,'], majalan: ['?', 'e,/', 'e,', 'u,'], basenote: 'e,' },
                            kotekan: { ngubeng: ['e,', '.', 'e,', '.'], majalan: ['?', 'e,', 'e,', '.'], basenote: 'e,' } },
                    'u,': { homophonic: { ngubeng: ['u,', 'a,', 'u,', 'a,'], majalan: ['?', 'u,/', 'u,', 'a,'], basenote: 'u,' },
                            kotekan: { ngubeng: ['u,', '.', 'u,', '.'], majalan: ['?', 'u,', 'u,', '.'], basenote: 'u,' } },
                    'a,': { homophonic: { ngubeng: ['a,', 'i,', 'a,', 'i,'], majalan: ['?', 'a,/', 'a,', 'i,'], basenote: 'a,' },
                            kotekan: { ngubeng: ['a,', '.', 'a,', '.'], majalan: ['?', 'a,', 'a,', '.'], basenote: 'a,' } },
                    i: { homophonic: { ngubeng: ['i', 'o', 'i', 'o'], majalan: ['?', 'i/', 'i', 'o'], basenote: 'i' },
                            kotekan: { ngubeng: ['i', '.', 'i', '.'], majalan: ['?', 'i', 'i', '.'], basenote: 'i' } },
                    o: { homophonic: { ngubeng: ['o', 'e', 'o', 'e'], majalan: ['?', 'o/', 'o', 'e'], basenote: 'o' },
                            kotekan: { ngubeng: ['o', '.', 'o', '.'], majalan: ['?', 'o', 'o', '.'], basenote: 'o' } },
                    e: { homophonic: { ngubeng: ['e', 'u', 'e', 'u'], majalan: ['?', 'e/', 'e', 'u'], basenote: 'e' },
                            kotekan: { ngubeng: ['e', '.', 'e', '.'], majalan: ['?', 'e', 'e', '.'], basenote: 'e' } },
                    u: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u/', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['u', '.', 'u', '.'], majalan: ['?', 'u', 'u', '.'], basenote: 'u' } },
                    a: { homophonic: { ngubeng: ['a', 'i<', 'a', 'i<'], majalan: ['?', 'a/', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['a', '.', 'a', '.'], majalan: ['?', 'a', 'a', '.'], basenote: 'a' } },
                    'i<': { homophonic: { ngubeng: ['i<', 'a', 'i<', 'a'], majalan: ['?', 'i</', 'i<', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['i<', '.', 'i<', '.'], majalan: ['?', 'i</', 'i<', '.'], basenote: 'i<' } }
                },
                PEMADE_POLOS: {
                    'o,': { homophonic: { ngubeng: ['o,', 'e,', 'o,', 'e,'], majalan: ['?', 'o,/', 'o,', 'e,'], basenote: 'o,' },
                            kotekan: { ngubeng: ['o,', '.', 'o,', '.'], majalan: ['?', 'o,', 'o,', '.'], basenote: 'o,' } },
                    'e,': { homophonic: { ngubeng: ['e,', 'u,', 'e,', 'u,'], majalan: ['?', 'e,/', 'e,', 'u,'], basenote: 'e,' },
                            kotekan: { ngubeng: ['e,', '.', 'e,', '.'], majalan: ['?', 'e,', 'e,', '.'], basenote: 'e,' } },
                    'u,': { homophonic: { ngubeng: ['u,', 'a,', 'u,', 'a,'], majalan: ['?', 'u,/', 'u,', 'a,'], basenote: 'u,' },
                            kotekan: { ngubeng: ['u,', '.', 'u,', '.'], majalan: ['?', 'u,', 'u,', '.'], basenote: 'u,' } },
                    'a,': { homophonic: { ngubeng: ['a,', 'i,', 'a,', 'i,'], majalan: ['?', 'a,/', 'a,', 'i,'], basenote: 'a,' },
                            kotekan: { ngubeng: ['a,', '.', 'a,', '.'], majalan: ['?', 'a,', 'a,', '.'], basenote: 'a,' } },
                    i: { homophonic: { ngubeng: ['i', 'o', 'i', 'o'], majalan: ['?', 'i/', 'i', 'o'], basenote: 'i' },
                            kotekan: { ngubeng: ['i', '.', 'i', '.'], majalan: ['?', 'i', 'i', '.'], basenote: 'i' } },
                    o: { homophonic: { ngubeng: ['o', 'e', 'o', 'e'], majalan: ['?', 'o/', 'o', 'e'], basenote: 'o' },
                            kotekan: { ngubeng: ['o', '.', 'o', '.'], majalan: ['?', 'o', 'o', '.'], basenote: 'o' } },
                    e: { homophonic: { ngubeng: ['e', 'u', 'e', 'u'], majalan: ['?', 'e/', 'e', 'u'], basenote: 'e' },
                            kotekan: { ngubeng: ['e', '.', 'e', '.'], majalan: ['?', 'e', 'e', '.'], basenote: 'e' } },
                    u: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u/', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['u', '.', 'u', '.'], majalan: ['?', 'u', 'u', '.'], basenote: 'u' } },
                    a: { homophonic: { ngubeng: ['a', 'i<', 'a', 'i<'], majalan: ['?', 'a/', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['a', '.', 'a', '.'], majalan: ['?', 'a', 'a', '.'], basenote: 'a' } },
                    'i<': { homophonic: { ngubeng: ['i<', 'a', 'i<', 'a'], majalan: ['?', 'i</', 'i<', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['i<', '.', 'i<', '.'], majalan: ['?', 'i</', 'i<', '.'], basenote: 'i<' } }
                },
                KANTILAN_POLOS: {
                    'o,': { homophonic: { ngubeng: ['o,', 'e,', 'o,', 'e,'], majalan: ['?', 'o,/', 'o,', 'e,'], basenote: 'o,' },
                            kotekan: { ngubeng: ['o,', '.', 'o,', '.'], majalan: ['?', 'o,', 'o,', '.'], basenote: 'o,' } },
                    'e,': { homophonic: { ngubeng: ['e,', 'u,', 'e,', 'u,'], majalan: ['?', 'e,/', 'e,', 'u,'], basenote: 'e,' },
                            kotekan: { ngubeng: ['e,', '.', 'e,', '.'], majalan: ['?', 'e,', 'e,', '.'], basenote: 'e,' } },
                    'u,': { homophonic: { ngubeng: ['u,', 'a,', 'u,', 'a,'], majalan: ['?', 'u,/', 'u,', 'a,'], basenote: 'u,' },
                            kotekan: { ngubeng: ['u,', '.', 'u,', '.'], majalan: ['?', 'u,', 'u,', '.'], basenote: 'u,' } },
                    'a,': { homophonic: { ngubeng: ['a,', 'i,', 'a,', 'i,'], majalan: ['?', 'a,/', 'a,', 'i,'], basenote: 'a,' },
                            kotekan: { ngubeng: ['a,', '.', 'a,', '.'], majalan: ['?', 'a,', 'a,', '.'], basenote: 'a,' } },
                    i: { homophonic: { ngubeng: ['i', 'o', 'i', 'o'], majalan: ['?', 'i/', 'i', 'o'], basenote: 'i' },
                            kotekan: { ngubeng: ['i', '.', 'i', '.'], majalan: ['?', 'i', 'i', '.'], basenote: 'i' } },
                    o: { homophonic: { ngubeng: ['o', 'e', 'o', 'e'], majalan: ['?', 'o/', 'o', 'e'], basenote: 'o' },
                            kotekan: { ngubeng: ['o', '.', 'o', '.'], majalan: ['?', 'o', 'o', '.'], basenote: 'o' } },
                    e: { homophonic: { ngubeng: ['e', 'u', 'e', 'u'], majalan: ['?', 'e/', 'e', 'u'], basenote: 'e' },
                            kotekan: { ngubeng: ['e', '.', 'e', '.'], majalan: ['?', 'e', 'e', '.'], basenote: 'e' } },
                    u: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u/', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['u', '.', 'u', '.'], majalan: ['?', 'u', 'u', '.'], basenote: 'u' } },
                    a: { homophonic: { ngubeng: ['a', 'i<', 'a', 'i<'], majalan: ['?', 'a/', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['a', '.', 'a', '.'], majalan: ['?', 'a', 'a', '.'], basenote: 'a' } },
                    'i<': { homophonic: { ngubeng: ['i<', 'a', 'i<', 'a'], majalan: ['?', 'i</', 'i<', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['i<', '.', 'i<', '.'], majalan: ['?', 'i</', 'i<', '.'], basenote: 'i<' } }
                },
                PEMADE_SANGSIH: {
                    'o,': { homophonic: { ngubeng: ['a,', 'i,', 'a,', 'i,'], majalan: ['?', 'a,/', 'a,', 'i,'], basenote: 'a,' },
                            kotekan: { ngubeng: ['.', 'e,', '.', 'e,'], majalan: ['.,', 'o,', 'o,', 'e,'], basenote: 'o,' } },
                    'e,': { homophonic: { ngubeng: ['i', 'o', 'i', 'o'], majalan: ['?', 'i/', 'i', 'o'], basenote: 'i' },
                            kotekan: { ngubeng: ['.', 'u,', '.', 'u,'], majalan: ['.', 'u,', 'u,', 'a,'], basenote: 'e,' } },
                    'u,': { homophonic: { ngubeng: ['o', 'e', 'o', 'e'], majalan: ['?', 'o/', 'o', 'e'], basenote: 'o' },
                            kotekan: { ngubeng: ['.', 'a,', '.', 'a,'], majalan: ['.', 'u,', 'u,', 'a'], basenote: 'u,' } },
                    'a,': { homophonic: { ngubeng: ['e', 'u', 'e', 'u'], majalan: ['?', 'e/', 'e', 'u'], basenote: 'e' },
                            kotekan: { ngubeng: ['.', 'i', '.', 'i'], majalan: ['.', 'a,', 'a,', 'i'], basenote: 'a,' } },
                    i: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u/', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['.', 'o', '.', 'o'], majalan: ['.', 'i', 'i', 'o'], basenote: 'i' } },
                    o: { homophonic: { ngubeng: ['a', 'i<', 'a', 'i<'], majalan: ['?', 'a/', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['.', 'e', '.', 'e'], majalan: ['.', 'o', 'o', 'e'], basenote: 'o' } },
                    e: { homophonic: { ngubeng: ['i<', 'a', 'i<', 'a'], majalan: ['?', 'i</', 'i<', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['.', 'u', '.', 'u'], majalan: ['.', 'e', 'e', 'u'], basenote: 'e' } },
                    u: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u/', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['.', 'a', '.', 'a'], majalan: ['.', 'u', 'u', 'a'], basenote: 'u' } },
                    a: { homophonic: { ngubeng: ['a', 'i<', 'a', 'i<'], majalan: ['?', 'a/', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['.', 'i<', '.', 'i<'], majalan: ['.', 'a', 'a', 'i<'], basenote: 'a' } },
                    'i<': { homophonic: { ngubeng: ['i<', 'a', 'i<', 'a'], majalan: ['?', 'i</', 'i<', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['.', 'a', '.', 'a'], majalan: ['.', 'i</', 'i<', 'a'], basenote: 'i<' } },
                },
                KANTILAN_SANGSIH: {
                    'o,': { homophonic: { ngubeng: ['a,', 'i,', 'a,', 'i,'], majalan: ['?', 'a,/', 'a,', 'i,'], basenote: 'a,' },
                            kotekan: { ngubeng: ['.', 'e,', '.', 'e,'], majalan: ['.,', 'o,', 'o,', 'e,'], basenote: 'o,' } },
                    'e,': { homophonic: { ngubeng: ['i', 'o', 'i', 'o'], majalan: ['?', 'i/', 'i', 'o'], basenote: 'i' },
                            kotekan: { ngubeng: ['.', 'u,', '.', 'u,'], majalan: ['.', 'u,', 'u,', 'a,'], basenote: 'e,' } },
                    'u,': { homophonic: { ngubeng: ['o', 'e', 'o', 'e'], majalan: ['?', 'o/', 'o', 'e'], basenote: 'o' },
                            kotekan: { ngubeng: ['.', 'a,', '.', 'a,'], majalan: ['.', 'u,', 'u,', 'a'], basenote: 'u,' } },
                    'a,': { homophonic: { ngubeng: ['e', 'u', 'e', 'u'], majalan: ['?', 'e/', 'e', 'u'], basenote: 'e' },
                            kotekan: { ngubeng: ['.', 'i', '.', 'i'], majalan: ['.', 'a,', 'a,', 'i'], basenote: 'a,' } },
                    i: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u/', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['.', 'o', '.', 'o'], majalan: ['.', 'i', 'i', 'o'], basenote: 'i' } },
                    o: { homophonic: { ngubeng: ['a', 'i<', 'a', 'i<'], majalan: ['?', 'a/', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['.', 'e', '.', 'e'], majalan: ['.', 'o', 'o', 'e'], basenote: 'o' } },
                    e: { homophonic: { ngubeng: ['i<', 'a', 'i<', 'a'], majalan: ['?', 'i</', 'i<', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['.', 'u', '.', 'u'], majalan: ['.', 'e', 'e', 'u'], basenote: 'e' } },
                    u: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u/', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['.', 'a', '.', 'a'], majalan: ['.', 'u', 'u', 'a'], basenote: 'u' } },
                    a: { homophonic: { ngubeng: ['a', 'i<', 'a', 'i<'], majalan: ['?', 'a/', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['.', 'i<', '.', 'i<'], majalan: ['.', 'a', 'a', 'i<'], basenote: 'a' } },
                    'i<': { homophonic: { ngubeng: ['i<', 'a', 'i<', 'a'], majalan: ['?', 'i</', 'i<', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['.', 'a', '.', 'a'], majalan: ['.', 'i</', 'i<', 'a'], basenote: 'i<' } },
                },
                // Casting should be performed prior to pattern conversion.
                // Reyong norot symbols are cast to octave 1.
                REYONG_1: {
                    i: { homophonic: { ngubeng: ['.', 'a,', 'u,', 'a,'], majalan: ['?', '.', 'u,', 'a,'], basenote: 'u,' },
                            kotekan: { ngubeng: ['.', 'a,', 'u,', 'a,'], majalan: ['?', '.', 'u,', 'a,'], basenote: 'u,' } },
                    o: { homophonic: { ngubeng: ['.', 't', '.', 't'], majalan: ['?', 'u,', 'a,', 't'], basenote: 'a,' },
                            kotekan: { ngubeng: ['.', 't', '.', 't'], majalan: ['?', 'u,', 'a,', 't'], basenote: 'a,' } },
                    e: { homophonic: { ngubeng: ['e,', 'u,', 'e,', 'u,'], majalan: ['?', 'e,', 'e,', 'u,'], basenote: 'e,' },
                            kotekan: { ngubeng: ['e,', 'u,', 'e,', 'u,'], majalan: ['?', 'e,', 'e,', 'u,'], basenote: 'e,' } },
                    u: { homophonic: { ngubeng: ['u,', 'a,', 'u,', 'a,'], majalan: ['?', 'u,', 'u,', 'a,'], basenote: 'u,' },
                            kotekan: { ngubeng: ['u,', 'a,', 'u,', 'a,'], majalan: ['?', 'u,', 'u,', 'a,'], basenote: 'u,' } },
                    a: { homophonic: { ngubeng: ['a,', 'e,', 'a,', 'e,'], majalan: ['?', 'a,', 'a,', 'e,'], basenote: 'a,' },
                            kotekan: { ngubeng: ['a,', 'e,', 'a,', 'e,'], majalan: ['?', 'a,', 'a,', 'e,'], basenote: 'a,' } }
                },
                REYONG_2: {
                    i: { homophonic: { ngubeng: ['i', 'o', 'i', 'o'], majalan: ['?', 'i', 'i', 'o'], basenote: 'i' },
                            kotekan: { ngubeng: ['i', 'o', 'i', 'o'], majalan: ['?', 'i', 'i', 'o'], basenote: 'i' } },
                    o: { homophonic: { ngubeng: ['o', 'e', 'o', 'e'], majalan: ['?', 'o', 'o', 'e'], basenote: 'o' },
                            kotekan: { ngubeng: ['o', 'e', 'o', 'e'], majalan: ['?', 'o', 'o', 'e'], basenote: 'o' } },
                    e: { homophonic: { ngubeng: ['e', 'i', 'e', 'i'], majalan: ['?', 'e', 'e', 'i'], basenote: 'e' },
                            kotekan: { ngubeng: ['e', 'i', 'e', 'i'], majalan: ['?', 'e', 'e', 'i'], basenote: 'e' } },
                    u: { homophonic: { ngubeng: ['.', 'e', 'o', 'e'], majalan: ['?', '.', 'o', 'e'], basenote: 'o' },
                            kotekan: { ngubeng: ['.', 'e', 'o', 'e'], majalan: ['?', '.', 'o', 'e'], basenote: 'o' } },
                    a: { homophonic: { ngubeng: ['.', 'i', 'o', 'i'], majalan: ['?', '.', 'o', 'i'], basenote: 'e' },
                            kotekan: { ngubeng: ['.', 'i', 'o', 'i'], majalan: ['?', '.', 'o', 'i'], basenote: 'e' } }
                },
                REYONG_3: {
                    i: { homophonic: { ngubeng: ['.', 'a', 'u', 'a'], majalan: ['?', '.', 'u', 'a'], basenote: 'i<' },
                            kotekan: { ngubeng: ['.', 'a', 'u', 'a'], majalan: ['?', '.', 'u', 'a'], basenote: 'i<' } },
                    o: { homophonic: { ngubeng: ['.', 'i<', 'a', 'i<'], majalan: ['?', '.', 'a', 'i<'], basenote: 'a' },
                            kotekan: { ngubeng: ['.', 'i<', 'a', 'i<'], majalan: ['?', '.', 'a', 'i<'], basenote: 'a' } },
                    e: { homophonic: { ngubeng: ['.', 'u', 'a', 'u'], majalan: ['?', '.', 'a', 'u'], basenote: 'i<' },
                            kotekan: { ngubeng: ['.', 'u', 'a', 'u'], majalan: ['?', '.', 'a', 'u'], basenote: 'i<' } },
                    u: { homophonic: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u', 'u', 'a'], basenote: 'u' },
                            kotekan: { ngubeng: ['u', 'a', 'u', 'a'], majalan: ['?', 'u', 'u', 'a'], basenote: 'u' } },
                    a: { homophonic: { ngubeng: ['a', 'u', 'a', 'u'], majalan: ['?', 'a', 'a', 'u'], basenote: 'a' },
                            kotekan: { ngubeng: ['a', 'u', 'a', 'u'], majalan: ['?', 'a', 'a', 'u'], basenote: 'a' } }
                },
                REYONG_4: {
                    i: { homophonic: { ngubeng: ['i<', 'o<', 'i<', 'o<'], majalan: ['?', 'i<', 'i<', 'o<'], basenote: 'u<' },
                            kotekan: { ngubeng: ['i<', 'o<', 'i<', 'o<'], majalan: ['?', 'i<', 'i<', 'o<'], basenote: 'u<' } },
                    o: { homophonic: { ngubeng: ['o<', 'e<', 'o<', 'e<'], majalan: ['?', 'o<', 'o<', 'e<'], basenote: 'o<' },
                            kotekan: { ngubeng: ['o<', 'e<', 'o<', 'e<'], majalan: ['?', 'o<', 'o<', 'e<'], basenote: 'o<' } },
                    e: { homophonic: { ngubeng: ['e<', 'u<', 'e<', 'u<'], majalan: ['?', 'e<', 'e<', 'u<'], basenote: 'e<' },
                            kotekan: { ngubeng: ['e<', 'u<', 'e<', 'u<'], majalan: ['?', 'e<', 'e<', 'u<'], basenote: 'e<' } },
                    u: { homophonic: { ngubeng: ['u<', 'e<', 'u<', 'e<'], majalan: ['?', 'u<', 'u<', 'e<'], basenote: 'u<' },
                            kotekan: { ngubeng: ['u<', 'e<', 'u<', 'e<'], majalan: ['?', 'u<', 'u<', 'e<'], basenote: 'u<' } },
                    a: { homophonic: { ngubeng: ['.', 'i<', 'o<', 'i<'], majalan: ['?', '.', 'o<', 'i<'], basenote: 'e<' },
                            kotekan: { ngubeng: ['.', 'i<', 'o<', 'i<'], majalan: ['?', '.', 'o<', 'i<'], basenote: 'e<' } }
                }
            } as NorotDefinition
        }
}

// Returns the number of notes of a pattern of 1 if the symbol is not a notation pattern.
export function patternSize(symbol: NoteSymbol, position: Position): number {
    const pattern = getPatternType(symbol, position)
    switch (pattern) {
        case 'NOROT':
            return patterns.norot.size
        default:
            return 1
    }
}

// Returns the width of the notation after expanding notation pattern symbols.
export function notationWidth(notation: NoteSymbol[], position: Position) {
    return notation.reduce((sum, symbol) => sum + patternSize(symbol, position), 0)
}

// Converts specific symbols that represent a sequence of notes to a list of PlaybackSamplerAction objects.
// Function `createNoteActions` expects a `CreatePatternArgs` object as argument.
// Arguments `prevsymbol` and `nextsymbol` are required because some patterns can consist of two consecutive symbols.
// The 'grace note' pattern requires information about the next symbol to determine its octave.
// WARNING: GRACE NOTES WILL MODIFY THE LAST `SamplerAction` OBJECT, MAKING `createNoteActions` AN 'IMPURE FUNCTION'.
export function applyPatterns(position: Position, staff: Measure[]): Measure[] {
    const newStaff: Measure[] = []
    staff.forEach((measure, measureIdx) => {
        const expandedNotation: NoteSymbol[] = []
        measure.notation.forEach((symbol, symbolIdx) => {
            const pattern = getPatternType(symbol, position)
            switch (pattern) {
                case 'SINGLENOTE':
                    expandedNotation.push(symbol)
                    break
                case 'NOROT':
                    expandedNotation.push(...norotPattern(position, staff, measureIdx, symbolIdx))
                    break
                case 'INVALID':
                    console.error(`invalid pattern ${symbol} for ${position} staff=${JSON.stringify(staff)}`)
                    expandedNotation.push(...silenceSymbol())
                    break
                case 'UNHANDLED':
                    console.error(`Unhandled pattern ${symbol} for ${position}`)
                    expandedNotation.push(...silenceSymbol())
                    break
                default:
                    expandedNotation.push(symbol)
            }
        })
        newStaff.push({ notation: expandedNotation } as Measure)
    })
    return newStaff
}

function silenceSymbol(): NoteSymbol[] {
    return [MutingChars[0]]
}

function norotPattern(position: Position, staff: Measure[], measureIdx: number, symbolIdx: number): NoteSymbol[] {
    // Check if norot applies to the current position.
    if (!(position in patterns.norot.patterns)) {
        console.error(`Unexpected norot symbol in ${position} notation.`)
        return []
    }
    // Remove any space symbols and determine the norot type
    const notation = staff[measureIdx].notation.filter((symbol) => symbol.replace(' ', '') != '')
    //     if (notation.length > 2) {
    //         console.error(`Unexpected number of norot symbols: expected 1 or 2 but found ${notation.length}.`)
    //         return []
    //     }
    const norotType: NorotType = notation.length == 1 ? 'kotekan' : 'homophonic'

    // Determine the current and previous tone
    // Assume that the first symbol of the staff coincides with the GIR and set the prevSymbol to undefined.
    const symbol = staff[measureIdx].notation[symbolIdx]
    const prevSymbol =
        symbolIdx > 0
            ? staff[measureIdx].notation[symbolIdx - 1]
            : measureIdx > 0
              ? staff[measureIdx - 1].notation.at(-1)
              : undefined
    // The norot pattern is set to majalan if there is a change in tone, at the beginning of a norot sequence or on the GIR.
    const norotPattern: NorotSubPattern = prevSymbol == symbol ? 'ngubeng' : 'majalan'

    // Ngubeng
    const [currTone, _rest1] = splitTone(symbol)
    if (norotPattern == 'ngubeng') {
        return patterns.norot.patterns[position]![currTone][norotType].ngubeng
    }

    // Majalan: set the first pattern note to the last norot pokok if it exists, otherwise set it to a muting symbol.
    // The previous note is either the first note of the measure (homophonic) or the (last) note of the previous measure (kotekan).
    // In the latter case the previous measure is in the current staff (majalan can not occur in the first beat of the staff).
    var firstNote, _rest2: NoteSymbol
    if (measureIdx == 0 && symbolIdx == 0)
        firstNote = patterns.norot.patterns[position]![currTone][norotType].basenote // subpattern on GIR
    else if (prevSymbol && getPatternType(prevSymbol, position) == 'NOROT') {
        const [prevTone, _rest2] = splitTone(prevSymbol)
        firstNote = patterns.norot.patterns[position]![prevTone][norotType].basenote
    } else firstNote = '.' // start of a norot sequence
    // Return the majalan pattern with the first note replaced
    return patterns.norot.patterns[position]![currTone][norotType].majalan.toSpliced(0, 1, firstNote)
}
