import type { JSX } from 'react'
import { Activity, useEffect, useState } from 'react'
import { HStack, Radio, RadioGroup, SelectPicker, Stack, Text } from 'rsuite'
import { speedList } from '../config/config'
import { focusDefaultOption, useUserSelectionStore } from '../stores/usePlaybackStore'
import type { PlaybackCursorStyle } from '../typing/animation'
import type { Position } from '../typing/basetypes'
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
    const userSelections = useUserSelectionStore((state) => state)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
    }, [])

    useEffect(
        () => debug(`SELECTED SPEED: ${JSON.stringify(userSelections.selectedSpeedOption)}`),
        [userSelections.selectedSpeedOption]
    )

    useEffect(() => {
        const updateFocusMenu = async () => {
            if (score) {
                setFocusMenuItems(createFocusMenuItems(score))
            }
        }
        updateFocusMenu()
        debug(`Resetting focus value`)
        userSelections.setSelectedFocusOption(focusDefaultOption)
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
                        value={userSelections.selectedScoreOption?.value}
                        onSelect={(value, item) => {
                            userSelections.setSelectedScoreOption(item as ExtendedOption<ScoreInfo>)
                        }}
                        // Onchange needed because value can be null / initial selector state is unselected
                        // (also needed if cleanable==true)
                        onChange={(value, e) => {
                            if (value === null) userSelections.setSelectedScoreOption(null)
                        }}
                    />
                </Activity>
                <SelectPicker
                    id="focusselector"
                    searchable={false}
                    cleanable={false}
                    label="focus:"
                    data={focusMenuItems}
                    value={userSelections.selectedFocusOption.value}
                    onSelect={(value, item) => {
                        userSelections.setSelectedFocusOption(item as ExtendedOption<Position[]>)
                    }}
                />
                <SelectPicker
                    id="speedselector"
                    searchable={false}
                    cleanable={false}
                    label="speed:"
                    data={speedMenuItems}
                    value={userSelections.selectedSpeedOption.value}
                    onSelect={(value, item) => {
                        userSelections.setSelectedSpeedOption(item as ExtendedOption<number>)
                    }}
                />
                <HStack className="pl-2 pr-2 rs-picker-toggle rs-btn bg-white border border-solid border-(--rs-border-primary)">
                    <Text className="text-(--rs-text-secondary)">cursor:</Text>
                    <RadioGroup
                        name="radio-group-controlled"
                        inline
                        value={userSelections.selectedCursorStyle}
                        onChange={(value) => userSelections.setSelectedCursorStyle(value as PlaybackCursorStyle)}>
                        <Radio value="Beat">beat</Radio>
                        <Radio value="System">system</Radio>
                    </RadioGroup>
                </HStack>
            </Stack>
        </div>
    )
}
