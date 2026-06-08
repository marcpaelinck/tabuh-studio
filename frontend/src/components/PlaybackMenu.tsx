import type { Dispatch, JSX } from 'react'
import { Activity, useEffect, useState } from 'react'
import { SelectPicker, Stack } from 'rsuite'
import { speedList } from '../config/config'
import type { Position } from '../typing/basetypes'
import { focusDefaultOption, type Appearance, type ExtendedOption, type ScoreInfo } from '../typing/interface'
import type { Score } from '../typing/score'
import { debug } from '../utils/debugger'
import { createFocusMenuItems, createSpeedMenuItems } from '../utils/selectorsUtils'

export default function PlayerMenu({
    appAppearance,
    score,
    scoreMenuOptions,
    selectedScoreOption,
    selectedFocusOption,
    selectedSpeedOption,
    setSelectedScoreOption,
    setSelectedFocusOption,
    setSelectedSpeedOption
}: {
    appAppearance: Appearance
    score: Score | undefined
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    selectedScoreOption: ExtendedOption<ScoreInfo> | null
    selectedFocusOption: ExtendedOption<Position[]>
    selectedSpeedOption: ExtendedOption<number>
    setSelectedScoreOption: Dispatch<ExtendedOption<ScoreInfo> | null>
    setSelectedFocusOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedSpeedOption: Dispatch<ExtendedOption<number>>
}): JSX.Element {
    const [focusMenuItems, setFocusMenuItems] = useState<ExtendedOption<Position[]>[]>([focusDefaultOption])
    const [speedMenuItems, setSpeedMenuItems] = useState<ExtendedOption<number>[]>([])

    useEffect(() => {
        const updateFixedMenus = async () => {
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
    }, [])

    useEffect(() => debug(`SELECTED SPEED: ${JSON.stringify(selectedSpeedOption)}`), [selectedSpeedOption])

    useEffect(() => {
        const updateFocusMenu = async () => {
            if (score) {
                setFocusMenuItems(createFocusMenuItems(score))
            }
        }
        updateFocusMenu()
        debug(`Resetting focus value`)
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
            </Stack>
        </div>
    )
}
