export const BaseNote: string = "16n"
export type KeyPOS = [string, string]
export type KeyGroup = KeyPOS[]
export type InstrumentConfig = {
    type: string
    label: string
    svg_file: string // template for SVG files
    samples: string
    volume: number
}
export type InstrumentariumConfig = { [instrumentname: string]: InstrumentConfig }
// A keystroke can consist of more than one [notename, stroke] pair, e.g. reyong ' byong'.
export type KeystrokeConfig = [string, string] // [notename, stroke]
export type AlphabetConfig = { [characters: string]: { [instrumentgroup: string]: KeystrokeConfig[] } }
export type InstrumentAnimationInfo = { group: string, label: string, svg_file: string }
export type AnimationConfig = {
    instrumentation: { [name: string]: InstrumentAnimationInfo[] }
    highlight: { [stroke: string]: string[] }
}

export const SOUNDS_FOLDER = 'sounds/'

export const NOTES = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3']

export const instrumentConfigs: Record<string, InstrumentariumConfig> = {
    GONG_KEBYAR: {
        GONGS: { type: "percussion", label: "GONGS", svg_file: "GK_GONGS.svg", samples: "GK_GONGS_{notename}_{stroke}.mp3", volume: -24 },
        KENDANG: { type: "percussion", label: "KENDANG", svg_file: "GK_KENDANG.svg", samples: "GK_KENDANG_{notename}_{stroke}.wav", volume: -18 },
        JEGOGAN: { type: "melodic", label: "JEGOGAN", svg_file: "GK_JEGOGAN.svg", samples: "GK_JEGOGAN_{notename}_{stroke}.mp3", volume: -24 },
        PENYACAH: { type: "melodic", label: "PENYACAH", svg_file: "GK_PENYACAH.svg", samples: "GK_PENYACAH_{notename}_{stroke}.mp3", volume: -24 },
        CALUNG: { type: "melodic", label: "CALUNG", svg_file: "GK_CALUNG.svg", samples: "GK_CALUNG_{notename}_{stroke}.mp3", volume: -24 },
        PEMADE_POLOS: { type: "melodic", label: "- PEMADE_POLOS", svg_file: "GK_GANGSA.svg", samples: "GK_PEMADE_{notename}_{stroke}.mp3", volume: -24 },
        PEMADE_SANGSIH: { type: "melodic", label: "- PEMADE_SANGSIH", svg_file: "GK_GANGSA.svg", samples: "GK_PEMADE_{notename}_{stroke}.mp3", volume: -24 },
        KANTILAN_POLOS: { type: "melodic", label: "- KANTILAN_POLOS", svg_file: "GK_GANGSA.svg", samples: "GK_KANTILAN_{notename}_{stroke}.mp3", volume: -24 },
        KANTILAN_SANGSIH: { type: "melodic", label: "- KANTILAN_SANGSIH", svg_file: "GK_GANGSA.svg", samples: "GK_KANTILAN_{notename}_{stroke}.mp3", volume: -24 },
        UGAL: { type: "melodic", label: "UGAL", svg_file: "GK_GANGSA.svg", samples: "GK_UGAL_{notename}_{stroke}.mp3", volume: -24 },
        TROMPONG: { type: "melodic", label: "TROMPONG", svg_file: "", samples: "GK_TROMPONG_{notename}_{stroke}.mp3", volume: -24 },
        REYONG: { type: "melodic", label: "REYONG", svg_file: "GK_REYONG.svg", samples: "GK_REYONG_{notename}_{stroke}.mp3", volume: -24 },
        REYONG_1: { type: "melodic", label: "- REYONG_1", svg_file: "GK_REYONG.svg", samples: "GK_REYONG_{notename}_{stroke}.mp3", volume: -24 },
        REYONG_2: { type: "melodic", label: "- REYONG_2", svg_file: "GK_REYONG.svg", samples: "GK_REYONG_{notename}_{stroke}.mp3", volume: -24 },
        REYONG_3: { type: "melodic", label: "- REYONG_3", svg_file: "GK_REYONG.svg", samples: "GK_REYONG_{notename}_{stroke}.mp3", volume: -24 },
        REYONG_4: { type: "melodic", label: "- REYONG_4", svg_file: "GK_REYONG.svg", samples: "GK_REYONG_{notename}_{stroke}.mp3", volume: -24 },
    },
    SEMAR_PAGULINGAN: {
        GONGS: { type: "percussion", label: "GONGS", svg_file: "SP_GONGS.svg", samples: "SP_GONGS_{notename}_{stroke}.mp3", volume: -24 },
        KENDANG: { type: "percussion", label: "KENDANG", svg_file: "SP_KENDANG.svg", samples: "SP_KENDANG_{notename}_{stroke}.mp3", volume: -24 },
        JEGOGAN: { type: "melodic", label: "JEGOGAN", svg_file: "SP_JEGOGAN.svg", samples: "SP_JEGOGAN_{notename}_{stroke}.mp3", volume: -24 },
        CALUNG: { type: "melodic", label: "CALUNG", svg_file: "SP_CALUNG.svg", samples: "SP_CALUNG_{notename}_{stroke}.mp3", volume: -24 },
        PEMADE_POLOS: { type: "melodic", label: "- PEMADE_POLOS", svg_file: "SP_GANGSA.svg", samples: "SP_PEMADE_{notename}_{stroke}.mp3", volume: -24 },
        PEMADE_SANGSIH: { type: "melodic", label: "- PEMADE_SANGSIH", svg_file: "SP_GANGSA.svg", samples: "SP_PEMADE_{notename}_{stroke}.mp3", volume: -24 },
        KANTILAN_POLOS: { type: "melodic", label: "- KANTILAN_POLOS", svg_file: "SP_GANGSA.svg", samples: "SP_KANTILAN_{notename}_{stroke}.mp3", volume: -24 },
        KANTILAN_SANGSIH: { type: "melodic", label: "- KANTILAN_SANGSIH", svg_file: "SP_GANGSA.svg", samples: "SP_KANTILAN_{notename}_{stroke}.mp3", volume: -24 },
        TROMPONG: { type: "melodic", label: "TROMPONG", svg_file: "SP_TROMPONG.svg", samples: "SP_TROMPONG_{notename}_{stroke}.mp3", volume: -24 },
    }
}

