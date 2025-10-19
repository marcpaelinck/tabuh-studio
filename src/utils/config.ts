import { instrumentConfigs, SOUNDS_FOLDER, type Note } from "../config/config";
import { fileExists } from "./filesystem";

export function soundFiles(notes: Note[], fileTemplate: string): string[] {
    return notes.map(([tone, muting]) =>
        fileTemplate.replace('{tone}', `${tone}`).replace('{muting}', `${muting}`))
}

export function soundFile(note: string, fileTemplate: string): string {
    return fileTemplate.replace('{note}', note)
}

// Checks if all sound files can be found.
// File names should be formatted as {instrumentarium}_{instrument}_{tone}_{muting}.mp3
// e.g. GK_JEGOGAN_I1_O.mp3
export async function sanityCheck() {
    var logMessage = ""
    const instrPitchStroke = Object.entries(instrumentConfigs).map(([instr, config]) =>
        config.notes.flat().map((note) => [instr, note])
    ).flat()
    for (const [instr, note] of instrPitchStroke) {
        const filename = instrumentConfigs[instr].sampletemplate.replace('{note}', note)
        const found = instr in instrumentConfigs && await fileExists(SOUNDS_FOLDER + filename)
        if (!found) logMessage += `X ${filename} not found in ${SOUNDS_FOLDER}\n`
        // else console.log(`V ${filename} found in ${SOUNDS_FOLDER}`)
    }
    if (logMessage) console.log(logMessage)
}
