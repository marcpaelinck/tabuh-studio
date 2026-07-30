import { type Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import { fileExists } from '../utils/filesystem'
import { doSanityCheck, SOUNDS_FOLDER } from './config'

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

/*______________ ALPHABET _______________*/
