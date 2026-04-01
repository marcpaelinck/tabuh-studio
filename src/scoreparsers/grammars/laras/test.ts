import _ from 'lodash'
import { positionConfigs } from '../../../config/config.ts'
import type { Position } from '../../../typing/types.ts'

const labelToPosition: Record<string, Position> = {
    r1: 'REYONG_1',
    r2: 'REYONG_2',
    r3: 'REYONG_3',
    r4: 'REYONG_4',
    ks: 'KANTILAN_SANGSIH',
    kp: 'KANTILAN_POLOS',
    ps: 'PEMADE_SANGSIH',
    pp: 'PEMADE_POLOS',
    u: 'UGAL',
    gr: 'GENDER_RAMBAT',
    p: 'PENYACAH',
    c: 'CALUNG',
    j: 'JEGOGAN',
    g: 'GONGS',
    km: 'KEMPLI',
    cc: 'CENGCENG',
    kkr: 'KENDANG',
    krw: 'KENDANG_WADON',
    krl: 'KENDANG_LANANG'
}

const larasConfig: Record<string, any> = {
    r1: {
        alphabet: ['E', 'U', 'A', 'I', 'O', 'e'],
        samples: ['r_e.mp3', 'r_u.mp3', 'r_a.mp3', 'r_i.mp3', 'r_o.mp3', 'r_e-h.mp3'],
        volume: -24
    },
    r2: {
        alphabet: ['A', 'I', 'O', 'e', 'u', 'a'],
        samples: ['r_a.mp3', 'r_i.mp3', 'r_o.mp3', 'r_e-h.mp3', 'r_u-h.mp3', 'r_a-h.mp3'],
        volume: -24
    },
    r3: {
        alphabet: ['e', 'u', 'a', 'i', 'o'],
        samples: ['r_e-h.mp3', 'r_u-h.mp3', 'r_a-h.mp3', 'r_i-h.mp3', 'r_o-h.mp3'],
        volume: -24
    },
    r4: {
        alphabet: ['U', 'a', 'i', 'o', 'e', 'u'],
        samples: ['r_u-h.mp3', 'r_a-h.mp3', 'r_i-h.mp3', 'r_o-h.mp3', 'r_e-hh.mp3', 'r_u-hh.mp3'],
        volume: -24
    },
    rs2: {
        alphabet: ['a', 'i', 'o', 'e', 'u'],
        samples: ['r_a.mp3', 'r_i.mp3', 'r_o.mp3', 'r_e-h.mp3', 'r_u-h.mp3'],
        volume: -24
    },
    rs4: {
        alphabet: ['a', 'i', 'o', 'e', 'u'],
        samples: ['r_a-h.mp3', 'r_i-h.mp3', 'r_o-h.mp3', 'r_e-hh.mp3', 'r_u-hh.mp3'],
        volume: -24
    },
    rp1: {
        alphabet: ['e', 'u', 'a', 'i', 'o'],
        samples: ['r_e.mp3', 'r_u.mp3', 'r_a.mp3', 'r_i.mp3', 'r_o.mp3'],
        volume: -24
    },
    rp3: {
        alphabet: ['e', 'u', 'a', 'i', 'o'],
        samples: ['r_e-h.mp3', 'r_u-h.mp3', 'r_a-h.mp3', 'r_i-h.mp3', 'r_o-h.mp3'],
        volume: -24
    },
    ks: {
        alphabet: ['O', 'E', 'U', 'A', 'I', 'o', 'e', 'u', 'a', 'i'],
        samples: ['gk_o.mp3','gk_e.mp3','gk_u.mp3','gk_a.mp3','gk_i.mp3','gk_o-h.mp3','gk_e-h.mp3','gk_u-h.mp3','gk_a-h.mp3','gk_i-h.mp3'], // prettier-ignore
        volume: -28
    },
    kp: {
        alphabet: ['O', 'E', 'U', 'A', 'I', 'o', 'e', 'u', 'a', 'i'],
        samples: ['gk_o.mp3','gk_e.mp3','gk_u.mp3','gk_a.mp3','gk_i.mp3','gk_o-h.mp3','gk_e-h.mp3','gk_u-h.mp3','gk_a-h.mp3','gk_i-h.mp3'], // prettier-ignore
        volume: -28
    },
    ps: {
        alphabet: ['O', 'E', 'U', 'A', 'I', 'o', 'e', 'u', 'a', 'i'],
        samples: ['gp_o.mp3','gp_e.mp3','gp_u.mp3','gp_a.mp3','gp_i.mp3','gp_o-h.mp3','gp_e-h.mp3','gp_u-h.mp3','gp_a-h.mp3','gp_i-h.mp3'], // prettier-ignore
        volume: -28
    },
    pp: {
        alphabet: ['O', 'E', 'U', 'A', 'I', 'o', 'e', 'u', 'a', 'i'],
        samples: ['gp_o.mp3','gp_e.mp3','gp_u.mp3','gp_a.mp3','gp_i.mp3','gp_o-h.mp3','gp_e-h.mp3','gp_u-h.mp3','gp_a-h.mp3','gp_i-h.mp3'], // prettier-ignore
        volume: -28
    },
    gr: {
        alphabet: ['E', 'U', 'A', 'I', 'o', 'e', 'u', 'a', 'i'],
        samples: ['gr_e.mp3','gr_u.mp3','gr_a.mp3','gr_i.mp3','gr_o.mp3','gr_e-h.mp3','gr_u-h.mp3','gr_a-h.mp3','gr_i-h.mp3'], // prettier-ignore
        volume: -26
    },
    gr1: {
        alphabet: ['E', 'U', 'A', 'I', 'o', 'e', 'u', 'a', 'i'],
        samples: ['gr_e.mp3','gr_u.mp3','gr_a.mp3','gr_i.mp3','gr_o.mp3','gr_e-h.mp3','gr_u-h.mp3','gr_a-h.mp3','gr_i-h.mp3'], // prettier-ignore
        volume: -26
    },
    gr2: {
        alphabet: ['E', 'U', 'A', 'I', 'o', 'e', 'u', 'a', 'i'],
        samples: ['gr_e-h.mp3','gr_u-h.mp3','gr_a-h.mp3','gr_i-h.mp3','gr_o-h.mp3','gr_e-hh.mp3','gr_u-hh.mp3','gr_a-hh.mp3','gr_i-hh.mp3'], // prettier-ignore
        volume: -26
    },
    u: { alphabet: [], samples: [], volume: -24 },
    t: { alphabet: [], samples: [], volume: -24 },
    p: {
        alphabet: ['U', 'A', 'i', 'o', 'e', 'u', 'a'],
        samples: ['pp_u.mp3', 'pp_a.mp3', 'pp_i.mp3', 'pp_o.mp3', 'pp_e.mp3', 'pp_u-h.mp3', 'pp_a-h.mp3'],
        volume: -22
    },
    c: {
        alphabet: ['I', 'O', 'E', 'U', 'A'],
        samples: ['pc_i.mp3', 'pc_o.mp3', 'pc_e.mp3', 'pc_u.mp3', 'pc_a.mp3'],
        volume: -22
    },
    j: {
        alphabet: ['I', 'O', 'E', 'U', 'A'],
        samples: ['pj_i.mp3', 'pj_o.mp3', 'pj_e.mp3', 'pj_u.mp3', 'pj_a.mp3'],
        volume: -22
    },
    g: { alphabet: ['G', 'L', 'P', 't'], samples: ['g_g.mp3', 'g_l.mp3', 'g_p.mp3', 'g_t.mp3'], volume: -20 },
    km: { alphabet: ['x'], samples: ['km.mp3'], volume: -20 },
    kn: { alphabet: ['n'], samples: ['kn.mp3'], volume: -24 },
    cc: { alphabet: ['x', 'c', 'C'], samples: ['c_x-l.mp3', 'c_c.mp3', 'c_c-o.mp3'], volume: -28 },
    kkr: {
        alphabet: ['o', 'e', 'n', 'u', 'D', 'T', 'k', 'p', 'ḱ', 'ṕ'],
        samples: ['kkr_o.mp3','kkr_e.mp3','kkr_n.mp3','kkr_u.mp3','kkr_d.mp3','kkr_t.mp3','kkr_k.mp3','kkr_p.mp3','kkr_k-h.mp3','kkr_pak.mp3'], // prettier-ignore
        volume: -17
    },
    krw: {
        alphabet: ['o', 'e', 'n', 'u', 'D', 'T', 'k', 'p', 'ḱ', 'ṕ'],
        samples: ['kkr_o.mp3','kkr_e.mp3','kkr_n.mp3','kkr_u.mp3','kkr_d.mp3','kkr_t.mp3','kkr_k.mp3','kkr_p.mp3','kkr_k-h.mp3','kkr_pak.mp3'], // prettier-ignore
        volume: -17
    },
    krl: {
        alphabet: ['o', 'e', 'n', 'u', 'D', 'T', 'k', 'p', 'ḱ', 'ṕ'],
        samples: ['kkr_o.mp3','kkr_e.mp3','kkr_n.mp3','kkr_u.mp3','kkr_d.mp3','kkr_t.mp3','kkr_k.mp3','kkr_p.mp3','kkr_k-h.mp3','kkr_pak.mp3'], // prettier-ignore
        volume: -17
    },
    tr: { alphabet: ['o', 'p', 'x'], samples: ['tr_o.mp3', 'tr_p.mp3', 'tr_x.mp3'], volume: -18 }
}

