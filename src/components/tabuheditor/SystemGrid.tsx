import { useContext, useState, type Dispatch, type ReactNode } from 'react'
import type { EditorSystemData, PlayBackState, Stave } from '../../models/types'
import { AudioFunctions, type AudioFunctionsType } from './contexts'
import { getTextWidthInPx } from '../../utils/measurements'
import { getValidSymbols } from '../../utils/alphabet'
import { NavigationCell } from './NavigationCell'
import { Col, HStack, Row, Text, VStack } from 'rsuite'
import { IoPauseCircle, IoPlayCircle, IoPlayCircleOutline } from 'react-icons/io5'
import { positionConfigs } from '../../config/config'

// Contains the editable notation of one system (gongan)
export function SystemDetails({
    systemData,
    pbState,
    setPbState
}: {
    systemData: EditorSystemData
    pbState: PlayBackState
    setPbState: Dispatch<PlayBackState>
}): ReactNode {
    const audioFunc: AudioFunctionsType = useContext(AudioFunctions)
    const [playbackActive, setPlaybackActive] = useState<boolean>(false)

    function playPauseClicked() {
        if (!playbackActive) {
            audioFunc.playPause(true, [systemData])
            setPbState('playing')
            setPlaybackActive(true)
        } else {
            audioFunc.playPause(!(pbState == 'playing'))
            setPbState(pbState == 'playing' ? 'paused' : 'playing')
        }
    }

    const staffNodes = Object.entries(systemData.staffs).map(([pos, staves], pidx) => {
        const staveNodes = staves.map((stave: Stave, sidx: number) => {
            const width: string = getTextWidthInPx('x'.repeat(systemData.colWidths[sidx]), 14) + 15 + 'px'
            const validSymbols: string[] = getValidSymbols(pos, true)
            return (
                <Col id={`COL-${pidx * 100 + sidx}`} key={pidx * 100 + sidx} span="auto">
                    <NavigationCell
                        key={pidx * 100 + sidx}
                        posId={pidx}
                        secId={sidx}
                        validSymbols={validSymbols}
                        defaultValue={stave.notation.map((jSym) => jSym.s).join('')}
                        style={{ width: width }}
                        className={`balifont10 h-5 resize-none overflow-clip p-0`}
                        spellCheck="false"
                    />
                </Col>
            )
        })

        return (
            <Row id={`ROW-${systemData.id}-${pos}`}>
                <Col id={`COL-${systemData.id}-POS`} span="auto">
                    <Text as="div" className="w-40 h-5">
                        {positionConfigs[pos].name}
                    </Text>
                </Col>
                {staveNodes}
            </Row>
        )
    })

    return (
        <>
            <HStack>
                <button onClick={playPauseClicked}>
                    {pbState == 'playing' ? (
                        <IoPlayCircle color="orange" size="2em" />
                    ) : pbState == 'paused' ? (
                        <IoPauseCircle color="orange" size="2em" />
                    ) : (
                        <IoPlayCircleOutline color="gray" size="2em" />
                    )}
                </button>
            </HStack>

            <VStack>{staffNodes}</VStack>
        </>
    )
}
