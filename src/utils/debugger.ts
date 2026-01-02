const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: false,
    createTimeline: false,
    EditorWindow: false,
    useKeyboardListener: false,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    registerComponent: false,
    ScorePlayer: false,
    StaffNode: false,
    SystemContextMenu: false,
    SystemNode: false,
    SystemSummary: true
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
