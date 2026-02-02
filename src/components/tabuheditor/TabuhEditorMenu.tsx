import _ from 'lodash'
import { useContext, useEffect, useState, type Dispatch } from 'react'
import { FaRegKeyboard } from 'react-icons/fa6'
import { IoFolderOpenOutline, IoSettingsOutline } from 'react-icons/io5'
import { Box, Button, Modal, Nav, SelectPicker, Textarea, useDialog } from 'rsuite'
import type { EditorScore, ScoreInfo } from '../../models/types'
import TsGongIcon from '../../reacticons/TsGongIcon'
import type { KeyboardType } from './TabuhEditor'
import { ScoreFunctions, WpApiFunctions, type ScoreFunctionsType } from './contexts'

type Action =
    | '1'
    | '2'
    | '3'
    | '4'
    | 'login'
    | 'file-open'
    | 'file-import'
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
            case 'file-save': {
                // Persist cached changes and empty caches
                const score: EditorScore | undefined = { ...scoreFunc.getEditorScore() } as EditorScore
                if (score) {
                    score.systems.forEach((sys) =>
                        _.toPairs(sys.staffs).forEach(([_, measures]) =>
                            measures.forEach((measure) => {
                                if (measure.notation_ != undefined) {
                                    measure.notation = measure.notation_
                                    measure.notation_ = undefined
                                }
                            })
                        )
                    )
                    const json = scoreFunc.scoreToFormattedJson(score)
                    showTextInDialog(json || 'No text')
                    scoreFunc.updateScore(score)
                }
                break
            }
            case 'file-import':
                break
            case 'file-saveas': {
                console.log(await wpFunc.user.getUser())
                break
            }
        }
        setActiveKey(undefined)
    }

    useEffect(() => {
        performAction()
    }, [activeKey])

    useEffect(() => {
        setTabuhOptions(
            scoreList.map((scoreInfo) => {
                return { value: scoreInfo, label: scoreInfo.title }
            })
        )
    }, [scoreList])

    function scoreSelected(scoreInfo: ScoreInfo | undefined) {
        setScoreSelector(false)
        if (scoreInfo) {
            loadScore(scoreInfo)
        }
    }

    const selectNotationDialog = (
        <Modal className="w-[20rem]" open={scoreSelector} onClose={() => setScoreSelector(false)}>
            <Modal.Header>
                <Modal.Title>Open notations</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Box className="grid content-center">
                    <SelectPicker block data={scoreListOptions} onSelect={(scoreInfo) => scoreSelected(scoreInfo)} />
                </Box>
            </Modal.Body>
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
            {selectNotationDialog}
        </Nav>
    )
}
