// The system summary contains the fields and buttons that appear in the header of each collapsible system section.
// This summary contains button + text field combinations. The button can either enable to edit the field
// (e.g. in case of the part or label name) or perform an action (copy current or labeled section). In the
// latter case, the field will contain information about the copied system.

import { useRef, useState, type ActionDispatch, type FocusEvent, type HTMLAttributes, type UIEvent } from 'react'
import { AiOutlineNumber, AiOutlinePieChart } from 'react-icons/ai'
import { IoMdCopy } from 'react-icons/io'
import { IoArrowForwardOutline, IoPricetagOutline } from 'react-icons/io5'
import type { IconType } from 'react-icons/lib'
import { PiCheck, PiX } from 'react-icons/pi'
import { Col, Grid, IconButton, Input, InputGroup, Row } from 'rsuite'
import type { PlaybackAction, PlaybackState } from '../../hooks/playbackReducer'
import type { EditorSystemData } from '../../models/types'
import { debug } from '../../utils/debugger'
import { PlayBackButtons } from './PlaybackButtons'

type FieldNameType = 'id' | 'part' | 'label' | 'copy' | 'goto'

interface SummaryItemProps extends HTMLAttributes<HTMLDivElement> {
    span: number
    fieldname: FieldNameType
    value: string | number | undefined
    execute: (fieldname: string, value?: string) => void
}

// This is a single summary item containing a button and a value field.
// Depending on the item's specs, the button's action will optionally collect information
// from the user (e.g. new field value or label name of the system to copy)
// and will then perform the `execute` function.
function SummaryItem({ span, fieldname, value, execute, ...props }: SummaryItemProps) {
    interface SpecType {
        icon: IconType
        action: string
        color: string
    }
    const specs: Record<string, SpecType> = {
        id: { icon: AiOutlineNumber, action: 'none', color: 'black' },
        part: { icon: AiOutlinePieChart, action: 'edit', color: 'black' },
        label: { icon: IoPricetagOutline, action: 'edit', color: 'orange' },
        copy: { icon: IoMdCopy, action: 'copy', color: 'blue' },
        goto: { icon: IoArrowForwardOutline, action: 'goto', color: 'green' }
    }
    const Icon = specs[fieldname].icon

    const [editing, setEditing] = useState<boolean>(false)
    const ref = useRef<HTMLInputElement>(null)

    function doAction(event: UIEvent | FocusEvent, action: string) {
        debug(`executing action ${action}`, SystemSummary.name)
        event.stopPropagation()
        if (action == 'edit') {
            setEditing(true)
            return
        }
        setEditing(false)
        if (action != 'cancel') execute(fieldname, ref.current?.value)
    }

    // Pressing the Enter key in an input field will end editing and save the content.
    function onEnter(e: any) {
        if (e.key === 'Enter') {
            e.target.blur()
            doAction(e, 'save')
        }
    }

    const inputField = (
        <InputGroup inside size="xs">
            <Input
                ref={ref}
                defaultValue={value || ''}
                onClick={(e) => e.stopPropagation()}
                onKeyUp={onEnter}
                onBlur={(e) => doAction(e, 'cancel')}
            />
            <InputGroup.Addon as="span">
                {/* Save (V) and cancel (X) buttons */}
                <PiCheck onClick={(e) => doAction(e, 'save')} className="hover:text-green-800 hover:cursor-pointer" />
                <PiX onClick={(e) => doAction(e, 'cancel')} className="hover:text-red-800 hover:cursor-pointer" />
            </InputGroup.Addon>
        </InputGroup>
    )
    const icon = (
        <Icon
            size="1rem"
            onClick={(event: UIEvent<SVGElement>) => {
                doAction(event, specs[fieldname].action)
            }}
        />
    )

    return (
        <Col as="div" span={span} className="flex bg-gray-100 border-2 border-white divide-solid items-center">
            {specs[fieldname].action == 'none' ? icon : <IconButton icon={icon} className="p-0" />}
            <span style={{ color: specs[fieldname].color }} className="text-sm pl-3">
                {editing ? inputField : `${value || ''}`}
            </span>
        </Col>
    )
}

interface SystemSummaryProps {
    data: EditorSystemData[]
    systemData: EditorSystemData
    updateSysData: (sysData: EditorSystemData) => void
    playback: ActionDispatch<[action: PlaybackAction]>
    playbackState: PlaybackState
}
export function SystemSummary({ data, systemData, updateSysData, playback, playbackState }: SystemSummaryProps) {
    // Payload of the summary field buttons after optional value input by user.
    function execute(fieldname: string, value?: string) {
        const newSystemData = { ...systemData }
        switch (fieldname) {
            case 'part':
                if (typeof value == 'string') newSystemData.part = value
                break
            case 'label':
                if (typeof value == 'string') newSystemData.label = value
                break
            case 'copy':
            case 'goto':
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
                <SummaryItem span={2} fieldname="id" value={systemData.id + 1} execute={execute} />
                <SummaryItem span={4} fieldname="part" value={systemData.part} execute={execute} />
                <SummaryItem span={4} fieldname="label" value={systemData.label} execute={execute} />
                <SummaryItem span={4} fieldname="copy" value={systemData.copyfrom} execute={execute} />
                <SummaryItem span={4} fieldname="goto" value={systemData.goto} execute={execute} />
            </Row>
        </Grid>
    )
}
