import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import type { Position } from '@tabuhstudio/shared'
import type { UUID } from '@tabuhstudio/shared/types/basetypes.ts'
import { Activity, useEffect, useMemo, useReducer, useRef, useState, type Dispatch } from 'react'
import { BsPerson, BsPersonFillCheck } from 'react-icons/bs'
import {
    Button,
    Col,
    Container,
    Content,
    Drawer,
    Dropdown,
    Form,
    Grid,
    Header,
    HStack,
    IconButton,
    Message,
    PasswordInput,
    Popover,
    Row,
    SchemaModel,
    SegmentedControl,
    Sidebar,
    Sidenav,
    StringType,
    useDialog,
    useMediaQuery,
    Whisper,
    type FormInstance,
    type WhisperInstance
} from 'rsuite'
import { playbackReducerFactory } from '../componentlogic/playback/playbackReducer'
import { usePlaybackManager } from '../componentlogic/playback/usePlaybackManager'
import { useScoreManager } from '../componentlogic/useScoreManager'
import { useScoreReader } from '../componentlogic/useScoreReader'
import { noCursor, speedList } from '../config/config'
import { useAuth, type AuthUser } from '../context/AuthContext'
import { TsLogoIcon } from '../reacticons/TsLogoIcon'
import { apiForgotPassword } from '../services/apiService'
import { useAppInfo } from '../stores/useAppInfo.tsx'
import { useEnvironmentStore } from '../stores/useEnvironmentStore.ts'
import { usePlaybackFunctionStore } from '../stores/usePlaybackFunctionStore.ts'
import { useScoreStore } from '../stores/useScoreStore.tsx'
import {
    focusDefaultOption,
    panggulDefaultOption,
    useUserSelectionStore,
    type MainView
} from '../stores/useUserSettingsStore.ts'
import { type Appearance, type ExtendedOption, type ScoreInfo } from '../typing/interface'
import type { DashboardParameters } from '../typing/playback'
import { debug } from '../utils/debugger'
import { createFocusMenuItems, createSpeedMenuItems } from '../utils/selectorsUtils'
import {
    chars,
    Dashboard,
    dashboardDefaults as defaultDashboardValues,
    type ComponentName,
    type DashboardComponentValues,
    type DashboardValues
} from './Dashboard'
import EditorWindow from './editor/EditorWindow'
import { EditProfileDrawer } from './EditProfileDrawer'
import { MainMenu } from './MainMenu'
import { MobileBottomNav } from './MobileBottomNav'
import { OptionList } from './OptionList'
import PlaybackMenu from './PlaybackMenu'
import { Player } from './player/Player'
import PlayerWindow from './player/PlayerWindow'
import { RegisterDrawer } from './RegisterDrawer'
import { ScoreBrowser } from './ScoreBrowser'
import { ScoreRecoveryPrompt } from './ScoreRecoveryPrompt'
import { Tip } from './Tooltipped'

interface LoginDialogProps {
    open: boolean
    setOpen: Dispatch<boolean>
    login: (email: string, password: string) => Promise<void>
}

