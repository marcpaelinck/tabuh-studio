import _ from 'lodash'

//
const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: false,
    createTimeline: false,
    EditorWindow: false,
    useKeyboardListener: false,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    PlaybackButtons: false,
    playbackReducer: true,
    registerComponent: false,
    ScorePlayer: false,
    StaffNode: false,
    SystemContextMenu: false,
    SystemNode: false,
    SummaryItem: false,
    TabuhEditor: false
}

// const regExpstr: string = '([\w_]+).*@[\w/:\.\-_]+\/([\w\._\-]+)\?'
const regExp: RegExp = /([\w_]+).*@[\w/:\.\-_]+\/([\w_\-]+)\.\w+\?/g

export const debug = (message: any, caller1: string, raw: boolean = false) => {
    const stack = new Error().stack as string
    const matches = [...stack?.matchAll(regExp)]
    const caller = matches.length >= 2 ? matches[1][2] : ''

    if (!caller) console.log('debug: could not determine caller.')
    if (!(caller in debugOn)) console.log(`debug: no entry for ${caller}.`)

    if (debugOn[caller]) {
        if (raw) {
            console.log(message)
            return
        }
        const callerTxt = caller ? `${matches[1][1]} [${matches[1][2]}]: ` : ''
        var logText = message
        if (_.isArray(message) || _.isObject(message)) logText = JSON.stringify(message)
        console.log(`${callerTxt}: ${logText}`)
    }
}
