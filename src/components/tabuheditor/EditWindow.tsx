import { Container } from "rsuite"
import TextLine from "./TextLine"

function Cursor() {
    return (
            <symbol id="te-cursor">
                <rect id="CursorTemplate" x="0" y="0" width={2} height={20} fill="#000000" />
            </symbol>            
    )
}

export default function EditWindow()
    {
        return (
            <Container className="w-full overflow-scroll border rounded-md p-2">
            <svg className="balifont16" viewBox="0 0 1500 500" xmlns="http://www.w3.org/2000/svg">
                <Cursor/>
                <TextLine id={0} content={["a", "e", "i", "o", "a,"]}/>
            </svg>
            </Container>
        )
    }