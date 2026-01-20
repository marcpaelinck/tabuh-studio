// The system summary contains the fields and buttons that appear in the header of each collapsible system section.
// This summary contains buttons optionally combined with a text field. The item type determines the button's action
// such as editing a field name (e.g. `part` or `label`) or creating/copying a section. After the action is performed
// the field will contain the result of the action (e.g. new field value or id/label of copied system).
import { useEffect, useRef, useState, type HTMLAttributes, type MouseEvent } from 'react'
import { AiOutlineNumber } from 'react-icons/ai'
import { FaCheck, FaXmark } from 'react-icons/fa6'
import { IoArrowForwardOutline } from 'react-icons/io5'
import type { IconType } from 'react-icons/lib'
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
import type { EditorScore, EditorSystem } from '../../models/types'
import TsCopyIcon from '../../reacticons/TsCopyIcon'
import TsDeleteIcon from '../../reacticons/TsDeleteIcon'
import TsLabelIcon from '../../reacticons/TsLabelIcon'
import TsNewIcon from '../../reacticons/TsNewIcon'
import { debug } from '../../utils/debugger'
import { ExecutionForm } from './ExecutionForm'

// Col item formatted to contain summary items
export function SCol({ ...props }: ColProps) {
    return <Col as="div" className="flex bg-gray-100 border-2 border-white divide-solid items-center" {...props} />
}

type ItemType = 'id' | 'label' | 'new' | 'copy' | 'delete' | 'goto_loop' | 'tempo_dynamics'

interface SummaryItemProps extends HTMLAttributes<HTMLDivElement> {
    item: ItemType
    sysData: EditorSystem
    score?: EditorScore
    labels?: Record<string, EditorSystem>
    gototargets?: Set<string> // list of uuid's of systems that occur in some 'goto' field
    execute?: (fieldname: string, value?: string) => void
    options?: InputOption<string>[]
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
    type ActionType = 'editfield' | 'execute' | 'inputpicker' | 'gotoform' | 'none'
    interface SpecType {
        icon: IconType
        iconcolor?: string
        action: ActionType
        hasfield?: boolean
        formtitle?: string // Title to display in editing mode
        fieldval?: string | number
        textcolor?: string
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
    const specs: Record<ItemType, SpecType> = {
        id: { icon: AiOutlineNumber, action: 'none', hasfield: true, fieldval: sysData.id, fieldTooltip: sysData.uuid },
        label: {
            icon: TsLabelIcon,
            iconcolor: '#1C78E0',
            action: 'editfield',
            hasfield: true,
            fieldval: sysData.label,
            textcolor: 'orange',
            buttonTooltip: 'Add or remove a label to mark a system for copying or for `goto` instructions.'
        },
        new: {
            icon: TsNewIcon,
            iconcolor: '#1C78E0',
            action: 'execute',
            hasfield: false,
            buttonTooltip: 'Create an empty system below this one.'
        },
        copy: {
            icon: TsCopyIcon,
            iconcolor: '#1C78E0',
            action: 'inputpicker',
            hasfield: true,
            formtitle: 'copy',
            fieldval: sysData.copyfrom,
            textcolor: 'blue',
            buttonTooltip: 'Select a system that should be copied below this one.',
            fieldTooltip: 'Label or number of the system from which this system was copied.'
        },
        delete: {
            icon: TsDeleteIcon,
            iconcolor: '#1C78E0',
            action: 'execute',
            hasfield: false,
            buttonTooltip: 'Delete this system (warning: can not be undone).'
        },
        goto_loop: {
            icon: IoArrowForwardOutline,
            iconcolor: '#1C78E0',
            action: 'gotoform',
            hasfield: true,
            formtitle: `system # ${sysData.id}`,
            fieldval:
                sysData.execution
                    ?.filter((item) => item.type == 'goto')
                    .map((item) => item.targetname)
                    .join('\n') || '',
            textcolor: 'green',
            buttonTooltip: 'Add a `goto` or `loop` instruction.',
            fieldTooltip:
                sysData.execution
                    ?.filter((item) => ['goto', 'loop'].includes(item.type))
                    ?.map((item) => item.tooltip)
                    .join('\n') || ''
        },
        tempo_dynamics: {
            icon: IoArrowForwardOutline,
            iconcolor: '#1C78E0',
            action: 'gotoform',
            hasfield: true,
            formtitle: `Tempo and Dynamics instructions for system # ${sysData.id}`,
            fieldval:
                sysData.execution
                    ?.filter((item) => ['tempo', 'dynamics'].includes(item.type))
                    .map((item) => item.tooltipshort)
                    .join('\n') || '',
            textcolor: 'green',
            buttonTooltip: 'Add a `goto` or `loop` instruction.',
            fieldTooltip:
                sysData.execution
                    ?.filter((item) => ['tempo', 'dynamics'].includes(item.type))
                    .map((item) => item.tooltip)
                    .join('\n') || ''
        }
    }
    const [editing, setEditing] = useState<boolean>(false)
    const inputRef = useRef<HTMLInputElement & PickerHandle>(null)
    const [warning, setWarning] = useState<string | null>(null)

