import MinusIcon from '@rsuite/icons/Minus'
import PlusIcon from '@rsuite/icons/Plus'
import { useEffect, useState, type Dispatch } from 'react'
import type { FormProps } from 'rsuite'
import { Button, Divider, Drawer, Form, IconButton, List } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { executionItemTooltip } from '../../hooks/useEditorScoreManager'
import type { EditorSystem, ExecutionItem, ExecutionItemType, GotoItem } from '../../models/types'
import { debug } from '../../utils/debugger'
import ExecutionItemForm from './ExecutionItemForm'

const defaultItem: Record<ExecutionItemType, ExecutionItem> = {
    goto: { type: 'goto', targetuuid: '', targetname: '', tooltip: 'goto', tooltipshort: '' },
    loop: { type: 'loop', count: 0, tooltip: 'loop', tooltipshort: '' },
    tempo: { type: 'tempo', isGradual: false, toSection: -1, toValue: -1, tooltip: 'tempo', tooltipshort: '' },
    dynamics: { type: 'dynamics', isGradual: false, toSection: -1, toValue: -1, tooltip: 'dynamics', tooltipshort: '' }
}

interface FlowElementListProps {
    label: string
    itemList: ExecutionItem[]
    setItemList: Dispatch<ExecutionItem[]>
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

    function handleAdd() {
        const newItem: ExecutionItem = { ...defaultItem.goto }
        newItem.seqId = itemList.length
        const newItemList = [...itemList, newItem]
        setItemList(newItemList)
        setSelectedElement(0)
    }

    function handleDelete() {
        if (!selectedElement) return
        const newItemList = [...itemList]
        newItemList.splice(selectedElement, 1)
        setItemList(newItemList)
        setSelectedElement(undefined)
    }

    return (
        <>
            <div>{label}</div>
            <List bordered divider={false} autoScroll className={'border-black w-full h-40'}>
                {itemList.map((val, idx) => {
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
                                {val.tooltip}
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
    const [itemList, setItemList] = useState<ExecutionItem[]>(systemData.execution || [])
    const [selectedListElement, setSelectedListElement] = useState<number | undefined>(undefined)
    const [formValue, setFormValue] = useState<Record<string, any>>({})
    const [dirtyForm, setDirtyForm] = useState<boolean>(false)

    const uuidToNameLookup = Object.fromEntries(sysOptions.map((el) => [el.value, el.label]))

    // Populates the forms fields with the values of the selected item
    function updateFieldsFromSelected() {
        if (selectedListElement == undefined) return
        const selectedItem = itemList[selectedListElement] as GotoItem
        const newFormValue = {
            ...selectedItem,
            targetuuid: selectedItem.targetuuid || '',
            each: selectedItem.each,
            passes: selectedItem.passes
        }
        setFormValue(newFormValue)
    }

    // Updates the selected list item with the form values
    function updateSelectedFromFields() {
        if (!selectedListElement) return
        const selectedItem = itemList[selectedListElement] as GotoItem
        var newItem = {
            ...selectedItem,
            targetuuid: formValue.targetuuid,
            targetname: uuidToNameLookup[formValue.targetuuid],
            passes: formValue.each == undefined ? undefined : formValue.passes,
            each: formValue.each
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

    const handleSave = () => {
        if (itemList) systemData.execution = itemList
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
                    label="Go To & Loop instructions"
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
