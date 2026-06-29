import type { Dispatch, JSX, RefObject } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Grid, HStack, Row, SelectPicker, Toggle } from 'rsuite'
import 'rsuite/Toggle/styles/index.css'
import { positionConfigs, theme } from '../../config/config'
import type { AnimationData, NotationParagraph, SVGInfo } from '../../typing/animation'
import type { Position } from '../../typing/basetypes'
import { type Appearance, type ExtendedOption } from '../../typing/interface'
import type { PlaybackCallbackFunctions } from '../../typing/playback'
import NotationArea from './NotationArea'
// import 'rsuite/Slider/styles/index.css';
// import 'rsuite/Loader/styles/index.css';
// import 'rsuite/DropDown/styles/index.css';
import { useUserSelectionStore } from '../../stores/usePlaybackStore'
import { type XCoordRecord, type YCoordRecord } from '../../typing/animation'
import { debug } from '../../utils/debugger'
import { ResizableSVG } from '../ResizableSVG'

// Returns the SVG filename for the given position if found.
// In case more than one position is given, all positions must use the same SVG file.
// (Animation can currently animate only one instrument at the same time)
function positionToSvg(positions: string[]): string {
    const svgList: string[] = []
    positions.forEach((pos: string) => svgList.push(positionConfigs[pos as Position]?.svg_file))
    const uniqueList: string[] = [...new Set(svgList)]
    return uniqueList.length == 1 ? uniqueList[0] : ''
}

// Returns the content of the data section of the SVG file.
// This section contains the panggul positions for each instrument key.
const retrieve_svg_data = (svgElement: SVGSVGElement | null): SVGInfo => {
    if (!svgElement) return { svg: null, panggul: null, x: null, y: null, animation: null }
    const panggul: SVGUseElement | null = svgElement?.querySelector('#helpinghand')
    const data_x: HTMLDataElement | null = svgElement.querySelector('data.x')
    const data_y: HTMLDataElement | null = svgElement.querySelector('data.y')
    var data_animation: HTMLDataElement | null = svgElement.querySelector('data.animation')
    //@ts-ignore: incorrect error for attributes.value
    const xValues: XCoordRecord = data_x ? JSON.parse(data_x.attributes.value.value) : null
    //@ts-ignore: incorrect error for attributes.value
    const yValues: YCoordRecord = data_y ? JSON.parse(data_y.attributes.value.value) : null
    //@ts-ignore: incorrect error for attributes.value
    const animationValues: AnimationData = data_animation ? JSON.parse(data_animation?.attributes.value.value) : null
    return { svg: svgElement, panggul: panggul, x: xValues, y: yValues ? yValues.y : 0, animation: animationValues }
}

