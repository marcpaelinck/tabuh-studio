import ArrowLeftLineIcon from '@rsuite/icons/ArrowLeftLine'
import ArrowRightLineIcon from '@rsuite/icons/ArrowRightLine'
import CollaspedOutlineIcon from '@rsuite/icons/CollaspedOutline'
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline'
import SearchIcon from '@rsuite/icons/Search'
import _ from 'lodash'
import { useEffect, useState } from 'react'
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
    Sidebar,
    Sidenav,
    useMediaQuery,
    VStack
} from 'rsuite'
import { editorInitialExpandState } from '../../config/config'
import { useScore } from '../../hooks/useScore'
import { debug } from '../../utils/debugger'
import EditorWindow from './EditorWindow'
import { TabuhEditorMenu } from './TabuhEditorMenu'
import logo from '/dist/icons/tabuh-studio_icon.svg'

export type KeyboardType = 'regular' | 'laras'

const NavHeader = ({ expanded, ...rest }: { expanded: boolean }) => {
    if (!expanded) {
        return (
            <HStack justify="center">
                {' '}
                <img src={logo} className="h-10 pl-0 pr-0" alt="logo" />
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
    //NAVIGATION
    const [sidenavExpanded, setSidenavExpanded] = useState(true)
    const [isMobile] = useMediaQuery('(max-width: 768px)')
    const isExpandedSidenav = sidenavExpanded && !isMobile
    //END NAVIGATION
    const [score, loadScore, loadingScore] = useScore(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [buttonIsExpand, setButtonIsExpand] = useState<boolean>(!editorInitialExpandState)
    const [keyboard, SetKeyboard] = useState<KeyboardType>('regular')

    useEffect(() => {
        setLoading(loadingTabuhDict || loadingScore)
    }, [loadingTabuhDict, loadingScore])

    function expandAll(expand: boolean) {
        const newExpanded = _.mapValues(expanded, () => expand)
        debug(newExpanded, TabuhEditor.name)
        setExpanded(newExpanded)
        setButtonIsExpand(!expand)
    }

    const ToggleIcon = sidenavExpanded ? ArrowRightLineIcon : ArrowLeftLineIcon

    return (
        <Container id="main" height="80vh">
            <Container id="header+content">
                <Header id="header">
                    <HStack spacing={16} align="center" p="1rem">
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
            <Sidebar h="100%" width={isExpandedSidenav ? 200 : 56} collapsible>
                <Sidenav expanded={isExpandedSidenav} defaultOpenKeys={[]} h="100%">
                    <Sidenav.Header className={isExpandedSidenav ? '' : 'pl-0 pr-0'}>
                        <NavHeader expanded={isExpandedSidenav} />
                    </Sidenav.Header>
                    <Sidenav.Body>
                        <TabuhEditorMenu
                            keyboard={keyboard}
                            loadScore={loadScore}
                            setKeyboard={SetKeyboard}
                            tabuhDict={tabuhDict}
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
}
