const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: false,
    createTimeline: false,
    EditorWindow: true,
    useKeyboardListener: false,
    Menu: false,
    MeasureNode: false,
    NavigationCell: false,
    PlayBackButtons: false,
    registerComponent: false,
    ScorePlayer: false,
    StaffNode: false,
    SystemContextMenu: false,
    SystemNode: false,
    SummaryItem: true
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
