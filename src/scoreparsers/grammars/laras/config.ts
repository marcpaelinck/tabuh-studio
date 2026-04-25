import type { Position } from '../../../typing/instruments'

// Instrument tag conversion (tag -> )
export const labelToPosition: Record<string, Position[]> = {
    r1: ['REYONG_1'],
    r2: ['REYONG_2'],
    r3: ['REYONG_3'],
    r4: ['REYONG_4'],
    rs2: ['REYONG_2'],
    rs4: ['REYONG_4'],
    rp1: ['REYONG_1'],
    rp3: ['REYONG_3'],
    ks: ['KANTILAN_SANGSIH'],
    kp: ['KANTILAN_POLOS'],
    ps: ['PEMADE_SANGSIH'],
    pp: ['PEMADE_POLOS'],
    gr: ['UGAL'],
    gp: ['KANTILAN_POLOS', 'PEMADE_POLOS'],
    gs: ['KANTILAN_SANGSIH', 'PEMADE_SANGSIH'],
    u: ['UGAL'],
    t: ['TROMPONG'],
    p: ['PENYACAH'],
    c: ['CALUNG'],
    j: ['JEGOGAN'],
    g: ['GONGS'],
    km: ['KEMPLI'],
    cc: ['CENGCENG'],
    kkr: ['KENDANG'],
    krw: ['KENDANG_WADON'],
    krl: ['KENDANG_LANANG'],
    tr: ['KEMPLI']
}

// Alphabet translation table (Laras -> Tabuh)
// prettier-ignore
export const symbolLookup: Record<Position, Record<string, string>> = {
    REYONG_1: { E: 'e,', U: 'u,', A: 'a,', I: 'i', O: 'o', e: 'e' },
    REYONG_2: { A: 'a,', I: 'i', O: 'o', e: 'e', u: 'u', a: 'a' },
    REYONG_3: { e: 'e', u: 'u', a: 'a', i: 'i<', o: 'o<' },
    REYONG_4: { U: 'u', a: 'a', i: 'i<', o: 'o<', e: 'e<', u: 'u<' },
    KANTILAN_SANGSIH: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<' },
    KANTILAN_POLOS: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<' },
    PEMADE_SANGSIH: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<' },
    PEMADE_POLOS: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<' },
    UGAL: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<' },
    GENDER_RAMBAT: { E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<' },
    TROMPONG: { A: 'a,', I: 'i,', O: 'o,', E: 'e,', U: 'u,', a: 'a', i: 'i', o: 'o', e: 'e', u: 'u' },
    PENYACAH: { U: 'u,', A: 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a' },
    CALUNG: { I: 'i', O: 'o', E: 'e', U: 'u', A: 'a' },
    JEGOGAN: { I: 'i', O: 'o', E: 'e', U: 'u', A: 'a' },
    GONGS: { G: 'G', L: 'G', P: 'P', T: 'T' },
    KEMPLI: { x: 'x?' },
    CENGCENG: { x: 'x', c: 'x?' },
    KENDANG: { o: '8', e: '*', n: '0', u: ')', D: '9', T: '(' },
    KENDANG_WADON: { o: '8', e: '*', n: '0', u: ')', D: '9', T: '(' },
    KENDANG_LANANG: { o: '8', e: '*', n: '0', u: ')', D: '9', T: '(' }
}
