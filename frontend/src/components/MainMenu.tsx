import { useContext, useEffect, useState, type Dispatch } from 'react'
import { FaRegKeyboard } from 'react-icons/fa6'
import { IoFolderOpenOutline, IoSettingsOutline } from 'react-icons/io5'
import { Box, Button, Modal, Nav, SelectPicker, Textarea, useDialog } from 'rsuite'
import { persistCachedChanges } from '../componentlogic/useScoreReader'
import type { KeyboardType } from '../config/config'
import type { AuthUser } from '../context/AuthContext'
import { ScoreFunctions, WpApiFunctions, type ScoreFunctionsType } from '../context/contexts'
import TsGongIcon from '../reacticons/TsGongIcon'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'
import type { Score, ScoreFormat } from '../typing/score'

type Action =
    | '1'
    | '2'
    | '3'
    | '4'
    | 'login'
    | 'file-open'
    | 'file-import-laras'
    | 'file-import-tabuh'
    | 'file-save'
    | 'file-saveas'
    | 'instruments-select'
    | 'settings-instruments'
    | 'settings-keyboard'
    | 'settings-colors'

// Temporary solution for saving scores manually
const SimpleTextareaDialog = ({ payload }: { payload: { payload: string } }) => {
    const [isOpen, setIsOpen] = useState(true)
    return (
        <Modal open={isOpen} onClose={() => setIsOpen(false)} className="h-100 w-200">
            <Modal.Body>
                <Textarea value={payload.payload} className="h-90 w-180" />
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={() => setIsOpen(false)} appearance="primary">
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

interface TabuhEditorMenuProps {
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    selectedScoreOption: ExtendedOption<ScoreInfo> | null
    score: Score | undefined
    setSelectedScoreOption: Dispatch<ExtendedOption<ScoreInfo> | null>
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    saveScore: (score: Score | undefined, destination: 'database' | 'file') => Promise<boolean>
    keyboard: KeyboardType
    setKeyboard: Dispatch<KeyboardType>
    user: AuthUser | null
}

export function MainMenu({
    scoreMenuOptions,
    selectedScoreOption,
    score,
    setSelectedScoreOption,
    loadScore,
    saveScore,
    keyboard,
    setKeyboard,
    user
}: TabuhEditorMenuProps) {
    const [activeKey, setActiveKey] = useState<Action | undefined>(undefined)
    const [scoreSelector, setScoreSelector] = useState<boolean>(false)
    const scoreFunc: ScoreFunctionsType = useContext(ScoreFunctions)
    const dialog = useDialog()
    const wpFunc = useContext(WpApiFunctions)

    const showTextInDialog = async (payload: string) => {
        //@ts-ignore
        await dialog.open(SimpleTextareaDialog, { payload })
    }

    async function performAction() {
        switch (activeKey) {
            case 'file-open':
                setScoreSelector(true)
                break
            case 'file-save':
                if (score) {
                    const persistedScore = persistCachedChanges(score)
                    const isSuccess = await saveScore(persistedScore, 'database')
                    if (isSuccess) {
                    } else {
                        dialog.alert(
                            'An error occurred: the notation was not saved.\n' +
                                'If the error persists choose `Save As... and copy the text to a file.\n' +
                                'You will be able to upload it later.'
                        )
                    }
                }
                break
            case 'file-saveas': {
                // Persist cached changes and empty caches
                const persistedScore = persistCachedChanges(score)
                if (persistedScore) {
                    saveScore(persistedScore, 'file')
                }
                break
            }
            case 'file-import-laras': {
                loadScore('Laras')
                break
            }
            case 'file-import-tabuh': {
                loadScore('Notation')
                break
            }
        }
        setActiveKey(undefined)
    }

    useEffect(() => {
        performAction()
    }, [activeKey])

    const selectScoreDialog = (
        <Modal className="w-[20rem]" open={scoreSelector} onClose={() => setScoreSelector(false)}>
            <Modal.Header>
                <Modal.Title>Select a notation</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Box className="grid content-center">
                    <SelectPicker
                        id="scoreselector"
                        searchable={false}
                        cleanable={false}
                        label="score:"
                        data={scoreMenuOptions}
                        value={selectedScoreOption?.value}
                        onSelect={(value, item) => {
                            setScoreSelector(false)
                            setSelectedScoreOption(item as ExtendedOption<ScoreInfo>)
                        }}
                        // Onchange needed because value can be null / initial selector state is unselected
                        // (also needed if cleanable==true)
                        onChange={(value, e) => {
                            if (value === null) setSelectedScoreOption(null)
                        }}
                    />
                </Box>
            </Modal.Body>
        </Modal>
    )

    return (
        <Nav activeKey={activeKey} onSelect={setActiveKey}>
            <Nav.Menu eventKey="1" title="Notation" icon={<IoFolderOpenOutline />}>
                <Nav.Item eventKey="file-open">Open...</Nav.Item>
                <Nav.Item eventKey="file-import-laras">Import Laras file...</Nav.Item>
                <Nav.Item eventKey="file-import-tabuh">Import Tabuh file...</Nav.Item>
                <Nav.Item disabled={!user} eventKey="file-save" className="block width-xl">
                    <div className="block width-xl">Save</div>
                    {!user && <div className="text-xs block width-xl text-gray-400">Requires login</div>}
                </Nav.Item>
                <Nav.Item eventKey="file-saveas">Save As...</Nav.Item>
            </Nav.Menu>
            <Nav.Menu
                disabled
                eventKey="2"
                title="Instruments"
                icon={<TsGongIcon height="1em" width="1em" color="black" />}>
                <Nav.Item eventKey="instruments-select">Select</Nav.Item>
            </Nav.Menu>
            <Nav.Menu disabled eventKey="3" title="Keyboard" icon={<FaRegKeyboard />}>
                <Nav.Item
                    disabled
                    active={keyboard == 'regular'}
                    onSelect={() => setKeyboard('regular')}
                    eventKey="keyboard-regular">
                    Regular
                </Nav.Item>
                <Nav.Item
                    disabled
                    active={keyboard == 'laras'}
                    onSelect={() => setKeyboard('laras')}
                    eventKey="keyboard-laras">
                    Laras
                </Nav.Item>
            </Nav.Menu>
            <Nav.Menu disabled eventKey="4" title="Settings" icon={<IoSettingsOutline />}>
                <Nav.Item disabled eventKey="settings-instruments">
                    Instrument definitions
                </Nav.Item>
                <Nav.Item disabled eventKey="settings-keyboard">
                    Keyboard definitions
                </Nav.Item>
                <Nav.Item disabled eventKey="settings-colors">
                    Color schemes
                </Nav.Item>
            </Nav.Menu>
            {selectScoreDialog}
        </Nav>
    )
}
