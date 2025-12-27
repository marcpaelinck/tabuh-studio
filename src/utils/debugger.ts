const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: false,
    createTimeline: false,
    EditorWindow: false,
    useKeyboardListener: true,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    registerComponent: false,
    ScorePlayer: false,
    StaffNode: false,
    SystemContextMenu: true,
    SystemNode: false
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
