import { useState, type MouseEvent } from "react"

export default function EditWindow()
    {
    const [cursorXY, setCursorXY] = useState<{x:number, y:number}>({x:40, y:15})

    const moveCursor = (e: MouseEvent<SVGTextElement>) => {
        setCursorXY({x:e.clientX-109, y:cursorXY.y})
        console.log(e)
    }

        return (
        <>
            <svg className="balifont14" viewBox="0 0 1500 500" xmlns="http://www.w3.org/2000/svg">
                <symbol id="cursor">
                    <rect x="0" y="0" width={2} height={20} >
                        <animate
                            attributeType="XML"
                            attributeName="fill"
                            values="#000000;#000000;#00000000;#00000000"
                            dur="1.3s"
                            repeatCount="indefinite"/>
                    </rect>
                </symbol>
                <text onClick={moveCursor} x="20" y="30" >ioio iooe oeoe oa,a,i a,ia,ia,</text>
                <g>
                    <use href="#cursor" x={cursorXY.x} y={cursorXY.y}/>
                </g>
            </svg>
    </>
    )
    }