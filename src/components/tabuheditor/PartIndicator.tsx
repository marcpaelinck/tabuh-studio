import { useEffect, useState } from 'react'
import { Col, Tooltip, useDialog, Whisper, type ColProps } from 'rsuite'
import { debug } from '../../utils/debugger'

interface PartIndicatorProps extends ColProps {
    uuid: string
    partName: string
    partColor: string | undefined
    firstOfRange: boolean
    selectionOn: boolean
    toggleSelection: (on: boolean, partName?: string) => void
    extendSelection: (uuid: string) => void
}

export function PartIndicator({
    uuid,
    partName,
    partColor,
    firstOfRange,
    selectionOn,
    toggleSelection,
    extendSelection,
    ...props
}: PartIndicatorProps) {
    const [highlightMe, setHighlightMe] = useState<boolean>(false)
    const dialog = useDialog()

    // Deselect all parts when the user ends the drag action
    useEffect(() => {
        if (!selectionOn && highlightMe) setHighlightMe(false)
    }, [selectionOn])

    async function handleMousOver() {
        debug(`mouseover & selection is ${selectionOn}`)
        if (selectionOn) {
            setHighlightMe(true)
            extendSelection(uuid)
        }
    }
    function handleMouseDown(event: MouseEvent) {
        event.stopPropagation()
        toggleSelection(true)
        setHighlightMe(true)
        extendSelection(uuid)
    }

    async function handleMouseUp(event: MouseEvent) {
        extendSelection(uuid)
        const newPartName = await dialog.prompt('part name:')
        toggleSelection(false, newPartName)
    }

    return (
        <Whisper
            trigger="hover"
            placement="autoHorizontalStart"
            controlId={`control-id-Whisper`}
            speaker={
                <Tooltip>Part name. To add or modify a part, click and drag down. Click on a name to edit it.</Tooltip>
            }>
            <Col
                span={'auto'}
                background={selectionOn && highlightMe ? '#fffb004a' : partColor}
                className="flex justify-center grow-[0.4]  p-0"
                onMouseOver={() => handleMousOver()}
                onMouseDown={(e: MouseEvent) => handleMouseDown(e)}
                onMouseUp={(e: MouseEvent) => handleMouseUp(e)}
                {...props}>
                <div className={`m-0 [writing-mode:vertical-rl] overflow-hidden align-center text-middle select-none`}>
                    {firstOfRange ? partName : ''}
                </div>
            </Col>
        </Whisper>
    )
}
