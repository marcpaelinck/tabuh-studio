const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: true,
    createTimeline: false,
    EditorWindow: false,
    useKeyboardListener: false,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    PlayBackButtons: false,
    registerComponent: false,
    ScorePlayer: false,
    StaffNode: false,
    SystemContextMenu: false,
    SystemNode: true,
    SummaryItem: false
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
