import React, { useState } from 'react'
import { Modal, Button, SelectPicker, Form } from 'rsuite'

export interface SelectionModalProps {
    title: string
    message?: string
    options: Array<{ label: string; value: string }>
    isOpen: boolean
    onSelect: (selectedValue: string | null) => void
    onCancel: () => void
    placeholder?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * Interactive modal that requests the user to select a value from a list.
 * Uses React Suite Modal and SelectPicker components.
 *
 * @example
 * const [isOpen, setIsOpen] = useState(false)
 * const [selected, setSelected] = useState<string | null>(null)
 *
 * <SelectionModal
 *   title="Choose an instrument"
 *   message="Select from the list below"
 *   options={[
 *     { label: 'Drums', value: 'drums' },
 *     { label: 'Guitar', value: 'guitar' }
 *   ]}
 *   isOpen={isOpen}
 *   onSelect={(value) => {
 *     setSelected(value)
 *     setIsOpen(false)
 *   }}
 *   onCancel={() => setIsOpen(false)}
 * />
 */
export const SelectionModal: React.FC<SelectionModalProps> = ({
    title,
    message,
    options,
    isOpen,
    onSelect,
    onCancel,
    placeholder = 'Select an option...',
    size = 'sm'
}) => {
    const [selectedValue, setSelectedValue] = useState<string | null>(null)

    const handleConfirm = () => {
        onSelect(selectedValue)
        setSelectedValue(null)
    }

    const handleCancel = () => {
        setSelectedValue(null)
        onCancel()
    }

    return (
        <Modal open={isOpen} onClose={handleCancel} size={size} backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {message && <p style={{ marginBottom: '1rem' }}>{message}</p>}
                <Form layout="vertical">
                    <Form.Group>
                        <SelectPicker
                            data={options}
                            value={selectedValue}
                            onChange={(value) => setSelectedValue(value || null)}
                            placeholder={placeholder}
                            block
                            searchable
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={handleCancel} appearance="subtle">
                    Cancel
                </Button>
                <Button onClick={handleConfirm} appearance="primary" disabled={selectedValue === null}>
                    Select
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default SelectionModal
