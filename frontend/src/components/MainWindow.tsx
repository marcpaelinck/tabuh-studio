import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import CollaspedOutlineIcon from '@rsuite/icons/CollaspedOutline'
import EditIcon from '@rsuite/icons/Edit'
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import _ from 'lodash'
import { useEffect, useReducer, useRef, useState, type Dispatch } from 'react'
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
import { editorInitialExpandState, noCursor, type KeyboardType } from '../config/config'
import { useAuth, type AuthUser } from '../context/AuthContext'
import type { DashboardFunctionsType, ScoreFunctionsType } from '../context/contexts'
import { DashboardFunctions, ScoreFunctions } from '../context/contexts'
import type { Position, UUID } from '../typing/basetypes'
import type { ScoreMenuOption } from '../typing/menus'
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
    //NAVIGATION
    const [sidenavExpanded, setSidenavExpanded] = useState(true)
    const [isMobile] = useMediaQuery('(max-width: 768px)')
    const isExpandedSidenav = sidenavExpanded && !isMobile
    const [active, setActive] = useState<'editor' | 'player'>('player')
    const screenSize = useScreenSize()
    const { user, login, logout } = useAuth()

    useEffect(() => {
        if (user) console.log(`${user} successfully logged in`)
        else console.log(`Logout successful`)
    }, [user])

    // const [initialize, setInitialize] = useState<boolean>(true)

    //DASHBOARD WARNINGS
    const [dashboardValues, setDashboardValues] = useState<DashboardValues>(defaultDashboardValues)

    const { scoreList, loadedScore, loadScore, isLoading: isLoadingScore } = useScoreReader(dataSource)
    const dashboardFunctions: DashboardFunctionsType = {
        setDashboardElement: setDashboardElement,
        clearDashboardElement: clearDashboardElement
    }
    const { score, getScore, updateScore, labels, updateSystem, updateParts, executeItemAction } =
        useScoreManager(dashboardFunctions)
    const [currentScoreId, setCurrentScoreId] = useState<UUID>('') // use this state to trigger events when a new score is loaded
    const scoreFunctions: ScoreFunctionsType = { getScore, updateScore, updateSystem, updateParts }

    const [expanded, setExpanded] = useState<Record<UUID, boolean>>({})
    const [buttonIsExpand, setButtonIsExpand] = useState<boolean>(!editorInitialExpandState)
    const [keyboard, SetKeyboard] = useState<KeyboardType>('regular')
    const [scoreMenuOptions, setScoreMenuOptions] = useState<ScoreMenuOption[]>([])

    // PLAYBACK SETTINGS
    const [focus, setFocus] = useState<Position[]>([])
    const {
        timeLine,
        updatePlaybackCallbackFunctions,
        playbackProgress,
        setPlaybackProgress,
        playbackSpeed,
        setPlaybackSpeed,
        schedulePlayback,
        totalDurationMs
    } = usePlaybackManager(focus)
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
        setScoreMenuOptions(
            scoreList.map((scoreInfo) => {
                return { value: scoreInfo, label: scoreInfo.title }
            })
        )
    }, [scoreList])

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

    function expandAll(expand: boolean) {
        const newExpanded = _.mapValues(expanded, () => expand)
        setExpanded(newExpanded)
        setButtonIsExpand(!expand)
    }

    const ToggleIcon = sidenavExpanded ? ArrowRightLineIcon : ArrowLeftLineIcon

    const playerWindow = (
        <PlayerWindow
            visible={active == 'player'}
            scoreMenuOptions={scoreMenuOptions}
            score={score}
            currentScoreId={currentScoreId}
            loadScore={loadScore}
            totalDurationMs={totalDurationMs}
            timeLine={timeLine}
            focus={focus}
            setFocus={setFocus}
            updatePlaybackFunctions={updatePlaybackCallbackFunctions}
            playbackProgress={playbackProgress}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            playbackState={playbackState}
            playback={playback}
        />
    )

    const editorWindow = score && (
        <EditorWindow
            visible={active == 'editor'}
            loading={isLoadingScore}
            score={score}
            currentScoreId={currentScoreId}
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
            <Container id="header+content" className="flex ">
                <Header id="header" className="flex">
                    <Grid className="ml-4 mr-4 w-full h-12 content-center" align="middle">
                        <Row align="middle">
                            <Col span={1} align="left">
                                <Button
                                    appearance="primary"
                                    startIcon={buttonIsExpand ? <ExpandOutlineIcon /> : <CollaspedOutlineIcon />}
                                    size="sm"
                                    onClick={() => expandAll(buttonIsExpand)}
                                />
                            </Col>
                            <Col span={22}>
                                <Dashboard values={dashboardValues} />
                            </Col>
                            <Col span={1}>
                                <Toggle
                                    size={'lg'}
                                    color="violet"
                                    checkedChildren={<PlayOutlineIcon />}
                                    unCheckedChildren={<EditIcon />}
                                    defaultChecked
                                    onChange={(checked) => setActive(checked ? 'player' : 'editor')}
                                />
                            </Col>
                        </Row>
                    </Grid>
                </Header>
                <Content id="content" px="1rem" className="h-9/10">
                    <div id="editor/player window box" className={`h-19/20 border rounded-md p-2 overflow-scroll`}>
                        {editorWindow}
                        {playerWindow}
                    </div>
                </Content>
            </Container>
            <Sidebar h="100%" width={isExpandedSidenav ? 200 : 56} collapsible>
                <Sidenav expanded={isExpandedSidenav} defaultOpenKeys={[]} h="100%">
                    <Sidenav.Header className={isExpandedSidenav ? '' : 'pl-0 pr-0'}>
                        <NavHeader expanded={isExpandedSidenav} user={user} login={login} logout={logout} />
                    </Sidenav.Header>
                    <Sidenav.Body>
                        <MainMenu
                            keyboard={keyboard}
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
                {screenSize.abbr.includes('lg') && <Container id="full-application">{fullApplication}</Container>}
                {/* Container for small screens only displays the Player Window */}
                {!screenSize.abbr.includes('lg') && <Container id="player-only">{playerWindow}</Container>}
            </ScoreFunctions>
        </DashboardFunctions>
    )
}