export const cInstrumentConfigs: Record<string, string[]> = {
    REYONG_13: ['REYONG_1', 'REYONG_3'],
    REYONG_24: ['REYONG_2', 'REYONG_4'],
    REYONG: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4'],
    KANTILAN: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'],
    PEMADE: ['PEMADE_POLOS', 'PEMADE_SANGSIH'],
    GANGSA_POLOS: ['KANTILAN_POLOS', 'PEMADE_POLOS'],
    GANGSA_SANGSIH: ['KANTILAN_SANGSIH', 'PEMADE_SANGSIH'],
    GANGSA: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH', 'PEMADE_POLOS', 'PEMADE_SANGSIH'],
    MELODIC: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH', 'PEMADE_POLOS', 'PEMADE_SANGSIH', "JEGOGAN", "PENYACAH", "CALUNG", 'REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4']
}
// const alphabetConfig: { [pos: string]: { [symbol: string]: string } } = {};
// for (const [pos, value] of Object.entries(instrumentConfigs)) {
//     alphabetConfig[pos] = Object.fromEntries(value.alphabet.map((symbol, index) =>
//         [symbol, value.samples[index]]
//     ))
// }
// console.log(alphabetConfig);

export const alphabetConfigByGroup: AlphabetConfig = {
    "0": { KENDANG: [["CUNG", "CUNGKUNG"]] },
    "8": { KENDANG: [["KA", "KAPAK"]] },
    "9": { KENDANG: [["DE", "DETUT"]] },
    "G": { GONGS: [["GIR", "OPEN"]] },
    "P": { GONGS: [["PUR", "OPEN"]] },
    "T": { GONGS: [["TONG", "OPEN"]] },
    "(": { KENDANG: [["TUT", "DETUT"]] },
    ")": { KENDANG: [["KUNG", "CUNGKUNG"]] },
    "*": { KENDANG: [["PAK", "KAPAK"]] },
    "o,": { GANGSA: [["DONG0", "OPEN"]], UGAL: [["DONG0", "OPEN"]] },
    "e,": { GANGSA: [["DENG0", "OPEN"]], UGAL: [["DENG0", "OPEN"]], REYONG: [["DENG0", "OPEN"]] },
    "u,": { GANGSA: [["DUNG0", "OPEN"]], UGAL: [["DUNG0", "OPEN"]], REYONG: [["DUNG0", "OPEN"]] },
    "a,": { GANGSA: [["DANG0", "OPEN"]], UGAL: [["DANG0", "OPEN"]], REYONG: [["DANG0", "OPEN"]] },
    "i": { MELODIC: [["DING1", "OPEN"]] },
    "o": { MELODIC: [["DONG1", "OPEN"]] },
    "e": { MELODIC: [["DENG1", "OPEN"]] },
    "u": { MELODIC: [["DUNG1", "OPEN"]] },
    "a": { MELODIC: [["DANG1", "OPEN"]] },
    "i<": { GANGSA: [["DING2", "OPEN"]], UGAL: [["DING2", "OPEN"]], REYONG: [["DING2", "OPEN"]] },
    "o<": { REYONG: [["DONG2", "OPEN"]] },
    "e<": { REYONG: [["DENG2", "OPEN"]] },
    "u<": { REYONG: [["DUNG2", "OPEN"]] },
    "o,/": { GANGSA: [["DONG0", "ABBREVIATED"]], UGAL: [["DONG0", "ABBREVIATED"]] },
    "e,/": { GANGSA: [["DENG0", "ABBREVIATED"]], UGAL: [["DENG0", "ABBREVIATED"]], REYONG: [["DENG0", "ABBREVIATED"]] },
    "u,/": { GANGSA: [["DUNG0", "ABBREVIATED"]], UGAL: [["DUNG0", "ABBREVIATED"]], REYONG: [["DUNG0", "ABBREVIATED"]] },
    "a,/": { GANGSA: [["DANG0", "ABBREVIATED"]], UGAL: [["DANG0", "ABBREVIATED"]], REYONG: [["DANG0", "ABBREVIATED"]] },
    "i/": { GANGSA: [["DING1", "ABBREVIATED"]], UGAL: [["DING1", "ABBREVIATED"]], REYONG: [["DING1", "ABBREVIATED"]] },
    "o/": { GANGSA: [["DONG1", "ABBREVIATED"]], UGAL: [["DONG1", "ABBREVIATED"]], REYONG: [["DONG1", "ABBREVIATED"]] },
    "e/": { GANGSA: [["DENG1", "ABBREVIATED"]], UGAL: [["DENG1", "ABBREVIATED"]], REYONG: [["DENG1", "ABBREVIATED"]] },
    "u/": { GANGSA: [["DUNG1", "ABBREVIATED"]], UGAL: [["DUNG1", "ABBREVIATED"]], REYONG: [["DUNG1", "ABBREVIATED"]] },
    "a/": { GANGSA: [["DANG1", "ABBREVIATED"]], UGAL: [["DANG1", "ABBREVIATED"]], REYONG: [["DANG1", "ABBREVIATED"]] },
    "i</": { GANGSA: [["DING2", "ABBREVIATED"]], UGAL: [["DING2", "ABBREVIATED"]], REYONG: [["DING2", "ABBREVIATED"]] },
    "o</": { REYONG: [["DONG2", "ABBREVIATED"]] },
    "e</": { REYONG: [["DENG2", "ABBREVIATED"]] },
    "u</": { REYONG: [["DUNG2", "ABBREVIATED"]] },
    "o,?": { GANGSA: [["DONG0", "MUTED"]], UGAL: [["DONG0", "MUTED"]] },
    "e,?": { GANGSA: [["DENG0", "MUTED"]], UGAL: [["DENG0", "MUTED"]], REYONG: [["DENG0", "MUTED"]] },
    "u,?": { GANGSA: [["DUNG0", "MUTED"]], UGAL: [["DUNG0", "MUTED"]], REYONG: [["DUNG0", "MUTED"]] },
    "a,?": { GANGSA: [["DANG0", "MUTED"]], UGAL: [["DANG0", "MUTED"]], REYONG: [["DANG0", "MUTED"]] },
    "i?": { GANGSA: [["DING1", "MUTED"]], UGAL: [["DING1", "MUTED"]], REYONG: [["DING1", "MUTED"]] },
    "o?": { GANGSA: [["DONG1", "MUTED"]], UGAL: [["DONG1", "MUTED"]], REYONG: [["DONG1", "MUTED"]] },
    "e?": { GANGSA: [["DENG1", "MUTED"]], UGAL: [["DENG1", "MUTED"]], REYONG: [["DENG1", "MUTED"]] },
    "u?": { GANGSA: [["DUNG1", "MUTED"]], UGAL: [["DUNG1", "MUTED"]], REYONG: [["DUNG1", "MUTED"]] },
    "a?": { GANGSA: [["DANG1", "MUTED"]], UGAL: [["DANG1", "MUTED"]], REYONG: [["DANG1", "MUTED"]] },
    "i<?": { GANGSA: [["DING2", "MUTED"]], UGAL: [["DING2", "MUTED"]], REYONG: [["DING2", "MUTED"]] },
    "o<?": { REYONG: [["DONG2", "MUTED"]] },
    "e<?": { REYONG: [["DENG2", "MUTED"]] },
    "u<?": { REYONG: [["DUNG2", "MUTED"]] },
    "r": { REYONG_1: [["DENG0", "OPEN"], ["DING1", "OPEN"]] },
    "b": { REYONG_1: [["DENG0", "OPEN"], ["DANG0", "OPEN"]], REYONG_2: [["DING1", "OPEN"], ["DENG1", "OPEN"]], REYONG_3: [["DUNG1", "OPEN"], ["DING2", "OPEN"]], REYONG_4: [["DONG2", "OPEN"], ["DUNG2", "OPEN"]] },
    "b/": { REYONG_1: [["DENG0", "ABBREVIATED"], ["DANG0", "ABBREVIATED"]], REYONG_2: [["DING1", "ABBREVIATED"], ["DENG1", "ABBREVIATED"]], REYONG_3: [["DUNG1", "ABBREVIATED"], ["DING2", "ABBREVIATED"]], REYONG_4: [["DONG2", "ABBREVIATED"], ["DUNG2", "ABBREVIATED"]] },
    "b?": { REYONG_1: [["DENG0", "MUTED"], ["DANG0", "MUTED"]], REYONG_2: [["DING1", "MUTED"], ["DENG1", "MUTED"]], REYONG_3: [["DUNG1", "MUTED"], ["DING2", "MUTED"]], REYONG_4: [["DONG2", "MUTED"], ["DUNG2", "MUTED"]] },
    "x?": { REYONG_1: [["DUNG0", "TICKOPEN"]], REYONG_2: [["DONG1", "TICKOPEN"]], REYONG_3: [["DANG1", "TICKOPEN"]], REYONG_4: [["DENG2", "TICKOPEN"]] },
    "x": { REYONG_1: [["DUNG0", "TICKMUTED"]], REYONG_2: [["DONG1", "TICKMUTED"]], REYONG_3: [["DANG1", "TICKMUTED"]], REYONG_4: [["DENG2", "TICKMUTED"]] },
}

