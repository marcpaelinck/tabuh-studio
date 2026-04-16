// NotationArea wraps a textarea component that can be animated during playback.
// E.g. notation can be written in the textarea element or a cursor can scroll through the
// notation while the corresponding notes are being played.

import { useEffect, useRef, type Dispatch, type RefObject } from 'react'
import type {
    HighlightRange,
    HilightRangeFunction,
    NotationParagraph,
    PlaybackCallbackFunctions,
    PlayerCursorParameters,
    Position
} from '../../typing/types'

interface NotationAreaProps {
    notation: NotationParagraph[] | null
    visible: boolean
    focus: Position[]
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
}

export default function NotationArea({ notation, visible, focus, updatePlaybackFunctions }: NotationAreaProps) {
    const textAreaRef: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)

    // Highlighting function: highlights the given range (line and character range)
    const highlightCursor: HilightRangeFunction = (hlRange: HighlightRange) => {
        const para = textAreaRef.current?.children[hlRange.line]
        const para1 = textAreaRef.current?.childNodes[hlRange.line]
        // Note: the `container` parameter is not supported yet by all browsers
        // See mdn documentation.
        //@ts-expect-error container option is valid but not recognized
        para?.scrollIntoView({ behavior: 'smooth', block: 'center', container: 'nearest' })

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

    // const animateNotationCursor = (time: number, params: PlayerCursorParameters) => {
    //     // if (currentFocus.includes(cAction.position)) {
    //     if (focus.length > 0 && focus[0] === params.position) {
    //         Tone.getDraw().schedule(() => highlightCursor({ line: params.line, range: params.range }), time)
    //     }
    // }

    const animateNotationCursor = (time: number, params: PlayerCursorParameters) => {
        // if (currentFocus.includes(cAction.position)) {
        if (focus.length > 0 && focus[0] === params.position) {
            highlightCursor({ line: params.line, range: params.range })
        }
    }

    useEffect(() => updatePlaybackFunctions({ playercursor: animateNotationCursor }), [])

    return (
        <>
            <div
                id="NotationArea"
                ref={textAreaRef}
                className="mb-2 balifont w-full h-25 text-sm/5 overflow-scroll border rounded-md p-2">
                {visible && notation}
            </div>
        </>
    )
}
