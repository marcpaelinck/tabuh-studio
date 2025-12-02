import { useMemo, useRef, type Dispatch, type SVGAttributes} from "react"
import type { JsonSymbol, TextCursorPosition } from "../../models/types"

export function FontSymbol({symbol, moveCursor, ...props} : {symbol: JsonSymbol | string, moveCursor: Dispatch<React.MouseEvent<SVGTSpanElement, MouseEvent>>} & SVGAttributes<SVGTSpanElement>) {

    return (
        <>
            <tspan className={props.className} onClick={(e: React.MouseEvent<SVGTSpanElement, MouseEvent>) => moveCursor(e)}>
                {typeof symbol === 'string' ? symbol : symbol.s}
            </tspan>
        </>
            )
}

export function TextContainer({id, x, y, content, editable, setCursorPosition, ...props}:
    {id: string, x: number, y: number, content: JsonSymbol[] | string[], editable: boolean, setCursorPosition: Dispatch<TextCursorPosition>} & Omit<SVGAttributes<SVGTSpanElement>, "id">) {
    const lineRef = useRef<SVGTextElement | null>(null)
    const fs = 14 // font size

    // CHanges the cursor's SVG coordinates and surrounding symbols when the textline is clicked.
    const moveCursor = (event: React.MouseEvent<SVGTSpanElement>) => {
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
                {content.map((symbol) => {
                    key+=1
                    if (key==1) {}
                    return <FontSymbol className={props.className} key={key} symbol={symbol} moveCursor={editable ? moveCursor : ()=>{}} />
                })}
            </>
        )
    }, [content])

    return(
        <>
            {editable && <rect key={`bg-${id}`} x={`${(x-.25)*fs}`} y={`${(2*y-1.5)*fs}`} width={`${content.length * fs}`} height={`${fs * 2}`} fill="#ffff00" fillOpacity={.3}/>}
            <text id={id} ref={lineRef} x={`${x*fs}`} y={`${2*y*fs}`} className={`text-[${fs}pt] ` + (editable ? "balifont" : "font-sans")} >{textContent}</text>
        </>
    )

}