export function getTextWidthInPx(text: string, fontSize: number): number {
    const textField = document.createElement('span')
    document.body.appendChild(textField)

    textField.style.fontFamily = 'BaliMusic5'
    textField.style.fontSize = fontSize + 'px'
    textField.style.fontWeight = 'normal'
    textField.style.fontStyle = 'normal'
    textField.style.height = 'auto'
    textField.style.width = 'auto'
    textField.style.position = 'absolute'
    textField.style.whiteSpace = 'no-wrap'
    textField.innerHTML = text

    const width = Math.ceil(textField.clientWidth)
    const formattedWidth = width

    document.body.removeChild(textField)
    return formattedWidth
}
