import { useEffect, useState } from 'react'
import { useScore } from '../../hooks/useScore'
import Menu from './Menu'
import { Box, Button, HStack, VStack } from 'rsuite'
import EditorWindow from './EditorWindow'
import ExpandOutlineIcon from '@rsuite/icons/ExpandOutline'
import CollaspedOutlineIcon from '@rsuite/icons/CollaspedOutline'
import { editorInitialExpandState } from '../../config/config'

export default function TabuhEditor({
    tabuhDict,
    loadingTabuhDict
}: {
    tabuhDict: Record<string, string>
    loadingTabuhDict: boolean
}) {
    const [score, loadScore, loadingScore] = useScore(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [expanded, setExpanded] = useState<Record<number, boolean>>({})
    const [buttonIsExpand, setButtonIsExpand] = useState<boolean>(!editorInitialExpandState)
    var scoreList: string[] = Object.keys(tabuhDict)

    useEffect(() => {
        setLoading(loadingTabuhDict || loadingScore)
    }, [loadingTabuhDict, loadingScore])

    function expandAll(expand: boolean) {
        const newExpanded = Object.fromEntries(Object.keys(expanded).map((id) => [id, expand]))
        setExpanded(newExpanded)
        setButtonIsExpand(!expand)
    }

    return (
        <div id="TabuhEditor">
            <VStack id="EditorContainer" className="m-5">
                <HStack>
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
                <Box className={`w-full flex border h-200  rounded-md p-2`}>
                    {score != null && (
                        <EditorWindow score={score} expanded={expanded} setExpanded={setExpanded} loading={loading} />
                    )}
                </Box>
            </VStack>
        </div>
    )
}
