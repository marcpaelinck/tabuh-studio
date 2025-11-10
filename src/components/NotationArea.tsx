// NotationArea wraps a textarea component that can be animated during playback.
// E.g. notation can be written in the textarea element or a cursor can scroll through the 
// notation while the corresponding notes are being played.

import { Component, createRef, type RefObject } from "react"
import type { NotationType } from "../models/types";

interface NotationAreaAttributes extends React.TextareaHTMLAttributes<HTMLDivElement>, React.RefAttributes<NotationArea> {
    notation: NotationType | null
}

interface NotationAreaStates { 
    text: string, 
    textarea: RefObject<HTMLDivElement | null>
}

export class NotationArea extends Component<NotationAreaAttributes, NotationAreaStates> {
    constructor(props: NotationAreaAttributes) {
        super(props);
        this.state = {text: "", textarea: createRef()}
    }

    update = (newText: string) => {
        this.setState({text: this.state.text + newText})
        if (this.state.textarea.current)
            this.state.textarea.current.scrollTop = this.state.textarea.current.scrollHeight;
    }

    highlight = (line: number, range: number[]) => {
        const para = this.state.textarea.current?.children[line]
        const para1 = this.state.textarea.current?.childNodes[line]
        para?.scrollIntoView({ behavior: "smooth", block: "center" });

        const range1 = new Range();
        if (para1) {
            const text = para1.firstChild
            if (text){
                range1.setStart(text, range[0]);
                range1.setEnd(text, range[1]);
                const highlight = new Highlight(range1);       
                CSS.highlights.set("notation-highlight", highlight)
            }
        }

    }

    clear = () => this.setState({text: ""})

    render() {
        return (
            <>
                <div id="NotationArea" ref={this.state.textarea} className="mb-2 balifont w-full h-25 text-sm/5 overflow-hidden border rounded-md p-2">
                { this.props.notation }
                </div>
            </>
        );
    }
}
