import type { JSX } from 'react'
import { Activity, useEffect, useState } from 'react'
import { HStack, Radio, RadioGroup, SelectPicker, Stack, Text } from 'rsuite'
import { speedList } from '../config/config'
import type { PlaybackCursorStyle } from '../typing/animation'
import type { Position } from '../typing/basetypes'
import { focusDefaultOption, type Appearance, type ExtendedOption, type ScoreInfo } from '../typing/interface'
import type { PlaybackSettings } from '../typing/playback'
import type { Score } from '../typing/score'
import { debug } from '../utils/debugger'
import { createFocusMenuItems, createSpeedMenuItems } from '../utils/selectorsUtils'

export interface PlayerMenuProps {
    appAppearance: Appearance
    score: Score | undefined
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    playbackSettings: PlaybackSettings
}

export default function PlaybackMenu({
    appAppearance,
    score,
    scoreMenuOptions,
    playbackSettings
}: PlayerMenuProps): JSX.Element {
    const [focusMenuItems, setFocusMenuItems] = useState<ExtendedOption<Position[]>[]>([focusDefaultOption])
    const [speedMenuItems, setSpeedMenuItems] = useState<ExtendedOption<number>[]>([])

    useEffect(() => {
        const updateFixedMenus = async () => {
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
    }, [])

    useEffect(
        () => debug(`SELECTED SPEED: ${JSON.stringify(playbackSettings.selectedSpeedOption)}`),
        [playbackSettings.selectedSpeedOption]
    )

    useEffect(() => {
        const updateFocusMenu = async () => {
            if (score) {
                setFocusMenuItems(createFocusMenuItems(score))
            }
        }
        updateFocusMenu()
        debug(`Resetting focus value`)
        playbackSettings.setSelectedFocusOption(focusDefaultOption)
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
                        value={playbackSettings.selectedScoreOption?.value}
                        onSelect={(value, item) => {
                            playbackSettings.setSelectedScoreOption(item as ExtendedOption<ScoreInfo>)
                        }}
                        // Onchange needed because value can be null / initial selector state is unselected
                        // (also needed if cleanable==true)
                        onChange={(value, e) => {
                            if (value === null) playbackSettings.setSelectedScoreOption(null)
                        }}
                    />
                </Activity>
                <SelectPicker
                    id="focusselector"
                    searchable={false}
                    cleanable={false}
                    label="focus:"
                    data={focusMenuItems}
                    value={playbackSettings.selectedFocusOption.value}
                    onSelect={(value, item) => {
                        playbackSettings.setSelectedFocusOption(item as ExtendedOption<Position[]>)
                    }}
                />
                <SelectPicker
                    id="speedselector"
                    searchable={false}
                    cleanable={false}
                    label="speed:"
                    data={speedMenuItems}
                    value={playbackSettings.selectedSpeedOption.value}
                    onSelect={(value, item) => {
                        playbackSettings.setSelectedSpeedOption(item as ExtendedOption<number>)
                    }}
                />
                <HStack className="pl-2 pr-2 rs-picker-toggle rs-btn bg-white border border-solid border-(--rs-border-primary)">
                    <Text className="text-(--rs-text-secondary)">cursor:</Text>
                    <RadioGroup
                        name="radio-group-controlled"
                        inline
                        value={playbackSettings.selectedCursorStyle}
                        onChange={(value) => playbackSettings.setSelectedCursorStyle(value as PlaybackCursorStyle)}>
                        <Radio value="Beat">beat</Radio>
                        <Radio value="System">system</Radio>
                    </RadioGroup>
                </HStack>
            </Stack>
        </div>
    )
}
