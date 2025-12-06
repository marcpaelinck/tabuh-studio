import { Box } from 'rsuite'
import type { Score, TextCursorPosition } from '../../models/types'
import { ScoreAccordeonView } from './ScoreAccordeonView'

function Cursor({ position }: { position: TextCursorPosition }) {
    return (
        <rect
            id="CursorTemplate"
            width={1.5}
            height={20}
            fill="#000000"
            x={position.x}
            y={position.y}
            className="cursor-visible"
            transform="translate(-1 1)"
        />
    )
}

export default function EditWindow({ score }: { score: Score | null }) {
    return (
        <>
            {/*<Box className={`w-full flex border h-200  rounded-md p-2  overflow-scroll`}>*/}
            {/* <svg className={`w-full h-${svgHeight}`} xmlns="http://www.w3.org/2000/svg"> */}
            {score != null && (
                <>
                    {/* <ScoreText score={score} setCursorPosition={setCursorPosition}/> */}
                    {/* <ScoreAccordeonView score={score} /> */}
                    {/* <Cursor position={cursorPosition} /> */}
                </>
            )}
            {/* </svg> */}
            {/*</Box>*/}
        </>
    )
}
