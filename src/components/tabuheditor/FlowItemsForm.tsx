import { useEffect, useState, type Dispatch } from 'react'
import { Button, Drawer, Form, List, type DividerProps, type FormControlProps, type FormProps } from 'rsuite'
import type { GotoItem } from '../../models/types'
import { debug } from '../../utils/debugger'

interface GotoListType extends DividerProps {
    value?: GotoItem[]
    setSelected: Dispatch<GotoItem | null>
}

const GotoList = ({ value, setSelected }: GotoListType) => {
    function handleClick(idx: number) {
        setSelected((value || [])[idx])
    }

    return (
        <List>
            {(value || []).map((val, idx) => (
                <List.Item key={`goto-${idx}`}>
                    <div
                        onClick={() => {
                            if (value) handleClick(idx)
                        }}>
                        {val.targetdisplay}
                    </div>
                </List.Item>
            ))}
        </List>
    )
}

interface GotoItemListType extends FormControlProps {
    value?: GotoItem[]
    label: string
    setSelected: Dispatch<GotoItem | undefined>
}

const GotoItemList = ({ label, value, setSelected, ...props }: GotoItemListType) => (
    <Form.Group controlid={props.name} {...props}>
        <Form.Label>{label}</Form.Label>
        <Form.Control accepter={GotoList} setSelected={setSelected} {...props} />
    </Form.Group>
)

interface GotoItemEditorProps extends FormControlProps<Text> {
    item: GotoItem | undefined
}

const GotoItemEditor = ({ item, ...props }: GotoItemEditorProps) => {
    useEffect(() => debug(`gotoItemEditor: ${JSON.stringify(props.value)}`), [props.value])
    return (
        <Form.Group controlId={props.name}>
            <Form.Label>Target system</Form.Label>
            <Form.Control {...props} />
            {item?.targetdisplay && <Form.Text>{item.targetdisplay || ''}</Form.Text>}
        </Form.Group>
    )
}

interface FlowInputFormType extends FormProps {
    gotoItems: GotoItem[]
    title: string
    open: boolean
    setOpen: Dispatch<boolean>
}

export function FlowItemsForm({ gotoItems, title, open, setOpen, ...props }: FlowInputFormType) {
    const [formValue, setFormValue] = useState<Record<string, any>>({ select: gotoItems, gotoItem: '' })
    const [selectedItem, setSelectedItem] = useState<GotoItem | undefined>(undefined)

    useEffect(() => {
        const newFormValue = { ...formValue, gotoItem: selectedItem?.targetdisplay || '' }
        setFormValue(newFormValue)
    }, [selectedItem])

    useEffect(() => {
        debug(formValue)
    }, [formValue])

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
                <Form fluid onChange={setFormValue} formValue={formValue} {...props}>
                    <GotoItemList name="select" label="ItemList" setSelected={setSelectedItem} />
                    <GotoItemEditor item={selectedItem} name="gotoItem" />
                </Form>
            </Drawer.Body>
        </Drawer>
    )
}
