import _ from 'lodash'

// Enable/disable the debug function for each module in the list below.
// Specify a function by setting the dict value to {functionName: true}

const mainSwitch = true // easily switch off all logging
const debugOn: Record<string, boolean | Record<string, boolean>> = {
    UNKNOWN: false,
    createSchedule: false,
    Dashboard: false,
    EditorWindow: false,
    ExecutionForm: false,
    ExecutionItemForm: false,
    executionManager: false,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    PartIndicator: false,
    PlaybackButtons: { moveEditorCursor: false },
    playbackReducer: false,
    playbackManager: false,
    registerComponent: false,
    score: false,
    ScorePlayer: false,
    StaffNode: false,
    SystemContextMenu: false,
    SystemNode: false,
    SummaryItem: false,
    TabuhEditor: false,
    TabuhEditorMenu: false,
    useEditorScoreManager: false,
    useInstruments: false,
    useKeyboard: false,
    usePartManager: false,
    useRules: false,
    useScoreReader: false,
    validationManager: false
}

// The RegExp constants are used to parse the call stack to determine the
// module from which the debug function was called

// Split stack in separate lines
const regExpLineSplit: RegExp = /(.+)(?:[\n\r]+|$)/g
// Parse a single line: V8 JavaScript engine (Chrome, Edge, Opera, Brave, Node.js, and Electron)
const regExpV8: RegExp = / +at +([\w_\-]+).+?([\w_\-]+)\.(?:ts|tsx|js)/g
// Parse a single line: SpiderMonkey engine (Firefox) and JavaScriptCore engine (Safari)
const regExpJSC: RegExp = /([\w_\-\/<]+)@.+?([\w_\-]+)\.(?:ts|tsx|js)/g

// Use this function in any module that requires debug logging to the console.
// The name of the module should be added to the above list.
//
export const debug = (message: any, raw: boolean = false, caller?: string) => {
    if (!mainSwitch) return

    const stack = new Error('debug').stack as string
    // Split in separate text lines
    const linematches = [...stack?.matchAll(regExpLineSplit)].map((match) => match[1])
    // Try both formats. Parse the second (JSC) or third (V8) line which should contain information
    // about the caller function. Each RegExp string returns an empty match for the 'other' format.
    var trace = [...linematches[1]?.matchAll(regExpJSC)]
    if (trace.length == 0) trace = [...linematches[2]?.matchAll(regExpV8)]
    // Validate result.
    if (!trace || trace.length == 0 || trace[0].length < 3) {
        console.log('debug: add the caller.')
    }
    // Next to the original string, parsing should return two captured values:
    // the calling function and the name of its module.
    const [func, module]: string[] = caller
        ? ['', caller]
        : trace && trace.length >= 1 && trace[0].length >= 3 && trace[0].slice(1, 3)[1] != 'index'
          ? trace[0].slice(1, 3)
          : ['', 'UNKNOWN']
    // Check if the module is in the above debugOn list
    if (!(module in debugOn)) console.log(`debug: no entry for ${module}.`)

    if (
        debugOn[module] == true ||
        (typeof debugOn[module] == 'object' &&
            // if func is async, its name will be followed by a digit.
            (debugOn[module][func] == true || debugOn[module][func.slice(0, -1)] == true))
    ) {
        const callerTxt = module ? `${func} [${module}]` : ''
        if (raw || typeof message == 'object') {
            if (!raw) console.log(`${callerTxt}:`)
            console.log(message)
            return
        }
        var logText = message
        if (_.isArray(message) || _.isObject(message)) logText = JSON.stringify(message)
        console.log(`${callerTxt}: ${logText}`)
    }
}
