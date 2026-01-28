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
import { useEditorScoreManager } from '../../hooksandmanagers/useEditorScoreManager'
import { useScoreReader } from '../../hooksandmanagers/useScoreReader'
import { cycleValidation } from '../../hooksandmanagers/validationManager'
import type { EditorScore, ScoreInfo } from '../../models/types'
import { debug } from '../../utils/debugger'
import type { DashboardFunctionsType, ScoreFunctionsType } from './contexts'
import { DashboardFunctions, ScoreFunctions } from './contexts'
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

export function TabuhEditor({ scoreList, loadingScoreList }: { scoreList: ScoreInfo[]; loadingScoreList: boolean }) {
    //NAVIGATION
    const [sidenavExpanded, setSidenavExpanded] = useState(true)
    const [isMobile] = useMediaQuery('(max-width: 768px)')
    const isExpandedSidenav = sidenavExpanded && !isMobile

    //DASHBOARD WARNINGS
    const [dashboardValues, setDashboardValues] = useState<DashboardValues>(defaultDashboardValues)

    const { score: importedScore, loadScore, isLoading: loadingScore } = useScoreReader<EditorScore>('new')
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

    const [loading, setLoading] = useState<boolean>(false)
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
                tooltip: `title: ${importedScore.title}\ncomposer: ${importedScore.composer}`
            }
            debug(`Dashboard values=${JSON.stringify(newDashboardValue)}`)
            setDashboardValues(newDashboardValue)
        }
    }, [importedScore])

    useEffect(() => {
        debug(`New editor score available, title=${editorScore?.title} with ${editorScore?.systems.length} systems`)
    }, [editorScore])

    useEffect(() => {
        setLoading(loadingScoreList || loadingScore)
    }, [loadingScoreList, loadingScore])

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
                                        loading={loading}
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
                                <NavHeader expanded={isExpandedSidenav} />
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
