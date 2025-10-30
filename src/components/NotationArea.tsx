import { Component, createRef, type Ref, type RefObject } from "react";

export class NotationArea extends Component<React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, { text: string }> {
    constructor(props: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>) {
        super(props);
        this.state = {
            text: ""
        };
    }

    update = (newText: string) => {
        this.setState({
            text: this.state.text + newText
        });
    };

    render() {
        return (
            <textarea value={this.state.text} readOnly={true} rows={8} cols={120} />
        );
    }
}