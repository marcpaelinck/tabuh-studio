import { useEffect, useState } from 'react'
import type { WordPressApiType } from '../components/tabuheditor/contexts'

// Will be passed by the Tabu Studio WordPress plugin
interface WpApiSettings {
    root: string
    nonce: string
}
declare const wpApiSettings: WpApiSettings

export function useWordpressApi(): WordPressApiType {
    const apiRootURL = 'https://tabuh-studio.local/wp-json'

    var [wpTabuhSettings, setWpTabuhSettings] = useState<WpApiSettings>(wpApiSettings)

    useEffect(() => {
        console.log(`NEW TABUHSETTINGS: ${JSON.stringify(wpTabuhSettings)}`)
    }, [wpTabuhSettings])

    type ApiFunction = 'user_login' | 'user_logout' | 'user_info' | 'session_getnonce'
    type Method = 'GET' | 'POST'
    interface FunctionProperties {
        endpoint: string
        method: Method
        nonce: boolean
    }

    const apiMethod: Record<ApiFunction, FunctionProperties> = {
        user_login: { endpoint: 'user/login', method: 'POST', nonce: true },
        user_logout: { endpoint: 'user/logout', method: 'GET', nonce: true },
        user_info: { endpoint: 'user/info', method: 'GET', nonce: true },
        session_getnonce: { endpoint: 'session/getnonce', method: 'GET', nonce: false }
    }

    // Generic function for a call to the tabuhstudio WordPress plugin API
    async function apiCall(func: ApiFunction, body?: object, nonce?: string) {
        const callparameters: RequestInit = { method: apiMethod[func].method }
        callparameters.credentials = 'same-origin'
        const headers: HeadersInit = {}

        if (apiMethod[func].nonce) {
            headers['X-WP-Nonce'] = nonce || wpTabuhSettings.nonce
            callparameters.credentials = 'same-origin'
        }
        if (apiMethod[func].method == 'POST') {
            headers['Content-Type'] = 'application/json'
            if (body) {
                callparameters['body'] = JSON.stringify(body)
            }
        }
        callparameters.headers = headers

        // The actual call to the WP API
        console.log(`REQUEST=${apiMethod[func].endpoint} ${JSON.stringify(callparameters)}`)
        const jsonResponse = await fetch(
            apiRootURL + '/tabuhstudio/v1/' + apiMethod[func].endpoint,
            callparameters
        ).then((result) => result.json())

        // Store the new nonce value as a state variable, so that it can be used with the next query.
        // The nonce value changes when the user signs in or out.
        if ('nonce' in jsonResponse && jsonResponse.nonce) {
            console.log(`setting tabuh settings: ${JSON.stringify(wpTabuhSettings)}`)
            setWpTabuhSettings({ ...wpTabuhSettings, ...{ nonce: jsonResponse.nonce as string } })
        }

        console.log(`${func} RESPONSE=${JSON.stringify(jsonResponse)}`)
        return jsonResponse
    }

    async function nonceCall(func: ApiFunction, body?: object, refreshNonce: boolean = false) {
        if (refreshNonce) return await getNonce().then((session) => apiCall(func, body, session.nonce))
        else return await apiCall(func, body)
    }

    // SESSION FUNCTION
    async function getNonce() {
        return await apiCall('session_getnonce')
    }

    // USER FUNCTIONS
    //
    async function login(username: string, password: string, refreshNonce?: boolean) {
        return await nonceCall('user_login', { username: username, password: password }, refreshNonce)
    }

    async function logout(refreshNonce?: boolean) {
        return await nonceCall('user_logout', undefined, refreshNonce)
    }

    async function getUser(refreshNonce?: boolean) {
        return await nonceCall('user_info', undefined, refreshNonce)
    }

    return { user: { login, logout, getUser }, session: { getNonce } }
}
