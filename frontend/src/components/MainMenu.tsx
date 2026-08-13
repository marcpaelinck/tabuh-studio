import { useEffect, useState, type Dispatch } from 'react'
import { FaRegKeyboard } from 'react-icons/fa6'
import { IoFolderOpenOutline, IoSettingsOutline } from 'react-icons/io5'
import { TbFileImport } from 'react-icons/tb'
import { Drawer, Nav } from 'rsuite'
import { persistCachedChanges } from '../componentlogic/useScoreReader'
import { useShowMessage } from '../componentlogic/useShowMessage'
import type { KeyboardType } from '../config/config'
import type { AuthUser } from '../context/AuthContext'
import TsGongIcon from '../reacticons/TsGongIcon'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'
import type { ScoreFilterPref } from '../typing/preferences'
import type { Score, ScoreFormat } from '../typing/score'
import { KeyMapEditor } from './editor/KeyMapEditor'
import { ManageGroupsDrawer } from './ManageGroupsDrawer'
import { ManageUsersDrawer } from './ManageUsersDrawer'
import { PreferencesDrawer } from './PreferencesDrawer'
import { ScoreBrowser } from './ScoreBrowser'
import { ScoreDetailsDialog, type ScoreDetailsValues } from './ScoreDetailsDialog'
import { NavItemTip } from './Tooltipped'

