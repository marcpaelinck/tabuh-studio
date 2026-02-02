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

    type ApiFunction = 'login' | 'logout' | 'user' | 'refresh_nonce'
    type Method = 'GET' | 'POST'
    interface FunctionProperties {
        method: Method
        nonce: boolean
    }

    const apiMethod: Record<ApiFunction, FunctionProperties> = {
        login: { method: 'POST', nonce: true },
        logout: { method: 'GET', nonce: true },
        user: { method: 'GET', nonce: true },
        refresh_nonce: { method: 'GET', nonce: false }
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

        // var init: RequestInit =
        //     apiMethod[func].method == 'GET'
        //         ? {
        //               method: apiMethod[func].method,
        //               headers: { 'X-WP-Nonce': wpTabuhSettings.nonce },
        //               credentials: 'same-origin'
        //           }
        //         : {
        //               method: apiMethod[func].method,
        //               headers: { 'X-WP-Nonce': wpTabuhSettings.nonce, 'Content-Type': 'application/json' },
        //               body: JSON.stringify(body),
        //               credentials: 'same-origin'
        //           }
        console.log(`REQUEST=${func} ${JSON.stringify(callparameters)}`)
        const jsonResponse = await fetch(apiRootURL + '/tabuhstudio/v1/' + func, callparameters).then((result) =>
            result.json()
        )

        if ('nonce' in jsonResponse && jsonResponse.nonce)
            setWpTabuhSettings({ ...wpTabuhSettings, ...{ nonce: jsonResponse.nonce as string } })
        console.log(`${func} RESPONSE=${JSON.stringify(jsonResponse)}`)
        return jsonResponse
    }

    // USER FUNCTIONS
    //
    async function login(username: string, password: string) {
        return await apiCall('login', { username: username, password: password })
    }

    async function logout(nonce?: string) {
        return await apiCall('logout', undefined, nonce)
    }

    async function getUser(nonce?: string) {
        return await apiCall('user', undefined, nonce)
    }

    // SESSION FUNCTIONS
    async function getNonce() {
        return await apiCall('refresh_nonce')
    }

    return { user: { login, logout, getUser }, session: { getNonce } }
}
