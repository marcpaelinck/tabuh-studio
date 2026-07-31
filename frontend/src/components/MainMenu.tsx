import { useEffect, useMemo, useState, type Dispatch } from 'react'
import { FaRegKeyboard } from 'react-icons/fa6'
import { IoFolderOpenOutline, IoSettingsOutline } from 'react-icons/io5'
import { TbFileImport } from 'react-icons/tb'
import { Button, ButtonGroup, Drawer, Nav, SelectPicker, useDialog } from 'rsuite'
import { persistCachedChanges } from '../componentlogic/useScoreReader'
import type { KeyboardType } from '../config/config'
import type { AuthUser } from '../context/AuthContext'
import TsGongIcon from '../reacticons/TsGongIcon'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'
import type { Score, ScoreFormat } from '../typing/score'
import { KeyMapEditor } from './editor/KeyMapEditor'
import { ScoreDetailsDialog, type ScoreDetailsValues } from './ScoreDetailsDialog'

type Action =
    | '1'
    | '2'
    | '3'
    | '4'
    | 'login'
    | 'score-new'
    | 'score-details'
    | 'keyboard-edit'
    | 'file-open'
    | 'file-open-json'
    | 'file-import-notation'
    | 'file-import-laras'
    | 'file-save'
    | 'file-export'
    | 'file-export-midi'
    | 'file-export-pdf'
    | 'instruments-select'
    | 'settings-instruments'
    | 'settings-keyboard'
    | 'settings-colors'

interface TabuhEditorMenuProps {
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    score: Score | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    saveScore: (
        score: Score | undefined,
        destination: 'database' | 'jsonfile' | 'midifile' | 'pdffile'
    ) => Promise<boolean>
    newScore: (fields: ScoreDetailsValues) => void
    updateScoreMeta: (meta: { title: string; composer: string }) => void
    keyboard: KeyboardType
    setKeyboard: Dispatch<KeyboardType>
    user: AuthUser | null
}

