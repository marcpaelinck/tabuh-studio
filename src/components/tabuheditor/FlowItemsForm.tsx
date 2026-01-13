import { useState, type Dispatch } from 'react'
import { Button, Form, List, Modal, type FormControlProps } from 'rsuite'
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

interface FlowInputFormType {
    gotoItems: GotoItem[]
    open: boolean
    setOpen: Dispatch<boolean>
}

export function FlowItemsForm({ gotoItems, open, setOpen, ...props }: FlowInputFormType) {
    const [formValue, setFormValue] = useState<Record<string, any>>({})

    const handleClose = () => {
        setOpen(false)
    }
    const handleOpen = () => {
        setOpen(true)
    }

    return (
        <>
            <Modal open={open} onClose={handleClose} size="xs">
                <Modal.Header>
                    <Modal.Title>Go to instruction</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form fluid onChange={setFormValue} formValue={formValue}>
                        <GotoItemList
                            name="select"
                            label="ItemList"
                            accepter={GotoItemList}
                            data={gotoItems}
                            errorPlacement="bottomStart"
                        />
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={handleClose} appearance="primary">
                        Confirm
                    </Button>
                    <Button onClick={handleClose} appearance="subtle">
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
            <Button onClick={handleOpen}>New User</Button>
        </>
    )
}
