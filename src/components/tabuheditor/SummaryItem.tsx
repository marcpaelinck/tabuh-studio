// The system summary contains the fields and buttons that appear in the header of each collapsible system section.
// This summary contains button + text field combinations. The button can either enable to edit the field
// (e.g. in case of the part or label name) or perform an action (copy current or labeled section). In the
// latter case, the field will contain information about the copied system.

import { useRef, useState, type FocusEvent, type HTMLAttributes, type UIEvent } from 'react'
import { AiOutlineNumber, AiOutlinePieChart } from 'react-icons/ai'
import { FaCheck, FaXmark } from 'react-icons/fa6'
import { IoMdCopy } from 'react-icons/io'
import { IoArrowForwardOutline, IoPricetagOutline } from 'react-icons/io5'
import type { IconType } from 'react-icons/lib'
import { Col, IconButton, Input, InputGroup } from 'rsuite'
import { debug } from '../../utils/debugger'

type FieldNameType = 'id' | 'part' | 'label' | 'copy' | 'goto'

interface SummaryItemProps extends HTMLAttributes<HTMLDivElement> {
    span: number
    fieldname: FieldNameType
    value: string | number | undefined
    execute?: (fieldname: string, value?: string) => void
}

// This is a single summary item containing a button and a value field.
// Depending on the item's specs, the button's action will optionally collect information
// from the user (e.g. new field value or label name of the system to copy)
// and will then perform the `execute` function.
export function SummaryItem({ span, fieldname, value, execute, ...props }: SummaryItemProps) {
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
    const [editing, setEditing] = useState<boolean>(false)
    const ref = useRef<HTMLInputElement>(null)

    function doAction(event: UIEvent | FocusEvent, action: string) {
        debug(`executing action ${action}`, SummaryItem.name)
        event.stopPropagation()
        if (action == 'edit') {
            setEditing(true)
            return
        }
        setEditing(false)
        if (action != 'cancel' && execute) execute(fieldname, ref.current?.value)
    }

    // Pressing the Enter key in an input field will end editing and save the content.
    function onEnter(e: any) {
        if (e.key === 'Enter') {
            e.target.blur()
            doAction(e, 'save')
        }
    }

    // Buttons that appear inside an input field
    const SaveCancelBtn = ({ action }: { action: 'save' | 'cancel' }) => {
        const Icon: IconType = action == 'save' ? FaCheck : FaXmark
        return (
            <IconButton
                as="span"
                size="xs"
                appearance="subtle"
                color={action == 'save' ? 'green' : 'red'}
                icon={<Icon onClick={(e) => doAction(e, action)} />}
            />
        )
    }

    // Input field for values whose action is 'edit'
    const inputField = (
        <InputGroup inside size="xs" {...props}>
            <Input
                ref={ref}
                defaultValue={value || ''}
                onClick={(e) => e.stopPropagation()}
                onKeyUp={onEnter}
                onBlur={(e) => doAction(e, 'cancel')}
            />
            <InputGroup.Addon as="span">
                {/* Save (V) and cancel (X) buttons */}
                <SaveCancelBtn action="save" />
                <SaveCancelBtn action="cancel" />
            </InputGroup.Addon>
        </InputGroup>
    )

    const SummaryIcon = specs[fieldname].icon
    const summaryIcon = (
        <SummaryIcon
            size="1rem"
            onClick={(event: UIEvent<SVGElement>) => {
                doAction(event, specs[fieldname].action)
            }}
        />
    )

    return (
        <Col as="div" span={span} className="flex bg-gray-100 border-2 border-white divide-solid items-center">
            {specs[fieldname].action == 'none' ? (
                summaryIcon
            ) : (
                <IconButton size="sm" as={'span'} icon={summaryIcon} className="p-0" />
            )}
            <span style={{ color: specs[fieldname].color }} className="text-sm pl-3">
                {editing ? inputField : `${value || ''}`}
            </span>
        </Col>
    )
}