export const animationConfig = {
    highlight: {
        OPEN: ["green", "lime"],
        ABBREVIATED: ["blue", "aqua"],
        MUTED: ["purple", "fuchsia"],
        TICKOPEN: ["green", "lime"],
        TICKMUTED: ["blue", "aqua"],
        KAPAK: ["green"],
        DETUT: ["blue"],
        CUNGKUNG: ["purple"]
    }
}

export const alphabetConfig = expandAlphabetConfigByGroup()
console.log(alphabetConfig)

// Check that all expected sound files are present (currently set to check GONG_KEBYAR only)
// Suppress the next line after performing the check
// await sanityCheck()


// Expands each instrumentgroup->value pair in alphabetConfigByGroup to
// an instrument->value pair for each instrument in the instrumentgroup.
function expandAlphabetConfigByGroup(): AlphabetConfig {
    return Object.fromEntries(Object.entries(alphabetConfigByGroup).map(([symbol, instrdict]) =>
        [symbol, Object.fromEntries(Object.entries(instrdict).map(([group, notes]) =>
            cInstrumentConfigs[group] ? cInstrumentConfigs[group].map((pos) => [pos, notes]) : [[group, notes]]
        ).flat())]
    ))
}

function mapInstruments() {

}

function soundfileName(instrumentarium: string, position: string, note: [pitch: string, stroke: string]): string | null {
    const fileTemplate = instrumentConfigs[instrumentarium][position]?.samples
    if (fileTemplate) return fileTemplate.replace('{notename}', `${note[0]}`).replace('{stroke}', `${note[1]}`)
    else return null
}

