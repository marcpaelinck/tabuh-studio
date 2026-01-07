import _ from 'lodash'

//
const debugOn: Record<string, boolean> = {
    createSchedule: false,
    EditorWindow: false,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    PlaybackButtons: true,
    playbackReducer: true,
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

// regex used to parse call stack to determine caller module
// const regExp: RegExp = /([\w_]+).*@[\w/:\.\-_]+\/([\w_\-]+)\.\w+\?/g
const regExpLineSplit: RegExp = /(.+)(?:[\n\r]+|$)/g
//JavaScriptCore (a.o. Firefox)
const regExpJSC: RegExp = /([\w_\-\/<]+)@.+?([\w_\-]+)\.(?:ts|tsx|js)/g
//V0 (a.o. Chrome)
const regExpV8: RegExp = / +at +([\w_\-]+).+?([\w_\-]+)\.(?:ts|tsx|js)/g

export const debug = (message: any, raw: boolean = false) => {
    const stack = new Error().stack as string
    // Split in separate txt lines and select the second line:
    // the first line contains the trace for the current function call (debug)
    const linematches = [...stack?.matchAll(regExpLineSplit)].map((match) => match[1])
    // Parse the trace message. Try two formats
    var trace = [...linematches[1]?.matchAll(regExpJSC)]
    if (trace.length == 0) trace = [...linematches[2]?.matchAll(regExpV8)]
    // Next to the original string, parsing should return two captured values:
    // the calling function and the name of its module
    if (!trace || trace.length == 0 || trace[0].length < 3) {
        console.log('debug: could not determine caller.')
        console.log(linematches[1])
        console.log(trace)
        return
    }
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
