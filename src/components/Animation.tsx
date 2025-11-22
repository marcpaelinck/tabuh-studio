import type { JSX, RefObject } from 'react'
import { useMemo, useRef, useState } from 'react'
import { ReactSVG } from 'react-svg'
import React from 'react';
import { positionConfigs } from '../config/config';
import { FRAMESTYLE, theme } from '../config/constants';
import type { AnimationInfo, MenuItemInfo, NotationType, SVGInfo } from '../models/types';
import NotationArea from './NotationArea';
import { Toggle, Slider, Grid, Row, Col, Loader } from 'rsuite'
import 'rsuite/Toggle/styles/index.css'
import 'rsuite/Slider/styles/index.css'
import 'rsuite/Loader/styles/index.css'
import 'rsuite/DropDown/styles/index.css'
import Selector from './Selector';

// Returns the SVG filename for the given position if found.
// In case more than one position is given, all positions must use the same SVG file.
// (Animation can currently animate only one instrument at the same time)
function positionToSvg(positions: string[]): string  {
    const svgList: string[] = []
    positions.forEach((pos: string)=> svgList.push(positionConfigs[pos]?.svg_file))
    const uniqueList: string[] = [...new Set(svgList)]
    return uniqueList.length==1 ? uniqueList[0] : ""
}

// Returns the content of the data section of the SVG file
const retrieve_svg_data = (svgRef: React.RefObject<SVGSVGElement | null>): SVGInfo => {
    if (!svgRef.current) return { svg: null, panggul: null, x: null, y: null, animation: null }
    const panggul: SVGUseElement | null = svgRef.current?.querySelector("#helpinghand")
    const data_x: HTMLDataElement | null = svgRef.current.querySelector("data.x");
    const data_y: HTMLDataElement | null = svgRef.current.querySelector("data.y");
    var data_animation: HTMLDataElement | null = svgRef.current.querySelector("data.animation");
    //@ts-expect-error
    const xValues: XCoordRecord = data_x ? JSON.parse(data_x.attributes.value.value) : null;
    //@ts-expect-error
    const yValues: YCoordRecord = data_y ? JSON.parse(data_y.attributes.value.value) : null;
    //@ts-expect-error
    const animationValues: AnimationData = data_animation ? JSON.parse(data_animation?.attributes.value.value) : null;
    return { svg: svgRef.current, panggul: panggul, x: xValues, y: (yValues ? yValues.y : 0), animation: animationValues }
}

const defaultPanggulOption: MenuItemInfo = {key: "HIDE", displayValue: "Hide", value: null}

