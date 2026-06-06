// The system summary contains the fields and buttons that appear in the header of each collapsible system section.
// This summary contains buttons optionally combined with a text field. The item type determines the button's action
// such as editing a field name (e.g. `part` or `label`) or creating/copying a section. After the action is performed
// the field will contain the result of the action (e.g. new field value or id/label of copied system).
import { useEffect, useRef, useState, type HTMLAttributes, type MouseEvent } from 'react'
import { AiOutlineNumber } from 'react-icons/ai'
import { FaCheck, FaXmark } from 'react-icons/fa6'
import type { IconType } from 'react-icons/lib'
import { RiPlayListFill } from 'react-icons/ri'
import {
    Col,
    IconButton,
    Input,
    InputGroup,
    InputPicker,
    Tooltip,
    Whisper,
    type ColProps,
    type PickerHandle
} from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import type { AppearanceType } from 'rsuite/esm/internals/types'
import { defaultBeatFrequency, tsBlue } from '../../config/config'
import TsCopyIcon from '../../reacticons/TsCopyIcon'
import TsDeleteIcon from '../../reacticons/TsDeleteIcon'
import TsKempliNotationIcon from '../../reacticons/TsKempliNotationIcon'
import TsKempliOffIcon from '../../reacticons/TsKempliOffIcon'
import TsKempliOnIcon from '../../reacticons/TsKempliOnIcon'
import TsLabelIcon from '../../reacticons/TsLabelIcon'
import TsNewIcon from '../../reacticons/TsNewIcon'
import type { Score, System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { ExecutionForm } from './ExecutionForm'

// Col item formatted to contain summary items
export function SCol({ ...props }: ColProps) {
    return <Col as="div" className="flex bg-gray-100 border-2 border-white divide-solid items-center" {...props} />
}

type ItemName = 'id' | 'label' | 'new' | 'copy' | 'delete' | 'execution' | 'kempli'

interface SummaryItemProps extends HTMLAttributes<HTMLDivElement> {
    item: ItemName
    sysData: System
    score?: Score
    labels?: Record<string, System>
    gototargets?: Set<string> // list of uuid's of systems that occur in some 'goto' field. Used for validation.
    execute?: (fieldname: string, value?: string) => void
    options?: InputOption<string | number>[]
}

// This Element displays a single System attribute. The element containing a button and/or a value field.
// Depending on the value of the `action` property, the button's action will optionally collect information
// from the user (e.g. new field value or label name of the system to copy)
// and will then perform the `execute` function.
export function SummaryItem({
    item,
    sysData,
    score,
    labels,
    gototargets,
    execute,
    options,
    ...props
}: SummaryItemProps) {
    // Specifications of the display mode and functionality of each SummaryItem type.
    // See below for a detailed description of the properties of this interface.
    type ActionType = 'fieldeditor' | 'execute' | 'none'
    type FieldEditorType = 'inputfield' | 'stringinputpicker' | 'numberinputpicker' | 'executionform' | 'none'
    type FieldEditorBehavior = 'always' | 'afterbuttonclick'

    // A summary item consists of a button followed by an optional (editable or fixed) text field.
    interface ItemSpecs {
        icon: IconType // Button icon
        iconcolor?: string
        appearance?: AppearanceType // Button's appearance (default='default')
        action: ActionType // Action on button click
        hasfield?: boolean // Button is followed by a text field
        formtitle?: string // Title to display in editing mode
        fieldeditor?: FieldEditorType // Field editor type
        fieldeditwhen?: FieldEditorBehavior // When should the field be editable?
        fieldval?: string | number
        textcolor?: string // Field's text color
        buttonTooltip?: string
        fieldTooltip?: string
    }

    // Specification of the items. Each item corresponds with an attribute of a System object and contains a button and/or a field.
    // icon: button icon.
    // iconcolor: button icon.
    //action: button action. If the action's value is 'execute', the `execute` function is called immediately.
    //        If the action's value is 'none', the item is only used to display a value.
    //        Otherwise the action specifies the type of form that should be used to collect additional information from the user,
    //        after which the 'execute' function is called.
    //hasfield: If true, the item has a field next to the button with information about the System attribute.
    //fieldval: Display value of the field.
    //textcolor: Text color of the field.
    //buttonTooltip: Tooltip text for the button.
    //fieldTooltip: Tooltip text for the field.
    const itemSpecs: Record<ItemName, ItemSpecs> = {
        id: {
            icon: AiOutlineNumber,
            action: 'none',
            hasfield: true,
            fieldeditor: 'none',
            fieldval: sysData.id,
            fieldTooltip: sysData.uuid
        },
        label: {
            icon: TsLabelIcon,
            iconcolor: tsBlue,
            action: 'fieldeditor',
            hasfield: true,
            fieldeditor: 'inputfield',
            fieldeditwhen: 'afterbuttonclick',
            fieldval: sysData.label || '',
            textcolor: 'orange',
            buttonTooltip: 'Add or remove a label to mark a system for copying or for `goto` instructions.'
        },
        new: {
            icon: TsNewIcon,
            iconcolor: tsBlue,
            action: 'execute',
            hasfield: false,
            buttonTooltip: 'Create an empty system below this one.'
        },
        copy: {
            icon: TsCopyIcon,
            iconcolor: tsBlue,
            action: 'fieldeditor',
            hasfield: true,
            fieldeditor: 'stringinputpicker',
            fieldeditwhen: 'afterbuttonclick',
            formtitle: 'copy',
            fieldval: sysData.copyFrom || '',
            textcolor: 'blue',
            buttonTooltip: 'Select a system that should be copied below this one.',
            fieldTooltip: 'Label or number of the system from which this system was copied.'
        },
        delete: {
            icon: TsDeleteIcon,
            iconcolor: tsBlue,
            action: 'execute',
            hasfield: false,
            buttonTooltip: 'Delete this system (warning: can not be undone).'
        },
        execution: {
            icon: RiPlayListFill,
            iconcolor: tsBlue,
            action: 'fieldeditor',
            hasfield: true,
            fieldeditor: 'executionform',
            fieldeditwhen: 'afterbuttonclick',
            formtitle: `system # ${sysData.id}`,
            fieldval: sysData.execution?.map((item) => item.tooltipshort).join(' | ') || '',
            textcolor: 'green',
            buttonTooltip: 'Playing sequence, tempo & dynamics.',
            fieldTooltip: sysData.execution?.map((item) => item.tooltip).join('\n') || ''
        },
        kempli: {
            // Kempli button toggles between three states.
            // The field displays the kempli frequency and is only visible when kempli state is 'on'.
            icon: [TsKempliOnIcon, TsKempliOffIcon, TsKempliNotationIcon][
                ['on', 'off', 'notation'].indexOf(sysData.kempli.state)
            ],
            iconcolor: tsBlue,
            action: 'execute',
            hasfield: sysData.kempli.state == 'on',
            fieldeditor: 'numberinputpicker',
            fieldeditwhen: 'always',
            fieldval: sysData.kempli.frequency || defaultBeatFrequency,
            buttonTooltip: [`Kempli beat every ${sysData.kempli.frequency} notes`, 'Kempli off', 'Kempli in notation'][
                ['on', 'off', 'notation'].indexOf(sysData.kempli.state)
            ]
        }
    }
    const [editing, setEditing] = useState<boolean>(itemSpecs[item].fieldeditwhen == 'always')
    const inputRef = useRef<HTMLInputElement & PickerHandle>(null)
    const [warning, setWarning] = useState<string | null>(null)

    useEffect(() => {
        // Cancel editing when Esc key is pressed or when user clicks anywhere outside the input field.
        // The input field's onClick handler stops propagation to avoid closing it on mouse click.
        debug(`Editing= ${editing}`)

        if (editing) {
            function handleEscapeKey(event: KeyboardEvent) {
                if (event.code === 'Escape' && itemSpecs[item].fieldeditwhen != 'always') {
                    debug(`Setting editing to false (1)`)
                    setEditing(false)
                }
            }
            document.addEventListener('keydown', handleEscapeKey)
            return () => {
                // Cleanup functions
                document.removeEventListener('keydown', handleEscapeKey)
            }
        }
    }, [editing])

    // Action performed on button click.
    function buttonAction(event: any, action: string) {
        if (itemSpecs[item].fieldeditwhen == 'afterbuttonclick') {
            setEditing(true)
            return
        }
        debug(`EXECUTING ${item}`)
        if (action != 'cancel' && validate() && execute) execute(item)
    }

    // Action performed after editing a field.
    function inputFieldAction(event: any, action: string, value: string | undefined) {
        event.target.blur()
        debug(`warning is ${warning}`)
        if (action != 'cancel' && !(warning == null)) return
        const returnValue = value || inputRef.current?.value
        debug(`executing field action ${action} value=${returnValue}`)
        if (itemSpecs[item].fieldeditwhen != 'always') setEditing(false)
        setWarning(null) // Can only reach this point if cancel was selected.
        if (action != 'cancel' && execute) execute(item, returnValue)
    }

    // Called by buttonAction function and by onChange callback of input fields
    function validate(value?: string | undefined): boolean {
        var msg: string | null = null
        switch (item) {
            case 'label': {
                if (labels && value && Object.keys(labels).includes(value)) msg = 'This name is already in use'
                debug(`labels=${JSON.stringify(Object.keys(labels || []))} value=${value}`)
                break
            }
            case 'delete': {
                if (gototargets?.has(sysData.uuid))
                    msg = "Can't delete this system because one or more goto directives point to this system."
                break
            }
            default:
        }
        debug(`validate is ${msg}`)
        setWarning(msg)
        return msg == null
    }

    // Pressing the Enter key in an input field will end editing and save the content.
    function onEnter(e: any, value?: string) {
        if (e.key === 'Enter') {
            e.target.blur()
            inputFieldAction(e, 'save', value)
        }
    }

    // Buttons that appear inside an input field
    const SaveCancelBtn = ({ action }: { action: 'save' | 'cancel' }) => {
        const Icon: IconType = action == 'save' ? FaCheck : FaXmark
        return (
            <IconButton
                as="span"
                size="xs"
                appearance={action == 'save' ? 'subtle' : 'link'}
                color={action == 'save' ? 'green' : 'red'}
                icon={<Icon />}
                onClick={(e) => inputFieldAction(e, action, inputRef.current?.value)}
            />
        )
    }

    // Input field for values whose action is 'edit'
    const inputField = (
        <InputGroup inside size="xs" {...props}>
            <Input ref={inputRef} defaultValue={itemSpecs[item].fieldval || ''} onKeyUp={onEnter} onChange={validate} />
            <InputGroup.Addon as="span">
                <SaveCancelBtn action="cancel" />
                <SaveCancelBtn action="save" />
            </InputGroup.Addon>
        </InputGroup>
    )

    const inputPicker = (
        <InputPicker
            ref={inputRef}
            data={options || []}
            defaultValue={itemSpecs[item].fieldval}
            onChange={(val, e) => inputFieldAction(e, 'save', val)}
            placeholder={`${itemSpecs[item].formtitle}`}
            width="100%"
            cleanable={false}
            size="xs"
        />
    )

    const executionItemsForm = (
        <ExecutionForm
            systemData={sysData}
            title={`${itemSpecs[item].formtitle}`}
            open={editing}
            sysOptions={(options || []) as InputOption<string>[]}
            setOpen={setEditing}
            onSave={() => execute!('execution')}
        />
    )

    const inputMethod =
        itemSpecs[item].fieldeditor == 'inputfield'
            ? inputField
            : itemSpecs[item].fieldeditor?.includes('inputpicker')
              ? inputPicker
              : itemSpecs[item].fieldeditor == 'executionform'
                ? executionItemsForm
                : null

    const SummaryIcon = itemSpecs[item].icon
    const summaryIcon = <SummaryIcon size="1.3rem" color={itemSpecs[item].iconcolor} />
    const textWhisperRef = useRef<OverlayTriggerHandle>(null)

    // Show message on warning. Note: currently warning is only set by field validation.
    useEffect(() => {
        if (warning) textWhisperRef.current?.open()
        else textWhisperRef.current?.close()
    }, [warning])

    return (
        <>
            {itemSpecs[item].action == 'none' ? (
                summaryIcon
            ) : (
                <Whisper
                    placement="autoVerticalStart"
                    delayClose={50}
                    trigger={warning ? 'click' : itemSpecs[item].buttonTooltip ? 'hover' : 'none'}
                    controlId={`control-id-Whisper`}
                    className="mytooltip"
                    speaker={
                        <Tooltip className="mytooltip">
                            {warning ? warning : itemSpecs[item].buttonTooltip || ''}
                        </Tooltip>
                    }>
                    <IconButton
                        size="sm"
                        as={'span'}
                        icon={summaryIcon}
                        onClick={(event: MouseEvent<HTMLElement>) => {
                            buttonAction(event, itemSpecs[item].action)
                        }}
                        className="shrink-0 basis-[1.5rem] pl-0 pr-1 pt-0 pb-0"
                        appearance={itemSpecs[item].appearance}
                    />
                </Whisper>
            )}
            {itemSpecs[item].hasfield ? (
                <Whisper
                    ref={textWhisperRef}
                    delayClose={50}
                    trigger={itemSpecs[item].fieldTooltip ? 'hover' : 'none'}
                    placement="autoVerticalStart"
                    controlId={`control-id-Whisper`}
                    speaker={
                        // style whitespace:pre enables to use \n for new line
                        <Tooltip className="whitespace-pre">
                            {warning ? warning : itemSpecs[item].fieldTooltip || ''}
                        </Tooltip>
                    }>
                    <span style={{ color: itemSpecs[item].textcolor, width: '100%' }} className="text-sm pl-1">
                        {editing ? inputMethod : null}
                        {editing &&
                        ['inputfield', 'numberinputpicker', 'stringinputpicker'].includes(
                            itemSpecs[item].fieldeditor || 'other'
                        )
                            ? null
                            : `${itemSpecs[item].fieldval || ''}`}
                    </span>
                </Whisper>
            ) : (
                <></>
            )}
        </>
    )
}