const laras2tabuh: Record<string, string> = {}

Object.entries(labelToPosition).forEach(([lpos, tpos]) => {
    laras2tabuh[tpos] = Object.fromEntries(
        _.zip(larasConfig[lpos].alphabet, _.keys(positionConfigs[tpos].symbolToNoteNames))
    )
})
console.log(JSON.stringify(laras2tabuh))

// prettier-ignore
const dict = {
    REYONG_1: { E: 'e,', U: 'u,', A: 'a,', I: 'i', O: 'o', e: 'e', undefined: 'x/' },
    REYONG_2: { A: 'u,', I: 'a,', O: 'i', e: 'o', u: 'e', a: 'u', undefined: 'x/' },
    REYONG_3: { e: 'o', u: 'e', a: 'u', i: 'a', o: 'i<', undefined: 'x/' },
    REYONG_4: { U: 'u', a: 'a', i: 'i<', o: 'o<', e: 'e<', u: 'u<', undefined: 'x/' },
    KANTILAN_SANGSIH: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<', undefined: 'i<?' }, 
    KANTILAN_POLOS: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<', undefined: 'i<?' },
    PEMADE_SANGSIH: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<', undefined: 'i<?' },
    PEMADE_POLOS: { O: 'o,', E: 'e,', U: 'u,', A: 'a,', I: 'i', o: 'o', e: 'e', u: 'u', a: 'a', i: 'i<', undefined: 'i<?' },
    UGAL: { E: 'o,', U: 'e,', A: 'u,', I: 'a,', o: 'i', e: 'o', u: 'e', a: 'u', i: 'a', undefined: 'i<?' },
    PENYACAH: { U: 'u,', A: 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', undefined: 'a/' },
    CALUNG: { I: 'i', O: 'o', E: 'e', U: 'u', A: 'a', undefined: 'a/' },
    JEGOGAN: { I: 'i', O: 'o', E: 'e', U: 'u', A: 'a', undefined: 'a/' },
    GONGS: { G: 'G', L: 'P', P: 'T' },
    KEMPLI: { x: 'x?' },
    CENGCENG: { x: 'x', c: 'x?' },
    KENDANG: { o: '8', e: '*', n: '0', u: ')', D: '9', T: '(' },
    KENDANG_WADON: { o: '8', e: '*', n: '0', u: ')', D: '9', T: '(' },
    KENDANG_LANANG: { o: '8', e: '*', n: '0', u: ')', D: '9', T: '(' }
}
