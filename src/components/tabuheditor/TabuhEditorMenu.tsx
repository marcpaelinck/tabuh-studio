import { useContext, useEffect, useState, type Dispatch } from 'react'
import { FaRegKeyboard } from 'react-icons/fa6'
import { IoFolderOpenOutline, IoSettingsOutline } from 'react-icons/io5'
import { Modal, Nav, SelectPicker } from 'rsuite'
import type { ScoreInfo } from '../../models/types'
import TsGongIcon from '../../reacticons/TsGongIcon'
import { debug } from '../../utils/debugger'
import type { KeyboardType } from './TabuhEditor'
import { ScoreFunctions, type ScoreFunctionsType } from './contexts'

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
    scoreList: ScoreInfo[]
    loadScore: (scoreInfo: ScoreInfo | undefined) => void
    keyboard: KeyboardType
    setKeyboard: Dispatch<KeyboardType>
}

interface TabuhOption {
    value: ScoreInfo
    label: string
}

export function TabuhEditorMenu({ scoreList, loadScore, keyboard, setKeyboard }: TabuhEditorMenuProps) {
    const [activeKey, setActiveKey] = useState<Action | undefined>(undefined)
    const [scoreListOptions, setTabuhOptions] = useState<TabuhOption[]>([])
    const scoreFunc: ScoreFunctionsType = useContext(ScoreFunctions)

    function performAction() {
        switch (activeKey) {
            case 'file-save': {
                debug(scoreFunc.getEditorScore())
            }
        }
    }
    useEffect(performAction, [activeKey])

    useEffect(() => {
        setTabuhOptions(
            scoreList.map((scoreInfo) => {
                return { value: scoreInfo, label: scoreInfo.title }
            })
        )
    }, [scoreList])

    function scoreSelected(scoreInfo: ScoreInfo | undefined) {
        setActiveKey(undefined)
        if (scoreInfo) {
            loadScore(scoreInfo)
        }
    }

    const selectNotation = (
        <Modal size="xs" open={activeKey == 'file-open'} onClose={() => setActiveKey(undefined)}>
            <Modal.Header>
                <Modal.Title>Open notation</Modal.Title>
            </Modal.Header>
            <SelectPicker data={scoreListOptions} onSelect={(scoreInfo) => scoreSelected(scoreInfo)} />
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
