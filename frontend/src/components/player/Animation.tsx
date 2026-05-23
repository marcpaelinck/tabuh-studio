import type { Dispatch, JSX, RefObject } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ReactSVG } from 'react-svg'
import { Grid, HStack, Loader, Row, SelectPicker, Slider, Toggle } from 'rsuite'
import 'rsuite/Toggle/styles/index.css'
import { FRAMESTYLE, positionConfigs, theme } from '../../config/config'
import type { AnimationData, NotationParagraph, SVGInfo } from '../../typing/animation'
import type { Position } from '../../typing/basetypes'
import { panggulDefaultOption, type ExtendedOption } from '../../typing/menus'
import type { PlaybackCallbackFunctions } from '../../typing/playback'
import NotationArea from './NotationArea'
// import 'rsuite/Slider/styles/index.css';
// import 'rsuite/Loader/styles/index.css';
// import 'rsuite/DropDown/styles/index.css';
import { type XCoordRecord, type YCoordRecord } from '../../typing/animation'
import { debug } from '../../utils/debugger'

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
    selectedFocusOption: ExtendedOption<Position[]>
    selectedPanggulOption: ExtendedOption<Position[]>
    notationElement: NotationParagraph[] | null
    setSelectedPanggulOption: Dispatch<ExtendedOption<Position[]>>
    setSVGInfo: Dispatch<SVGInfo>
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
}
export default function Animation({
    selectedFocusOption,
    selectedPanggulOption,
    notationElement,
    setSelectedPanggulOption,
    setSVGInfo,
    updatePlaybackFunctions
}: AnimationProps): JSX.Element {
    const defaultSvgSize = 35 // percent
    const [hasPanggul, setHasPanggul] = useState<boolean>(false)
    const [notationVisible, setNotationVisible] = useState<boolean>(true)
    const [svgSizeStyle, setSvgSize] = useState<Object>({ width: `${defaultSvgSize}%`, height: `${defaultSvgSize}%` })
    const svgInfoRef: RefObject<SVGInfo> = useRef<SVGInfo>({
        svg: null,
        panggul: null,
        x: null,
        y: null,
        animation: null
    })

    const [panggulMenuItems, setPanggulMenuItems] = useState<ExtendedOption<Position[]>[]>([])

    useEffect(() => debug(`SELECTED PANGGUL: ${JSON.stringify(selectedPanggulOption)}`), [selectedPanggulOption])

    useEffect(() => {
        debug(`new focus: ${JSON.stringify(selectedFocusOption.objValue)}`)
        const menuItems: ExtendedOption<Position[]>[] = selectedFocusOption.objValue.map((position) => {
            return { label: positionConfigs[position as Position].name, value: position, objValue: [position] }
        })
        const hideItem: ExtendedOption<Position[]> = panggulDefaultOption
        setPanggulMenuItems([hideItem].concat(menuItems))
        setSelectedPanggulOption(menuItems.length > 0 ? menuItems[0] : hideItem)
    }, [selectedFocusOption])

    useEffect(() => {
        if (panggulMenuItems.length > 1) setSelectedPanggulOption(panggulMenuItems[1])
        else setSelectedPanggulOption(panggulDefaultOption)
    }, [panggulMenuItems])

    // Initialize the selected pangul option. Dependency svgInfoRef.current is necessary
    // because it might not be initialized before selectedPanggulOption gets its initial value.
    useEffect(() => {
        debug(`panggul=${JSON.stringify(selectedPanggulOption)}`)
        if (selectedPanggulOption) setPanggulVisibility(selectedPanggulOption)
    }, [selectedPanggulOption, svgInfoRef.current])

    const updateSvgSize = (val: number | number[]) => {
        const size: number = Math.round(typeof val == 'number' ? val : val[0])
        setSvgSize({ width: `${size}%`, height: `${size}%` })
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
            <ReactSVG
                src={positionToSvg(selectedFocusOption?.objValue)}
                style={svgSizeStyle}
                loading={() => <Loader />}
                useRequestCache={true}
                afterInjection={setSvgStates}
            />
        )
    }, [selectedFocusOption, svgSizeStyle])

    return selectedFocusOption.objValue.length > 0 ? (
        <div className="m-6 w-full">
            <Grid fluid id="Animation" color="black" className={`px-4 pt-3 pb-4 ${FRAMESTYLE}`}>
                <Row id="animation-toggles-row" gutter={10} className="p-1">
                    <HStack>
                        <Toggle
                            id="notation toggle"
                            label="notation"
                            labelPlacement="start"
                            disabled={notationElement == null}
                            color={theme.animation}
                            defaultChecked={notationElement != null && notationVisible}
                            onChange={(checked) => setNotationVisibility(checked)}></Toggle>
                        {
                            // The panggul checkbox is only visible if the embedded SVG code has a panggul element
                            hasPanggul && (
                                <SelectPicker
                                    id="panggul selector"
                                    searchable={false}
                                    cleanable={false}
                                    label="panggul:"
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
                <Row id="notation-area-row" className="p-2">
                    <NotationArea
                        notation={notationElement}
                        visible={notationVisible}
                        selectedFocusOption={selectedFocusOption}
                        selectedPanggulOption={selectedPanggulOption}
                        updatePlaybackFunctions={updatePlaybackFunctions}
                    />
                </Row>
                <Row id="slider-row" className="pl-4 pr-4 pt-10">
                    <Slider
                        progress
                        className="flex w-full ts-theme-animation"
                        barClassName="flex w-full ts-theme-animation"
                        min={0}
                        max={100}
                        defaultValue={defaultSvgSize}
                        onChange={(val) => {
                            updateSvgSize(val)
                        }}
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
