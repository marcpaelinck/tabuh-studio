// NotationArea wraps a textarea component that can be animated during playback.
// E.g. notation can be written in the textarea element or a cursor can scroll through the
// notation while the corresponding notes are being played.

import { useCallback, useEffect, useRef, type Dispatch, type RefObject } from 'react'
import type { HighlightRange, HilightRangeFunction, NotationParagraph } from '../../typing/animation'
import type { Position } from '../../typing/basetypes'
import type { ExtendedOption } from '../../typing/interface'
import type { PlaybackCallbackFunctions, PlayerCursorParameters } from '../../typing/playback'
import { debug } from '../../utils/debugger'

interface NotationAreaProps {
    notation: NotationParagraph[] | null
    visible: boolean
    selectedFocusOption: ExtendedOption<Position[]>
    selectedPanggulOption: ExtendedOption<Position[]>
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
}

export default function NotationArea({
    notation,
    visible,
    selectedFocusOption,
    selectedPanggulOption,
    updatePlaybackFunctions
}: NotationAreaProps) {
    const textAreaRef: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
    const selectedFocusRef = useRef<Position[]>([])
    const selectedPanggulRef = useRef<Position[]>([])

    useEffect(() => {
        selectedFocusRef.current = selectedFocusOption.objValue
    }, [selectedFocusOption])
    useEffect(() => {
        selectedPanggulRef.current = selectedPanggulOption.objValue
    }, [selectedPanggulOption])

    // Highlighting function: highlights the given range (line and character range)
    const highlightCursor: HilightRangeFunction = (hlRange: HighlightRange) => {
        const para = textAreaRef.current?.children[hlRange.line]
        const para1 = textAreaRef.current?.childNodes[hlRange.line]
        // Note: the `container` parameter is not supported yet by all browsers
        // See mdn documentation.
        //@ts-expect-error container option is valid but not recognized
        para?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start', container: 'nearest' })

        const range1 = new Range()
        if (para1) {
            const text = para1.firstChild
            if (text && visible) {
                range1.setStart(text, hlRange.range[0])
                range1.setEnd(text, hlRange.range[1])
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
            {' '}
            {visible && (
                <div
                    id="NotationArea"
                    ref={textAreaRef}
                    className="mb-2 balifont w-full h-25 text-sm/5 overflow-scroll border rounded-md p-2">
                    {notation}
                </div>
            )}
        </>
    )
}
