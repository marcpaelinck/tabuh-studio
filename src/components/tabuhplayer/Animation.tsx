import type { Dispatch, JSX, RefObject } from 'react';
import { useRef, useState } from 'react';
import { ReactSVG } from 'react-svg';
import { positionConfigs } from '../../config/config';
import { FRAMESTYLE, theme } from '../../config/constants';
import type { AnimationData, HighlightRange, MenuItemInfo, NotationParagraph, SVGInfo } from '../../models/types';
import NotationArea from './NotationArea';
import { Toggle, Slider, Grid, Row, Col, Loader } from 'rsuite';
import 'rsuite/Toggle/styles/index.css';
// import 'rsuite/Slider/styles/index.css';
// import 'rsuite/Loader/styles/index.css';
// import 'rsuite/DropDown/styles/index.css';
import Selector from '../Selector';
import { type XCoordRecord, type YCoordRecord } from '../../models/types';

// Returns the SVG filename for the given position if found.
// In case more than one position is given, all positions must use the same SVG file.
// (Animation can currently animate only one instrument at the same time)
function positionToSvg(positions: string[]): string {
    const svgList: string[] = [];
    positions.forEach((pos: string) => svgList.push(positionConfigs[pos]?.svg_file));
    const uniqueList: string[] = [...new Set(svgList)];
    return uniqueList.length == 1 ? uniqueList[0] : '';
}

// Returns the content of the data section of the SVG file
const retrieve_svg_data = (svgElement: SVGSVGElement | null): SVGInfo => {
    if (!svgElement) return { svg: null, panggul: null, x: null, y: null, animation: null };
    const panggul: SVGUseElement | null = svgElement?.querySelector('#helpinghand');
    const data_x: HTMLDataElement | null = svgElement.querySelector('data.x');
    const data_y: HTMLDataElement | null = svgElement.querySelector('data.y');
    var data_animation: HTMLDataElement | null = svgElement.querySelector('data.animation');
    //@ts-ignore: incorrect error for attributes.value
    const xValues: XCoordRecord = data_x ? JSON.parse(data_x.attributes.value.value) : null;
    //@ts-ignore: incorrect error for attributes.value
    const yValues: YCoordRecord = data_y ? JSON.parse(data_y.attributes.value.value) : null;
    //@ts-ignore: incorrect error for attributes.value
    const animationValues: AnimationData = data_animation ? JSON.parse(data_animation?.attributes.value.value) : null;
    return { svg: svgElement, panggul: panggul, x: xValues, y: yValues ? yValues.y : 0, animation: animationValues };
};

export const panggulDefaultOption: MenuItemInfo = { key: 'HIDE', displayValue: 'Hide', value: null };

export default function Animation({
    focus,
    notationElement,
    panggulMenuItems,
    highlightFunctionRef,
    panggulOption,
    setPanggulOption,
    setSVGInfo
}: {
    focus: string[];
    notationElement: NotationParagraph[] | null;
    panggulMenuItems: MenuItemInfo[];
    panggulOption: MenuItemInfo;
    highlightFunctionRef: RefObject<Dispatch<HighlightRange>>;
    setPanggulOption: Dispatch<MenuItemInfo>;
    setSVGInfo: Dispatch<SVGInfo>;
}): JSX.Element {
    const defaultSvgSize = 100; // percent
    const [hasPanggul, setHasPanggul] = useState<boolean>(false);
    const [notationVisible, setNotationVisible] = useState<boolean>(true);
    const [svgSizeStyle, setSvgSize] = useState<Object>({ width: `${defaultSvgSize}%`, height: `${defaultSvgSize}%` });
    const svgInfoRef: RefObject<SVGInfo> = useRef<SVGInfo>({
        svg: null,
        panggul: null,
        x: null,
        y: null,
        animation: null
    });

    const updateSvgSize = (val: number | number[]) => {
        const size: number = Math.round(typeof val == 'number' ? val : val[0]);
        setSvgSize({ width: `${size}%`, height: `${size}%` });
    };

    async function setSvgStates(svg: SVGSVGElement) {
        if (svg) {
            svgInfoRef.current = retrieve_svg_data(svg);
            setSVGInfo(svgInfoRef.current);
            setHasPanggul(svgInfoRef.current.panggul ? true : false);
        }
    }

    function setPanggulVisibility(selection: MenuItemInfo) {
        if (svgInfoRef.current.svg && hasPanggul) {
            const panggul = svgInfoRef.current.panggul;
            if (panggul && selection.value) {
                if (panggul.classList.contains('invisible')) {
                    panggul.classList.remove('invisible');
                }
            } else if (panggul && !panggul.classList.contains('invisible')) {
                panggul.classList.add('invisible');
            }
            setPanggulOption(selection);
        }
    }

    function setNotationVisibility(isVisible: boolean) {
        setNotationVisible(isVisible);
    }

    return focus.length > 0 ? (
        <div className="m-6">
            <Grid fluid id="Animation" color="blue" className={`px-4 pt-3 pb-4 ${FRAMESTYLE}`}>
                <Row id="animation-toggles-row" gutter={10} className="p-1">
                    <Col span="auto">
                        <Toggle
                            id="notation toggle"
                            disabled={notationElement == null}
                            color={theme.animation}
                            defaultChecked={notationElement != null && notationVisible}
                            onChange={(checked) => setNotationVisibility(checked)}
                        >
                            notation
                        </Toggle>
                    </Col>
                    {
                        // The panggul checkbox is only visible if the embedded SVG code has a panggul element
                        hasPanggul && (
                            <Col span="auto">
                                <Selector
                                    id="panggul selector"
                                    title={'panggul: ' + (panggulOption.value ? panggulOption.displayValue : 'hidden')}
                                    className="tabuhselector"
                                    valueList={panggulMenuItems}
                                    onChange={setPanggulVisibility}
                                />
                            </Col>
                        )
                    }
                </Row>
                <Row id="notation-area-row" className="p-2">
                    <div>
                        <NotationArea
                            notation={notationElement}
                            visible={notationVisible}
                            highlightFunctionRef={highlightFunctionRef}
                        />
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
                        onChange={(val) => {
                            updateSvgSize(val);
                        }}
                    />
                </Row>
                <Row id="svg-embed-row" className="pt-2 pl-4 pr-4">
                    <ReactSVG
                        src={positionToSvg(focus)}
                        style={svgSizeStyle}
                        loading={() => <Loader />}
                        useRequestCache={true}
                        afterInjection={setSvgStates}
                    />
                </Row>
            </Grid>
        </div>
    ) : (
        <div />
    );
}
