// Converts (shorthand) symbols that represent a sequence of base notes to the corresponding base note symbols.
// Also sets the octave of a grace note according to the note to which it is attached and to the position's range.

import { NoteObject } from '@tabuhstudio/shared'
import type { NoteSymbol, Position } from '@tabuhstudio/shared/types/basetypes'
import type { BeatSliceInfo } from '../typing/execution'
import type { Staff } from '../typing/score'

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
                    'a,': { homophonic: { ngubeng: ['a,', 'i', 'a,', 'i'], majalan: ['?', 'a,/', 'a,', 'i'], basenote: 'a,' },
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
                    'a,': { homophonic: { ngubeng: ['a,', 'i', 'a,', 'i'], majalan: ['?', 'a,/', 'a,', 'i'], basenote: 'a,' },
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
                    e: { homophonic: { ngubeng: ['i<', 'u', 'i<', 'u'], majalan: ['?', 'i</', 'i<', 'u'], basenote: 'i<' },
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
                    e: { homophonic: { ngubeng: ['i<', 'u', 'i<', 'u'], majalan: ['?', 'i</', 'i<', 'u'], basenote: 'i<' },
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

// Returns the number of notes a symbol expands to during pattern resolution.
// Norot symbols expand to 4 notes. All other symbols (including combined
// grace-note symbols) occupy exactly one notation column.
export function patternSize(note: NoteObject, position?: Position): number {
    void position // reserved for future position-specific logic
    return note.pattern.norot ? patterns.norot.size : 1
}

// Returns the number of columns over which the notation spans, after expanding pattern symbols.
// Currently only norot has a pattern length > 1.
// Patterns that are not followed by a sufficient number of extension symbols will be truncated
// except if the pattern occurs at the end of the notation.
export function notationWidth(notation: NoteObject[], position?: Position): number {
    var totalWidth = 0
    var remaining = 0 // remaining number of expected spaces after a pattern
    notation.forEach((note) => {
        if (note.isExtensionSilence) {
            if (remaining) remaining--
            else totalWidth++
        } else if (note.isMutingSilence) totalWidth++
        else {
            totalWidth += 1 - remaining // pattern will be truncated if there are insufficient trailing spaces
            remaining = patternSize(note, position) - 1
        }
    })
    totalWidth += remaining
    return totalWidth
}

// Converts an array of NoteSymbol strings to an array of NoteObject objects.
function symbolArrayToNoteArray(symbols: NoteSymbol[], position: Position): NoteObject[] {
    return symbols.map((sym) => new NoteObject(sym, position))
}

// Expands shorthand notation symbols (norot) into their full note sequences.
// staff is an array of Staffs, one per kempli beat (as produced by the parser before flattening).
//
// `eatSpaces` enables the alignment policy used by the compact view: a shorthand
// symbol "eats" the following space columns so it occupies its full expanded width
// in place (a norot symbol therefore consumes the 3 spaces after it). When there
// are too few following spaces the sequence is cut off and a warning is logged.
// With `eatSpaces` off (the parser's path) every norot expands to its full size
// and following spaces are kept — the original behaviour.
export interface ApplyPatternParams {
    position: Position
    staff: Staff
    beatSlices: BeatSliceInfo[]
    eatSpaces: boolean
}
export function applyPatterns({ position, staff, beatSlices, eatSpaces }: ApplyPatternParams): Staff {
    const expandedObjNotation: NoteObject[] = []
    var prevNorotSymbol: NoteObject | null = null
    beatSlices.forEach((slice, beatIdx) => {
        const beatObjNotation = staff.objNotation.slice(slice.start, slice.end)
        var noteIdx = 0
        while (noteIdx < beatObjNotation.length) {
            const symbol = beatObjNotation[noteIdx]
            if (symbol.error !== undefined) {
                // Structurally invalid symbol — replace with silence
                prevNorotSymbol = null
                expandedObjNotation.push(new NoteObject(symbol.canonicalSymbol, position))
                noteIdx++
            } else if (symbol.pattern.norot) {
                const pattern = norotPattern(
                    position,
                    symbol,
                    prevNorotSymbol,
                    noteIdx,
                    beatIdx,
                    slice.end - slice.start
                )
                if (eatSpaces) {
                    // The norot occupies its own column plus the following space columns.
                    let avail = 1
                    while (
                        avail < pattern.length &&
                        noteIdx + avail < beatObjNotation.length &&
                        beatObjNotation[noteIdx + avail].toString() === ' '
                    ) {
                        avail++
                    }
                    const take = Math.min(pattern.length, avail)
                    expandedObjNotation.push(...pattern.slice(0, take))
                    if (take < pattern.length) {
                        console.warn(
                            `norot sequence cut off in ${position} measure ${beatIdx}: ` +
                                `needs ${pattern.length} columns, only ${take} available.`
                        )
                    }
                    noteIdx += take
                } else {
                    expandedObjNotation.push(...pattern)
                    noteIdx++
                }
                prevNorotSymbol = symbol
            } else {
                // Single note (including combined grace-note symbols, strokes, etc.)
                if (!symbol.isExtensionSilence) prevNorotSymbol = null
                expandedObjNotation.push(new NoteObject(symbol.canonicalSymbol, position))
                noteIdx++
            }
        }
    })
    const expandedNotation: NoteSymbol[] = expandedObjNotation.map((note) => note.toString())
    return { notation: expandedNotation, objNotation: expandedObjNotation }
}

function norotPattern(
    position: Position,
    norotNote: NoteObject,
    prevNorotNote: NoteObject | null,
    noteIdx: number,
    beatIdx: number,
    beatLength: number
): NoteObject[] {
    if (!(position in patterns.norot.patterns)) {
        console.error(`Unexpected norot symbol in ${position} notation.`)
        return []
    }
    // Remove any space symbols and determine the norot type.
    // Norot style rule: if the measure contains only one note, assume kotekan style.
    // Rationale: in general the kempli doubles the beat frequency when norot is played kotekan style.
    //     const objNotation = beatObjNotation.filter((note) => note.toString() != SPACE_CHAR)
    //     const norotType: NorotType = objNotation.length == 1 ? 'kotekan' : 'homophonic'
    const norotType: NorotType = beatLength == 4 ? 'kotekan' : 'homophonic'

    // Current note
    //     const norotNote = beatObjNotation[symbolIdx]
    const currTone = norotNote.symbol.pitch + norotNote.symbol.octave

    // Previous symbol: from the same beat (if symbolIdx > 0) or the last symbol of the previous beat
    //     const prevNote: NoteObject | undefined =
    //         symbolIdx > 0 ? beatObjNotation[symbolIdx - 1] : prevBeatObjNotation?.at(-1)

    //     const prevNorotNote = prevNote !== undefined && prevNote.pattern.norot ? prevNote : undefined

    // Ngubeng when the previous norot note has the same tone; majalan on a tone change,
    // at the start of a norot sequence, or on the GIR.
    const subPattern: NorotSubPattern =
        prevNorotNote && prevNorotNote.toString() === norotNote.toString() ? 'ngubeng' : 'majalan'

    if (subPattern === 'ngubeng') {
        return symbolArrayToNoteArray(patterns.norot.patterns[position]![currTone][norotType].ngubeng, position)
    }

    // Majalan: derive the first pattern note from the previous norot basenote (if any)
    let firstNote: NoteSymbol
    if (beatIdx === 0 && noteIdx === 0) {
        firstNote = patterns.norot.patterns[position]![currTone][norotType].basenote // on GIR
    } else if (prevNorotNote) {
        const prevTone = prevNorotNote.symbol.pitch + prevNorotNote.symbol.octave
        firstNote = patterns.norot.patterns[position]![prevTone][norotType].basenote
    } else {
        firstNote = '.' // start of a norot sequence
    }
    return symbolArrayToNoteArray(
        patterns.norot.patterns[position]![currTone][norotType].majalan.toSpliced(0, 1, firstNote),
        position
    )
}
