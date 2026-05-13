import _ from 'lodash'

// export function getTextWidthInPx(text: string, fontSize: number): number {
//     const textField = document.createElement('span')
//     document.body.appendChild(textField)

//     textField.style.fontFamily = 'BaliMusic5'
//     textField.style.fontSize = fontSize + 'px'
//     textField.style.fontWeight = 'normal'
//     textField.style.fontStyle = 'normal'
//     textField.style.height = 'auto'
//     textField.style.width = 'auto'
//     textField.style.position = 'absolute'
//     textField.style.whiteSpace = 'no-wrap'
//     textField.innerHTML = text

//     const width = Math.ceil(textField.clientWidth)
//     const formattedWidth = width

//     document.body.removeChild(textField)
//     console.log(`TEXTWIDTH '${text}' (fs=${fontSize}) : ${formattedWidth}`)
//     return formattedWidth
// }

export function getTextWidthInPx(text: string, fontSize: number): number {
    return 1 + (9 / 14) * fontSize * text.length
}

export function rgbToHex(rgb: number[]): string {
    const hexArray = _.map(rgb, (num: string) => {
        const as16 = _.parseInt(num).toString(16)
        return `${_.size(as16) === 1 ? '0' : ''}${as16}`
    })
    return `#${hexArray.join('')}`
}
