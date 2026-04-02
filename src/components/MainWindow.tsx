import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import CollaspedOutlineIcon from '@rsuite/icons/CollaspedOutline'
import EditIcon from '@rsuite/icons/Edit'
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import _ from 'lodash'
import { useContext, useEffect, useReducer, useRef, useState, type Dispatch } from 'react'
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
import { playbackReducerFactory } from '../componentlogic/playbackReducer'
import { useEditorScoreManager } from '../componentlogic/useEditorScoreManager'
import { usePlaybackManager } from '../componentlogic/usePlaybackManager'
import { useScoreReader } from '../componentlogic/useScoreReader'
import { cycleValidation } from '../componentlogic/validationManager'
import { editorInitialExpandState, noCursor, type KeyboardType } from '../config/config'
import type { Position, ScoreMenuOption, WpUserRecord } from '../typing/types'
import { debug } from '../utils/debugger'
import type { DashboardFunctionsType, ScoreFunctionsType } from './contexts'
import { DashboardFunctions, ScoreFunctions, WpApiFunctions } from './contexts'
import {
    Dashboard,
    dashboardDefaults as defaultDashboardValues,
    type ComponentName,
    type DashboardComponentValues,
    type DashboardValues
} from './editor/Dashboard'
import EditorWindow from './editor/EditorWindow'
import { MainMenu } from './MainMenu'
import PlayerWindow from './player/PlayerWindow'
import logo from '/dist/icons/tabuh-studio_icon.svg'

interface LoginDialogProps {
    open: boolean
    setOpen: Dispatch<boolean>
    setUser: Dispatch<WpUserRecord | undefined>
}

function LoginDialog({ open, setOpen, setUser }: LoginDialogProps) {
    interface FormValue {
        username: string
        password: string
    }
    const formRef = useRef<FormInstance>(null)
    const model = SchemaModel<FormValue>({ username: StringType().isRequired(), password: StringType().isRequired() })
    const [formValue, setFormValue] = useState<Record<string, any>>({ username: '', password: '' })
    const wpFunc = useContext(WpApiFunctions)

    const handleSubmit = async () => {
        if (!formRef.current) return
        if (!formRef.current.check()) {
            console.error('Form Error')
            return
        }
        wpFunc.user.login(formValue.username as string, formValue.password as string).then((result) => {
            if (result && !('error' in result) && 'user' in result) {
                setUser(result.user)
                setOpen(false)
            } else setUser(undefined)
        })
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
    user: WpUserRecord | undefined
    setUser: Dispatch<WpUserRecord | undefined>
}
function NavHeader({ expanded, user, setUser, ...rest }: NavHeaderProps) {
    const [openLogin, setOpenLogin] = useState<boolean>(false)
    const [logoutMenu, setLogoutMenu] = useState<boolean>(false)
    const wpFunc = useContext(WpApiFunctions)

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
                    const result = await wpFunc.user.logout()
                    if (result && result['logged_in'] == false) setUser(undefined)
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
                <div className="text-[0.75rem]">{expanded && user ? ' ' + user.display_name : ''}</div>
            </HStack>
            {user && logoutPop}
            <LoginDialog open={openLogin} setOpen={setOpenLogin} setUser={setUser} />
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
    const [user, setUser] = useState<WpUserRecord | undefined>(undefined)
    const [active, setActive] = useState<'editor' | 'player'>('player')

    // const [initialize, setInitialize] = useState<boolean>(true)

    //DASHBOARD WARNINGS
    const [dashboardValues, setDashboardValues] = useState<DashboardValues>(defaultDashboardValues)

    const { scoreList, loadedScore, loadScore, isLoading: loadingScore } = useScoreReader(dataSource)
    const dashboardFunctions: DashboardFunctionsType = {
        setDashboardElement: setDashboardElement,
        clearDashboardElement: clearDashboardElement
    }
    const {
        editorScore,
        getEditorScore,
        updateScore,
        labels,
        updateSystem,
        updateParts,
        scoreToFormattedJson,
        executeItemAction
    } = useEditorScoreManager(dashboardFunctions)
    const scoreFunctions: ScoreFunctionsType = {
        getEditorScore,
        updateScore,
        updateSystem,
        updateParts,
        scoreToFormattedJson
    }
    const wpFunc = useContext(WpApiFunctions)

    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
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

    useEffect(() => updatePlaybackCallbackFunctions({ generic: stopPlayback }), [])

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
        const newDashboardValues: DashboardValues = { ...dashboardValues }
        newDashboardValues[name] = value
        setDashboardValues(newDashboardValues)
    }
    function clearDashboardElement(name: ComponentName) {
        const newDashboardValues: DashboardValues = { ...dashboardValues }
        newDashboardValues[name] = { visible: false }
        setDashboardValues(newDashboardValues)
    }

    // On initial render, check if the user is logged in to the WordPress site and set state accordingly.
    useEffect(() => {
        const getUser = async () => {
            const result = await wpFunc.user.getUser()
            if (result && result['logged_in']) {
                setUser(result?.user)
            }
        }
        getUser()
    }, [])

    useEffect(() => {
        debug(`New score imported, title=${loadedScore?.title} with ${loadedScore?.systems.length} systems`)
        if (loadedScore) {
            updateScore(loadedScore)
            // UPDATE DASHBOARD
            const validation = cycleValidation(loadedScore, true)
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
        debug(`New editor score available, title=${editorScore?.title} with ${editorScore?.systems.length} systems`)
    }, [editorScore])

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
            score={editorScore}
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

    const editorWindow = (
        <EditorWindow
            visible={active == 'editor'}
            expanded={expanded}
            setExpanded={setExpanded}
            loading={loadingScore}
            editorScore={editorScore}
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
                    {/* <HStack spacing={16} align="center" p="1rem"> */}
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
                    {/* </HStack> */}
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
                        <NavHeader expanded={isExpandedSidenav} user={user} setUser={setUser} />
                    </Sidenav.Header>
                    <Sidenav.Body>
                        <MainMenu
                            keyboard={keyboard}
                            loadScore={loadScore}
                            setKeyboard={SetKeyboard}
                            scoreMenuOptions={scoreMenuOptions}
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
                <Container id="full-application" className="hidden lg:flex">
                    {fullApplication}
                </Container>
                {/* Container for small screens only displays the Player Window */}
                <Container id="player-only" className="flex lg:hidden w-full h-full">
                    {playerWindow}
                </Container>
            </ScoreFunctions>
        </DashboardFunctions>
    )
}
