import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import EditIcon from '@rsuite/icons/Edit'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import { Activity, useEffect, useReducer, useRef, useState, type Dispatch } from 'react'
import { BsPerson, BsPersonFillCheck } from 'react-icons/bs'
import {
    Button,
    Col,
    Container,
    Content,
    Form,
    Grid,
    Header,
    HStack,
    IconButton,
    Modal,
    PasswordInput,
    Popover,
    Row,
    SchemaModel,
    Sidebar,
    Sidenav,
    StringType,
    Toggle,
    useMediaQuery,
    type FormInstance
} from 'rsuite'
import { playbackReducerFactory } from '../componentlogic/playback/playbackReducer'
import { usePlaybackManager } from '../componentlogic/playback/usePlaybackManager'
import { useScoreManager } from '../componentlogic/useScoreManager'
import { useScoreReader } from '../componentlogic/useScoreReader'
import { useScreenSize } from '../componentlogic/useScreenSize'
import { cycleValidation } from '../componentlogic/validationManager'
import { noCursor, type KeyboardType } from '../config/config'
import { useAuth, type AuthUser } from '../context/AuthContext'
import type { DashboardFunctionsType, ScoreFunctionsType } from '../context/contexts'
import { DashboardFunctions, ScoreFunctions } from '../context/contexts'
import type { Position, UUID } from '../typing/basetypes'
import {
    focusDefaultOption,
    panggulDefaultOption,
    speedDefaultOption,
    type Appearance,
    type ExtendedOption,
    type ScoreInfo
} from '../typing/interface'
import type { DashboardParameters } from '../typing/playback'
import { debug } from '../utils/debugger'
import {
    Dashboard,
    dashboardDefaults as defaultDashboardValues,
    type ComponentName,
    type DashboardComponentValues,
    type DashboardValues
} from './Dashboard'
import EditorWindow from './editor/EditorWindow'
import { MainMenu } from './MainMenu'
import { Player } from './player/Player'
import PlayerWindow from './player/PlayerWindow'
import logo from '/dist/icons/tabuh-studio_icon.svg'

interface LoginDialogProps {
    open: boolean
    setOpen: Dispatch<boolean>
    login: (email: string, password: string) => Promise<void>
}

function LoginDialog({ open, setOpen, login }: LoginDialogProps) {
    interface FormValue {
        username: string
        password: string
    }
    const formRef = useRef<FormInstance>(null)
    const model = SchemaModel<FormValue>({ username: StringType().isRequired(), password: StringType().isRequired() })

    const [formValue, setFormValue] = useState<Record<string, any>>({ username: '', password: '' })

    const handleSubmit = async () => {
        if (!formRef.current) return
        if (!formRef.current.check()) {
            console.error('Form Error')
            return
        }
        try {
            await login(formValue.username as string, formValue.password as string)
        } catch (err) {
            console.error('Login failed')
            // setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setOpen(false)
        }
    }

    return (
        <Modal className="w-[20rem]" open={open} onClose={() => setOpen(false)}>
            <Modal.Header>
                <Modal.Title>Login</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form
                    fluid
                    ref={formRef}
                    onChange={setFormValue}
                    // onCheck={setFormError}
                    formValue={formValue}
                    model={model}>
                    <Form.Group controlId="username-7">
                        <Form.Label>Username</Form.Label>
                        <Form.Control name="username" w={200} />
                        <Form.Text tooltip>Required</Form.Text>
                    </Form.Group>
                    <Form.Group controlId="password-7">
                        <Form.Label>Password</Form.Label>
                        <Form.Control name="password" type="password" autoComplete="off" accepter={PasswordInput} />
                        <Form.Text tooltip>Required</Form.Text>
                    </Form.Group>

                    <Button appearance="primary" onClick={handleSubmit}>
                        Login
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    )
}

interface NavHeaderProps {
    expanded: boolean
    user: AuthUser | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}
