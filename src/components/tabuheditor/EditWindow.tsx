import { Box } from "rsuite"
import { useState } from "react"
import type { Score, TextCursorPosition} from "../../models/types"
import { ScoreTableView } from "./ScoreTableView"

function Cursor({position}: {position: TextCursorPosition}) {
    return (
        <rect id="CursorTemplate" width={1.5} height={20} fill="#000000" x={position.x} y={position.y} className="cursor-visible" transform="translate(-1 1)"/>
    )
}

export default function EditWindow({score}:{score: Score | null})
    {
        const windowHeight = 200

        return (
            <Box className={`w-full flex border h-${windowHeight} rounded-md p-2`}>
            {/* <svg className={`w-full h-${svgHeight}`} xmlns="http://www.w3.org/2000/svg"> */}
                {score!=null && (<>
                    {/* <ScoreText score={score} setCursorPosition={setCursorPosition}/> */}
                    <ScoreTableView score={score} />
                    {/* <Cursor position={cursorPosition} /> */}
                </>)}
            {/* </svg> */}
            </Box>
        )
    }