function expandAlphabetConfigByGroupOld(): AlphabetConfig {
    const newAlphaDict: AlphabetConfig = {};
    Object.keys(alphabetConfigByGroup).forEach((key) => {
        const newEntry: { [instrument: string]: KeystrokeConfig[] } = {};
        const value = alphabetConfigByGroup[key];
        Object.keys(value).forEach((instrgroup) => {
            var instruments: string[] = [];
            if (instrgroup in cInstrumentConfigs) {
                instruments = cInstrumentConfigs[instrgroup];
            } else {
                instruments = [instrgroup];
            }
            instruments.forEach((instr) => {
                newEntry[instr] = value[instrgroup];
            });
        });
        newAlphaDict[key] = newEntry;
    });
    return newAlphaDict;
};


import { fileExists } from "../utils/filesystem"

async function sanityCheck() {
    var logMessage = ""
    const instrPitchStroke = Object.entries(alphabetConfig).map(([key, config]) =>
        Object.entries(config).map(([instr, notes]) =>
            notes.map(([pitch, stroke]) => [instr, pitch, stroke])
        )).flat().flat()
    for (const [instr, pitch, stroke] of instrPitchStroke) {
        const filename = instrumentConfigs.GONG_KEBYAR[instr].samples.replace('{notename}', `${pitch}`).replace('{stroke}', `${stroke}`)
        const found = instr in instrumentConfigs.GONG_KEBYAR && await fileExists(SOUNDS_FOLDER + filename)
        if (!found) logMessage += `X ${filename} not found in ${SOUNDS_FOLDER}\n`
        // else console.log(`V ${filename} found in ${SOUNDS_FOLDER}`)
    }
    if (logMessage) console.log(logMessage)
}


