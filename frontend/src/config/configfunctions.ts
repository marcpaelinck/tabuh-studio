import { SILENCE_EXTENDING_CHARS, SILENCE_MUTING_CHARS } from '@tabuhstudio/shared/noteChars'
import type { Position } from '../typing/basetypes'
import { fileExists } from '../utils/filesystem'
import { doSanityCheck, positionConfigs, SOUNDS_FOLDER } from './config'

export function soundFiles(notes: string[], fileTemplate: string): string[] {
    return notes.map(([tone, muting]) => fileTemplate.replace('{tone}', `${tone}`).replace('{muting}', `${muting}`))
}

export function soundFile(note: string, fileTemplate: string): string {
    return fileTemplate.replace('{note}', note)
}

export const isExtension = (symbol: string): boolean => SILENCE_EXTENDING_CHARS.has(symbol)
export const isMuting = (symbol: string): boolean => SILENCE_MUTING_CHARS.has(symbol)

// Checks if all sound files can be found.
// File names should be formatted as {instrumentarium}_{instrument}_{tone}_{muting}.mp3
// e.g. GK_JEGOGAN_I1_O.mp3
async function sanityCheck() {
    var logMessage = ''
    const instrPitchStroke = Object.entries(positionConfigs)
        .map(([instr, config]) =>
            Object.values(config.symbolToNoteNames)
                .flat()
                .map((note) => [instr, note])
        )
        .flat()
    for (const [position, note] of instrPitchStroke) {
        const filename = positionConfigs[position as Position].sampletemplate.replace('{note}', note)
        const found = position in positionConfigs && (await fileExists(SOUNDS_FOLDER + filename))
        if (!found) logMessage += `X ${filename} not found in ${SOUNDS_FOLDER}\n`
    }
    if (logMessage) console.error(logMessage)
}
if (doSanityCheck) sanityCheck()
