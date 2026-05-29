import MinusIcon from '@rsuite/icons/Minus'
import PlusIcon from '@rsuite/icons/Plus'
import { useEffect, useState, type Dispatch } from 'react'
import type { FormProps } from 'rsuite'
import { Button, Divider, Drawer, IconButton, List, SelectPicker } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { dynamicsToNumber } from '../../config/config'
import type {
    DynamicsItem,
    ExecutionItem,
    ExecutionItemType,
    GotoItem,
    KempliValue,
    LoopItem,
    TempoItem
} from '../../typing/execution'
import type { System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { executionItemTooltip } from '../../utils/executionItems'
import ExecutionItemForm, { formModel, type FlowConditionType, type FormValueType } from './ExecutionItemForm'

type ExecutionItemDefault = {
    type?: ExecutionItemType
    value?: KempliValue | number
    targetuuid?: string
    targetname?: string
    isGradual?: boolean
    count?: number
    seconds?: number
    seqId?: number
    tooltip?: string
    tooltipshort?: string
    toBPM?: number
    toDynamics?: string
    toBeat?: number
}

const defaultItem: Record<ExecutionItemType | 'new', ExecutionItemDefault> = {
    goto: { type: 'goto', targetuuid: '', targetname: '', tooltip: 'goto', tooltipshort: '' },
    loop: { type: 'loop', count: undefined, tooltip: 'loop', tooltipshort: '' },
    wait: { type: 'wait', seconds: 0, tooltip: 'wait', tooltipshort: '' },
    tempo: {
        type: 'tempo',
        isGradual: undefined,
        toBeat: undefined,
        toBPM: undefined,
        tooltip: 'tempo',
        tooltipshort: ''
    },
    dynamics: {
        type: 'dynamics',
        isGradual: undefined,
        toBeat: undefined,
        toDynamics: undefined,
        tooltip: 'dynamics',
        tooltipshort: ''
    },
    sequence: { type: 'sequence', tooltip: 'specify type', tooltipshort: '' },
    suppress: { type: 'suppress', tooltip: 'specify type', tooltipshort: '' },
    kempli: { type: 'kempli', tooltip: 'specify type', tooltipshort: '' },
    new: { type: undefined, seqId: 0, tooltip: 'specify type', tooltipshort: '' }
}

interface FlowElementListProps {
    label: string
    itemList: ExecutionItemDefault[]
    setItemList: Dispatch<ExecutionItemDefault[]>
    selectedElement: number | undefined
    setSelectedElement: Dispatch<number | undefined>
}

// Editable list of execution items (goto, loop, tempo and dynamics)
const FlowElementList = ({
    label,
    itemList,
    selectedElement,
    setSelectedElement,
    setItemList
}: FlowElementListProps) => {
    useEffect(() => {
        // Select first item if any
        if (itemList && itemList.length > 0) setSelectedElement(0)
    }, [])

    async function handleAdd() {
        const newItem: ExecutionItemDefault = { ...defaultItem['new'] }
        newItem.seqId = itemList.length
        const newItemList = [...itemList, newItem]
        setItemList(newItemList)
        setSelectedElement(itemList.length)
    }

    function handleDelete() {
        if (selectedElement == undefined) return
        const newItemList = [...itemList]
        newItemList.splice(selectedElement, 1)
        setItemList(newItemList)
        setSelectedElement(undefined)
    }

    const typeOptions: { label: string; value: ExecutionItemType }[] = [
        { label: 'go to', value: 'goto' },
        { label: 'loop', value: 'loop' },
        { label: 'wait', value: 'wait' },
        { label: 'tempo', value: 'tempo' },
        { label: 'dynamics', value: 'dynamics' }
    ]
    return (
        <>
            <div>{label}</div>
            <List bordered divider={false} autoScroll className={'border-black w-full h-40'}>
                {itemList &&
                    itemList.map((val, idx) => {
                        if (!val) return
                        val.seqId = idx
                        return (
                            <List.Item
                                key={`execution-${idx}`}
                                className={
                                    'h-9 pt-0 pb-0 items-center flex ' +
                                    (idx == selectedElement ? 'font-bold bg-amber-100' : '')
                                }>
                                <div
                                    onClick={(e) => {
                                        setSelectedElement(idx)
                                    }}>
                                    {val.type && val.tooltip}
                                    {!val.type && (
                                        <SelectPicker
                                            data={typeOptions}
                                            searchable={false}
                                            w={224}
                                            placeholder="Select a type"
                                            onChange={(value) => {
                                                if (value) {
                                                    const newList = [...itemList]
                                                    newList.splice(idx, 1, defaultItem[value])
                                                    setItemList(newList)
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            </List.Item>
                        )
                    })}
            </List>
            <IconButton onClick={() => handleAdd()} icon={<PlusIcon />} />
            <IconButton onClick={() => handleDelete()} icon={<MinusIcon />} />{' '}
        </>
    )
}

interface ExecutionFormProps extends FormProps {
    systemData: System
    title: string
    open: boolean
    sysOptions: InputOption<string>[]
    setOpen: Dispatch<boolean>
    onSave: () => void
}

// Main form Component
// The form consists of a list of flow items and several input fields. The field values corresponds
// with the properties of the selected list item.
export function ExecutionForm({ systemData, title, open, sysOptions, setOpen, onSave, ...props }: ExecutionFormProps) {
    const [itemList, setItemList] = useState<ExecutionItemDefault[]>(systemData.execution || [])
    const [selectedListElement, setSelectedListElement] = useState<number | undefined>(undefined)
    const [formValue, setFormValue] = useState<FormValueType>({} as FormValueType)
    const [dirtyForm, setDirtyForm] = useState<boolean>(false)
    const [loop, setLoop] = useState<number | undefined>(undefined) // loop value if a loop item occurs in the itemList

    const uuidToNameLookup = Object.fromEntries(sysOptions.map((el) => [el.value, el.label]))

    useEffect(() => debug(`ITEMLIST=${JSON.stringify(itemList)}`), [itemList])
    useEffect(() => debug(`ExecutionForm is ${open ? 'open' : 'closed'}`), [open])

    // Set the loop state value
    useEffect(() => {
        const loopElement = itemList.find((el) => el.type == 'loop')
        if (loopElement) {
            setLoop(loopElement.count)
        } else {
            setLoop(undefined)
        }
    }, [itemList])

    // Populates the forms fields with the values of the selected item
    function updateFieldsFromSelected() {
        if (selectedListElement == undefined) return
        const selectedItem = itemList[selectedListElement] as ExecutionItem
        var conditions: FlowConditionType[] = []
        if (selectedItem.nthpass != undefined) conditions.push(selectedItem.nthpass ? 'nthpass' : 'pass')
        if ('iterations' in selectedItem && selectedItem.iterations != undefined) {
            conditions.push('iteration')
        }
        // if (conditions.length == 0) conditions = undefined
        var newFormValue: FormValueType = { ...selectedItem, conditions: conditions, passes: selectedItem.passes }
        debug(`UPDATE FIELDS=${JSON.stringify(newFormValue)}`)
        if (selectedItem.type == 'goto') newFormValue.targetuuid = selectedItem.targetuuid || ''
        if (selectedItem.type == 'loop') newFormValue.count = selectedItem.count
        if (selectedItem.type == 'wait') newFormValue.count = selectedItem.seconds
        if (selectedItem.type == 'tempo') {
            newFormValue.fromBPM = selectedItem.fromValue
            newFormValue.toBPM = selectedItem.value
            newFormValue.isGradual = selectedItem.isGradual
            newFormValue.fromBeat = selectedItem.fromBeat
            newFormValue.toBeat = selectedItem.toBeat
        }
        if (selectedItem.type == 'dynamics') {
            newFormValue.fromDynamics = selectedItem.fromDynamics
            newFormValue.toDynamics = selectedItem.dynamics
            newFormValue.isGradual = selectedItem.isGradual
            newFormValue.fromBeat = selectedItem.fromBeat
            newFormValue.toBeat = selectedItem.toBeat
        }
        debug(`UPDATE FIELDS2=${JSON.stringify(newFormValue)}`)
        setFormValue(newFormValue)
    }

    // Updates the selected list item with the form values
    function updateSelectedFromFields() {
        debug(`ITEMTYPE=${formValue.type}`)
        if (selectedListElement == undefined) return
        const selectedItem = itemList[selectedListElement] as ExecutionItem
        var newItem: ExecutionItem = {
            ...selectedItem,
            passes: formValue.conditions?.some((val) => ['pass', 'nthpass'].includes(val))
                ? formValue.passes || []
                : undefined,
            nthpass: formValue.conditions?.includes('nthpass')
                ? true
                : formValue.conditions?.includes('pass')
                  ? false
                  : undefined
        }
        debug(`EDITING`)
        if (selectedItem.type == 'goto') {
            newItem = newItem as GotoItem
            newItem.targetuuid = formValue.targetuuid || ''
            if (formValue.targetuuid) newItem.targetname = uuidToNameLookup[formValue.targetuuid]
        }
        if (selectedItem.type == 'loop') {
            newItem = newItem as LoopItem
            if (formValue.count) newItem.count = formValue.count
        }
        if (selectedItem.type == 'tempo') {
            newItem = newItem as TempoItem
            newItem.fromValue = formValue.fromBPM ? Number(formValue.fromBPM) : undefined
            newItem.value = Number(formValue.toBPM)
            newItem.isGradual = formValue.isGradual || false
            newItem.fromBeat = formValue.fromBeat
            if (formValue.conditions?.includes('iteration')) newItem.iterations = formValue.iterations || []
            else newItem.iterations = undefined
            if (formValue.toBeat != undefined) newItem.toBeat = formValue.toBeat
            debug(`TEMPO=${formValue.toBPM} NewItem=${newItem.value}`)
        }
        if (selectedItem.type == 'dynamics') {
            newItem = newItem as DynamicsItem
            newItem.fromDynamics = formValue.fromDynamics
            newItem.fromValue = newItem.fromDynamics ? dynamicsToNumber[newItem.fromDynamics] : undefined
            if (formValue.toDynamics != undefined) newItem.dynamics = formValue.toDynamics
            newItem.value = dynamicsToNumber[newItem.dynamics]
            newItem.isGradual = formValue.isGradual || false
            newItem.fromBeat = formValue.fromBeat
            if (formValue.conditions?.includes('iteration')) newItem.iterations = formValue.iterations || []
            else newItem.iterations = undefined
            if (formValue.toBeat != undefined) newItem.toBeat = formValue.toBeat
        }
        newItem = {
            ...newItem,
            tooltip: executionItemTooltip(newItem, 'long'),
            tooltipshort: executionItemTooltip(newItem, 'short')
        }
        const newItemList = [...itemList]
        newItemList.splice(selectedListElement, 1, newItem)
        setItemList(newItemList)
    }

    // Populate fields from new selected item
    useEffect(() => {
        updateFieldsFromSelected()
    }, [selectedListElement])

    // Update item when user modifies a field
    useEffect(() => {
        if (dirtyForm) {
            setDirtyForm(false)
            updateSelectedFromFields()
        }
    }, [dirtyForm])

    function validate(itemList: ExecutionItemDefault[]): ExecutionItem[] | undefined {
        return itemList ? (itemList.filter((item) => item.type != undefined) as ExecutionItem[]) : undefined
    }

    const handleSave = () => {
        if (itemList) {
            const validatedList = validate(itemList)
            if (validatedList) if (itemList) systemData.execution = validatedList
        }
        onSave()
        setOpen(false)
    }

    return (
        <Drawer open={open} backdrop="static" onClose={() => setOpen(false)}>
            <Drawer.Header>
                <Drawer.Title>{title}</Drawer.Title>
                <Drawer.Actions>
                    <Button
                        onClick={(e) => {
                            setOpen(false)
                        }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={(e) => {
                            handleSave()
                        }}
                        appearance="primary">
                        Confirm
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                {/* List of execution items */}
                <FlowElementList
                    label="Execution instructions"
                    itemList={itemList}
                    selectedElement={selectedListElement}
                    setSelectedElement={setSelectedListElement}
                    setItemList={setItemList}
                />
                <Divider color="#000" size="xs" spacing="lg" />
                <ExecutionItemForm
                    model={formModel}
                    // onChange={(val) => {
                    //     setFormValue(val as FormValueType)
                    //     setDirtyForm(true)
                    // }}
                    formValue={formValue}
                    type={selectedListElement != undefined ? itemList[selectedListElement].type : undefined}
                    selectedElement={selectedListElement}
                    sysOptions={sysOptions}
                    setDirty={setDirtyForm}
                    setFormValue={setFormValue}
                    loop={loop}
                />
            </Drawer.Body>
        </Drawer>
    )
}
