import _ from 'lodash'

//
const debugOn: Record<string, boolean> = {
    createSchedule: false,
    EditorWindow: true,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    PlaybackButtons: false,
    playbackReducer: false,
    registerComponent: false,
    score: false,
    ScorePlayer: false,
    StaffNode: false,
    SystemContextMenu: false,
    SystemNode: false,
    SummaryItem: false,
    TabuhEditor: false,
    useInstruments: false,
    useKeyboardListener: false
}

// regex used to parse the call stack to determine the caller module

// Split stack in separate lines
const regExpLineSplit: RegExp = /(.+)(?:[\n\r]+|$)/g
// Parse a single line: JavaScriptCore (a.o. Firefox)
const regExpJSC: RegExp = /([\w_\-\/<]+)@.+?([\w_\-]+)\.(?:ts|tsx|js)/g
// Parse a single line: V8 (a.o. Chrome)
const regExpV8: RegExp = / +at +([\w_\-]+).+?([\w_\-]+)\.(?:ts|tsx|js)/g

export const debug = (message: any, raw: boolean = false) => {
    const stack = new Error().stack as string
    // Split in separate text lines
    const linematches = [...stack?.matchAll(regExpLineSplit)].map((match) => match[1])
    // Try both formats. Parse the second (JSC) or third (V8) line which should contain information
    // about the caller function. Each RegExp string returns an empty match for the 'other' format.
    var trace = [...linematches[1]?.matchAll(regExpJSC)]
    if (trace.length == 0) trace = [...linematches[2]?.matchAll(regExpV8)]
    // Validate result.
    var valid = true
    if (!trace || trace.length == 0 || trace[0].length < 3) {
        console.log('debug: could not determine caller.')
        valid
    }
    // Next to the original string, parsing should return two captured values:
    // the calling function and the name of its module.
    const [func, module]: string[] = trace[0].slice(1, 3)
    // Check if the module is in the above debugOn list
    if (!(module in debugOn)) console.log(`debug: no entry for ${module}.`)

    if (debugOn[module]) {
        if (raw) {
            console.log(message)
            return
        }
        const callerTxt = module ? `${func} [${module}]` : ''
        var logText = message
        if (_.isArray(message) || _.isObject(message)) logText = JSON.stringify(message)
        console.log(`${callerTxt}: ${logText}`)
    }
}
