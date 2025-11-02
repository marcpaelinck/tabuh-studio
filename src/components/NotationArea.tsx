// NotationArea wraps a textarea component that can be animated during playback.
// E.g. notation can be written in the textarea element or a cursor can scroll through the 
// notation while the corresponding notes are being played.

import { Component, createRef, type RefObject } from "react"

interface NotationAreaAttributes extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, React.RefAttributes<NotationArea> {}

interface NotationAreaStates { 
    text: string, 
    textarea: RefObject<HTMLTextAreaElement | null>
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
    };

    clear = () => this.setState({text: ""})

    render() {
        return (
            <textarea value={this.state.text} ref={this.state.textarea} readOnly={true} rows={this.props.rows} cols={this.props.cols} className="balifont"/>
        );
    }
}
