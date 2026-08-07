/**
 * This hook provides an easy way to display a status message.
 * Function showMessage displays a message in a React Suite `Message` component.
 */
import { Message, useToaster, type MessageProps } from 'rsuite'

interface ShowMessageProps extends MessageProps {
    message: string
}

export function useShowMessage() {
    const toaster = useToaster()

    /**
     * Displays a message in a Message component.
     * message: The message
     * type: 'info' | 'success' | 'warning' | 'error'
     * Accepts any prop of the React Suite `Message` component.
     */
    function showMessage({ message, ...props }: ShowMessageProps) {
        const header = props.type ? props.type[0].toUpperCase() + props.type.slice(1) : 'Info'
        const messageComponent = (
            <Message showIcon={props.showIcon || true} closable header={header} type={props.type || 'info'}>
                {message}
            </Message>
        )
        toaster.push(messageComponent, { duration: 5000 })
    }

    return { showMessage }
}
