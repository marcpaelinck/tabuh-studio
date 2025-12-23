const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: true,
    createTimeline: false,
    EditorWindow: false,
    keyboardListener: false,
    Menu: false,
    MeasureNode: true,
    NavigationCell: false,
    registerComponent: false,
    ScorePlayer: false,
    SystemGrid: false
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
