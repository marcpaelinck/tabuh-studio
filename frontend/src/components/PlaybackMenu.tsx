import type { Position } from '@tabuhstudio/shared'
import type { JSX } from 'react'
import { Activity, useEffect, useState } from 'react'
import { HStack, Radio, RadioGroup, SelectPicker, Stack, Text } from 'rsuite'
import { speedList } from '../config/config'
import { focusDefaultOption, useUserSelectionStore } from '../stores/useUserSettingsStore'
import type { PlaybackCursorStyle } from '../typing/animation'
import { type Appearance, type ExtendedOption, type ScoreInfo } from '../typing/interface'
import type { Score } from '../typing/score'
import { debug } from '../utils/debugger'
import { createFocusMenuItems, createSpeedMenuItems } from '../utils/selectorsUtils'

export interface PlayerMenuProps {
    appAppearance: Appearance
    score: Score | undefined
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
}

export default function PlaybackMenu({ appAppearance, score, scoreMenuOptions }: PlayerMenuProps): JSX.Element {
    const [focusMenuItems, setFocusMenuItems] = useState<ExtendedOption<Position[]>[]>([focusDefaultOption])
    const [speedMenuItems, setSpeedMenuItems] = useState<ExtendedOption<number>[]>([])
    const selectedScoreOption = useUserSelectionStore((state) => state.selectedScoreOption)
    const setSelectedScoreOption = useUserSelectionStore((state) => state.setSelectedScoreOption)
    const selectedFocusOption = useUserSelectionStore((state) => state.selectedFocusOption)
    const setSelectedFocusOption = useUserSelectionStore((state) => state.setSelectedFocusOption)
    const selectedSpeedOption = useUserSelectionStore((state) => state.selectedSpeedOption)
    const setSelectedSpeedOption = useUserSelectionStore((state) => state.setSelectedSpeedOption)
    const selectedCursorStyle = useUserSelectionStore((state) => state.selectedCursorStyle)
    const setSelectedCursorStyle = useUserSelectionStore((state) => state.setSelectedCursorStyle)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
    }, [])

    useEffect(() => console.log(`FOCUS=${selectedFocusOption.value}`), [selectedFocusOption])

    useEffect(() => debug(`SELECTED SPEED: ${JSON.stringify(selectedSpeedOption)}`), [selectedSpeedOption])

    useEffect(() => {
        const updateFocusMenu = async () => {
            if (score) {
                setFocusMenuItems(createFocusMenuItems(score))
            }
        }
        updateFocusMenu()
        debug(`Resetting focus value because score is now ${score?.title}`)
        setSelectedFocusOption(focusDefaultOption)
    }, [score])

    return (
        <div className="selectors flex flex-wrap">
            <Stack direction={{ xs: 'column', sm: 'row' }}>
                {/* Score selector is only visible on small screens where only the player is displayed. */}
                <Activity mode={appAppearance == 'full' ? 'hidden' : 'visible'}>
                    <SelectPicker
                        id="scoreselector"
                        searchable={false}
                        cleanable={false}
                        label="score:"
                        data={scoreMenuOptions}
                        value={selectedScoreOption?.value}
                        onSelect={(value, item) => {
                            setSelectedScoreOption(item as ExtendedOption<ScoreInfo>)
                        }}
                        // Onchange needed because value can be null / initial selector state is unselected
                        // (also needed if cleanable==true)
                        onChange={(value, e) => {
                            if (value === null) setSelectedScoreOption(null)
                        }}
                    />
                </Activity>
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
                <HStack className="pl-2 pr-2 rs-picker-toggle rs-btn bg-white border border-solid border-(--rs-border-primary)">
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
            </Stack>
        </div>
    )
}
