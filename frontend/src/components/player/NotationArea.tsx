// NotationArea wraps a textarea component that can be animated during playback.
// E.g. notation can be written in the textarea element or a cursor can scroll through the
// notation while the corresponding notes are being played.

import type { Position } from '@tabuhstudio/shared'
import { useCallback, useEffect, useRef, type Dispatch, type RefObject } from 'react'
import { HStack, Radio, RadioGroup, Text } from 'rsuite'
import { useUserSelectionStore } from '../../stores/useUserSettingsStore'
import type {
    HighlightRange,
    HilightRangeFunction,
    NotationParagraph,
    PlaybackCursorStyle
} from '../../typing/animation'
import type { PlaybackCallbackFunctions, PlayerCursorParameters } from '../../typing/playback'
import { debug } from '../../utils/debugger'

// function scrollIntoContainerView(element: HTMLElement | null, container: HTMLElement | null) {
//     if (!element || !container) return
//     const elementRect = element.getBoundingClientRect()
//     const containerRect = container.getBoundingClientRect()

//     // Vertical
//     const offsetTop = elementRect.top - containerRect.top
//     const offsetBottom = elementRect.bottom - containerRect.bottom
//     if (offsetTop < 0) {
//         container.scrollTop += offsetTop
//     } else if (offsetBottom > 0) {
//         container.scrollTop += offsetBottom
//     }

//     // Horizontal
//     const offsetLeft = elementRect.left - containerRect.left
//     const offsetRight = elementRect.right - containerRect.right
//     if (offsetLeft < 0) {
//         container.scrollLeft += offsetLeft
//     } else if (offsetRight > 0) {
//         container.scrollLeft += offsetRight
//     }
// }

interface NotationAreaProps {
    notation: NotationParagraph[] | null
    visible: boolean
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
}

export default function NotationArea({ notation, visible, updatePlaybackFunctions }: NotationAreaProps) {
    // The states that change the notation animation's behavior must be read through a ref: they are
    // captured (once, at mount) by the `[]`-memoized `animateNotationCursor` that is registered with the
    // playback engine, so reading them directly from the closure would not use their current at
    // their mount-time values.
    const textAreaRef: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
    const selectedFocusRef = useRef<Position[]>([])
    const selectedPanggulRef = useRef<Position[]>([])
    const selectedCursorStyleRef = useRef<PlaybackCursorStyle>('Beat')
    const visibleRef = useRef<boolean>(visible)
    const { selectedFocusOption, selectedPanggulOption, selectedCursorStyle, setSelectedCursorStyle } =
        useUserSelectionStore()

    useEffect(() => {
        selectedFocusRef.current = selectedFocusOption.objValue
    }, [selectedFocusOption])
    useEffect(() => {
        selectedPanggulRef.current = selectedPanggulOption.objValue
    }, [selectedPanggulOption])
    useEffect(() => {
        selectedCursorStyleRef.current = selectedCursorStyle
    }, [selectedCursorStyle])
    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        console.log(`NotationArea visible=${visible}`)
    }, [visible])

    // Highlighting function: highlights the given range (line and character range)
    const highlightCursor: HilightRangeFunction = (hlRange: HighlightRange) => {
        const para: HTMLParagraphElement = textAreaRef.current?.children[hlRange.line] as HTMLParagraphElement
        const para1: Node = textAreaRef.current?.childNodes[hlRange.line] as Node
        para?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start' })
        // More stable alternative for scrollIntoView:
        // scrollIntoContainerView(para, textAreaRef.current)

        const range1 = new Range()
        if (para1) {
            console.log(selectedCursorStyle)
            var start = hlRange.range[0]
            var end = hlRange.range[1]
            // If user cursor setting is system, highlight the entire system.
            // Do nothing if end==0: this is the 'cursor off' message.
            if (selectedCursorStyleRef.current == 'System' && end != 0) {
                start = 0
                end = para.textContent.length
            }
            const text = para1.firstChild
            if (text && visibleRef.current) {
                range1.setStart(text, start)
                range1.setEnd(text, end)
                const highlight = new Highlight(range1)
                CSS.highlights.set('notation-highlight', highlight)
            }
        }
    }
    // Callback function used for playback animation
    const animateNotationCursor = useCallback((time: number, params: PlayerCursorParameters) => {
        const position =
            selectedPanggulRef.current.length > 0
                ? selectedPanggulRef.current[0]
                : selectedFocusRef.current.length > 0
                  ? selectedFocusRef.current[0]
                  : undefined
        debug(`NOTATION CURSOROPTTION: ${JSON.stringify(selectedPanggulRef.current)}`)
        if (position === params.position) {
            highlightCursor({ line: params.line, range: params.range })
        }
    }, [])

    useEffect(() => updatePlaybackFunctions({ playercursor: animateNotationCursor }), [])

    return (
        <>
            {visible && (
                <>
                    <HStack className="justify-end px-3 pt-1" spacing={6}>
                        <Text className="text-(--rs-text-secondary) text-xs">cursor:</Text>
                        <RadioGroup
                            inline
                            value={selectedCursorStyle}
                            onChange={(value) => setSelectedCursorStyle(value as PlaybackCursorStyle)}>
                            <Radio value="Beat">beat</Radio>
                            <Radio value="System">system</Radio>
                        </RadioGroup>
                    </HStack>

                    <div
                        id="NotationArea"
                        ref={textAreaRef}
                        className="mb-2 balifont w-full h-25 text-sm/5 overflow-scroll border rounded-md p-2">
                        {notation}
                    </div>
                </>
            )}
        </>
    )
}
