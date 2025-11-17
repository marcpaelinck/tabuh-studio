import type { JSX } from 'react'
import { useRef, useState } from 'react'
import { ReactSVG } from 'react-svg'
import ClipLoader from 'react-spinners/ClipLoader'
import React from 'react';
import { instrumentConfigs } from '../config/config';
import { FRAMESTYLE } from '../config/constants';
import type { AnimationInfo, NotationType, SVGInfo } from '../models/types';
import { NotationArea } from './NotationArea';
import { Toggle, Slider } from 'rsuite'
import 'rsuite/Toggle/styles/index.css';
import 'rsuite/Slider/styles/index.css';

function positionToSvg(position: string): string  {
    console.log("loading SVG file")
    return position in instrumentConfigs ? instrumentConfigs[position].svg_file : ""
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

export default function Animation({focus, notationRef, animationInfoUpdater}: 
    {focus: string, notationRef: React.RefObject<NotationType | null>, animationInfoUpdater: Function}) : JSX.Element {
    const defaultSvgSize = 100 // percent
    // const checkBoxRef: React.RefObject<HTMLInputElement | null>  = useRef(null)
    const svgElement: React.RefObject<SVGSVGElement | null>  = useRef(null)
    const [svgLoaded, setSvgLoaded] = useState<boolean>(false)
    const [hasPanggul, setHasPanggul] = useState<boolean>(false)
    const [notationVisible, setNotationVisible] = useState<boolean>(true)
    const panggulRef = useRef<Element | null>(null)
    const [svgSizeStyle, setSvgSize] = useState<Object>({"width": `${defaultSvgSize}%`, "height": `${defaultSvgSize}%`})
    const notationVisibleRef: React.RefObject<boolean> = useRef(true)
    const  notationAreaRef: React.RefObject<NotationArea|null> = useRef(null)
    // const [localSvgElement, setLocalSvgElement] = useState<HTMLDivElement | null>(null)

    const updateSvgSize = (val: number | number[]) => {
        const size: number = Math.round(typeof val=="number" ? val : val[0])
        setSvgSize({"width": `${size}%`, "height": `${size}%`})
    }

    function panggulElement()  {return (svgElement.current && svgLoaded) ? svgElement.current.querySelector("#helpinghand") : null}
    //@ts-ignore unused `svg` argument
    function setSvgLoadedFalse(svg: SVGSVGElement) {setSvgLoaded(false)}

    function setSvgStates(svg: SVGSVGElement) {
        if (svg) {
                svgElement.current = svg
                const svgInfo: SVGInfo = retrieve_svg_data(svgElement)
                const animationInfo: AnimationInfo = {svgInfo: svgInfo, notationAreaRef: notationAreaRef}
                animationInfoUpdater(animationInfo) // pass animationInfo to App component
                setSvgLoaded(true)
                panggulRef.current = panggulElement()
                setHasPanggul(panggulElement() ? true : false)
        }
    }

    function setPanggulVisibility(isVisible: boolean){
        if (svgElement.current && hasPanggul){
            const panggul = panggulElement()
            if (panggul && isVisible) {
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

    return(focus ? (
            <div id="Animation" color="blue" className={`px-4 pt-3 pb-4 ${FRAMESTYLE}`}>
                <div>
                    <NotationArea ref={notationAreaRef} notation={notationRef.current} visible={notationVisible}/>
                </div>
                <div id="svg-embed" >
                    <div id="checkbox-and-slider" className="flex items-center">
                        {// The panggul checkbox is only visible if the embedded SVG code has a panggul element
                        hasPanggul && (
                        <div className="w-3/10 align-bottom">
                            <Toggle id="notation toggle" 
                                defaultChecked ={notationVisible}
                                onChange={checked => setNotationVisibility(checked)} 
                            >notation</Toggle>
                            <Toggle id="panggul toggle" 
                                defaultChecked 
                                onChange={checked => setPanggulVisibility(checked)} 
                            >panggul</Toggle>
                        </div>
                        )
                        }
                        <div className="w-6/10 pl-4 pr-4">
                            <Slider progress
                                className="flex w-full"
                                barClassName="flex w-full"
                                min={0} 
                                max={100} 
                                defaultValue={defaultSvgSize} 
                                onChange={(val) => {updateSvgSize(val)}} 
                            />
                        </div>
                    </div>
                    <ReactSVG src={positionToSvg(focus)} style={svgSizeStyle} loading={() => <ClipLoader />} 
                        useRequestCache={true} beforeInjection={setSvgLoadedFalse} afterInjection={setSvgStates}/>
                </div>
            </div>) 
        : <div/>)
}
