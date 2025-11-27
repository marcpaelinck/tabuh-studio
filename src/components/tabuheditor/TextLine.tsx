import { useMemo, useRef, type RefObject } from "react"

function FontSymbol({symbol, id, moveCursor} : {symbol: string, id: number, moveCursor: CallableFunction}) {
    const cursorRef = useRef<SVGTSpanElement | null>(null)
    const spacing = 16

    return (
        <>
            <tspan id={`na-cursor-${id}`} ref={cursorRef}  className={"cursor-hidden"} onClick={() => moveCursor(cursorRef)}>
                "|"
            </tspan>
            <tspan id={`na-text-${id}`} onClick={() => moveCursor(cursorRef)}>
                {symbol}
            </tspan>
        </>
            )
}

export default function TextLine({id, content}:{id: number, content: string[]}) {
    const cursorRef = useRef<SVGGElement | null>(null)
    const lineRef = useRef<SVGTextElement | null>(null)

    const moveCursor = (newRef: RefObject<SVGGElement>) => {
        if (cursorRef.current) {
            cursorRef.current.classList.remove("cursor-visible")
            cursorRef.current.classList.add("cursor-hidden")
        }
        newRef.current.classList.remove("cursor-hidden")
        newRef.current.classList.add("cursor-visible")
        cursorRef.current = newRef.current
    }

    const textContent = useMemo(() => {
        var id=0
        return (
            <>

            {content.map((symbol) => {
                id+=1
                return <FontSymbol symbol={symbol} moveCursor={moveCursor} id={id}/>
            })}
            </>
        )
    }, [content])

    return(
        <>
            <text id={`Line-${id}`} ref={lineRef} x="20" y="30" >{textContent}</text>
        </>
    )

}