import { useCallback, useEffect, useState, type HTMLAttributes } from 'react'

export const useKeyboard = (props: HTMLAttributes<HTMLInputElement>) => {
    const [str, setStr] = useState('')

    const handleKeyDown = useCallback(
        (v: string) => {
            props.onClick(v)
        },
        [props.onClick]
    )

    useEffect(() => {
        const fn = (e: KeyboardEvent) => handleKeyDown(e.key)
        document.addEventListener('keydown', fn)

        return () => {
            document.removeEventListener('keydown', fn)
        }
    }, [handleKeyDown])

    const onClick = useCallback((v: string) => {
        setStr((str) => str + v)
    }, [])
    return onClick
}
