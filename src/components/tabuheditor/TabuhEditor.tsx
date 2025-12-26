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
import DashboardIcon from '@rsuite/icons/Dashboard'
import PeoplesIcon from '@rsuite/icons/Peoples'
import PieChartIcon from '@rsuite/icons/PieChart'
import DataAuthorizeIcon from '@rsuite/icons/DataAuthorize'
import SettingIcon from '@rsuite/icons/Setting'
import SearchIcon from '@rsuite/icons/Search'
import logo from '/dist/icons/tabuh-studio_icon.svg'
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline'
import CollaspedOutlineIcon from '@rsuite/icons/CollaspedOutline'
import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import { useEffect, useState } from 'react'
import { editorInitialExpandState } from '../../config/config'
import { useScore } from '../../hooks/useScore'
import Menu from './Menu'
import EditorWindow from './EditorWindow'

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
    //DUMMIES
    const [score, loadScore, loadingScore] = useScore(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [buttonIsExpand, setButtonIsExpand] = useState<boolean>(!editorInitialExpandState)
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
                            <Nav.Item eventKey="1" icon={<DashboardIcon />}>
                                Overview
                            </Nav.Item>
                            <Nav.Menu eventKey="2" title="Customers" icon={<PeoplesIcon />}>
                                <Nav.Item eventKey="2-1">Users</Nav.Item>
                                <Nav.Item eventKey="2-2">Groups</Nav.Item>
                            </Nav.Menu>
                            <Nav.Menu eventKey="3" title="Analytics" icon={<PieChartIcon />}>
                                <Nav.Item eventKey="3-1">Geo</Nav.Item>
                                <Nav.Item eventKey="3-2">Devices</Nav.Item>
                                <Nav.Item eventKey="3-3">Loyalty</Nav.Item>
                                <Nav.Item eventKey="3-4">Visit Depth</Nav.Item>
                            </Nav.Menu>
                            <Nav.Menu eventKey="4" title="Security" icon={<DataAuthorizeIcon />}>
                                <Nav.Item eventKey="4-1">Users</Nav.Item>
                                <Nav.Item eventKey="4-2">Roles</Nav.Item>
                                <Nav.Item eventKey="4-3">Permissions</Nav.Item>
                            </Nav.Menu>

                            <Nav.Menu eventKey="5" title="Settings" icon={<SettingIcon />}>
                                <Nav.Item eventKey="5-1">Applications</Nav.Item>
                                <Nav.Item eventKey="5-2">Channels</Nav.Item>
                                <Nav.Item eventKey="5-3">Versions</Nav.Item>
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
