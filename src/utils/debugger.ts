const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: true,
    createTimeline: false,
    EditorWindow: true,
    keyboardListener: false,
    Menu: false,
    MeasureNode: true,
    NavigationCell: true,
    registerComponent: false,
    ScorePlayer: false,
    StaffNode: true,
    SystemNode: true
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