function LoginDialog({ open, setOpen, login }: LoginDialogProps) {
    const formRef = useRef<FormInstance>(null)
    const forgotRef = useRef<FormInstance>(null)
    const model = SchemaModel({ username: StringType().isRequired(), password: StringType().isRequired() })
    const forgotModel = SchemaModel({ email: StringType().isEmail('Enter a valid email address.').isRequired() })

    const [mode, setMode] = useState<'login' | 'forgot'>('login')
    const [formValue, setFormValue] = useState<Record<string, any>>({ username: '', password: '' })
    const [forgotValue, setForgotValue] = useState<Record<string, any>>({ email: '' })
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [forgotSent, setForgotSent] = useState(false)

    useEffect(() => {
        if (open) {
            setMode('login')
            setFormValue({ username: '', password: '' })
            setForgotValue({ email: '' })
            setError(null)
            setBusy(false)
            setForgotSent(false)
        }
    }, [open])

    const handleSubmit = async () => {
        setError(null)
        if (!formRef.current?.check()) return
        setBusy(true)
        try {
            await login((formValue.username as string).trim(), formValue.password as string)
            setOpen(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed.')
        } finally {
            setBusy(false)
        }
    }

    const handleForgot = async () => {
        setError(null)
        if (!forgotRef.current?.check()) return
        setBusy(true)
        try {
            await apiForgotPassword((forgotValue.email as string).trim())
            setForgotSent(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send the reset link.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Drawer open={open} size="sm" onClose={() => setOpen(false)}>
            <Drawer.Header>
                <Drawer.Title>{mode === 'login' ? 'Login' : 'Reset password'}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => setOpen(false)} appearance="subtle">
                        Cancel
                    </Button>
                    {mode === 'login' ? (
                        <Button appearance="primary" onClick={handleSubmit} loading={busy}>
                            Login
                        </Button>
                    ) : (
                        !forgotSent && (
                            <Button appearance="primary" onClick={handleForgot} loading={busy}>
                                Send reset link
                            </Button>
                        )
                    )}
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                {error && (
                    <Message type="error" showIcon className="mb-3">
                        {error}
                    </Message>
                )}
                {mode === 'login' ? (
                    <>
                        <Form fluid ref={formRef} onChange={setFormValue} formValue={formValue} model={model}>
                            <Form.Group controlId="username-7">
                                <Form.Label>Username</Form.Label>
                                <Form.Control name="username" />
                            </Form.Group>
                            <Form.Group controlId="password-7">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    name="password"
                                    type="password"
                                    autoComplete="off"
                                    accepter={PasswordInput}
                                />
                            </Form.Group>
                        </Form>
                        <Button
                            appearance="link"
                            className="px-0"
                            onClick={() => {
                                setError(null)
                                setMode('forgot')
                            }}>
                            Forgot password?
                        </Button>
                    </>
                ) : forgotSent ? (
                    <Message type="success" showIcon>
                        If that address has an account, we've sent a reset link. Please check your inbox.
                    </Message>
                ) : (
                    <>
                        <Form
                            fluid
                            ref={forgotRef}
                            onChange={setForgotValue}
                            formValue={forgotValue}
                            model={forgotModel}>
                            <Form.Group controlId="forgot-email">
                                <Form.Label>Email</Form.Label>
                                <Form.Control name="email" type="email" autoComplete="email" />
                            </Form.Group>
                        </Form>
                        <Button
                            appearance="link"
                            className="px-0"
                            onClick={() => {
                                setError(null)
                                setMode('login')
                            }}>
                            ← Back to login
                        </Button>
                    </>
                )}
            </Drawer.Body>
        </Drawer>
    )
}

interface NavHeaderProps {
    expanded: boolean
    user: AuthUser | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    infoDlg: () => void
    environment: string | undefined
}
function NavHeader({ expanded, user, login, logout, infoDlg, environment, ...rest }: NavHeaderProps) {
    const [openLogin, setOpenLogin] = useState<boolean>(false)
    const [openRegister, setOpenRegister] = useState<boolean>(false)
    const [openProfile, setOpenProfile] = useState<boolean>(false)

    // Apply different formatting when the SideNav element is collapsed
    const expandedfmt = {
        true: { justify: undefined, class: 'h-10' },
        false: { justify: 'center', class: 'h-10 pl-0 pr-0' }
    }
    const expKey = String(expanded) as 'true' | 'false'

    // Profile menu — a Whisper + Popover overlay so it floats OVER the menu rather than pushing
    // it down (an rsuite Dropdown inside a Sidenav renders inline as an accordion submenu).
    // Login/Logout toggles on auth state; the other items are placeholders wired in later
    // phases of the user-profile feature ("Manage users" is admin-only).
    const menuRef = useRef<WhisperInstance>(null)
    const runAndClose = (fn: () => void) => () => {
        menuRef.current?.close()
        fn()
    }
    const profileMenu = (
        <Whisper
            ref={menuRef}
            placement="bottomStart"
            trigger="click"
            speaker={
                <Popover full>
                    <Dropdown.Menu>
                        {user ? (
                            <Dropdown.Item onSelect={runAndClose(() => logout())}>Logout</Dropdown.Item>
                        ) : (
                            <Dropdown.Item onSelect={runAndClose(() => setOpenLogin(true))}>Login...</Dropdown.Item>
                        )}
                        <Dropdown.Item onSelect={runAndClose(() => setOpenRegister(true))}>
                            Create an account...
                        </Dropdown.Item>
                        {user && (
                            <Dropdown.Item onSelect={runAndClose(() => setOpenProfile(true))}>
                                Edit my profile...
                            </Dropdown.Item>
                        )}
                    </Dropdown.Menu>
                </Popover>
            }>
            <IconButton
                aria-label="Profile menu"
                title={user ? 'Account, profile and settings' : 'Log in or create an account'}
                data-tour="profile-menu"
                icon={user ? <BsPersonFillCheck color="orange" /> : <BsPerson />}
            />
        </Whisper>
    )

    return (
        <>
            <HStack justify={expandedfmt[expKey].justify}>
                <TsLogoIcon
                    environment={environment}
                    remSize={2.5}
                    onClick={() => infoDlg()}
                    style={{ cursor: 'pointer' }}
                />
                {expanded ? '  Tabuh Studio' : ''}
            </HStack>
            <HStack justify={expandedfmt[expKey].justify} className="mt-3">
                {profileMenu}
                <div className="text-[0.75rem]">{expanded && user ? ` ${user.name} (${user?.role})` : ''}</div>
            </HStack>
            <LoginDialog open={openLogin} setOpen={setOpenLogin} login={login} />
            <RegisterDrawer open={openRegister} onClose={() => setOpenRegister(false)} />
            <EditProfileDrawer open={openProfile} onClose={() => setOpenProfile(false)} />
        </>
    )
}
interface MainWindowProps {
    dataSource: 'database' | 'file'
}

export function MainWindow({ dataSource }: MainWindowProps) {
    // ── NAVIGATION ─────────────────────────────────────────────

    const [sidenavExpanded, setSidenavExpanded] = useState(true)
    const [isMobile] = useMediaQuery('(max-width: 768px)')
    const isExpandedSidenav = sidenavExpanded && !isMobile
    const { mainView, setMainView } = useUserSelectionStore()
    const { screenSize, environment } = useEnvironmentStore()
    const [appAppearance, setAppAppearance] = useState<Appearance>('full')
    const { user, login, logout } = useAuth()
    const appInfo = useAppInfo()
    const dialog = useDialog()

    // Dialog with app information. Appears when user clicks the app logo.
    function infoDlg() {
        dialog.alert(
            <p>
                <b>{appInfo.name}</b>
                <br /> {appInfo.email}
                <br />
                <br /> version {appInfo.frontend_version}
                <br /> API version {appInfo.backend_version}
                {environment != 'production' && <br />}
                {environment != 'production' && `${environment} environment`}
                <br />
                <br />
                {appInfo.copyright}
            </p>,
            { title: 'About' }
        )
    }

    useEffect(() => {
        setAppAppearance(screenSize?.abbr.includes('lg') ? 'full' : 'playerOnly')
    }, [screenSize])

    // ── DASHBOARD WARNINGS ─────────────────────────────────────────────

    const [dashboardValues, setDashboardValues] = useState<DashboardValues>(defaultDashboardValues)

    const { loadScore, saveScore, recoverScore, isLoading: isLoadingScore } = useScoreReader(dataSource)
    const { currentScore, scoreInfoList } = useScoreStore()
    const { score, validation, localCacheState, updateSystem, executeItemAction, newScore, updateScoreMeta } =
        useScoreManager()
    const [currentScoreId, setCurrentScoreId] = useState<UUID>('') // use this state to trigger events when a new score is loaded

    const [scoreMenuOptions, setScoreMenuOptions] = useState<ExtendedOption<ScoreInfo>[]>([])
    const {
        selectedSpeedOption,
        setSelectedSpeedOption,
        selectedScoreOption,
        setSelectedScoreOption,
        selectedFocusOption,
        setSelectedFocusOption,
        setSelectedPanggulOption,
        mobileTab,
        setMobileTab,
        keyboard,
        setKeyboard: SetKeyboard
    } = useUserSelectionStore()

    // ──  MENU AND SELECTORS SETTINGS ─────────────────────────────────────────────

    // Focus / speed option lists (shared by the desktop PlaybackMenu and the mobile views).
    // Speed is fixed; focus depends on the loaded score and is reset to "No Focus" on change.
    const speedMenuItems = useMemo(() => createSpeedMenuItems(speedList), [])
    const [focusMenuItems, setFocusMenuItems] = useState<ExtendedOption<Position[]>[]>([focusDefaultOption])
    useEffect(() => {
        const items = score ? createFocusMenuItems(score) : [focusDefaultOption]
        setFocusMenuItems(items)
        // Apply the user's preferred default focus for this score's orchestra if set and present.
        const prefFocus = score ? user?.preferences?.defaultFocusByOrchestra?.[score.instrumenttype] : undefined
        const match = prefFocus ? items.find((i) => i.value === prefFocus) : undefined
        setSelectedFocusOption(match ?? focusDefaultOption)
        debug(`setting panggul option to ${JSON.stringify(panggulDefaultOption)}`)
        setSelectedPanggulOption(panggulDefaultOption)
    }, [score])

    useEffect(() => {
        if (selectedScoreOption && selectedScoreOption.objValue) loadScore('JSON', selectedScoreOption?.objValue)
    }, [selectedScoreOption])

    const {
        timeLine,
        playbackProgress,
        setPlaybackProgress,
        playbackSpeed,
        setPlaybackSpeed,
        schedulePlayback,
        totalDurationMs
    } = usePlaybackManager()
    const playbackReducer = playbackReducerFactory(schedulePlayback, setPlaybackProgress)
    const [playbackState, playback] = useReducer(playbackReducer, {
        cursor: noCursor,
        audioState: 'nodata',
        playbackType: 'none'
    })
    const { setDashboardFunction: setDashboardFunction, setFinalizeFunction } = usePlaybackFunctionStore()

    // ___________ UPDATE PLAYBACK FUNCTIONS ____________

    // TOD: eliminate `updatedashboard` which is used to change cursor info.
    // Use cursor state variable instead and update dashboard from MainWindow.
    useEffect(() => {
        setFinalizeFunction(stopPlayback)
        setDashboardFunction(playbackDashboardFunction)
    }, [])

    async function stopPlayback(time: number) {
        playback({ actionType: 'stop' })
    }

    // ___________ UPDATE DASHBOARD STATES ____________

    useEffect(() => {
        setDashboardElement('cycle', { visible: validation.hasCycle, tooltip: validation.message, level: 'error' })
        if (score)
            setDashboardElement('score', {
                visible: true,
                text: score.title,
                tooltip: `title: ${score.title}\ncomposer: ${score.composer}\nuuid: ${score.uuid}`
            })
        if (!['playing', 'paused'].includes(playbackState.audioState)) {
            setDashboardElement('playback', { ...dashboardValues.playback, visible: false })
        }
        setDashboardElement('localCache', {
            visible: true,
            level: localCacheState.level,
            tooltip: localCacheState.message
        })
        // debug(`PLAYBACKSTATE=${playbackState.audioState}`)
    }, [playbackState, validation, score, localCacheState])

    function setDashboardElement(name: ComponentName, value: DashboardComponentValues) {
        setDashboardValues((currDashboardValues) => {
            const newDashboardValues: DashboardValues = { ...currDashboardValues }
            newDashboardValues[name] = value
            return newDashboardValues
        })
    }

    function playbackDashboardFunction(time: number, params: DashboardParameters) {
        if (!params.system) setDashboardElement('playback', { visible: false })
        else
            setDashboardElement('playback', {
                visible: true,
                text: `${chars.system}${params.system} ${chars.pass}${params.pass} ${chars.iteration}${params.iteration} ${chars.tempo}${params.tempo}`
            })
    }

    // ___________ UPDATE MENU STATES ____________

    useEffect(() => {
        setPlaybackSpeed(selectedSpeedOption.objValue)
    }, [selectedSpeedOption])

    useEffect(() => {
        if (scoreInfoList)
            setScoreMenuOptions(
                scoreInfoList.map((scoreInfo, idx) => {
                    return { label: scoreInfo.title, value: `#${idx} scoreInfo.title`, objValue: scoreInfo }
                })
            )
        debug('ScoreInfoList changed')
    }, [scoreInfoList])

    // ___________ UPDATE SCORE STATES ____________

    useEffect(() => {
        playback({ actionType: 'clear' })
    }, [currentScore])

    useEffect(() => {
        // `score` status is updated after each edit to the current score
        if (score && currentScoreId != score.uuid) {
            setCurrentScoreId(score.uuid)
            console.log('Initial PB load')
            playback({ actionType: 'load', playbackType: 'multiple', score: score, systemIndex: 0 })
        }
        setPlaybackProgress(0)
    }, [score])

    const ToggleIcon = sidenavExpanded ? ArrowRightLineIcon : ArrowLeftLineIcon

    const player = (
        <Player
            score={score}
            totalDurationMs={totalDurationMs}
            playback={playback}
            playbackState={playbackState}
            playbackProgress={playbackProgress}
        />
    )

    const playbackMenu = useMemo(
        () => <PlaybackMenu focusMenuItems={focusMenuItems} speedMenuItems={speedMenuItems} />,
        [focusMenuItems, speedMenuItems]
    )

    const playerWindow = (
        <PlayerWindow
            appAppearance={appAppearance}
            visible={mainView == 'player'}
            player={player}
            score={score}
            timeLine={timeLine}
            playbackSpeed={playbackSpeed}
        />
    )

    const editorWindow = score && (
        <EditorWindow
            visible={mainView == 'editor'}
            loading={isLoadingScore}
            score={score}
            executeItemAction={executeItemAction}
            playbackState={playbackState}
            playback={playback}
            updateSystem={updateSystem}
        />
    )

    const fullApplication = (
        <Container id="main-wide-screen" height="80vh">
            <Container id="header+content" className="flex w-full min-w-0 min-h-0">
                <Header id="header" className="flex bg-[#f7f7fa]">
                    <Grid className="ml-4 mt-2 w-full content-center" align="middle">
                        <Row align="middle">
                            <Col span={19} id="Dashboard" align="left" data-tour="dashboard">
                                <Dashboard values={dashboardValues} />
                            </Col>
                            <Col span={5} id="Toolbar" className="flex justify-end">
                                <HStack>
                                    {playbackMenu}
                                    <Tip tip="Switch between the player and the notation editor">
                                        <SegmentedControl
                                            data-tour="view-toggle"
                                            value={mainView}
                                            data={[
                                                { label: 'player', value: 'player' },
                                                { label: 'editor', value: 'editor' }
                                            ]}
                                            onChange={(value) => setMainView(value as MainView)}
                                            className="bg-[#2196f3]"
                                        />
                                    </Tip>
                                </HStack>
                            </Col>
                        </Row>
                        <Row className="bg-whte-1000">{player}</Row>
                    </Grid>
                </Header>
                <Content id="content" px="1rem" className="h-9/10 min-h-0 p-4">
                    <div
                        id="editor/player window box"
                        className={`h-[100%] border rounded-md p-2 ${mainView == 'editor' ? 'overflow-scroll' : 'overflow-hidden'}`}>
                        <Activity mode={mainView == 'editor' ? 'visible' : 'hidden'}>{editorWindow}</Activity>
                        <Activity mode={mainView == 'player' ? 'visible' : 'hidden'}>{playerWindow}</Activity>
                    </div>
                </Content>
            </Container>
            <Sidebar h="100%" width={isExpandedSidenav ? 200 : 56} collapsible>
                {/* rounded-r-md of the Sidenav only rounds the corners on the right. */}
                <Sidenav expanded={isExpandedSidenav} defaultOpenKeys={[]} h="100%" className="rounded-r-md">
                    <Sidenav.Header className={isExpandedSidenav ? '' : 'pl-0 pr-0'}>
                        <NavHeader
                            expanded={isExpandedSidenav}
                            user={user}
                            login={login}
                            logout={logout}
                            infoDlg={infoDlg}
                            environment={environment}
                        />
                    </Sidenav.Header>
                    <Sidenav.Body>
                        <MainMenu
                            keyboard={keyboard}
                            score={score}
                            loadScore={loadScore}
                            saveScore={saveScore}
                            newScore={newScore}
                            updateScoreMeta={updateScoreMeta}
                            setKeyboard={SetKeyboard}
                            scoreMenuOptions={scoreMenuOptions}
                            user={user}
                        />
                    </Sidenav.Body>
                    <Sidenav.Footer>
                        <IconButton
                            icon={<ToggleIcon />}
                            onClick={() => setSidenavExpanded(!sidenavExpanded)}
                            appearance="subtle"
                        />
                    </Sidenav.Footer>
                </Sidenav>
            </Sidebar>
        </Container>
    )

    return (
        <>
            {/* Offers to restore unsaved work found in the recovery snapshot on startup. */}
            <ScoreRecoveryPrompt recoverScore={recoverScore} />
            {/* Full application is only displayed on larger screens */}
            <Activity mode={appAppearance == 'full' ? 'visible' : 'hidden'}>
                <Container id="full-application" className="h-dvh min-w-0">
                    {fullApplication}
                </Container>
            </Activity>
            {/* Small screens: a top bar, a full-screen view chosen by the bottom nav, and the
                VLC-style bottom navigation. The player is always mounted and visible; the
                Scores/Focus/Speed views overlay it (see the note on the view area below). */}
            <Activity mode={appAppearance == 'playerOnly' ? 'visible' : 'hidden'}>
                <div className="flex flex-col h-dvh min-h-0">
                    {/* Top bar: score title (left) + logo/about (right). */}
                    <div className="flex items-center justify-between border-b px-3 py-2">
                        <span className="truncate text-lg font-medium">{score?.title ?? ''}</span>
                        <TsLogoIcon
                            environment={environment}
                            remSize={2.2}
                            onClick={() => infoDlg()}
                            style={{ cursor: 'pointer' }}
                        />
                    </div>

                    {/* View area, filling the space between top bar and bottom nav. The player
                        stays mounted AND visible whichever tab is active — its playback refs
                        (focus, speed, cursor) are updated by effects that React unmounts when a
                        component is hidden, so hiding it would freeze the values the scheduled
                        animation callback reads. The Scores/Focus/Speed views overlay it instead. */}
                    <div className="relative min-h-0 flex-1">
                        <div className="flex h-full flex-col">
                            <div className="min-h-0 flex-1">{playerWindow}</div>
                        </div>

                        {mobileTab != 'player' && (
                            <div className="absolute inset-0 overflow-auto bg-white p-3">
                                {mobileTab == 'scores' && (
                                    <ScoreBrowser
                                        scoreMenuOptions={scoreMenuOptions}
                                        defaultFilter={
                                            score ? { type: 'orchestra', value: score.instrumenttype } : undefined
                                        }
                                        selectedValue={selectedScoreOption?.value}
                                        onSelect={(o) => {
                                            setSelectedScoreOption(o)
                                            setMobileTab('player')
                                        }}
                                    />
                                )}
                                {mobileTab == 'focus' && (
                                    <div className="flex h-full flex-col gap-2">
                                        <div className="text-xs">focus:</div>
                                        <OptionList
                                            data={focusMenuItems}
                                            selectedValue={selectedFocusOption.value}
                                            onSelect={(o) => {
                                                setSelectedFocusOption(o)
                                                setMobileTab('player')
                                            }}
                                            className="flex-1 min-h-0"
                                        />
                                    </div>
                                )}
                                {mobileTab == 'speed' && (
                                    <div className="flex h-full flex-col gap-2">
                                        <div className="text-xs">speed:</div>
                                        <OptionList
                                            data={speedMenuItems}
                                            selectedValue={selectedSpeedOption.value}
                                            onSelect={(o) => {
                                                setSelectedSpeedOption(o)
                                                setMobileTab('player')
                                            }}
                                            className="flex-1 min-h-0"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <MobileBottomNav
                        active={mobileTab}
                        onChange={setMobileTab}
                        speedValue={selectedSpeedOption.value}
                    />
                </div>
            </Activity>
        </>
    )
}