export default function Animation({focus, animationInfoRef}: 
    {focus: string[], animationInfoRef: RefObject<AnimationInfo>}) : JSX.Element {
    const defaultSvgSize = 100 // percent
    // const checkBoxRef: React.RefObject<HTMLInputElement | null>  = useRef(null)
    const svgElement: React.RefObject<SVGSVGElement | null>  = useRef(null)
    const [svgLoaded, setSvgLoaded] = useState<boolean>(false)
    const [hasPanggul, setHasPanggul] = useState<boolean>(false)
    const [notationVisible, setNotationVisible] = useState<boolean>(true)
    // const [panggulSelection, setPanggulSelection] = useState<MenuItemInfo>(defaultPanggulOption)
    const [svgSizeStyle, setSvgSize] = useState<Object>({"width": `${defaultSvgSize}%`, "height": `${defaultSvgSize}%`})
    const  highlightFunctionRef: React.RefObject<CallableFunction> = useRef(() => {})
    // const [localSvgElement, setLocalSvgElement] = useState<HTMLDivElement | null>(null)

    const updateSvgSize = (val: number | number[]) => {
        const size: number = Math.round(typeof val=="number" ? val : val[0])
        setSvgSize({"width": `${size}%`, "height": `${size}%`})
    }

    function panggulElement()  {return (svgElement.current && svgLoaded) ? svgElement.current.querySelector("#helpinghand") : null}
    //@ts-ignore unused `svg` argument
    function setSvgLoadedFalse(svg: SVGSVGElement) {setSvgLoaded(false)}

    async function setSvgStates(svg: SVGSVGElement) {
        if (svg) {
                svgElement.current = svg
                const svgInfo: SVGInfo = retrieve_svg_data(svgElement)
                animationInfoRef.current.svgInfo= svgInfo
                animationInfoRef.current.highlightRef= highlightFunctionRef
                setSvgLoaded(true)
                animationInfoRef.current.panggulRef.current = panggulElement()
                setHasPanggul(panggulElement() ? true : false)
        }
    }

    function setPanggulVisibility(selection: MenuItemInfo){
        animationInfoRef.current.panggulOptionRef.current = selection
        // setPanggulSelection(selection)
        if (svgElement.current && hasPanggul){
            const panggul = panggulElement()
            if (panggul && selection.value) {
                if (panggul.classList.contains("invisible")) {
                    panggul.classList.remove("invisible")
                }
            } else if (panggul && ! panggul.classList.contains("invisible")) {
                panggul.classList.add("invisible")
            }
        }
    }

    function setNotationVisibility(isVisible: boolean){
        setNotationVisible(isVisible)
    }
    
    const  panggulMenuItems: MenuItemInfo[] = useMemo(() => {
        const hideItem: MenuItemInfo = defaultPanggulOption
        const menuItems: MenuItemInfo[] = focus.map((position) => {
            return {key: position, displayValue: positionConfigs[position].name, value:position }
        })
        animationInfoRef.current.panggulOptionRef.current = menuItems.length>0 ? menuItems[0] : defaultPanggulOption
        // setPanggulSelection(defaultPanggulOption)
        return [hideItem].concat(menuItems)
    }
    , [focus])

    return(focus.length > 0 ? (
        <div className="m-6">
            <Grid fluid id="Animation" color="blue" className={`px-4 pt-3 pb-4 ${FRAMESTYLE}`}>
                <Row id="animation-toggles-row" gutter={10} className="p-1">
                        <Col xs={8} sm={8} md={4}>
                            <Toggle 
                                id="notation toggle"
                                disabled={animationInfoRef.current.notationRef.current==null}
                                color={theme.animation}
                                defaultChecked={animationInfoRef.current.notationRef.current!=null && notationVisible}
                                onChange={checked => setNotationVisibility(checked)} 
                            >notation</Toggle>
                        </Col>
                    {// The panggul checkbox is only visible if the embedded SVG code has a panggul element
                        hasPanggul && (
                        <Col xs={8} sm={8}  md={4}>
                            {/* <Toggle 
                                id="panggul toggle" 
                                color={theme.animation}
                                defaultChecked 
                                onChange={checked => setPanggulVisibility(checked)} 
                            >panggul</Toggle> */}
                            <Selector 
                                id="panggul selector"
                                title={"panggul: " + (animationInfoRef.current.panggulOptionRef.current?.value ? animationInfoRef.current.panggulOptionRef.current?.displayValue : "Hidden")} 
                                className="tabuhselector" 
                                width="3/10" 
                                valueList={panggulMenuItems} 
                                onChange={setPanggulVisibility}
                            />                            
                        </Col>)
                    }
                </Row>
                <Row id="notation-area-row"  className="p-2" >
                    <div>
                        <NotationArea notation={animationInfoRef.current.notationRef.current} visible={notationVisible} hlFunction={highlightFunctionRef}/>
                    </div>
                </Row>
                <Row id="slider-row" className="pl-4 pr-4 pt-10">
                    <Slider 
                        progress
                        className="flex w-full ts-theme-animation"
                        barClassName="flex w-full ts-theme-animation"
                        min={0} 
                        max={100} 
                        defaultValue={defaultSvgSize} 
                        onChange={(val) => {updateSvgSize(val)}} 
                    />
                </Row>
                <Row id="svg-embed-row" className="pt-2 pl-4 pr-4" >
                    <ReactSVG 
                        src={positionToSvg(focus)} 
                        style={svgSizeStyle} 
                        loading={() => <Loader />} 
                        useRequestCache={true} 
                        beforeInjection={setSvgLoadedFalse} 
                        afterInjection={setSvgStates}
                    />
                </Row>
           </Grid>
        </div> )
        : <div/>)
}
