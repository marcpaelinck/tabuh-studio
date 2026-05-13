// These are test functions which should not be committed to the git repo
const rootURL = 'https://tabuh-studio.local'

interface WpApiSettings {
    root: string
    nonce: string
}
// Will be passed by the Tabu Studio WordPress plugin
declare const wpApiSettings: WpApiSettings

export function testFileImport(): void {
    console.log('import clicked')
    let headersList = { Accept: '*/*' }
    fetch(rootURL + '/wp-json/wp/v2/users?context=edit', { method: 'GET', headers: headersList })
        .then((response) => response.json())
        .catch((reason) => console.error(reason))
        .then((json) => console.log(json))
}

export function testFileSaveas(): void {
    console.log('save as clicked')
    console.log(`nonce=${wpApiSettings.nonce}`)
    fetch(rootURL + '/wp-json/wp/v2/users?context=edit', {
        method: 'GET',
        headers: { 'X-WP-Nonce': wpApiSettings.nonce },
        credentials: 'same-origin'
    })
        .then((response) => response.json())
        .then((json) => console.log(json))
}

export function testFileSaveas_old(): void {
    console.log(`nonce=${wpApiSettings.nonce}`)
    fetch(rootURL + '/wp/v2/posts', {
        method: 'POST',
        headers: { 'X-WP-Nonce': wpApiSettings.nonce, 'Content-Type': 'application/json' },
        credentials: 'same-origin', // Essential for cookie authentication
        body: JSON.stringify({ title: 'My New Post', status: 'publish' })
    })
        .then((response) => response.json())
        .then((data) => console.log(data))
}
