import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import CollaspedOutlineIcon from '@rsuite/icons/CollaspedOutline'
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline'
import SearchIcon from '@rsuite/icons/Search'
import { useEffect, useState } from 'react'
import { FaRegKeyboard } from 'react-icons/fa6'
import { GiXylophone } from 'react-icons/gi'
import { IoFolderOpenOutline, IoSettingsOutline } from 'react-icons/io5'
import {
    Box,
    Button,
    Container,
    Content,
    Header,
    HStack,
    IconButton,
    Input,
    InputGroup,
    Nav,
    Sidebar,
    Sidenav,
    useMediaQuery,
    VStack
} from 'rsuite'
import { editorInitialExpandState } from '../../config/config'
import { useScore } from '../../hooks/useScore'
import EditorWindow from './EditorWindow'
import Menu from './Menu'
import logo from '/dist/icons/tabuh-studio_icon.svg'

const NavHeader = ({ expanded }: { expanded: boolean }) => {
    if (!expanded) {
        return (
            <HStack justify="center">
                {' '}
                <img src={logo} className="h-10" alt="logo" />
            </HStack>
        )
    }

    return (
        <>
            <VStack spacing={12}>
                <HStack>
                    <img src={logo} className="h-10" alt="logo" /> Tabuh Studio
                </HStack>
                <InputGroup inside size="sm">
                    <InputGroup.Addon>
                        <SearchIcon />
                    </InputGroup.Addon>
                    <Input type="search" placeholder="Search here..." />
                </InputGroup>
            </VStack>
        </>
    )
}

export function TabuhEditor({
    tabuhDict,
    loadingTabuhDict
}: {
    tabuhDict: Record<string, string>
    loadingTabuhDict: boolean
}) {
    //DUMMIES
    const [sidenavExpanded, setSidenavExpanded] = useState(true)
    const [activeKey, setActiveKey] = useState('1')
    const [isMobile] = useMediaQuery('(max-width: 768px)')
    const isExpanded = sidenavExpanded && !isMobile
    //END DUMMIES
    const [score, loadScore, loadingScore] = useScore(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [buttonIsExpand, setButtonIsExpand] = useState<boolean>(!editorInitialExpandState)
    const [keyboard, SetKeyboard] = useState<string>('regular')
    var scoreList: string[] = Object.keys(tabuhDict)

    useEffect(() => {
        setLoading(loadingTabuhDict || loadingScore)
    }, [loadingTabuhDict, loadingScore])

    function expandAll(expand: boolean) {
        const newExpanded = Object.fromEntries(Object.keys(sidenavExpanded).map((id) => [id, expand]))
        setExpanded(newExpanded)
        setButtonIsExpand(!expand)
    }

    const ToggleIcon = sidenavExpanded ? ArrowRightLineIcon : ArrowLeftLineIcon

    return (
        <Container id="main" height="80vh">
            <Container id="header+content">
                <Header id="header">
                    <HStack spacing={16} align="center" p="1rem">
                        <Menu
                            menuDisabled={loading}
                            tabuhList={scoreList}
                            scoreUpdater={(value: string) => loadScore(tabuhDict[value])}
                        />
                        <Button
                            appearance="primary"
                            startIcon={buttonIsExpand ? <ExpandOutlineIcon /> : <CollaspedOutlineIcon />}
                            onClick={() => expandAll(buttonIsExpand)}
                        />
                    </HStack>
                </Header>
                <Content id="content" px="1rem" className="h-9/10">
                    <Box id="editor window box" className={`h-19/20 border rounded-md p-2 overflow-scroll`}>
                        {score != null && (
                            <EditorWindow
                                id="editor window component"
                                score={score}
                                expanded={expanded}
                                setExpanded={setExpanded}
                                loading={loading}
                            />
                        )}
                    </Box>
                </Content>
            </Container>
            <Sidebar h="100%" width={isExpanded ? 260 : 56} collapsible>
                <Sidenav expanded={isExpanded} defaultOpenKeys={[]} h="100%">
                    <Sidenav.Header>
                        <NavHeader expanded={isExpanded} />
                    </Sidenav.Header>
                    <Sidenav.Body>
                        <Nav activeKey={activeKey} onSelect={setActiveKey}>
                            <Nav.Menu eventKey="1" title="File" icon={<IoFolderOpenOutline />}>
                                <Nav.Item eventKey="file-open">Open...</Nav.Item>
                                <Nav.Item eventKey="file-save">Save</Nav.Item>
                                <Nav.Item eventKey="file-saveas">Save As...</Nav.Item>
                            </Nav.Menu>
                            <Nav.Menu eventKey="2" title="Instruments" icon={<GiXylophone />}>
                                <Nav.Item eventKey="instruments-select">Select</Nav.Item>
                            </Nav.Menu>
                            <Nav.Menu eventKey="3" title="Keyboard" icon={<FaRegKeyboard />}>
                                <Nav.Item
                                    active={keyboard == 'regular'}
                                    onSelect={() => SetKeyboard('regular')}
                                    eventKey="keyboard-regular">
                                    Regular
                                </Nav.Item>
                                <Nav.Item
                                    active={keyboard == 'laras'}
                                    onSelect={() => SetKeyboard('laras')}
                                    eventKey="keyboard-laras">
                                    Laras
                                </Nav.Item>
                            </Nav.Menu>

                            <Nav.Menu eventKey="4" title="Settings" icon={<IoSettingsOutline />}>
                                <Nav.Item eventKey="settings-instruments">Instrument definitions</Nav.Item>
                                <Nav.Item eventKey="settings-keyboard">Keyboard definitions</Nav.Item>
                                <Nav.Item eventKey="settings-colors">Color schemes</Nav.Item>
                            </Nav.Menu>
                        </Nav>
                    </Sidenav.Body>
                    <Sidenav.Footer>
                        <IconButton
                            icon={<ToggleIcon />}
                            onClick={() => setSidenavExpanded(!sidenavExpanded)}
                            appearance="subtle"
                        />
                        {/* <Sidenav.Toggle onToggle={setSidenavExpanded} /> */}
                    </Sidenav.Footer>
                </Sidenav>
            </Sidebar>
        </Container>
    )
}
