import type { JSX } from 'react'
import { useRef, useState } from 'react'
import { ReactSVG } from 'react-svg'
import ClipLoader from 'react-spinners/ClipLoader'
import React from 'react';
import { instrumentConfigs } from '../config/config';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import colors from 'tailwindcss/colors'
import { FRAMESTYLE } from '../config/constants';
import type { AnimationInfo, SVGInfo } from '../models/types';
import  {NotationArea}  from './NotationArea'

const svgBdrColorClass = `border-gray-300`
const svgBdrColorHex = colors.gray["300"]

function positionToSvg(position: string): string  {
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


export default function Animation({focus, animationInfoUpdater}: {focus: string, animationInfoUpdater: Function}) : JSX.Element {
    const defaultSvgSize = 40 // percent
    const checkBoxRef: React.RefObject<HTMLInputElement | null>  = useRef(null)
    const svgElement: React.RefObject<SVGSVGElement | null>  = useRef(null)
    const [svgLoaded, setSvgLoaded] = useState<boolean>(false)
    const [hasPanggul, setHasPanggul] = useState<boolean>(false)
    const panggulRef = useRef<Element | null>(null)
    const [svgSizeStyle, setSvgSize] = useState<Object>({"width": `${defaultSvgSize}%`, "height": `${defaultSvgSize}%`})
    const  notationAreaRef: React.RefObject<NotationArea|null> = useRef(null)
    // const [localSvgElement, setLocalSvgElement] = useState<HTMLDivElement | null>(null)

    const updateSvgSize = (val: number | number[]) => {
        const size: number = Math.round(typeof val=="number" ? val : val[0])
        setSvgSize({"width": `${size}%`, "height": `${size}%`})
    }

    function panggulElement()  {return (svgElement.current && svgLoaded) ? svgElement.current.querySelector("#helpinghand") : null}
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
//border-t-4 border-l-4 border-r-4 rounded-md p-4
    return(	focus ? (<div id="Animations" color="blue" className={"px-4 pt-3 pb-4 "}>
                <div id="svg-embed" className={FRAMESTYLE}>
                    {// The panggul checkbox is only visible if the embedded SVG code has a panggul element
                    hasPanggul && (<form id="panggul-selector" >
                        <input type="checkbox" id="show panggul" onChange={e => setPanggulVisibility(e.target.checked)} defaultChecked={true} ref={checkBoxRef}/>
                        <label>show panggul</label>
                    </form>  )
                    }
                    <ReactSVG src={positionToSvg(focus)} style={svgSizeStyle} loading={() => <ClipLoader />} useRequestCache={true} beforeInjection={setSvgLoadedFalse} afterInjection={setSvgStates}/>
                    {/* 
                    //@ts-ignore */}
                    <NotationArea notationAreaRef={notationAreaRef} rows={8} cols={800}/>
                </div>
                <div className="pl-4 pr-4">
                    <Slider min={0} max={100} defaultValue={defaultSvgSize} onChange={(val) => {updateSvgSize(val)}} styles={{track: {backgroundColor: svgBdrColorHex}, handle: {borderColor: svgBdrColorHex}}}/>
                </div>
            </div>) : <div/>)
}
