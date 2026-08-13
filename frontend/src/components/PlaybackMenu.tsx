import type { Position } from '@tabuhstudio/shared'
import type { JSX } from 'react'
import { HStack, Radio, RadioGroup, SelectPicker, Stack, Text } from 'rsuite'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'
import type { PlaybackCursorStyle } from '../typing/animation'
import { type ExtendedOption } from '../typing/interface'
import { Tip } from './Tooltipped'

// Desktop-only playback selectors (focus / speed / cursor style). The menu-item lists and
// the reset-on-score-change logic are owned by MainWindow and passed in; the mobile UI uses
// its own bottom-nav views instead of this component. Score selection lives in the Notation
// menu's "Open…" drawer (desktop) / the mobile "Scores" view.
export interface PlayerMenuProps {
    focusMenuItems: ExtendedOption<Position[]>[]
    speedMenuItems: ExtendedOption<number>[]
}

export default function PlaybackMenu({ focusMenuItems, speedMenuItems }: PlayerMenuProps): JSX.Element {
    const { selectedFocusOption, setSelectedFocusOption } = useUserSelectionStore()
    const { selectedSpeedOption, setSelectedSpeedOption } = useUserSelectionStore()
    const { selectedCursorStyle, setSelectedCursorStyle } = useUserSelectionStore()

    return (
        <div className="selectors flex flex-wrap" data-tour="playback-menu">
            <Stack direction={{ xs: 'column', sm: 'row' }}>
                <Tip tip="Which instrument the animation follows during playback">
                    <span data-tour="pb-focus" className="inline-block">
                        <SelectPicker
                            id="focusselector"
                            searchable={false}
                            cleanable={false}
                            label="focus:"
                            data={focusMenuItems}
                            value={selectedFocusOption.value}
                            onSelect={(value, item) => {
                                setSelectedFocusOption(item as ExtendedOption<Position[]>)
                            }}
                        />
                    </span>
                </Tip>
                <Tip tip="Playback speed">
                    <span data-tour="pb-speed" className="inline-block">
                        <SelectPicker
                            id="speedselector"
                            searchable={false}
                            cleanable={false}
                            label="speed:"
                            data={speedMenuItems}
                            value={selectedSpeedOption.value}
                            onSelect={(value, item) => {
                                setSelectedSpeedOption(item as ExtendedOption<number>)
                            }}
                        />
                    </span>
                </Tip>
                <Tip tip="How the playback cursor highlights the notation">
                    <HStack
                        data-tour="pb-cursor"
                        className="pl-2 pr-2 rs-picker-toggle rs-btn bg-white border border-solid border-(--rs-border-primary)">
                        <Text className="text-(--rs-text-secondary)">cursor:</Text>
                        <RadioGroup
                            name="radio-group-controlled"
                            inline
                            value={selectedCursorStyle}
                            onChange={(value) => setSelectedCursorStyle(value as PlaybackCursorStyle)}>
                            <Radio value="Beat">beat</Radio>
                            <Radio value="System">system</Radio>
                        </RadioGroup>
                    </HStack>
                </Tip>
            </Stack>
        </div>
    )
}
