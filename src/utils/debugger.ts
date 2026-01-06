const debugOn: Record<string, boolean> = {
    createInstrument: false,
    createTimelineFromEditor: false,
    createTimeline: false,
    EditorWindow: false,
    useKeyboardListener: false,
    Menu: false,
    MeasureNode: true,
    NavigationCell: false,
    PlayBackButtons: false,
    registerComponent: false,
    ScorePlayer: false,
    StaffNode: true,
    SystemContextMenu: false,
    SystemNode: true,
    SummaryItem: false
}

export const debug = (message: any, caller: string) => {
    if (debugOn[caller]) console.log(message)
}
