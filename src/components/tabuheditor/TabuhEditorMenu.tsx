import { useEffect, useState, type Dispatch } from 'react'
import { FaRegKeyboard } from 'react-icons/fa6'
import { IoFolderOpenOutline, IoSettingsOutline } from 'react-icons/io5'
import { Modal, Nav, SelectPicker } from 'rsuite'
import TsGongIcon from '../../reacticons/TsGongIcon'
import type { KeyboardType } from './TabuhEditor'

type Action =
    | '1'
    | '2'
    | '3'
    | '4'
    | 'file-open'
    | 'file-import'
    | 'file-save'
    | 'file-saveas'
    | 'instruments-select'
    | 'settings-instruments'
    | 'settings-keyboard'
    | 'settings-colors'

interface TabuhEditorMenuProps {
    tabuhDict: Record<string, string>
    loadScore: (file: string) => void
    keyboard: KeyboardType
    setKeyboard: Dispatch<KeyboardType>
}

interface TabuhOption {
    value: string
    label: string
}

export function TabuhEditorMenu({ tabuhDict, loadScore, keyboard, setKeyboard }: TabuhEditorMenuProps) {
    const [activeKey, setActiveKey] = useState<Action | undefined>(undefined)
    const [tabuhOptions, setTabuhOptions] = useState<TabuhOption[]>([])

    function performAction() {}
    useEffect(performAction, [activeKey])

    useEffect(() => {
        setTabuhOptions(
            Object.entries(tabuhDict).map(([key, value]) => {
                return { value: value, label: key }
            })
        )
    }, [tabuhDict])

    function scoreSelected(file: string | undefined) {
        setActiveKey(undefined)
        if (file) {
            loadScore(file)
        }
    }

    const selectNotation = (
        <Modal size="xs" open={activeKey == 'file-open'} onClose={() => setActiveKey(undefined)}>
            <Modal.Header>
                <Modal.Title>Open notation</Modal.Title>
            </Modal.Header>
            <SelectPicker data={tabuhOptions} onSelect={(file) => scoreSelected(file)} />
            <Modal.Body></Modal.Body>
        </Modal>
    )

    return (
        <Nav activeKey={activeKey} onSelect={setActiveKey}>
            <Nav.Menu eventKey="1" title="Notation" icon={<IoFolderOpenOutline />}>
                <Nav.Item eventKey="file-open">Open...</Nav.Item>
                <Nav.Item eventKey="file-import">Import...</Nav.Item>
                <Nav.Item eventKey="file-save">Save</Nav.Item>
                <Nav.Item eventKey="file-saveas">Save As...</Nav.Item>
            </Nav.Menu>
            <Nav.Menu eventKey="2" title="Instruments" icon={<TsGongIcon height="1em" width="1em" color="black" />}>
                <Nav.Item eventKey="instruments-select">Select</Nav.Item>
            </Nav.Menu>
            <Nav.Menu eventKey="3" title="Keyboard" icon={<FaRegKeyboard />}>
                <Nav.Item
                    active={keyboard == 'regular'}
                    onSelect={() => setKeyboard('regular')}
                    eventKey="keyboard-regular">
                    Regular
                </Nav.Item>
                <Nav.Item active={keyboard == 'laras'} onSelect={() => setKeyboard('laras')} eventKey="keyboard-laras">
                    Laras
                </Nav.Item>
            </Nav.Menu>
            <Nav.Menu eventKey="4" title="Settings" icon={<IoSettingsOutline />}>
                <Nav.Item eventKey="settings-instruments">Instrument definitions</Nav.Item>
                <Nav.Item eventKey="settings-keyboard">Keyboard definitions</Nav.Item>
                <Nav.Item eventKey="settings-colors">Color schemes</Nav.Item>
            </Nav.Menu>
            {selectNotation}
        </Nav>
    )
}
