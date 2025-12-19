const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: false,
    createTimeline: false,
    EditorWindow: true,
    keyboardListener: true,
    Menu: false,
    NavigationCell: false,
    registerComponent: false,
    ScorePlayer: false,
    SystemGrid: true
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
