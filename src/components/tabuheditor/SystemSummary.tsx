import { useRef, useState, type ActionDispatch, type FocusEvent, type HTMLAttributes, type MouseEvent } from 'react'
import { AiOutlinePieChart } from 'react-icons/ai'
import { IoMdCopy } from 'react-icons/io'
import { IoArrowForwardOutline, IoPricetagOutline } from 'react-icons/io5'
import type { IconType } from 'react-icons/lib'
import { PiCheck, PiX } from 'react-icons/pi'
import { Col, Grid, Input, InputGroup, Row } from 'rsuite'
import type { PlaybackAction, PlaybackState } from '../../hooks/playbackReducer'
import type { EditorSystemData } from '../../models/types'
import { PlayBackButtons } from './PlaybackButtons'

interface PanelColProps extends HTMLAttributes<HTMLDivElement> {
    span: number
    fieldname: string
    text: string
    Icon: IconType
    editable?: boolean
    update?: (fieldname: string, value: string | undefined) => void
    color?: string
}
function PanelCol({
    span,
    fieldname,
    text,
    Icon,
    color,
    editable = false,
    update = () => {},
    ...props
}: PanelColProps) {
    const [editing, setEditing] = useState<boolean>(false)
    const ref = useRef<HTMLInputElement>(null)

    function onEnter(e: any) {
        if (e.key === 'Enter') {
            e.target.blur()
            doSave(e)
        }
    }

    function doEdit(event: MouseEvent<SVGElement>) {
        event.stopPropagation()
        setEditing(true)
    }

    function doSave(event: MouseEvent<SVGElement>) {
        event.stopPropagation()
        setEditing(false)
        update(fieldname, ref.current?.value)
    }

    function doClose(event: MouseEvent<SVGElement> | FocusEvent<HTMLInputElement>) {
        event.stopPropagation()
        setEditing(false)
    }

    const inputField = (
        <InputGroup inside size="xs">
            <Input
                ref={ref}
                defaultValue={text}
                onClick={(e) => e.stopPropagation()}
                onKeyUp={onEnter}
                onBlur={doClose}
            />
            <InputGroup.Addon as="span">
                <PiCheck onClick={doSave} className="hover:text-green-600 hover:cursor-pointer" />
                <PiX onClick={doClose} className="hover:text-red-600 hover:cursor-pointer" />
            </InputGroup.Addon>
        </InputGroup>
    )

    return (
        <Col
            as="div"
            span={span}
            className="flex bg-gray-100 border-2 border-white divide-solid items-center"
            style={{ color: color }}>
            <Icon
                onClick={(event) => {
                    if (editable) doEdit(event)
                }}
            />
            <span className="text-sm pl-3"> {editing ? inputField : text}</span>
        </Col>
    )
}

// Information that is displayed in the header part of each panel header. See EditorWindow.
interface SystemSummaryProps {
    data: EditorSystemData[]
    systemData: EditorSystemData
    updateSysData: (sysData: EditorSystemData) => void
    playback: ActionDispatch<[action: PlaybackAction]>
    playbackState: PlaybackState
}
export function SystemSummary({ data, systemData, updateSysData, playback, playbackState }: SystemSummaryProps) {
    function update(fieldname: string, value: string | undefined) {
        const newSystemData = { ...systemData }
        switch (fieldname) {
            case 'part':
                if (value) newSystemData.part = value
                break
            case 'label':
                if (value) newSystemData.label = value
                break
            default:
        }
        updateSysData(newSystemData)
    }

    return (
        <Grid id="grid" className="ml-0">
            {/* Displays info about the System */}
            <Row id="row">
                <Col span={4} className="flex">
                    <PlayBackButtons
                        data={data}
                        systemId={systemData.id}
                        playback={playback}
                        playbackState={playbackState}
                        className="content-start"
                    />
                </Col>
                {/* <PanelCol span={2} text={`${systemData.id}`} icon={<AiOutlineNumber />} /> */}
                <PanelCol
                    span={4}
                    fieldname="part"
                    text={`${systemData.part || ''}`}
                    Icon={AiOutlinePieChart}
                    editable
                    update={update}
                />
                <PanelCol
                    span={4}
                    fieldname="label"
                    text={`${systemData.label || ''}`}
                    Icon={IoPricetagOutline}
                    editable
                    update={update}
                    color="orange"
                />
                <PanelCol
                    span={4}
                    fieldname="copyfrom"
                    text={`${systemData.copyfrom || ''}`}
                    Icon={IoMdCopy}
                    color="blue"
                />
                <PanelCol
                    span={4}
                    fieldname="goto"
                    text={`${systemData.goto || ''}`}
                    Icon={IoArrowForwardOutline}
                    color="green"
                />
            </Row>
        </Grid>
    )
}
