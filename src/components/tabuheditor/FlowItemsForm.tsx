import MinusIcon from '@rsuite/icons/Minus'
import PlusIcon from '@rsuite/icons/Plus'
import { useEffect, useState, type Dispatch } from 'react'
import type { CheckPickerProps, FormControlProps, FormGroupProps, FormProps } from 'rsuite'
import { Button, CheckPicker, Divider, Drawer, Form, IconButton, InputPicker, List } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { ArrayType, BooleanType, NumberType, SchemaModel, StringType } from 'rsuite/Schema'
import { flowItemTooltip } from '../../hooks/useEditorScoreManager'
import type { FlowItem, GotoItem } from '../../models/types'
import { debug } from '../../utils/debugger'

const formModel = { listitems: 'listitems', targetuuid: 'targetuuid', passes: 'passes', each: 'each', cycle: 'cycle' }

const model = SchemaModel({
    listitems: ArrayType(),
    targetuuid: StringType().isRequired(),
    passes: ArrayType().of(NumberType()).isRequired(),
    each: BooleanType().isRequiredOrEmpty(),
    cycle: NumberType().isRequiredOrEmpty()
})

interface GotoListProps {
    value: Record<string, any>
    selectedItem: GotoItem
    setSelectedItem: Dispatch<GotoItem>
    setDirty: Dispatch<boolean>
}

// Editable list of flow items (goto and loop)
// Part of a FlowItemsForm
const GotoList = ({ value, selectedItem, setSelectedItem, setDirty }: GotoListProps) => {
    const handleMinus = () => {
        // if (!value) value.listitems.slice(0, -1)
    }
    const handleAdd = () => {
        // value.listitems
    }

    return (
        <>
            <List bordered divider={false} autoScroll className={'border-black w-full h-40'}>
                {((value.listitems as GotoItem[]) || []).map((val, idx) => {
                    if (!val) return
                    val.seqId = idx
                    return (
                        <List.Item
                            key={`goto-${idx}`}
                            className={idx == selectedItem?.seqId ? 'font-bold bg-amber-100' : ''}>
                            <div
                                onClick={(e) => {
                                    setSelectedItem(value.listitems[idx])
                                }}>
                                {val.tooltip}
                            </div>
                        </List.Item>
                    )
                })}
            </List>
            <IconButton onClick={handleAdd} icon={<PlusIcon />} />
            <IconButton onClick={handleMinus} icon={<MinusIcon />} />{' '}
        </>
    )
}

interface ItemListProps extends FormControlProps {
    label: string
    selectedItem: FlowItem | undefined
    setSelectedItem: Dispatch<GotoItem>
    setDirty: Dispatch<boolean>
}

// Form item: editable list
const ItemList = ({ label, selectedItem, setSelectedItem, setDirty, ...props }: ItemListProps) => (
    <Form.Stack fluid layout="vertical" className="w-full">
        <Form.Group controlid={props.name} {...props}>
            <Form.Label>{label}</Form.Label>
            <Form.Control
                accepter={GotoList}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                setDirty={setDirty}
                {...props}
            />
        </Form.Group>
    </Form.Stack>
)

interface PickerFieldProps
    extends FormControlProps, FormGroupProps, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    data: any
    label: string
    selectedItem: FlowItem | undefined
    setDirty: Dispatch<boolean>
}

// Selection (single or multiple)
const PickerField = ({ label, selectedItem, setDirty, ...props }: PickerFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={props.accepter || InputPicker}
                cleanable={false}
                onChange={() => setDirty(true)}
                disabled={selectedItem == undefined}
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
    selectedItem: FlowItem | undefined
    setDirty: Dispatch<boolean>
    value: Record<string, any>
    sysOptions: InputOption<string>[]
}
// Form that captures the details of the selected item
const ItemForm = ({ label, selectedItem, value, sysOptions, setDirty, ...props }: ItemFormProps) => {
    return (
        <>
            <Form.Stack layout="horizontal">
                <Form.Group controlId={`${props.name}-type`}>
                    <Form.Label className="w-40">Type</Form.Label>
                    <Form.Text className="w-120 font-bold text-base">{selectedItem?.type}</Form.Text>
                </Form.Group>
                <PickerField
                    label="Target system"
                    name={formModel.targetuuid}
                    value={value.targetuuid}
                    selectedItem={selectedItem}
                    setDirty={setDirty}
                    data={sysOptions || []}
                    placeholder={'System to go to'}
                />
                <PickerField
                    label="Condition"
                    name={formModel.each}
                    value={value.each}
                    selectedItem={selectedItem}
                    setDirty={setDirty}
                    data={[
                        { label: 'none', value: undefined },
                        { label: 'after pass nr ...', value: false },
                        { label: 'after every ...th pass', value: true }
                    ]}
                />
                {value.each != undefined && (
                    <PickerField
                        accepter={CheckPicker}
                        label="Passes"
                        name={formModel.passes}
                        value={value.passes}
                        selectedItem={selectedItem}
                        countable={false}
                        setDirty={setDirty}
                        data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nr) => {
                            return { label: `${nr}`, value: nr }
                        })}
                    />
                )}
            </Form.Stack>
        </>
    )
}