interface AnimationProps {
    notationElement: NotationParagraph[] | null
    appAppearance: Appearance
    setSVGInfo: Dispatch<SVGInfo>
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
}
export function Animation({
    notationElement,
    appAppearance,
    setSVGInfo,
    updatePlaybackFunctions
}: AnimationProps): JSX.Element {
    const defaultSvgSize = appAppearance == 'playerOnly' ? 100 : 50 // percent
    const [hasPanggul, setHasPanggul] = useState<boolean>(false)
    const [notationVisible, setNotationVisible] = useState<boolean>(true)
    const svgInfoRef: RefObject<SVGInfo> = useRef<SVGInfo>({
        svg: null,
        panggul: null,
        x: null,
        y: null,
        animation: null
    })

    const [panggulMenuItems, setPanggulMenuItems] = useState<ExtendedOption<Position[]>[]>([])
    const selectedFocusOption = useUserSelectionStore((state) => state.selectedFocusOption)
    const selectedPanggulOption = useUserSelectionStore((state) => state.selectedPanggulOption)
    const setSelectedPanggulOption = useUserSelectionStore((state) => state.setSelectedPanggulOption)

    useEffect(() => debug(`SELECTED PANGGUL: ${JSON.stringify(selectedPanggulOption)}`), [selectedPanggulOption])

    useEffect(() => {
        debug(`new focus: ${JSON.stringify(selectedFocusOption.objValue)}`)
        initializeAnimationOptionsMenu(selectedFocusOption)
    }, [selectedFocusOption])

    // Initialize the selected pangul option. Dependency svgInfoRef.current is necessary
    // because it might not be initialized before selectedPanggulOption gets its initial value.
    useEffect(() => {
        debug(`panggul=${JSON.stringify(selectedPanggulOption)}`)
        if (selectedPanggulOption) setPanggulVisibility(selectedPanggulOption)
    }, [selectedPanggulOption, svgInfoRef.current])

    // Populates the animation selection menu, depending on the number of positions available.
    function initializeAnimationOptionsMenu(selectedFocusOption: ExtendedOption<Position[]>): void {
        const menuItems: ExtendedOption<Position[]>[] = []
        if (selectedFocusOption.objValue.length > 1) {
            selectedFocusOption.objValue.forEach((position) => {
                menuItems.push({
                    label: positionConfigs[position as Position].name,
                    value: position,
                    objValue: [position]
                })
            })
            menuItems.push({ label: 'Both (highlight only)', value: 'Highlight', objValue: [] })
        } else {
            menuItems.push({
                label: 'Panggul + highlight',
                value: 'Panggul',
                objValue: [selectedFocusOption.objValue[0]]
            })
            menuItems.push({ label: 'Highlight', value: 'Highlight', objValue: [] })
        }
        setPanggulMenuItems(menuItems)
        setSelectedPanggulOption(menuItems[0])
    }

    function setSvgStates(svg: SVGSVGElement) {
        if (svg) {
            svgInfoRef.current = retrieve_svg_data(svg)
            setSVGInfo(svgInfoRef.current)
            setHasPanggul(svgInfoRef.current.panggul ? true : false)
        }
    }

    function setPanggulVisibility(selection: ExtendedOption<Position[]> | undefined) {
        if (selection && svgInfoRef.current.svg && hasPanggul) {
            const panggul = svgInfoRef.current.panggul
            if (panggul && selection.objValue.length != 0) {
                if (panggul.classList.contains('invisible')) {
                    panggul.classList.remove('invisible')
                }
            } else if (panggul && !panggul.classList.contains('invisible')) {
                panggul.classList.add('invisible')
            }
            setSelectedPanggulOption(selection)
        }
    }

    function setNotationVisibility(isVisible: boolean) {
        setNotationVisible(isVisible)
    }

    const svgImage = useMemo(() => {
        return (
            <ResizableSVG
                src={positionToSvg(selectedFocusOption?.objValue)}
                defaultSize={defaultSvgSize}
                afterInjection={setSvgStates}
            />
        )
    }, [selectedFocusOption])

    return selectedFocusOption.objValue.length > 0 ? (
        <div className="m-0 md:m-6 w-full md:w-95/100 " id="animationgrid">
            <Grid fluid id="Animation" color="black" className="min-w-0">
                <Row id="animation-toggles-row" gutter={10} className="p-1 min-w-0">
                    <HStack className="w-full" justifyContent="center">
                        <Toggle
                            id="notation toggle"
                            label="notation"
                            labelPlacement="start"
                            disabled={notationElement == null}
                            color={theme.animation}
                            checked={notationVisible}
                            onChange={(checked) => setNotationVisibility(checked)}></Toggle>
                        {
                            // The panggul checkbox is only visible if the embedded SVG code has a panggul element
                            hasPanggul && (
                                <SelectPicker
                                    id="panggul selector"
                                    searchable={false}
                                    cleanable={false}
                                    label="animation:"
                                    data={panggulMenuItems}
                                    value={selectedPanggulOption.value}
                                    onSelect={(value, item) => {
                                        setSelectedPanggulOption(item as ExtendedOption<Position[]>)
                                    }}
                                    // Next lines only needed if cleanable==true
                                    // onChange={(value, e) => {
                                    //     if (value === null) setSelectedPanggulOption(null)
                                    // }}
                                />
                            )
                        }
                    </HStack>
                </Row>
                <Row id="notation-area-row" className="p-2 min-w-0">
                    <NotationArea
                        notation={notationElement}
                        visible={notationVisible}
                        updatePlaybackFunctions={updatePlaybackFunctions}
                    />
                </Row>
                <Row id="svg-embed-row" className="pt-2 pl-4 pr-4">
                    {svgImage}
                </Row>
            </Grid>
        </div>
    ) : (
        <div />
    )
}
