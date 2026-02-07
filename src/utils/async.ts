export const debounce = <T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => {
            func(...args)
            timeoutId = null
        }, delay)
    }
}

export async function emulateAsync<T>(returnValue: T): Promise<T> {
    return new Promise((resolve) =>
        setTimeout(() => {
            resolve(returnValue)
        }, 100)
    )
}
