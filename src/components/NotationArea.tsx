// NotationArea wraps a textarea component that can be animated during playback.
// E.g. notation can be written in the textarea element or a cursor could scroll through the 
// notation while the corresponding notes are being played.

import { Component, createRef, type RefObject } from "react";

export class NotationArea extends Component<React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement> | {notationAreaRef:RefObject<NotationArea>}, { text: string, textarea: RefObject<HTMLTextAreaElement | null>}> {
    constructor({props, notationAreaRef: notationAreaRef}:{props: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, notationAreaRef: RefObject<NotationArea>}) {
        // const textarea: RefObject<HTMLTextAreaElement>
        super(props, notationAreaRef);
        this.state = {text: "", textarea: createRef()}
        notationAreaRef.current = this
    }

    update = (newText: string) => {
        this.setState({text: this.state.text + newText});
        if (this.state.textarea.current)
            this.state.textarea.current.scrollTop = this.state.textarea.current.scrollHeight;
    };

    clear = () => {
        this.setState({text: ""});
    };


    render() {
        return (
            <textarea value={this.state.text} ref={this.state.textarea} readOnly={true} rows={8} cols={120} className="balifont"/>
        );
    }
}