export function MainMenu({
    scoreMenuOptions,
    score,
    loadScore,
    saveScore,
    newScore,
    updateScoreMeta,
    keyboard,
    setKeyboard,
    user
}: TabuhEditorMenuProps) {
    const [activeKey, setActiveKey] = useState<Action | undefined>(undefined)
    // The currently expanded top-level menu (accordion: opening one collapses the others).
    const [openMenu, setOpenMenu] = useState<string | null>(null)
    const menuProps = (key: string) => ({
        open: openMenu === key,
        onToggle: (open: boolean) => setOpenMenu(open ? key : null)
    })
    const [scoreSelector, setScoreSelector] = useState<boolean>(false)
    // The New / Score details dialog (null when closed).
    const [scoreDialogMode, setScoreDialogMode] = useState<'new' | 'edit' | null>(null)
    // The keyboard-mapping editor drawer.
    const [keyMapEditorOpen, setKeyMapEditorOpen] = useState<boolean>(false)
    const dialog = useDialog()
    const { selectedScoreOption, setSelectedScoreOption } = useUserSelectionStore()

    // Orchestra (InstrumentGroup) filter for the Open drawer. Options are the distinct
    // orchestra types actually present among the available scores, so new orchestra types
    // appear automatically once scores exist for them.
    const [orchestra, setOrchestra] = useState<string | null>(null)
    const orchestraOptions = useMemo(
        () =>
            [...new Set(scoreMenuOptions.map((o) => o.objValue.instrumentgroup))]
                .sort()
                .map((g) => ({ label: g.replace(/_/g, ' '), value: g })),
        [scoreMenuOptions]
    )
    const filteredScoreOptions = orchestra
        ? scoreMenuOptions.filter((o) => o.objValue.instrumentgroup === orchestra)
        : scoreMenuOptions

    async function performAction() {
        switch (activeKey) {
            case 'score-new':
                setScoreDialogMode('new')
                break
            case 'score-details':
                if (score) setScoreDialogMode('edit')
                break
            case 'keyboard-edit':
                setKeyMapEditorOpen(true)
                break
            case 'file-open': {
                // Reset the selection and default the orchestra filter before opening (the
                // Drawer has no onOpen hook). Default to the current score's orchestra when it
                // has scores available, otherwise the first available orchestra.
                setSelectedScoreOption(null)
                const groups = orchestraOptions.map((o) => o.value)
                setOrchestra(
                    score?.instrumenttype && groups.includes(score.instrumenttype)
                        ? score.instrumenttype
                        : (groups[0] ?? null)
                )
                setScoreSelector(true)
                break
            }
            case 'file-save':
                if (score) {
                    const persistedScore = persistCachedChanges(score)
                    const isSuccess = await saveScore(persistedScore, 'database')
                    if (isSuccess) {
                    } else {
                        dialog.alert(
                            'An error occurred: the notation was not saved.\n' +
                                'If the error persists choose `Export... to save\n' +
                                ' your work to a text file.'
                        )
                    }
                }
                break
            case 'file-export': {
                // Persist cached changes and empty caches
                const persistedScore = persistCachedChanges(score)
                if (persistedScore) {
                    saveScore(persistedScore, 'jsonfile')
                }
                break
            }
            case 'file-export-midi': {
                // Persist cached changes so the export includes unsaved edits.
                const persistedScore = persistCachedChanges(score)
                if (persistedScore) {
                    saveScore(persistedScore, 'midifile')
                }
                break
            }
            case 'file-export-pdf': {
                // Persist cached changes so the export includes unsaved edits.
                const persistedScore = persistCachedChanges(score)
                if (persistedScore) {
                    saveScore(persistedScore, 'pdffile')
                }
                break
            }
            case 'file-open-json': {
                loadScore('JSON-file')
                break
            }
            case 'file-import-notation': {
                loadScore('Notation')
                break
            }
            case 'file-import-laras': {
                loadScore('Laras')
                break
            }
        }
        setActiveKey(undefined)
    }

    useEffect(() => {
        performAction()
    }, [activeKey])

    const selectScoreDialog = (
        <Drawer size="xs" open={scoreSelector} onClose={() => setScoreSelector(false)}>
            <Drawer.Header>
                <Drawer.Title>Select a notation</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
                <div className="flex flex-col gap-3">
                    <div>
                        <div className="text-xs mb-1">orchestra:</div>
                        <ButtonGroup vertical className="w-full">
                            {orchestraOptions.map((o) => (
                                <Button
                                    key={o.value}
                                    appearance={orchestra === o.value ? 'primary' : 'default'}
                                    onClick={() => setOrchestra(o.value)}>
                                    {o.label}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </div>
                    <SelectPicker
                        id="scoreselector"
                        block
                        searchable={false}
                        cleanable={false}
                        label="score:"
                        data={filteredScoreOptions}
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
                </div>
            </Drawer.Body>
        </Drawer>
    )

    const scoreDetailsDialog = (
        <ScoreDetailsDialog
            open={scoreDialogMode !== null}
            mode={scoreDialogMode ?? 'new'}
            initial={
                scoreDialogMode === 'edit' && score
                    ? { title: score.title, composer: score.composer, instrumenttype: score.instrumenttype }
                    : undefined
            }
            onClose={() => setScoreDialogMode(null)}
            onSubmit={(values) => {
                if (scoreDialogMode === 'edit') updateScoreMeta({ title: values.title, composer: values.composer })
                else newScore(values)
            }}
        />
    )

    return (
        <Nav vertical activeKey={activeKey} onSelect={setActiveKey}>
            <Nav.Menu eventKey="0" title="Notation" icon={<IoFolderOpenOutline />} {...menuProps('0')}>
                <Nav.Item className="text-xs" eventKey="score-new">
                    New...
                </Nav.Item>
                <Nav.Item className="text-xs" eventKey="file-open">
                    Open...
                </Nav.Item>
                <Nav.Item className="text-xs" disabled={!score} eventKey="score-details">
                    Score details...
                </Nav.Item>
                <Nav.Item disabled={!user} eventKey="file-save" className="text-xs block width-xl">
                    <div className="block width-xl">Save</div>
                    {!user && <div className="text-xs block width-xl text-gray-400">Requires login</div>}
                </Nav.Item>
            </Nav.Menu>
            <Nav.Menu eventKey="1" title="File" icon={<TbFileImport />} {...menuProps('1')}>
                <Nav.Item className="text-xs" eventKey="file-open-json">
                    Open Tabuh Studio...
                </Nav.Item>
                <Nav.Item className="text-xs" eventKey="file-import-notation">
                    Open TS Script...
                </Nav.Item>
                <Nav.Item className="text-xs" eventKey="file-import-laras">
                    Open Laras...
                </Nav.Item>
                <Nav.Item className="text-xs" eventKey="file-export">
                    Export Tabuh Studio...
                </Nav.Item>
                <Nav.Item className="text-xs" eventKey="file-export-midi">
                    Export MIDI...
                </Nav.Item>
                <Nav.Item className="text-xs" eventKey="file-export-pdf">
                    Export PDF...
                </Nav.Item>
            </Nav.Menu>
            <Nav.Menu
                disabled
                eventKey="2"
                title="Instruments"
                icon={<TsGongIcon height="1em" width="1em" color="black" />}
                {...menuProps('2')}>
                <Nav.Item eventKey="instruments-select">Select</Nav.Item>
            </Nav.Menu>
            <Nav.Menu eventKey="3" title="Keyboard" icon={<FaRegKeyboard />} {...menuProps('3')}>
                <Nav.Item className="text-xs" eventKey="keyboard-edit">
                    Edit mappings...
                </Nav.Item>
                <Nav.Item
                    className="text-xs"
                    active={keyboard == 'regular'}
                    onSelect={() => setKeyboard('regular')}
                    eventKey="keyboard-regular">
                    Regular
                </Nav.Item>
                <Nav.Item
                    className="text-xs"
                    active={keyboard == 'laras'}
                    onSelect={() => setKeyboard('laras')}
                    eventKey="keyboard-laras">
                    Laras
                </Nav.Item>
            </Nav.Menu>
            <Nav.Menu disabled eventKey="4" title="Settings" icon={<IoSettingsOutline />} {...menuProps('4')}>
                <Nav.Item disabled eventKey="settings-instruments">
                    Instrument definitions
                </Nav.Item>
                <Nav.Item className="text-xs" disabled eventKey="settings-keyboard">
                    Keyboard definitions
                </Nav.Item>
                <Nav.Item className="text-xs" disabled eventKey="settings-colors">
                    Color schemes
                </Nav.Item>
            </Nav.Menu>
            {selectScoreDialog}
            {scoreDetailsDialog}
            <KeyMapEditor open={keyMapEditorOpen} setOpen={setKeyMapEditorOpen} />
        </Nav>
    )
}
