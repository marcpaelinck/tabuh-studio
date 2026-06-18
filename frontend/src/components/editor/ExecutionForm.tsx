import MinusIcon from '@rsuite/icons/Minus'
import PlusIcon from '@rsuite/icons/Plus'
import { useEffect, useState, type Dispatch } from 'react'
import type { FormProps } from 'rsuite'
import { Button, Divider, Drawer, IconButton, List, SelectPicker } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { ExecutionItem, LoopItem } from '../../typing/execution'
import type { System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { executionItemTooltip } from '../../utils/executionItems'
import ExecutionItemForm, {
    executionItemRegistry,
    executionTypeOptions,
    formModel,
    positionOptionsForSystem,
    type ExecutionItemDraft,
    type FlowConditionType,
    type FormValueType
} from './ExecutionItemForm'

const newPlaceholder = (seqId: number): ExecutionItemDraft => ({
    type: undefined,
    seqId,
    tooltip: 'specify type',
    tooltipshort: ''
})

interface FlowElementListProps {
    label: string
    itemList: ExecutionItemDraft[]
    setItemList: Dispatch<ExecutionItemDraft[]>
    selectedElement: number | undefined
    setSelectedElement: Dispatch<number | undefined>
}

// Editable list of execution items.
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

    function handleAdd() {
        const newItemList = [...itemList, newPlaceholder(itemList.length)]
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

    function cutoff(strValue: string, maxLength: number) {
        return strValue.length <= maxLength ? strValue : strValue.slice(0, maxLength) + '...'
    }

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
                                <div onClick={() => setSelectedElement(idx)}>
                                    {val.type && cutoff(val.tooltip, 45)}
                                    {!val.type && (
                                        <SelectPicker
                                            data={executionTypeOptions}
                                            searchable={false}
                                            w={224}
                                            placeholder="Select a type"
                                            onChange={(value) => {
                                                if (value) {
                                                    const created = executionItemRegistry[value].createDefault()
                                                    created.seqId = idx
                                                    const newList = [...itemList]
                                                    newList.splice(idx, 1, created)
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
            <IconButton onClick={() => handleDelete()} icon={<MinusIcon />} />
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

// Main form component: a list of execution items plus a detail form whose fields
// reflect the selected item. Both halves are driven by the descriptor registry.
export function ExecutionForm({ systemData, title, open, sysOptions, setOpen, onSave }: ExecutionFormProps) {
    const [itemList, setItemList] = useState<ExecutionItemDraft[]>(systemData.execution || [])
    const [selectedListElement, setSelectedListElement] = useState<number | undefined>(undefined)
    const [formValue, setFormValue] = useState<FormValueType>({ type: '', conditions: [] })
    const [dirtyForm, setDirtyForm] = useState<boolean>(false)
    const [loop, setLoop] = useState<number | undefined>(undefined) // loop count if a loop item exists

    const uuidToNameLookup = Object.fromEntries(sysOptions.map((el) => [el.value, el.label as string]))
    const positionOptions = positionOptionsForSystem(systemData.staffs)

    useEffect(() => debug(`ITEMLIST=${JSON.stringify(itemList)}`), [itemList])

    // Track the loop count so the condition form can offer per-iteration scoping.
    useEffect(() => {
        const loopElement = itemList.find((el) => el.type == 'loop') as LoopItem | undefined
        setLoop(loopElement ? loopElement.count : undefined)
    }, [itemList])

    // Populate the form fields from the selected item (delegated to its descriptor).
    function updateFieldsFromSelected() {
        if (selectedListElement == undefined) return
        const selected = itemList[selectedListElement]
        if (!selected.type) {
            setFormValue({ type: '', conditions: [] })
            return
        }
        const item = selected as ExecutionItem
        const conditions: FlowConditionType[] = []
        if (item.nthpass != undefined) conditions.push(item.nthpass ? 'nthpass' : 'pass')
        if ('iterations' in item && item.iterations != undefined) conditions.push('iteration')
        setFormValue({
            type: item.type,
            conditions,
            passes: item.passes,
            iterations: 'iterations' in item ? item.iterations : undefined,
            ...executionItemRegistry[item.type].toForm(item)
        })
    }

    // Write the form values back into the selected item (delegated to its descriptor).
    function updateSelectedFromFields() {
        if (selectedListElement == undefined) return
        const selected = itemList[selectedListElement]
        if (!selected.type) return
        const item = selected as ExecutionItem
        const hasPassCondition = formValue.conditions?.some((v) => ['pass', 'nthpass'].includes(v))
        const base = {
            ...item,
            passes: hasPassCondition ? formValue.passes || [] : undefined,
            nthpass: formValue.conditions?.includes('nthpass')
                ? true
                : formValue.conditions?.includes('pass')
                  ? false
                  : undefined
        } as ExecutionItem
        let newItem = executionItemRegistry[item.type].fromForm(formValue, base, { uuidToName: uuidToNameLookup })
        newItem = {
            ...newItem,
            tooltip: executionItemTooltip(newItem, 'long'),
            tooltipshort: executionItemTooltip(newItem, 'short')
        }
        const newItemList = [...itemList]
        newItemList.splice(selectedListElement, 1, newItem)
        setItemList(newItemList)
    }

    // Populate fields when the selection changes.
    useEffect(() => {
        updateFieldsFromSelected()
    }, [selectedListElement])

    // Write back when the user edits a (valid) field.
    useEffect(() => {
        if (dirtyForm) {
            setDirtyForm(false)
            updateSelectedFromFields()
        }
    }, [dirtyForm])

    function handleSave() {
        const validated = itemList.filter((item) => item.type != undefined) as ExecutionItem[]
        systemData.execution = validated
        onSave()
        setOpen(false)
    }

    return (
        <Drawer open={open} backdrop={false} enforceFocus={false} onClose={() => setOpen(false)}>
            <Drawer.Header>
                <Drawer.Title>{title}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={() => handleSave()} appearance="primary">
                        Confirm
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
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
                    formValue={formValue}
                    type={selectedListElement != undefined ? itemList[selectedListElement].type : undefined}
                    selectedElement={selectedListElement}
                    sysOptions={sysOptions}
                    positionOptions={positionOptions}
                    setDirty={setDirtyForm}
                    setFormValue={setFormValue}
                    loop={loop}
                />
            </Drawer.Body>
        </Drawer>
    )
}