type Action =
    | '1'
    | '2'
    | '3'
    | '4'
    | 'login'
    | 'score-new'
    | 'score-details'
    | 'file-open'
    | 'file-open-json'
    | 'file-import-notation'
    | 'file-import-laras'
    | 'file-save'
    | 'file-export'
    | 'file-export-midi'
    | 'file-export-pdf'
    | 'instruments-select'
    | 'settings-preferences'
    | 'settings-manage-users'
    | 'settings-manage-groups'
    | 'settings-instruments'
    | 'settings-keyboard'

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
    // Settings drawers.
    const [preferencesOpen, setPreferencesOpen] = useState<boolean>(false)
    const [manageUsersOpen, setManageUsersOpen] = useState<boolean>(false)
    const [manageGroupsOpen, setManageGroupsOpen] = useState<boolean>(false)
    const { selectedScoreOption, setSelectedScoreOption } = useUserSelectionStore()
    const { showMessage } = useShowMessage()

    // Pre-selected filter when opening the score browser: the loaded score's orchestra, else the
    // user's preferred default filter (orchestra or a subscribed group). ScoreBrowser falls back
    // to the first available orchestra when neither is applicable.
    const defaultFilter: ScoreFilterPref | undefined = score
        ? { type: 'orchestra', value: score.instrumenttype }
        : user?.preferences?.defaultScoreFilter

    async function performAction() {
        switch (activeKey) {
            case 'score-new':
                setScoreDialogMode('new')
                break
            case 'score-details':
                if (score) setScoreDialogMode('edit')
                break
            case 'settings-preferences':
                setPreferencesOpen(true)
                break
            case 'settings-manage-users':
                setManageUsersOpen(true)
                break
            case 'settings-manage-groups':
                setManageGroupsOpen(true)
                break
            case 'settings-keyboard':
                setKeyMapEditorOpen(true)
                break
            case 'file-open':
                // Reset the selection before opening (the Drawer has no onOpen hook); the
                // ScoreBrowser handles the orchestra default.
                setSelectedScoreOption(null)
                setScoreSelector(true)
                break
            case 'file-save':
                if (score) {
                    const persistedScore = persistCachedChanges(score)
                    const isSuccess = await saveScore(persistedScore, 'database')
                    if (isSuccess) {
                        showMessage({ message: 'The score was saved to the database.', type: 'success' })
                        // const message = (
                        //     <Message showIcon closable header={'Success'} type="success">
                        //         The score was saved to the database.
                        //     </Message>
                        // )
                        // toaster.push(message, { duration: 5000 })
                    } else {
                        showMessage({
                            message:
                                'The notation could not saved.\n' +
                                'Log out and in then try again.\n' +
                                'If the error persists choose `Export... to save\n' +
                                ' your work to a text file.',
                            type: 'warning'
                        })
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
                <ScoreBrowser
                    key={scoreSelector ? 'open' : 'closed'}
                    scoreMenuOptions={scoreMenuOptions}
                    defaultFilter={defaultFilter}
                    selectedValue={selectedScoreOption?.value}
                    onSelect={(o) => {
                        setScoreSelector(false)
                        setSelectedScoreOption(o)
                    }}
                />
            </Drawer.Body>
        </Drawer>
    )

    const scoreDetailsDialog = (
        <ScoreDetailsDialog
            open={scoreDialogMode !== null}
            mode={scoreDialogMode ?? 'new'}
            scoreUuid={score?.uuid}
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
        <Nav vertical activeKey={activeKey} onSelect={setActiveKey} data-tour="main-menu">
            <Nav.Menu eventKey="0" title="Notation" icon={<IoFolderOpenOutline />} {...menuProps('0')}>
                <NavItemTip tip="Create a new, empty score" className="text-xs" eventKey="score-new">
                    New...
                </NavItemTip>
                <NavItemTip tip="Open a score from the library" className="text-xs" eventKey="file-open">
                    Open...
                </NavItemTip>
                <NavItemTip
                    tip="Edit title / composer and see which groups have this score"
                    className="text-xs"
                    disabled={!score}
                    eventKey="score-details">
                    Score details...
                </NavItemTip>
                <NavItemTip
                    tip={`Save the score to the library ${!user ? '(requires Editor account)' : ''}`}
                    disabled={!user}
                    eventKey="file-save"
                    className="text-xs block width-xl">
                    Save
                </NavItemTip>
            </Nav.Menu>
            <Nav.Menu eventKey="1" title="File" icon={<TbFileImport />} {...menuProps('1')}>
                <NavItemTip
                    tip="Open a Tabuh Studio .json file from your computer"
                    className="text-xs"
                    eventKey="file-open-json">
                    Open Tabuh Studio...
                </NavItemTip>
                <NavItemTip tip="Import a Tabuh notation script" className="text-xs" eventKey="file-import-notation">
                    Open TS Script...
                </NavItemTip>
                <NavItemTip tip="Import a Laras file" className="text-xs" eventKey="file-import-laras">
                    Open Laras...
                </NavItemTip>
                <NavItemTip
                    tip="Export the score as a Tabuh Studio .json file"
                    className="text-xs"
                    eventKey="file-export">
                    Export Tabuh Studio...
                </NavItemTip>
                <NavItemTip tip="Export the score as a MIDI file" className="text-xs" eventKey="file-export-midi">
                    Export MIDI...
                </NavItemTip>
                <NavItemTip
                    tip="Export a PDF version of the score's notation"
                    className="text-xs"
                    eventKey="file-export-pdf">
                    Export PDF...
                </NavItemTip>
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
                <NavItemTip
                    tip="Use the regular note-entry keyboard layout"
                    className="text-xs"
                    active={keyboard == 'regular'}
                    onSelect={() => setKeyboard('regular')}
                    eventKey="keyboard-regular">
                    Regular
                </NavItemTip>
                <NavItemTip
                    tip="Use the Laras note-entry keyboard layout"
                    className="text-xs"
                    active={keyboard == 'laras'}
                    onSelect={() => setKeyboard('laras')}
                    eventKey="keyboard-laras">
                    Laras
                </NavItemTip>
            </Nav.Menu>
            <Nav.Menu disabled={!user} eventKey="4" title="Settings" icon={<IoSettingsOutline />} {...menuProps('4')}>
                <NavItemTip
                    tip="Your personal app preferences"
                    className="text-xs"
                    disabled={!user}
                    eventKey="settings-preferences">
                    Preferences...
                </NavItemTip>
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <NavItemTip
                        tip="Manage music groups and their repertoire"
                        className="text-xs"
                        eventKey="settings-manage-groups">
                        Manage groups...
                    </NavItemTip>
                )}
                {user?.role === 'admin' && (
                    <>
                        <NavItemTip
                            tip="Manage user accounts and roles"
                            className="text-xs"
                            eventKey="settings-manage-users">
                            Manage users...
                        </NavItemTip>
                        <NavItemTip tip="Edit keyboard mappings" className="text-xs" eventKey="settings-keyboard">
                            Keyboard settings...
                        </NavItemTip>
                        <NavItemTip
                            tip="Define instruments (coming soon)"
                            className="text-xs"
                            disabled
                            eventKey="settings-instruments">
                            Instrument definitions...
                        </NavItemTip>
                    </>
                )}
            </Nav.Menu>
            {selectScoreDialog}
            {scoreDetailsDialog}
            <KeyMapEditor open={keyMapEditorOpen} setOpen={setKeyMapEditorOpen} />
            <PreferencesDrawer open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
            <ManageUsersDrawer open={manageUsersOpen} onClose={() => setManageUsersOpen(false)} />
            <ManageGroupsDrawer open={manageGroupsOpen} onClose={() => setManageGroupsOpen(false)} />
        </Nav>
    )
}
