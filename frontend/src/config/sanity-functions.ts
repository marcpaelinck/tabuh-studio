import { getAllPositions } from '@tabuhstudio/shared/config/configAccess'
import { fileExists } from '../utils/filesystem'
import { doSanityCheck } from './config'
import { sampleSetForPosition } from './sampleSets'

// Checks if all sound files can be found.
// File names should be formatted as {instrumentarium}_{instrument}_{tone}_{muting}.mp3
// e.g. GK_JEGOGAN_I1_O.mp3
async function sanityCheck() {
    var logMessage = ''
    for (const position of getAllPositions()) {
        const set = sampleSetForPosition(position)
        const files = set?.files[position]
        if (!set || !files) continue
        for (const filename of Object.values(files)) {
            const found = await fileExists(set.folder + filename)
            if (!found) logMessage += `X ${filename} not found in ${set.folder}\n`
        }
    }
    if (logMessage) console.error(logMessage)
}
if (doSanityCheck) sanityCheck()

/*______________ ALPHABET _______________*/