    // Action performed on button click event and after field editing/selection.
    function buttonAction(event: any, action: string) {
        debug(`executing button action ${action}`)
        if (specs[item].hasfield) {
            setEditing(true)
            return
        }
        setEditing(false)
        if (action != 'cancel' && validate() && execute) execute(item)
    }

    useEffect(() => {
        // Cancel editing when Esc key is pressed or when user clicks anywhere outside the input field.
        // The input field's onClick handler stops propagation to avoid closing it on mouse click.
        if (editing) {
            function handleEscapeKey(event: KeyboardEvent) {
                if (event.code === 'Escape') {
                    setEditing(false)
                }
            }
            function handleClick(event: PointerEvent) {
                setEditing(false)
            }
            document.addEventListener('keydown', handleEscapeKey)
            document.addEventListener('click', handleClick)
            return () => {
                // Cleanup functions
                document.removeEventListener('keydown', handleEscapeKey)
                document.removeEventListener('click', handleClick)
            }
        }
    }, [editing])

    function inputAction(event: any, action: string, value: string | undefined) {
        event.target.blur()
        debug(`warning is ${warning}`)
        if (action != 'cancel' && !(warning == null)) return
        const returnValue = value || inputRef.current?.value
        debug(`executing field action ${action} value=${returnValue}`)
        setEditing(false)
        setWarning(null) // Can only reach this point if cancel was selected.
        if (action != 'cancel' && execute) execute(item, returnValue)
    }

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
            inputAction(e, 'save', value)
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
                onClick={(e) => inputAction(e, action, inputRef.current?.value)}
            />
        )
    }

    // Input field for values whose action is 'edit'
    const inputField = (
        <InputGroup inside size="xs" {...props}>
            <Input ref={inputRef} defaultValue={specs[item].fieldval || ''} onKeyUp={onEnter} onChange={validate} />
            <InputGroup.Addon as="span">
                <SaveCancelBtn action="cancel" />
                <SaveCancelBtn action="save" />
            </InputGroup.Addon>
        </InputGroup>
    )

    // Selection list for 'copy' and 'goto' actions
    const inputPicker = (
        <InputPicker
            ref={inputRef}
            data={options || []}
            defaultValue={specs[item].fieldval || ''}
            onChange={(val, e) => inputAction(e, 'save', val)}
            placeholder={`${specs[item].formtitle}`}
            width="100%"
        />
    )

    const flowItemsForm = (
        <ExecutionForm
            systemData={sysData}
            title={`${specs[item].formtitle}`}
            open={editing}
            sysOptions={options || []}
            setOpen={setEditing}
        />
    )

    const inputMethod =
        specs[item].action == 'editfield'
            ? inputField
            : specs[item].action == 'inputpicker'
              ? inputPicker
              : specs[item].action == 'gotoform'
                ? flowItemsForm
                : null

    const SummaryIcon = specs[item].icon
    const summaryIcon = <SummaryIcon size="1.3rem" color={specs[item].iconcolor} />
    const textWhisperRef = useRef<OverlayTriggerHandle>(null)

    // Show message on warning. Note: currently warning is only set by field validation.
    useEffect(() => {
        if (warning) textWhisperRef.current?.open()
        else textWhisperRef.current?.close()
    }, [warning])

    return (
        <>
            {specs[item].action == 'none' ? (
                summaryIcon
            ) : (
                <Whisper
                    placement="autoVerticalStart"
                    delayClose={50}
                    trigger={warning ? 'click' : specs[item].buttonTooltip ? 'hover' : 'none'}
                    controlId={`control-id-Whisper`}
                    className="mytooltip"
                    speaker={
                        <Tooltip className="mytooltip">{warning ? warning : specs[item].buttonTooltip || ''}</Tooltip>
                    }>
                    <IconButton
                        size="sm"
                        as={'span'}
                        icon={summaryIcon}
                        onClick={(event: MouseEvent<HTMLElement>) => {
                            buttonAction(event, specs[item].action)
                        }}
                        className="pl-0 pr-1 pt-0 pb-0"
                    />
                </Whisper>
            )}
            {specs[item].hasfield ? (
                <Whisper
                    ref={textWhisperRef}
                    delayClose={50}
                    trigger={specs[item].fieldTooltip ? 'hover' : 'none'}
                    placement="autoVerticalStart"
                    controlId={`control-id-Whisper`}
                    speaker={
                        // style whiteSpace:pre enables to use \n for new line
                        <Tooltip className="whitespace-pre">
                            {warning ? warning : specs[item].fieldTooltip || ''}
                        </Tooltip>
                    }>
                    <span style={{ color: specs[item].textcolor, width: '100%' }} className="text-sm pl-3">
                        {editing ? inputMethod : null}
                        {editing && ['editfield', 'inputpicker'].includes(specs[item].action)
                            ? null
                            : `${specs[item].fieldval || ''}`}
                    </span>
                </Whisper>
            ) : (
                <></>
            )}
        </>
    )
}