interface FlowInputFormProps extends FormProps {
    flowItems: FlowItem[]
    title: string
    open: boolean
    sysOptions: InputOption<string>[]
    setOpen: Dispatch<boolean>
}

// Main form Component
// The form consists of a list of flow items and several input fields. The field values corresponds
// with the properties of the selected items.
export function FlowItemsForm({ flowItems, title, open, sysOptions, setOpen, ...props }: FlowInputFormProps) {
    const [formValue, setFormValue] = useState<Record<string, any>>({ listitems: [...flowItems] })
    const [selectedItem, setSelectedItem] = useState<GotoItem | undefined>(undefined)
    const [dirtyForm, setDirtyForm] = useState<boolean>(false)
    const [dirtyList, setDirtyList] = useState<boolean>(false)

    const uuidToNameLookup = Object.fromEntries(sysOptions.map((el) => [el.value, el.label]))

    // Populates the forms fields with the values of the selected item
    function updateFieldsFromSelected() {
        const newListItems = formValue.listitems?.map((item: GotoItem) => {
            var newItem = { ...item, targetname: uuidToNameLookup[item.targetuuid] }
            newItem = {
                ...newItem,
                tooltip: flowItemTooltip(newItem, 'long'),
                tooltipshort: flowItemTooltip(newItem, 'short')
            }
            return newItem
        })
        const newFormValue = {
            listitems: newListItems,
            targetuuid: selectedItem?.targetuuid || '',
            each: selectedItem?.each,
            passes: selectedItem?.passes,
            cycle: selectedItem?.cycle
        }
        setFormValue(newFormValue)
    }

    // Updates the selected list item with the form values
    function updateSelectedFromFields() {
        const newListItems = formValue.listitems?.map((item: GotoItem) => {
            debug(`BEFORE UPDATE=${JSON.stringify(selectedItem)}`)
            const maxPassNr = formValue.passes ? Math.max(...formValue.passes) : 0
            debug(`MAXPASSCOUNT=${maxPassNr}`)
            if (!selectedItem || item.seqId != selectedItem.seqId) return { ...item }
            var newItem = {
                ...item,
                targetuuid: formValue.targetuuid,
                targetname: uuidToNameLookup[formValue.targetuuid],
                passes: formValue.passes,
                each: formValue.each,
                cycle: formValue.each && formValue.cycles < maxPassNr ? maxPassNr : formValue.cycles
            }
            newItem = {
                ...newItem,
                tooltip: flowItemTooltip(newItem, 'long'),
                tooltipshort: flowItemTooltip(newItem, 'short')
            }
            debug(`AFTER UPDATE=${JSON.stringify(newItem)}`)
            return newItem
        })
        const newFormValue = { ...formValue, listitems: newListItems }
        setFormValue(newFormValue)
    }

    // Populate fields from new selected item
    useEffect(() => {
        debug(`selected=${JSON.stringify(selectedItem)}`)
        updateFieldsFromSelected()
    }, [selectedItem, dirtyList])

    // Update item when user modifies a field
    useEffect(() => {
        if (dirtyForm) {
            debug(`selected=${JSON.stringify(selectedItem)}`)
            updateSelectedFromFields()
            setDirtyForm(false)
        }
    }, [dirtyForm])

    // useEffect(() => {
    //     debug(`formValue=${JSON.stringify(formValue)}`)
    // }, [formValue, selectedItem])

    const handleClose = () => {
        setOpen(false)
    }
    const handleOpen = () => {
        setOpen(true)
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
                            setOpen(false)
                        }}
                        appearance="primary">
                        Confirm
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                <Form onChange={setFormValue} formValue={formValue} {...props}>
                    <ItemList
                        name="listitems"
                        label="Go To & Loop instructions"
                        value={formValue}
                        selectedItem={selectedItem}
                        setSelectedItem={setSelectedItem}
                        setDirty={setDirtyList}
                    />
                    <Divider color="#000" size="xs" spacing="lg" />
                    <ItemForm
                        name="goto-loop"
                        label="Go To & Loop instructions"
                        value={formValue}
                        selectedItem={selectedItem}
                        setDirty={setDirtyForm}
                        sysOptions={sysOptions}
                    />
                </Form>
            </Drawer.Body>
        </Drawer>
    )
}
