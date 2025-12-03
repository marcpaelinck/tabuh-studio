import { useMemo, useRef, type Dispatch, type SVGAttributes} from "react"
import type { JsonSymbol, TextCursorPosition } from "../../models/types"
import { FontSymbol } from "./TextContainer"

export function CellTextContainer({content, editable, setCursorPosition, ...props}:
    {content: JsonSymbol[] | string[], editable: boolean, setCursorPosition: Dispatch<TextCursorPosition>} & Omit<SVGAttributes<SVGTSpanElement>, "id">) {
    const lineRef = useRef<HTMLDivElement | null>(null)
    const fs = 14 // font size

    // CHanges the cursor's SVG coordinates and surrounding symbols when the textline is clicked.
    const moveCursor = (event: React.MouseEvent<HTMLSpanElement>) => {
        const target = event.target as SVGTSpanElement
        // The text cursor will be moved either to the left or right of the clicked symbol, 
        // depending on whether the mouse cursor is located to the left or right of a threshold
        // location along the width of the symbol.
        const threshold = .55 
        const cursorPos: TextCursorPosition = {x: 0, y: 0, leftSymbol: null, rightSymbol: null}
        const boxLeft = target.getBoundingClientRect().x
        const boxWidth = target.getBoundingClientRect().width
        if (event.clientX-boxLeft < (threshold * boxWidth)) {
            cursorPos.x = target.getBBox().x
            cursorPos.rightSymbol = target
            cursorPos.leftSymbol = target.previousSibling as SVGTSpanElement | null
        } else {
            cursorPos.x = target.getBBox().x + target.getBBox().width
            cursorPos.leftSymbol = target
            cursorPos.rightSymbol = target.nextSibling as SVGTSpanElement | null
        }
        cursorPos.y = target.getBBox().y
        setCursorPosition(cursorPos)
        // console.log(`${cursorPos.leftSymbol ? cursorPos.leftSymbol.innerHTML : "-"}  ${cursorPos.rightSymbol ? cursorPos.rightSymbol.innerHTML : "-"}`)
    }

    const textContent = useMemo(() => {
        var key=0

        return (
            <>
                {content ? content.map((symbol) => {
                    key+=1
                    if (key==1) {}
                    return <FontSymbol className={props.className} key={key} symbol={symbol} />
                }) : <></>}
            </>
        )
    }, [content])

    return(
        <>
            <div ref={lineRef} className={`text-[${fs}pt] balifont`} >{textContent}</div>
        </>
    )

}