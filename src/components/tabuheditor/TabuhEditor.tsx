import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import CollaspedOutlineIcon from '@rsuite/icons/CollaspedOutline'
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline'
import _ from 'lodash'
import { useContext, useEffect, useRef, useState, type Dispatch } from 'react'
import { BsPerson, BsPersonFillCheck } from 'react-icons/bs'
import {
    Box,
    Button,
    Container,
    Content,
    Form,
    Header,
    HStack,
    IconButton,
    Modal,
    PasswordInput,
    Popover,
    SchemaModel,
    Sidebar,
    Sidenav,
    StringType,
    useMediaQuery,
    type FormInstance
} from 'rsuite'
import { editorInitialExpandState } from '../../config/config'
import { useEditorScoreManager } from '../../hooksandmanagers/useEditorScoreManager'
import { useScoreReader } from '../../hooksandmanagers/useScoreReader'
import { cycleValidation } from '../../hooksandmanagers/validationManager'
import type { EditorScore, WpUserRecord } from '../../models/types'
import { debug } from '../../utils/debugger'
import type { DashboardFunctionsType, ScoreFunctionsType } from './contexts'
import { DashboardFunctions, ScoreFunctions, WpApiFunctions } from './contexts'
import {
    Dashboard,
    dashboardDefaults as defaultDashboardValues,
    type ComponentName,
    type DashboardComponentValues,
    type DashboardValues
} from './Dashboard'
import EditorWindow from './EditorWindow'
import { TabuhEditorMenu } from './TabuhEditorMenu'
import logo from '/dist/icons/tabuh-studio_icon.svg'

export type KeyboardType = 'regular' | 'laras'

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
            console.log(`login=${JSON.stringify(result)}`)
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
                    console.log(`LOGOUT=${JSON.stringify(result)}`)
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
interface TabuhEditorProps {
    dataSource: 'database' | 'file'
}
export function TabuhEditor({ dataSource }: TabuhEditorProps) {
    //NAVIGATION
    const [sidenavExpanded, setSidenavExpanded] = useState(true)
    const [isMobile] = useMediaQuery('(max-width: 768px)')
    const isExpandedSidenav = sidenavExpanded && !isMobile
    const [user, setUser] = useState<WpUserRecord | undefined>(undefined)
    // const [initialize, setInitialize] = useState<boolean>(true)

    //DASHBOARD WARNINGS
    const [dashboardValues, setDashboardValues] = useState<DashboardValues>(defaultDashboardValues)

    const {
        scoreList,
        score: importedScore,
        loadScore,
        isLoading: loadingScore
    } = useScoreReader<EditorScore>('new', dataSource)
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

    function setDashboardElement(name: ComponentName, value: DashboardComponentValues) {
        const newDashboardValue: DashboardValues = { ...dashboardValues }
        newDashboardValue[name] = { visible: true, level: value.level, text: value.text, tooltip: value.tooltip }
        setDashboardValues(newDashboardValue)
    }
    function clearDashboardElement(name: ComponentName) {
        const newDashboardValue: DashboardValues = { ...dashboardValues }
        newDashboardValue[name] = { visible: false, tooltip: '' }
        debug(`Dashboard=${JSON.stringify(newDashboardValue)}`)
        setDashboardValues(newDashboardValue)
    }

    // On initial render, check if the user is logged in to the WordPress site and set state accordingly.
    useEffect(() => {
        const getUser = async () => {
            const result = await wpFunc.user.getUser()
            console.log(`CHECKING LOGGED IN USER=${JSON.stringify(result)}`)
            if (result && result['logged_in']) {
                console.log('setting user')
                setUser(result?.user)
            }
        }
        getUser()
    }, [])

    useEffect(() => {
        debug(`New score imported, title=${importedScore?.title} with ${importedScore?.systems.length} systems`)
        if (importedScore) {
            updateScore(importedScore)
            // UPDATE DASHBOARD
            const newDashboardValue: DashboardValues = { ...defaultDashboardValues }
            const validation = cycleValidation(importedScore, true)
            if (!validation.isValid)
                newDashboardValue['cycle'] = { visible: true, tooltip: validation.message, level: 'error' }
            newDashboardValue['score'] = {
                visible: true,
                text: importedScore.title,
                tooltip: `title: ${importedScore.title}\ncomposer: ${importedScore.composer}\ncomposer: ${importedScore.uuid}`
            }
            debug(`Dashboard values=${JSON.stringify(newDashboardValue)}`)
            setDashboardValues(newDashboardValue)
        }
    }, [importedScore])

    useEffect(() => {
        debug(`New editor score available, title=${editorScore?.title} with ${editorScore?.systems.length} systems`)
    }, [editorScore])

    function expandAll(expand: boolean) {
        const newExpanded = _.mapValues(expanded, () => expand)
        setExpanded(newExpanded)
        setButtonIsExpand(!expand)
    }

    const ToggleIcon = sidenavExpanded ? ArrowRightLineIcon : ArrowLeftLineIcon

    return (
        <DashboardFunctions value={dashboardFunctions}>
            <ScoreFunctions value={scoreFunctions}>
                <Container id="main" height="80vh">
                    <Container id="header+content">
                        <Header id="header">
                            <HStack spacing={16} align="center" p="1rem">
                                <Button
                                    appearance="primary"
                                    startIcon={buttonIsExpand ? <ExpandOutlineIcon /> : <CollaspedOutlineIcon />}
                                    onClick={() => expandAll(buttonIsExpand)}
                                />
                                <Dashboard values={dashboardValues} />
                            </HStack>
                        </Header>
                        <Content id="content" px="1rem" className="h-9/10">
                            <Box id="editor window box" className={`h-19/20 border rounded-md p-2 overflow-scroll`}>
                                {importedScore != null && (
                                    <EditorWindow
                                        id="editor window component"
                                        expanded={expanded}
                                        setExpanded={setExpanded}
                                        loading={loadingScore}
                                        editorScore={editorScore}
                                        labels={labels}
                                        updateSystem={updateSystem}
                                        updateParts={updateParts}
                                        executeItemAction={executeItemAction}
                                    />
                                )}
                            </Box>
                        </Content>
                    </Container>
                    <Sidebar h="100%" width={isExpandedSidenav ? 200 : 56} collapsible>
                        <Sidenav expanded={isExpandedSidenav} defaultOpenKeys={[]} h="100%">
                            <Sidenav.Header className={isExpandedSidenav ? '' : 'pl-0 pr-0'}>
                                <NavHeader expanded={isExpandedSidenav} user={user} setUser={setUser} />
                            </Sidenav.Header>
                            <Sidenav.Body>
                                <TabuhEditorMenu
                                    keyboard={keyboard}
                                    loadScore={loadScore}
                                    setKeyboard={SetKeyboard}
                                    scoreList={scoreList}
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
            </ScoreFunctions>
        </DashboardFunctions>
    )
}
