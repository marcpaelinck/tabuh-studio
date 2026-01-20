import MinusIcon from '@rsuite/icons/Minus'
import PlusIcon from '@rsuite/icons/Plus'
import { useEffect, useState, type Dispatch } from 'react'
import type { FormProps } from 'rsuite'
import { Button, Divider, Drawer, Form, IconButton, List, SelectPicker } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { executionItemTooltip } from '../../hooks/useEditorScoreManager'
import type { EditorSystem, ExecutionItem, ExecutionItemType, GotoItem, LoopItem } from '../../models/types'
import { debug } from '../../utils/debugger'
import ExecutionItemForm from './ExecutionItemForm'

type ExecutionItemDefault =
    | ExecutionItem
    | { type: ExecutionItemType | undefined; seqId: number | undefined; tooltip: string; tooltipshort: string }

const defaultItem: Record<ExecutionItemType | 'new', ExecutionItemDefault> = {
    goto: { type: 'goto', targetuuid: '', targetname: '', tooltip: 'goto', tooltipshort: '' },
    loop: { type: 'loop', count: 0, tooltip: 'loop', tooltipshort: '' },
    tempo: { type: 'tempo', isGradual: false, toSection: -1, toValue: -1, tooltip: 'tempo', tooltipshort: '' },
    dynamics: { type: 'dynamics', isGradual: false, toSection: -1, toValue: -1, tooltip: 'dynamics', tooltipshort: '' },
    new: { type: undefined, seqId: undefined, tooltip: 'specify type', tooltipshort: '' }
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
        if (!selectedElement) return
        const newItemList = [...itemList]
        newItemList.splice(selectedElement, 1)
        setItemList(newItemList)
        setSelectedElement(undefined)
    }

    const typeOptions: { label: string; value: ExecutionItemType }[] = [
        { label: 'go to', value: 'goto' },
        { label: 'loop', value: 'loop' },
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
                                className={idx == selectedElement ? 'font-bold bg-amber-100' : ''}>
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
                                                    val.type = value
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
    systemData: EditorSystem
    title: string
    open: boolean
    sysOptions: InputOption<string>[]
    setOpen: Dispatch<boolean>
}

// Main form Component
// The form consists of a list of flow items and several input fields. The field values corresponds
// with the properties of the selected items.
export function ExecutionForm({ systemData, title, open, sysOptions, setOpen, ...props }: ExecutionFormProps) {
    const [itemList, setItemList] = useState<ExecutionItemDefault[]>(systemData.execution || [])
    const [selectedListElement, setSelectedListElement] = useState<number | undefined>(undefined)
    const [formValue, setFormValue] = useState<Record<string, any>>({})
    const [dirtyForm, setDirtyForm] = useState<boolean>(false)

    const uuidToNameLookup = Object.fromEntries(sysOptions.map((el) => [el.value, el.label]))

    // Populates the forms fields with the values of the selected item
    function updateFieldsFromSelected() {
        if (selectedListElement == undefined) return
        const selectedItem = itemList[selectedListElement] as ExecutionItem
        const newFormValue = { ...selectedItem, each: selectedItem.each, passes: selectedItem.passes }
        if (selectedItem.type == 'goto') (newFormValue as GotoItem).targetuuid = selectedItem.targetuuid || ''
        if (selectedItem.type == 'loop') (newFormValue as LoopItem).count = selectedItem.count
        setFormValue(newFormValue)
    }

    // Updates the selected list item with the form values
    function updateSelectedFromFields() {
        if (!selectedListElement) return
        const selectedItem = itemList[selectedListElement] as ExecutionItem
        var newItem: ExecutionItem = {
            ...selectedItem,
            passes: formValue.each == undefined ? undefined : formValue.passes,
            each: formValue.each
        }
        debug(newItem.type)
        if (selectedItem.type == 'goto') {
            newItem = newItem as GotoItem
            newItem.targetuuid = formValue.targetuuid || ''
            newItem.targetname = uuidToNameLookup[formValue.targetuuid]
        }
        if (selectedItem.type == 'loop') {
            newItem = newItem as LoopItem
            newItem.count = formValue.count
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

    // Populate fields from new selected item
    useEffect(() => {
        debug(`LIST UPDATED: ${JSON.stringify(itemList)}`)
    }, [itemList])

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
        setOpen(false)
    }

    return (
        <Drawer open={open} onClose={() => setOpen(false)}>
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
                <Form onChange={setFormValue} formValue={formValue} {...props}>
                    {/* Details of the selected execution item */}
                    <ExecutionItemForm
                        type={selectedListElement != undefined ? itemList[selectedListElement].type : undefined}
                        selectedElement={selectedListElement}
                        itemInfo={formValue}
                        sysOptions={sysOptions}
                        setDirty={setDirtyForm}
                    />
                </Form>
            </Drawer.Body>
        </Drawer>
    )
}
