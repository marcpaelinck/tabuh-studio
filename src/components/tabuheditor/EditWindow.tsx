import { Box } from "rsuite"
import { useState } from "react"
import type { Score, TextCursorPosition} from "../../models/types"
import { ScoreText } from "./Containers"
import { ScoreTableView } from "./ScoreTableView"
import 'rsuite/Table/styles/index.css'

function Cursor({position}: {position: TextCursorPosition}) {
    return (
        <rect id="CursorTemplate" width={1.5} height={20} fill="#000000" x={position.x} y={position.y} className="cursor-visible" transform="translate(-1 1)"/>
    )
}

export default function EditWindow({score}:{score: Score | null})
    {
        const [cursorPosition, setCursorPosition] = useState<TextCursorPosition>({x: 0, y: 0, leftSymbol: null, rightSymbol: null})
        const svgHeight = score ? score.systems.length * 14 * 12 : 0

        return (
            <Box className="w-full flex border h-200 rounded-md p-2">
            {/* <svg className={`w-full h-${svgHeight}`} xmlns="http://www.w3.org/2000/svg"> */}
                {score!=null && (<>
                    {/* <ScoreText score={score} setCursorPosition={setCursorPosition}/> */}
                    <ScoreTableView score={score} setCursorPosition={setCursorPosition}/>
                    {/* <Cursor position={cursorPosition} /> */}
                </>)}
            {/* </svg> */}
            </Box>
        )
    }