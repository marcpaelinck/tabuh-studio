import MinusIcon from '@rsuite/icons/Minus'
import PlusIcon from '@rsuite/icons/Plus'
import { useEffect, useState, type Dispatch } from 'react'
import type { CheckPickerProps, FormControlProps, FormGroupProps, FormProps } from 'rsuite'
import { Button, CheckPicker, Divider, Drawer, Form, IconButton, InputPicker, List } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { ArrayType, BooleanType, NumberType, SchemaModel, StringType } from 'rsuite/Schema'
import { flowItemTooltip } from '../../hooks/useEditorScoreManager'
import type { EditorSystem, FlowItem, GotoItem } from '../../models/types'
import { debug } from '../../utils/debugger'

const formModel = { type: 'type', targetuuid: 'targetuuid', passes: 'passes', each: 'each' }
const newGoto: GotoItem = { type: 'goto', targetuuid: '', targetname: '', tooltip: 'goto', tooltipshort: '' }

const model = SchemaModel({
    type: StringType().isRequired(),
    targetuuid: StringType().isRequired(),
    passes: ArrayType().of(NumberType()).isRequiredOrEmpty(),
    each: BooleanType().isRequiredOrEmpty()
})

interface FlowElementListProps {
    label: string
    itemList: FlowItem[]
    setItemList: Dispatch<FlowItem[]>
    selectedElement: number | undefined
    setSelectedElement: Dispatch<number | undefined>
}

// Editable list of flow items (goto and loop)
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
        const newItem = { ...newGoto }
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
                            key={`goto-${idx}`}
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

// START OF FORM COMPONENTS

interface PickerFieldProps
    extends FormControlProps, FormGroupProps, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    data: any
    label: string
    selectedElement: number | undefined
    setDirty: Dispatch<boolean>
}

// Selection (single or multiple)
const PickerField = ({ label, selectedElement, setDirty, ...props }: PickerFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={props.accepter || InputPicker}
                cleanable={false}
                onChange={() => setDirty(true)}
                disabled={selectedElement == undefined}
                block
                searchable={false}
                className="w-60"
                {...props}
            />
        </Form.Group>
    )
}

interface ItemFormProps extends FormControlProps {
    label: string
    selectedElement: number | undefined
    setDirty: Dispatch<boolean>
    value: Record<string, any>
    sysOptions: InputOption<string>[]
}
// Form that captures the details of the selected item
const ItemForm = ({ label, selectedElement, value, sysOptions, setDirty, ...props }: ItemFormProps) => {
    return (
        <>
            <Form.Stack layout="horizontal">
                <Form.Group controlId={`${props.name}-type`}>
                    <Form.Label className="w-40">Type</Form.Label>
                    <Form.Text className="w-120 font-bold text-base">{value.type}</Form.Text>
                </Form.Group>
                <PickerField
                    label="Target system"
                    name={formModel.targetuuid}
                    value={value.targetuuid}
                    selectedElement={selectedElement}
                    setDirty={setDirty}
                    data={sysOptions || []}
                    placeholder={'System to go to'}
                />
                <PickerField
                    label="Condition"
                    name={formModel.each}
                    value={value.each}
                    selectedElement={selectedElement}
                    setDirty={setDirty}
                    data={[
                        { label: 'none', value: undefined },
                        { label: 'after pass(es) nr ...', value: false },
                        { label: 'after every ...th pass', value: true }
                    ]}
                />
                {value.each != undefined && (
                    <PickerField
                        accepter={CheckPicker}
                        label="Passes"
                        name={formModel.passes}
                        value={value.passes}
                        selectedElement={selectedElement}
                        countable={false}
                        setDirty={setDirty}
                        data={new Array(20).fill(null).map((_, idx) => {
                            return { label: `${idx + 1}`, value: idx + 1 }
                        })}
                    />
                )}
            </Form.Stack>
        </>
    )
}

interface FlowItemFormProps extends FormProps {
    systemData: EditorSystem
    title: string
    open: boolean
    sysOptions: InputOption<string>[]
    setOpen: Dispatch<boolean>
}

// Main form Component
// The form consists of a list of flow items and several input fields. The field values corresponds
// with the properties of the selected items.
export function FlowItemsForm({ systemData, title, open, sysOptions, setOpen, ...props }: FlowItemFormProps) {
    const [itemList, setItemList] = useState<FlowItem[]>(systemData.flow || [])
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
            tooltip: flowItemTooltip(newItem, 'long'),
            tooltipshort: flowItemTooltip(newItem, 'short')
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
        if (itemList) systemData.flow = itemList
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
                <FlowElementList
                    label="Go To & Loop instructions"
                    itemList={itemList}
                    selectedElement={selectedListElement}
                    setSelectedElement={setSelectedListElement}
                    setItemList={setItemList}
                />
                <Divider color="#000" size="xs" spacing="lg" />
                <Form onChange={setFormValue} formValue={formValue} {...props}>
                    <ItemForm
                        name="goto-loop"
                        label="Go To & Loop instructions"
                        value={formValue}
                        selectedElement={selectedListElement}
                        setDirty={setDirtyForm}
                        sysOptions={sysOptions}
                    />
                </Form>
            </Drawer.Body>
        </Drawer>
    )
}
