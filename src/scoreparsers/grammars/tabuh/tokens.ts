// A comment can appear on a separate line or after a line containing other notation items.
// In the former case the eol characters need to be consumed.
// export const positionLabel = new ExternalTokenizer((input) => {
//     var tag = ''
//     for (let i = 0; i < 10 && !stopChars.includes(input.next); i++) {
//         if (input.next == slash) {
//             tag = ''
//         } else tag += String.fromCharCode(input.next)
//         if (!validTags.some((tag) => tag.startsWith(tag))) {
//             return
//         }
//         input.advance()
//     }
//     if (input.next != tab) {
//         return
//     }
//     input.acceptToken(PositionLabel)
// })