function NavHeader({ expanded, user, login, logout, ...rest }: NavHeaderProps) {
    const [openLogin, setOpenLogin] = useState<boolean>(false)
    const [logoutMenu, setLogoutMenu] = useState<boolean>(false)

    // Apply different formatting when the SideNav element is collapsed
    const expandedfmt = {
        true: { justify: undefined, class: 'h-10' },
        false: { justify: 'center', class: 'h-10 pl-0 pr-0' }
    }
    const expKey = String(expanded) as 'true' | 'false'

    const logoutPop = (
        <Popover visible={logoutMenu}>
            <a
                onClick={async () => {
                    setLogoutMenu(false)
                    logout()
                }}>
                logout
            </a>
        </Popover>
    )

    return (
        <>
            <HStack justify={expandedfmt[expKey].justify}>
                <img src={logo} className={expandedfmt[expKey].class} />
                {expanded ? '  Tabuh Studio' : ''}
            </HStack>
            <HStack justify={expandedfmt[expKey].justify} className="mt-3">
                <IconButton
                    icon={user ? <BsPersonFillCheck color="orange" /> : <BsPerson />}
                    onClick={() => (user ? setLogoutMenu(true) : setOpenLogin(true))}
                />
                <div className="text-[0.75rem]">{expanded && user ? ` ${user.name} (${user?.role})` : ''}</div>
            </HStack>
            {user && logoutPop}
            <LoginDialog open={openLogin} setOpen={setOpenLogin} login={login} />
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
    const [active, setActive] = useState<'editor' | 'player'>('player')
    const screenSize = useScreenSize()
    const [appAppearance, setAppAppearance] = useState<Appearance>('full')
    const { user, login, logout } = useAuth()

    useEffect(() => {
        if (user) console.log(`${user} successfully logged in`)
        else console.log(`Logout successful`)
    }, [user])

    useEffect(() => {
        setAppAppearance(screenSize.abbr.includes('lg') ? 'full' : 'playerOnly')
    }, [screenSize])

    // ── DASHBOARD WARNINGS ─────────────────────────────────────────────

    const [dashboardValues, setDashboardValues] = useState<DashboardValues>(defaultDashboardValues)

    const { scoreInfoList, loadedScore, loadScore, isLoading: isLoadingScore } = useScoreReader(dataSource)
    const dashboardFunctions: DashboardFunctionsType = {
        setDashboardElement: setDashboardElement,
        clearDashboardElement: clearDashboardElement
    }
    const { score, getScore, updateScore, labels, updateSystem, updateParts, executeItemAction } =
        useScoreManager(dashboardFunctions)
    const [currentScoreId, setCurrentScoreId] = useState<UUID>('') // use this state to trigger events when a new score is loaded
    const scoreFunctions: ScoreFunctionsType = { getScore, updateScore, updateSystem, updateParts }

    const [keyboard, SetKeyboard] = useState<KeyboardType>('regular')
    const [scoreMenuOptions, setScoreMenuOptions] = useState<ExtendedOption<ScoreInfo>[]>([])

    // ──  MENU AND SELECTORS SETTINGS ─────────────────────────────────────────────

    // By keeping these values here, the actual selectors can occur in any child element.

    const [selectedScoreOption, setSelectedScoreOption] = useState<ExtendedOption<ScoreInfo> | null>(null)
    const [selectedFocusOption, setSelectedFocusOption] = useState<ExtendedOption<Position[]>>(focusDefaultOption)
    const [selectedPanggulOption, setSelectedPanggulOption] = useState<ExtendedOption<Position[]>>(panggulDefaultOption)
    const [selectedSpeedOption, setSelectedSpeedOption] = useState<ExtendedOption<number>>(speedDefaultOption)
    const currentFocusRef = useRef<Position[]>([]) // List of positions corresponding with the selected instrument
    const currentPanggulRef = useRef<Position[]>([]) // List of positions corresponding with the selected panggul animation (currently max. 1 position)

    useEffect(() => {
        currentFocusRef.current = selectedFocusOption.objValue
        currentPanggulRef.current = selectedPanggulOption.objValue
    }, [selectedPanggulOption, selectedFocusOption])

    useEffect(() => {
        if (selectedScoreOption && selectedScoreOption.objValue) loadScore('JSON', selectedScoreOption?.objValue)
    }, [selectedScoreOption])

    const {
        timeLine,
        updatePlaybackCallbackFunctions,
        playbackProgress,
        setPlaybackProgress,
        playbackSpeed,
        setPlaybackSpeed,
        schedulePlayback,
        totalDurationMs
    } = usePlaybackManager(currentFocusRef, currentPanggulRef)
    const playbackReducer = playbackReducerFactory(schedulePlayback, setPlaybackProgress)
    const [playbackState, playback] = useReducer(playbackReducer, {
        cursor: noCursor,
        audioState: 'nodata',
        playbackType: 'none'
    })

    useEffect(
        () => updatePlaybackCallbackFunctions({ generic: stopPlayback, updatedashboard: playbackDashboardFunction }),
        []
    )

    useEffect(() => {
        setPlaybackSpeed(selectedSpeedOption.objValue)
        debug(`setting speed to ${selectedSpeedOption.objValue}`)
    }, [selectedSpeedOption])

    useEffect(() => {
        setScoreMenuOptions(
            scoreInfoList.map((scoreInfo, idx) => {
                return { label: scoreInfo.title, value: `#${idx} scoreInfo.title`, objValue: scoreInfo }
            })
        )
    }, [scoreInfoList])

    async function stopPlayback(time: number) {
        playback({ actionType: 'stop' })
    }

    function setDashboardElement(name: ComponentName, value: DashboardComponentValues) {
        setDashboardValues((currDashboardValues) => {
            const newDashboardValues: DashboardValues = { ...currDashboardValues }
            newDashboardValues[name] = value
            return newDashboardValues
        })
    }

    function clearDashboardElement(name: ComponentName) {
        setDashboardValues((currDashboardValues) => {
            const newDashboardValues: DashboardValues = { ...dashboardValues }
            newDashboardValues[name] = { visible: false }
            return currDashboardValues
        })
    }

    function playbackDashboardFunction(time: number, params: DashboardParameters) {
        if (!params.system) setDashboardElement('playback', { visible: false })
        else
            setDashboardElement('playback', {
                visible: true,
                text: `sys[${params.system}] pass[${params.pass}] iter[${params.iteration}] [${params.tempo}]BPM`
            })
    }

    useEffect(() => {
        debug(`New score imported, title=${loadedScore?.title} with ${loadedScore?.systems.length} systems`)
        if (loadedScore) {
            updateScore(loadedScore)
            // UPDATE DASHBOARD
            const validation = cycleValidation(loadedScore)
            if (!validation.isValid)
                setDashboardElement('cycle', { visible: true, tooltip: validation.message, level: 'error' })
            setDashboardElement('score', {
                visible: true,
                text: loadedScore.title,
                tooltip: `title: ${loadedScore.title}\ncomposer: ${loadedScore.composer}\nuuid: ${loadedScore.uuid}`
            })
        }
        playback({ actionType: 'clear' })
    }, [loadedScore])

    useEffect(() => {
        debug(`New editor score available, title=${score?.title} with ${score?.systems.length} systems`)
        if (score && currentScoreId != score.uuid) {
            setCurrentScoreId(score.uuid)
            playback({
                actionType: 'load',
                playbackType: 'multiple',
                score: score,
                systemIndex: 0,
                intro: 2000,
                outro: 5000
            })
        }
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

    const playerWindow = (
        <PlayerWindow
            appAppearance={appAppearance}
            visible={active == 'player'}
            player={player}
            score={score}
            totalDurationMs={totalDurationMs}
            timeLine={timeLine}
            scoreMenuOptions={scoreMenuOptions}
            selectedScoreOption={selectedScoreOption}
            selectedFocusOption={selectedFocusOption}
            selectedPanggulOption={selectedPanggulOption}
            selectedSpeedOption={selectedSpeedOption}
            setSelectedScoreOption={setSelectedScoreOption}
            setSelectedFocusOption={setSelectedFocusOption}
            setSelectedPanggulOption={setSelectedPanggulOption}
            setSelectedSpeedOption={setSelectedSpeedOption}
            updatePlaybackFunctions={updatePlaybackCallbackFunctions}
            playbackProgress={playbackProgress}
            playbackSpeed={playbackSpeed}
            playbackState={playbackState}
            playback={playback}
        />
    )

    const editorWindow = score && (
        <EditorWindow
            visible={active == 'editor'}
            loading={isLoadingScore}
            score={score}
            labels={labels}
            updateParts={updateParts}
            executeItemAction={executeItemAction}
            updatePlaybackFunctions={updatePlaybackCallbackFunctions}
            playbackState={playbackState}
            playback={playback}
        />
    )

    const fullApplication = (
        <Container id="main-wide-screen" height="80vh">
            <Container id="header+content" className="flex w-full min-w-0">
                <Header id="header" className="flex nt-4 bg-[#f7f7fa]">
                    <Grid className="ml-4 mt-2 w-full content-center" align="middle">
                        <Row align="middle">
                            <Col span={19} id="Dashboard" align="left">
                                <Dashboard values={dashboardValues} />
                            </Col>
                            <Col span={5} id="Toolbar" className="flex justify-end">
                                <Toggle
                                    size={'lg'}
                                    color="violet"
                                    checkedChildren={<PlayOutlineIcon />}
                                    unCheckedChildren={<EditIcon />}
                                    defaultChecked={active == 'player'}
                                    onChange={(checked) => setActive(checked ? 'player' : 'editor')}
                                />
                            </Col>
                        </Row>
                        <Row className="bg-whte-1000">{player}</Row>
                    </Grid>
                </Header>
                <Content id="content" px="1rem" className="h-9/10">
                    <div id="editor/player window box" className={`h-19/20 border rounded-md p-2 overflow-scroll`}>
                        <Activity mode={active == 'editor' ? 'visible' : 'hidden'}>{editorWindow}</Activity>
                        <Activity mode={active == 'player' ? 'visible' : 'hidden'}>{playerWindow}</Activity>
                    </div>
                </Content>
            </Container>
            <Sidebar h="100%" width={isExpandedSidenav ? 200 : 56} collapsible>
                {/* rounded-r-md of the Sidenav only rounds the corners on the right. */}
                <Sidenav expanded={isExpandedSidenav} defaultOpenKeys={[]} h="100%" className="rounded-r-md">
                    <Sidenav.Header className={isExpandedSidenav ? '' : 'pl-0 pr-0'}>
                        <NavHeader expanded={isExpandedSidenav} user={user} login={login} logout={logout} />
                    </Sidenav.Header>
                    <Sidenav.Body>
                        <MainMenu
                            keyboard={keyboard}
                            selectedScoreOption={selectedScoreOption}
                            setSelectedScoreOption={setSelectedScoreOption}
                            loadScore={loadScore}
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
        <DashboardFunctions value={dashboardFunctions}>
            <ScoreFunctions value={scoreFunctions}>
                {/* Full application is only displayed on larger screens */}
                {appAppearance == 'full' && (
                    <Container id="full-application" className="min-w-0">
                        {fullApplication}
                    </Container>
                )}
                {/* Container for small screens only displays the Player Window */}
                {appAppearance == 'playerOnly' && <Container id="player-only">{playerWindow}</Container>}
            </ScoreFunctions>
        </DashboardFunctions>
    )
}
