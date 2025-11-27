import {useEffect, useState, type HTMLAttributes, type ReactElement } from "react"

export default function Debugwindow({message} :
   {message: string | null}) {

    const [content, setContent] = useState<ReactElement[]>([])

    useEffect(() => {
        if (message) {
            const id: number = content.length
            const newLine: ReactElement<HTMLAttributes<HTMLParagraphElement>> = <p key={`${id}`}>{message}</p>
            setContent([...content, newLine])
        }

    }, [message])

    return (
        <div className="w-8/10 h-30 border-1 overflow-scroll" >
            {content}
        </div>
    )
}