import { useState, type Dispatch } from 'react'
import { Button, Drawer, Form, List, type FormControlProps, type FormProps } from 'rsuite'
import type { GotoItem } from '../../models/types'

interface GotoItemListType extends FormControlProps {
    data: GotoItem[]
    name: string
    label: string
}

const GotoItemList = ({ data, name, label, ...props }: GotoItemListType) => (
    <Form.Group controlId={name} {...props}>
        <Form.Label>{label}</Form.Label>
        <Form.Control name={name} {...props} />
        <List>
            {(data || []).map((item, idx) => (
                <List.Item key={`goto-${idx}`}>
                    <div>{item.targetdisplay}</div>
                </List.Item>
            ))}
        </List>
    </Form.Group>
)

interface FormFieldType extends FormControlProps<Text> {
    name: string
    label: string
    text: string
}

const FormField = ({ name, label, text, ...props }: FormFieldType) => (
    <Form.Group controlId={name}>
        <Form.Label>{label}</Form.Label>
        <Form.Control name={name} {...props} />
        {text && <Form.Text>{text}</Form.Text>}
    </Form.Group>
)

interface FlowInputFormType extends FormProps {
    gotoItems: GotoItem[]
    title: string
    open: boolean
    setOpen: Dispatch<boolean>
}

export function FlowItemsForm({ gotoItems, title, open, setOpen, ...props }: FlowInputFormType) {
    const [formValue, setFormValue] = useState<Record<string, any>>({})

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
                            e.stopPropagation()
                            setOpen(false)
                        }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={(e) => {
                            e.stopPropagation()
                            setOpen(false)
                        }}
                        appearance="primary">
                        Confirm
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                <Form fluid onChange={setFormValue} formValue={formValue} {...props}>
                    <GotoItemList
                        name="select"
                        label="ItemList"
                        accepter={GotoItemList}
                        data={gotoItems}
                        errorPlacement="bottomStart"
                    />
                </Form>
            </Drawer.Body>
        </Drawer>
    )
}
